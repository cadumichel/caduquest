import type { SupabaseClient } from "@supabase/supabase-js";
import { emPedacos, lerTudo } from "./paginar";

/**
 * Com consulta × sem consulta: o acerto do aluno nos desafios em que podia
 * pesquisar (pesquisa liberada) contra os de pesquisa bloqueada. Uma diferença
 * grande mostra quem acha a resposta na apostila mas ainda não fixou.
 */

export type Parcial = { soma: number; n: number };
export type Consulta = { com: Parcial; sem: Parcial };

/** A partir de quantos pontos percentuais a diferença vira recado. */
export const DIFERENCA_RELEVANTE = 20;
/** Menos questões que isso de cada lado não dizem nada. */
export const QUESTOES_MINIMAS = 5;

export const consultaVazia = (): Consulta => ({ com: { soma: 0, n: 0 }, sem: { soma: 0, n: 0 } });

const pct = (p: Parcial) => (p.n > 0 ? Math.round((p.soma / p.n) * 100) : null);

/** Percentuais prontos para exibir; `falta fixar` quando o com consulta passa muito do sem. */
export function resumoConsulta(c: Consulta) {
  const com = pct(c.com);
  const sem = pct(c.sem);
  const comparavel = com !== null && sem !== null && c.com.n >= QUESTOES_MINIMAS && c.sem.n >= QUESTOES_MINIMAS;
  const diferenca = comparavel ? com - sem : null;
  return { com, sem, diferenca, faltaFixar: diferenca !== null && diferenca >= DIFERENCA_RELEVANTE };
}

/** Soma várias consultas (a turma inteira, por exemplo). */
export function somarConsultas(lista: Iterable<Consulta>): Consulta {
  const total = consultaVazia();
  for (const c of lista) {
    total.com.soma += c.com.soma;
    total.com.n += c.com.n;
    total.sem.soma += c.sem.soma;
    total.sem.n += c.sem.n;
  }
  return total;
}

/** Texto curto: "com consulta 78% · sem consulta 25%". */
export function textoConsulta(c: Consulta): string | null {
  const { com, sem } = resumoConsulta(c);
  if (com === null && sem === null) return null;
  return [com !== null && `com consulta ${com}%`, sem !== null && `sem consulta ${sem}%`].filter(Boolean).join(" · ");
}

export type RespostaConsulta = { alunoId: string; semConsulta: boolean; fracao: number };

export function agruparConsulta(respostas: RespostaConsulta[]): Map<string, Consulta> {
  const mapa = new Map<string, Consulta>();
  for (const r of respostas) {
    const c = mapa.get(r.alunoId) ?? consultaVazia();
    const lado = r.semConsulta ? c.sem : c.com;
    lado.soma += r.fracao;
    lado.n += 1;
    mapa.set(r.alunoId, c);
  }
  return mapa;
}

/**
 * Consulta de cada aluno nos desafios dados (uma temporada, ou todas da turma).
 * `alunoId` restringe a um aluno. Serve ao cliente do professor (RLS) e ao admin.
 */
export async function consultaPorAluno(
  db: SupabaseClient,
  filtro: { temporadaId: string } | { turmaId: string },
  alunoId?: string,
): Promise<Map<string, Consulta>> {
  const consultaDesafios =
    "temporadaId" in filtro
      ? db.from("desafios").select("id, saida_zera_questao").eq("temporada_id", filtro.temporadaId)
      : db
          .from("desafios")
          .select("id, saida_zera_questao, temporadas!inner(turma_id)")
          .eq("temporadas.turma_id", filtro.turmaId);
  const { data: desafios } = await consultaDesafios;
  const semConsulta = new Map((desafios ?? []).map((d) => [d.id as string, Boolean(d.saida_zera_questao)]));
  if (!semConsulta.size) return new Map();

  let consultaTentativas = db
    .from("tentativas")
    .select("id, aluno_id, desafio_id")
    .in("desafio_id", [...semConsulta.keys()]);
  if (alunoId) consultaTentativas = consultaTentativas.eq("aluno_id", alunoId);
  const { data: tentativas } = await consultaTentativas;
  const daTentativa = new Map((tentativas ?? []).map((t) => [t.id as string, t]));
  if (!daTentativa.size) return new Map();

  const respostas = (
    await Promise.all(
      emPedacos([...daTentativa.keys()]).map((ids) =>
        lerTudo<{ tentativa_id: string; fracao: number }>((de, ate) =>
          db
            .from("respostas")
            .select("tentativa_id, fracao")
            .in("tentativa_id", ids)
            .not("fracao", "is", null)
            .order("id")
            .range(de, ate),
        ),
      ),
    )
  ).flat();
  return agruparConsulta(
    respostas.flatMap((r) => {
      const t = daTentativa.get(r.tentativa_id);
      return t
        ? [{ alunoId: t.aluno_id, semConsulta: semConsulta.get(t.desafio_id) ?? false, fracao: Number(r.fracao) }]
        : [];
    }),
  );
}

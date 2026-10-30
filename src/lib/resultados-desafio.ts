import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultadoQuestao } from "@/lib/relatorio";
import type { Tentativa } from "@/lib/tipos-banco";

export type LinhaResultado = {
  alunoId: string;
  apelido: string;
  nomeReal: string | null;
  situacao: "concluiu" | "em andamento" | "não fez";
  pontos: number;
  acertos: number;
  respondidas: number;
  esgotadas: number;
  saidasTela: number;
  zeradasPorSaida: number;
  /** Resultado em cada questão (por id); ausente = não chegou nela. */
  questoes: Map<string, ResultadoQuestao>;
};

/** Resultados de um desafio por aluno e acerto médio por questão (cliente com RLS do professor). */
export async function resultadosDoDesafio(db: SupabaseClient, desafioId: string, turmaId: string) {
  const [{ data: alunos }, { data: tentativasBrutas }] = await Promise.all([
    db.from("alunos").select("id, apelido, nome_real").eq("turma_id", turmaId).eq("aprovado", true).order("apelido"),
    db.from("tentativas").select("*").eq("desafio_id", desafioId),
  ]);
  const tentativas = (tentativasBrutas ?? []) as Tentativa[];
  const { data: respostas } = tentativas.length
    ? await db
        .from("respostas")
        .select("tentativa_id, questao_id, fracao, tempo_esgotado, saidas_tela, zerada_por_saida")
        .in(
          "tentativa_id",
          tentativas.map((t) => t.id),
        )
    : {
        data: [] as {
          tentativa_id: string;
          questao_id: string;
          fracao: number | null;
          tempo_esgotado: boolean;
          saidas_tela: number;
          zerada_por_saida: boolean;
        }[],
      };

  type Agregado = { acertos: number; respondidas: number; esgotadas: number; saidas: number; zeradas: number };
  const porTentativa = new Map<string, Agregado>();
  const porQuestao = new Map<string, { soma: number; n: number }>();
  const detalhe = new Map<string, Map<string, ResultadoQuestao>>();
  for (const r of respostas ?? []) {
    const doAluno = detalhe.get(r.tentativa_id) ?? new Map<string, ResultadoQuestao>();
    doAluno.set(r.questao_id, {
      fracao: r.fracao === null ? null : Number(r.fracao),
      esgotada: r.tempo_esgotado,
      zerada: r.zerada_por_saida,
    });
    detalhe.set(r.tentativa_id, doAluno);
    const agg = porTentativa.get(r.tentativa_id) ?? { acertos: 0, respondidas: 0, esgotadas: 0, saidas: 0, zeradas: 0 };
    if (r.fracao !== null) {
      agg.acertos += Number(r.fracao);
      agg.respondidas += 1;
      const q = porQuestao.get(r.questao_id) ?? { soma: 0, n: 0 };
      q.soma += Number(r.fracao);
      q.n += 1;
      porQuestao.set(r.questao_id, q);
    }
    if (r.tempo_esgotado) agg.esgotadas += 1;
    if (r.zerada_por_saida) agg.zeradas += 1;
    agg.saidas += r.saidas_tela;
    porTentativa.set(r.tentativa_id, agg);
  }

  const tentativaDoAluno = new Map(tentativas.map((t) => [t.aluno_id, t]));
  const linhas: LinhaResultado[] = (alunos ?? []).map((a) => {
    const t = tentativaDoAluno.get(a.id);
    const agg = t ? porTentativa.get(t.id) : undefined;
    return {
      alunoId: a.id,
      apelido: a.apelido,
      nomeReal: a.nome_real,
      situacao: !t ? "não fez" : t.concluida_em ? "concluiu" : "em andamento",
      pontos: t ? Number(t.pontos) : 0,
      acertos: Math.round((agg?.acertos ?? 0) * 100) / 100,
      respondidas: agg?.respondidas ?? 0,
      esgotadas: agg?.esgotadas ?? 0,
      saidasTela: agg?.saidas ?? 0,
      zeradasPorSaida: agg?.zeradas ?? 0,
      questoes: (t && detalhe.get(t.id)) || new Map(),
    };
  });
  linhas.sort((a, b) => b.pontos - a.pontos || a.apelido.localeCompare(b.apelido, "pt-BR"));

  const acertoPorQuestao = new Map([...porQuestao].map(([id, q]) => [id, q.n ? q.soma / q.n : null]));
  return { linhas, acertoPorQuestao };
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeEmBrasilia } from "@/lib/datas";
import { agruparPorSemana, calcularConstancia } from "@/lib/constancia";
import { montarRanking } from "@/lib/ranking";
import type { Temporada } from "@/lib/tipos-banco";

/** Temporada em curso da turma; se não houver, a próxima; senão, a última. */
export async function temporadaAtual(db: SupabaseClient, turmaId: string): Promise<Temporada | null> {
  const { data } = await db
    .from("temporadas")
    .select("id, turma_id, professor_id, nome, narrativa, inicio, data_prova, capitulos")
    .eq("turma_id", turmaId)
    .order("inicio", { ascending: true });
  const temporadas = (data ?? []) as Temporada[];
  const hoje = hojeEmBrasilia();
  return (
    temporadas.find((t) => t.inicio <= hoje && hoje <= t.data_prova) ??
    temporadas.find((t) => t.inicio > hoje) ??
    temporadas.at(-1) ??
    null
  );
}

type TentativaRanking = {
  id: string;
  aluno_id: string;
  desafio_id: string;
  pontos: number;
  concluida_em: string | null;
  indice_atual: number;
  ordem: string[];
};

/**
 * Ranking completo de uma temporada. O cliente precisa poder ler alunos,
 * desafios, tentativas e respostas da turma (RLS do professor ou cliente admin).
 */
export async function rankingDaTemporada(db: SupabaseClient, temporada: Pick<Temporada, "id" | "turma_id">) {
  const [{ data: alunos }, { data: desafios }] = await Promise.all([
    db.from("alunos").select("id, apelido, avatar, cor").eq("turma_id", temporada.turma_id).eq("aprovado", true),
    db.from("desafios").select("id, tipo, abre_em, fecha_em").eq("temporada_id", temporada.id),
  ]);
  const idsDesafios = (desafios ?? []).map((d) => d.id);

  const { data: tentativas } = idsDesafios.length
    ? await db
        .from("tentativas")
        .select("id, aluno_id, desafio_id, pontos, concluida_em, indice_atual, ordem")
        .in("desafio_id", idsDesafios)
    : { data: [] as TentativaRanking[] };
  const idsTentativas = (tentativas ?? []).map((t) => t.id);

  const { data: respostas } = idsTentativas.length
    ? await db
        .from("respostas")
        .select("tentativa_id, fracao")
        .in("tentativa_id", idsTentativas)
        .not("fracao", "is", null)
    : { data: [] as { tentativa_id: string; fracao: number }[] };

  const porAluno = new Map(
    (alunos ?? []).map((a) => [
      a.id,
      { alunoId: a.id, apelido: a.apelido, avatar: a.avatar, cor: a.cor, pontos: 0, somaFracoes: 0, questoes: 0 },
    ]),
  );
  const alunoDaTentativa = new Map<string, string>();
  for (const t of tentativas ?? []) {
    alunoDaTentativa.set(t.id, t.aluno_id);
    const e = porAluno.get(t.aluno_id);
    if (e) e.pontos += Number(t.pontos);
  }
  for (const r of respostas ?? []) {
    const e = porAluno.get(alunoDaTentativa.get(r.tentativa_id) ?? "");
    if (e) {
      e.somaFracoes += Number(r.fracao);
      e.questoes += 1;
    }
  }

  // Constância: só os desafios semanais contam.
  const semanas = agruparPorSemana((desafios ?? []).filter((d) => d.tipo !== "relampago"));
  const concluidosPorAluno = new Map<string, Set<string>>();
  for (const t of (tentativas ?? []) as TentativaRanking[]) {
    if (!(t.concluida_em || t.indice_atual >= t.ordem.length)) continue;
    const set = concluidosPorAluno.get(t.aluno_id) ?? new Set<string>();
    set.add(t.desafio_id);
    concluidosPorAluno.set(t.aluno_id, set);
  }
  for (const e of porAluno.values()) {
    Object.assign(e, calcularConstancia(semanas, concluidosPorAluno.get(e.alunoId) ?? new Set()));
  }
  return montarRanking([...porAluno.values()]);
}

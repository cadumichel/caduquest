import type { SupabaseClient } from "@supabase/supabase-js";

type TentativaPontos = { desafio_id: string; aluno_id: string; pontos: number };

/**
 * Vitórias por aluno: em cada desafio, quem fez mais pontos vence (empate:
 * todos os empatados vencem). Desafio sem pontos não dá medalha.
 */
export function contarVitorias(tentativas: TentativaPontos[]): Map<string, number> {
  const maximo = new Map<string, number>();
  for (const t of tentativas) maximo.set(t.desafio_id, Math.max(maximo.get(t.desafio_id) ?? 0, Number(t.pontos)));
  const vitorias = new Map<string, number>();
  for (const t of tentativas) {
    const topo = maximo.get(t.desafio_id) ?? 0;
    if (topo > 0 && Number(t.pontos) === topo) vitorias.set(t.aluno_id, (vitorias.get(t.aluno_id) ?? 0) + 1);
  }
  return vitorias;
}

/** Medalhas dos alunos da turma, contando só desafios já encerrados. */
export async function medalhasDaTurma(db: SupabaseClient, turmaId: string): Promise<Map<string, number>> {
  const { data: desafios } = await db
    .from("desafios")
    .select("id, temporadas!inner(turma_id)")
    .eq("temporadas.turma_id", turmaId)
    .lt("fecha_em", new Date().toISOString());
  const ids = (desafios ?? []).map((d) => d.id as string);
  if (!ids.length) return new Map();
  const { data: tentativas } = await db.from("tentativas").select("desafio_id, aluno_id, pontos").in("desafio_id", ids);
  return contarVitorias((tentativas ?? []) as TentativaPontos[]);
}

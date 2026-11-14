import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Aluno de teste: o perfil que o professor usa para ver o app como aluno. Não
 * entra no ranking, na meta da turma nem nas contas do painel.
 */
export const APELIDO_DE_TESTE = "Aluno teste";

/**
 * Ids dos alunos de teste (de uma turma ou de todas as que o cliente enxerga).
 * Sem o SQL da coluna, a consulta falha e ninguém é de teste: nada quebra.
 */
export async function alunosDeTeste(db: SupabaseClient, turmaId?: string): Promise<Map<string, string>> {
  let consulta = db.from("alunos").select("id, turma_id").eq("de_teste", true);
  if (turmaId) consulta = consulta.eq("turma_id", turmaId);
  const { data } = await consulta;
  return new Map((data ?? []).map((a) => [a.id as string, a.turma_id as string]));
}

/** Tira os alunos de teste da contagem "alunos(count)" de cada turma. */
export function descontarAlunosDeTeste(
  turmas: { id: string; alunos: { count: number }[] }[],
  deTeste: Map<string, string>,
) {
  for (const turmaId of deTeste.values()) {
    const contagem = turmas.find((t) => t.id === turmaId)?.alunos[0];
    if (contagem) contagem.count = Math.max(0, contagem.count - 1);
  }
}

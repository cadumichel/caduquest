import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Revisão de erros: questões que o aluno errou (ou acertou só em parte) em
 * desafios já encerrados, cujo gabarito já é público. A questão sai da revisão
 * quando o aluno acerta. Sem a tabela "revisoes" (SQL ainda não rodado), a
 * revisão funciona, só não guarda o progresso.
 */

export const QUESTOES_POR_RODADA = 5;

/** Ids das questões a revisar, das erradas mais recentes para as mais antigas. */
export async function errosParaRevisar(db: SupabaseClient, alunoId: string, turmaId: string): Promise<string[]> {
  const { data: tentativas } = await db
    .from("tentativas")
    .select("id, desafios!inner(fecha_em, temporadas!inner(turma_id))")
    .eq("aluno_id", alunoId)
    .eq("desafios.temporadas.turma_id", turmaId)
    .lt("desafios.fecha_em", new Date().toISOString());
  const ids = (tentativas ?? []).map((t) => t.id as string);
  if (!ids.length) return [];

  const [{ data: respostas }, { data: revisadas }] = await Promise.all([
    db
      .from("respostas")
      .select("questao_id, servida_em")
      .in("tentativa_id", ids)
      .lt("fracao", 1)
      .order("servida_em", { ascending: false }),
    db.from("revisoes").select("questao_id").eq("aluno_id", alunoId).not("acertou_em", "is", null),
  ]);
  const acertadas = new Set((revisadas ?? []).map((r) => r.questao_id as string));
  return [...new Set((respostas ?? []).map((r) => r.questao_id as string))].filter((id) => !acertadas.has(id));
}

/** Questões já acertadas na revisão (contam XP no perfil). */
export async function revisoesAcertadas(db: SupabaseClient, alunoId: string): Promise<number> {
  const { count } = await db
    .from("revisoes")
    .select("questao_id", { count: "exact", head: true })
    .eq("aluno_id", alunoId)
    .not("acertou_em", "is", null);
  return count ?? 0;
}

export async function registrarRevisao(db: SupabaseClient, alunoId: string, questaoId: string, acertou: boolean) {
  const { data: atual } = await db
    .from("revisoes")
    .select("tentativas, acertou_em")
    .eq("aluno_id", alunoId)
    .eq("questao_id", questaoId)
    .maybeSingle();
  const agora = new Date().toISOString();
  await db.from("revisoes").upsert({
    aluno_id: alunoId,
    questao_id: questaoId,
    tentativas: (atual?.tentativas ?? 0) + 1,
    acertou_em: atual?.acertou_em ?? (acertou ? agora : null),
    atualizado_em: agora,
  });
}

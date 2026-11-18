import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lerPorIds } from "@/lib/paginar";
import { JANELA_APOS_FECHAR_S } from "@/lib/questoes/correcao";
import { gabaritoLiberado, type Desafio } from "@/lib/tipos-banco";
import { hojeEmBrasilia } from "@/lib/datas";
import { inicioDoDiaEmBrasilia } from "@/lib/revisao-bonus";

/**
 * Revisão de erros: questões que o aluno errou (ou acertou só em parte) em
 * desafios já encerrados, cujo gabarito já é público (ver gabaritoLiberado). A questão sai da revisão
 * quando o aluno acerta. Sem a tabela "revisoes" (SQL ainda não rodado), a
 * revisão funciona, só não guarda o progresso.
 */

export const QUESTOES_POR_RODADA = 5;

/** Ids das questões a revisar, das erradas mais recentes para as mais antigas. */
export async function errosParaRevisar(db: SupabaseClient, alunoId: string, turmaId: string): Promise<string[]> {
  const { data: tentativas } = await db
    .from("tentativas")
    .select("id, desafios!inner(*, temporadas!inner(*))")
    .eq("aluno_id", alunoId)
    .eq("desafios.temporadas.turma_id", turmaId)
    .lt("desafios.fecha_em", new Date(Date.now() - JANELA_APOS_FECHAR_S * 1000).toISOString());
  const ids = (tentativas ?? [])
    .filter((t) => gabaritoLiberado(t.desafios as unknown as Desafio))
    .map((t) => t.id as string);
  if (!ids.length) return [];

  const [respostas, { data: revisadas }] = await Promise.all([
    lerPorIds<{ questao_id: string; servida_em: string }>(
      db,
      "respostas",
      "questao_id, servida_em",
      "tentativa_id",
      ids,
      (c) => c.lt("fracao", 1),
    ),
    db.from("revisoes").select("questao_id").eq("aluno_id", alunoId).not("acertou_em", "is", null),
  ]);
  // Das erradas mais recentes para as mais antigas.
  respostas.sort((a, b) => b.servida_em.localeCompare(a.servida_em));
  const acertadas = new Set((revisadas ?? []).map((r) => r.questao_id as string));
  return [...new Set(respostas.map((r) => r.questao_id))].filter((id) => !acertadas.has(id));
}

/** Questões já acertadas na revisão (contam XP no perfil, sem limite por dia). */
export async function revisoesAcertadas(db: SupabaseClient, alunoId: string): Promise<number> {
  const { count } = await db
    .from("revisoes")
    .select("questao_id", { count: "exact", head: true })
    .eq("aluno_id", alunoId)
    .not("acertou_em", "is", null);
  return count ?? 0;
}

/** Grava a tentativa na revisão. Devolve true quando é o primeiro acerto desta questão. */
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
  return acertou && !atual?.acertou_em;
}

/** Questões que o aluno acertou na revisão hoje (horário de Brasília), para o limite diário do bônus. */
export async function acertosDeRevisaoHoje(db: SupabaseClient, alunoId: string): Promise<number> {
  const { count } = await db
    .from("revisoes")
    .select("questao_id", { count: "exact", head: true })
    .eq("aluno_id", alunoId)
    .gte("acertou_em", inicioDoDiaEmBrasilia(hojeEmBrasilia()));
  return count ?? 0;
}

/**
 * Conquista "Aprendi com o erro": o aluno zerou a revisão de erros. Fica gravada
 * (alunos.revisao_zerada_em) para não sumir quando aparecerem erros novos.
 * Sem o SQL, a gravação falha em silêncio e a conquista vale só enquanto a fila estiver vazia.
 */
export async function marcarRevisaoZerada(db: SupabaseClient, alunoId: string) {
  await db
    .from("alunos")
    .update({ revisao_zerada_em: new Date().toISOString() })
    .eq("id", alunoId)
    .is("revisao_zerada_em", null);
}

/** O aluno já zerou a revisão de erros alguma vez? */
export async function revisaoJaZerada(
  db: SupabaseClient,
  alunoId: string,
  turmaId: string,
  acertadas: number,
): Promise<boolean> {
  if (!acertadas) return false;
  const { data, error } = await db.from("alunos").select("revisao_zerada_em").eq("id", alunoId).maybeSingle();
  if (!error && data?.revisao_zerada_em) return true;
  // Quem zerou antes desta regra (ou sem o SQL): vale se a fila está vazia agora.
  return (await errosParaRevisar(db, alunoId, turmaId)).length === 0;
}

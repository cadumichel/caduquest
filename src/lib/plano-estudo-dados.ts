import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarPlano, type PlanoDeEstudo } from "@/lib/plano-estudo";
import { gabaritoLiberado, type Desafio } from "@/lib/tipos-banco";

/**
 * Plano de estudo do aluno na temporada. Só entram desafios cujo gabarito já
 * saiu (o mesmo critério da revisão de erros), para o plano não revelar o que
 * ele errou num desafio ainda aberto. Questão já acertada na revisão conta como certa.
 */
export async function planoDoAluno(db: SupabaseClient, alunoId: string, temporadaId: string): Promise<PlanoDeEstudo> {
  const { data: tentativas } = await db
    .from("tentativas")
    .select("id, desafios!inner(*, temporadas!inner(*))")
    .eq("aluno_id", alunoId)
    .eq("desafios.temporada_id", temporadaId);
  const ids = (tentativas ?? [])
    .filter((t) => gabaritoLiberado(t.desafios as unknown as Desafio))
    .map((t) => t.id as string);
  if (!ids.length) return montarPlano([]);

  const [{ data: respostas }, { data: revisadas }] = await Promise.all([
    db
      .from("respostas")
      .select("questao_id, fracao, questoes(capitulo, habilidades, enunciado)")
      .in("tentativa_id", ids)
      .not("fracao", "is", null)
      .order("servida_em", { ascending: false }),
    db.from("revisoes").select("questao_id").eq("aluno_id", alunoId).not("acertou_em", "is", null),
  ]);
  const acertadas = new Set((revisadas ?? []).map((r) => r.questao_id as string));
  return montarPlano(
    (
      (respostas ?? []) as unknown as {
        questao_id: string;
        fracao: number;
        questoes: { capitulo: string | null; habilidades: string[] | null; enunciado: string } | null;
      }[]
    ).flatMap((r) =>
      r.questoes
        ? [
            {
              questaoId: r.questao_id,
              capitulo: r.questoes.capitulo,
              habilidades: r.questoes.habilidades ?? [],
              enunciado: r.questoes.enunciado,
              fracao: acertadas.has(r.questao_id) ? 1 : Number(r.fracao),
            },
          ]
        : [],
    ),
  );
}

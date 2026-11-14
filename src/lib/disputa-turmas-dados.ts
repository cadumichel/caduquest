import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeEmBrasilia } from "@/lib/datas";
import { ALUNOS_MINIMOS, mesmaSerie, ordenarDisputa, placarDaTurma, type Disputa } from "@/lib/disputa-turmas";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import { ultimoDiaComPontos } from "@/lib/tipos-banco";

/**
 * Disputa da turma com as outras da mesma escola e série, do mesmo professor.
 * Entra só quem tem temporada valendo pontos hoje; com menos de duas turmas,
 * não há disputa (null). Nada é cadastrado: sai das turmas que já existem.
 */
export async function disputaDaTurma(db: SupabaseClient, turmaId: string): Promise<Disputa | null> {
  const { data: turma } = await db
    .from("turmas")
    .select("id, serie, escola_id, professor_id")
    .eq("id", turmaId)
    .maybeSingle();
  if (!turma?.serie?.trim()) return null;
  const { data: daEscola } = await db
    .from("turmas")
    .select("id, nome, serie")
    .eq("escola_id", turma.escola_id)
    .eq("professor_id", turma.professor_id);
  const rivais = (daEscola ?? []).filter((t) => mesmaSerie(t.serie, turma.serie));
  if (rivais.length < 2) return null;

  const hoje = hojeEmBrasilia();
  const agora = new Date().toISOString();
  const turmas = (
    await Promise.all(
      rivais.map(async (t) => {
        const temporada = await temporadaAtual(db, t.id);
        if (!temporada || temporada.inicio > hoje || hoje > ultimoDiaComPontos(temporada) || temporada.encerrada_em)
          return null;
        const [ranking, { count }] = await Promise.all([
          rankingDaTemporada(db, temporada),
          db
            .from("desafios")
            .select("id", { count: "exact", head: true })
            .eq("temporada_id", temporada.id)
            .lte("abre_em", agora),
        ]);
        if (ranking.length < ALUNOS_MINIMOS || !count) return null;
        return {
          turmaId: t.id as string,
          nome: t.nome as string,
          alunos: ranking.length,
          ...placarDaTurma(
            ranking.map((l) => l.pontos),
            count,
          ),
        };
      }),
    )
  ).filter((t) => t !== null);
  if (turmas.length < 2 || !turmas.some((t) => t.turmaId === turmaId)) return null;
  return { serie: turma.serie.trim(), turmas: ordenarDisputa(turmas) };
}

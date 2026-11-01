import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarRankingPublico, type EraId, type LinhaRankingPublico } from "./regras";

export type LinhaRankingComJogador = LinhaRankingPublico & { apelido: string; avatar: number; cor: number };

/** Partidas que valem ranking (a primeira de cada era, concluída). */
async function partidasDeRanking(db: SupabaseClient) {
  const { data } = await db
    .from("partidas_publicas")
    .select("jogador_id, era, pontos, iniciada_em, concluida_em, jogadores_publicos(apelido, avatar, cor)")
    .eq("vale_ranking", true)
    .not("concluida_em", "is", null)
    .limit(20000);
  return (data ?? []).map((p) => ({
    jogadorId: p.jogador_id as string,
    era: p.era as string,
    pontos: Number(p.pontos),
    duracaoMs: new Date(p.concluida_em as string).getTime() - new Date(p.iniciada_em as string).getTime(),
    jogador: p.jogadores_publicos as unknown as { apelido: string; avatar: number; cor: number } | null,
  }));
}

/** Ranking geral (era omitida) ou de uma era, com apelido e personagem. */
export async function rankingPublico(db: SupabaseClient, era?: EraId): Promise<LinhaRankingComJogador[]> {
  const partidas = await partidasDeRanking(db);
  const jogadores = new Map(partidas.map((p) => [p.jogadorId, p.jogador]));
  return montarRankingPublico(partidas, era).map((l) => {
    const j = jogadores.get(l.jogadorId);
    return { ...l, apelido: j?.apelido ?? "?", avatar: j?.avatar ?? 0, cor: j?.cor ?? 0 };
  });
}

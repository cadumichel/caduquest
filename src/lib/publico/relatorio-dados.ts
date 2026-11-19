import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lerPorIds, lerTudo } from "@/lib/paginar";
import type { AcessoRel, JogadorRel, PartidaRel, RespostaRel } from "./relatorio";

const COLUNAS_PARTIDA = "id, jogador_id, era, vale_ranking, iniciada_em, concluida_em, pontos";
const COLUNAS_RESPOSTA = "partida_id, questao_id, final, fracao, motivo_zerada";

/**
 * Tudo o que o relatório do desafio aberto usa. `db` é o cliente admin: as
 * tabelas públicas não têm política para o professor. Só quem passou por
 * exigirProfessor chega aqui.
 */
export async function dadosRelatorioPublico(db: SupabaseClient) {
  const [jogadores, partidas, acessos] = await Promise.all([
    lerTudo<JogadorRel>((de, ate) =>
      db
        .from("jogadores_publicos")
        .select("id, apelido, avatar, cor, criado_em, ultimo_acesso")
        .order("id")
        .range(de, ate),
    ),
    lerTudo<PartidaRel>((de, ate) => db.from("partidas_publicas").select(COLUNAS_PARTIDA).order("id").range(de, ate)),
    // Antes de rodar o SQL a tabela não existe: o relatório sai sem acessos.
    lerTudo<AcessoRel>((de, ate) =>
      db.from("acessos_publicos").select("jogador_id, dia").order("jogador_id").order("dia").range(de, ate),
    ).catch(() => null),
  ]);
  return { jogadores, partidas, acessos: acessos ?? [], semTabelaAcessos: acessos === null };
}

/** Respostas de uma lista de partidas. */
export const respostasDasPartidas = (db: SupabaseClient, partidas: string[]) =>
  lerPorIds<RespostaRel>(db, "respostas_publicas", COLUNAS_RESPOSTA, "partida_id", partidas);

/** Um jogador e as partidas dele. */
export async function dadosJogadorPublico(db: SupabaseClient, jogadorId: string) {
  const [{ data: jogador }, { data: partidas }, acessos] = await Promise.all([
    db
      .from("jogadores_publicos")
      .select("id, apelido, avatar, cor, criado_em, ultimo_acesso")
      .eq("id", jogadorId)
      .maybeSingle(),
    db.from("partidas_publicas").select(COLUNAS_PARTIDA).eq("jogador_id", jogadorId),
    db
      .from("acessos_publicos")
      .select("dia")
      .eq("jogador_id", jogadorId)
      .then((r) => (r.error ? [] : (r.data as { dia: string }[]))),
  ]);
  if (!jogador) return null;
  const lista = (partidas ?? []) as PartidaRel[];
  const respostas = await respostasDasPartidas(
    db,
    lista.map((p) => p.id),
  );
  return { jogador: jogador as JogadorRel, partidas: lista, respostas, dias: acessos.map((a) => a.dia).sort() };
}

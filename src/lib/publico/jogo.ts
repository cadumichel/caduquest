import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { arredondarPontos } from "@/lib/pontos";
import { montarVista } from "@/lib/questoes/apresentacao";
import { corrigir, tempoEsgotado } from "@/lib/questoes/correcao";
import { permutacaoAleatoria } from "@/lib/questoes/embaralhar";
import { tamanhoPermutacao, type Conteudo, type Resposta, type Vista } from "@/lib/questoes/tipos";
import { AVISO_ZERADA, type MotivoZerada } from "@/lib/tela-protegida";
import { urlImagem } from "@/lib/tipos-banco";
import {
  ehFinal,
  ERAS,
  QUESTOES_FINAIS,
  QUESTOES_POR_PARTIDA,
  pontosPublicos,
  sortearQuestoes,
  type EraId,
} from "./regras";
import type { JogadorSessao } from "./sessao";

export type Partida = {
  id: string;
  jogador_id: string;
  era: EraId;
  ordem: string[];
  indice_atual: number;
  vale_ranking: boolean;
  iniciada_em: string;
  concluida_em: string | null;
  pontos: number;
};

export type RespostaPublica = {
  id: string;
  partida_id: string;
  questao_id: string;
  posicao: number;
  final: boolean;
  permutacao: number[];
  servida_em: string;
  respondida_em: string | null;
  resposta: Resposta | null;
  fracao: number | null;
  pontos: number | null;
  tempo_esgotado: boolean;
  motivo_zerada: MotivoZerada | null;
};

export type QuestaoPublica = {
  id: string;
  enunciado: string;
  imagemUrl: string | null;
  vista: Vista;
  tempoLimite: number;
  restanteMs: number;
  relampago: boolean;
};

export type EstadoPartida =
  | {
      fase: "questao";
      questao: QuestaoPublica;
      posicao: number;
      total: number;
      final: boolean;
      pontos: number;
      aviso?: string;
    }
  /** Antes da rodada final: o jogador lê as regras e decide quando começar. */
  | { fase: "aviso_final"; pontos: number; aviso?: string }
  | { fase: "fim"; aviso?: string }
  | { fase: "erro"; mensagem: string };

type QuestaoBanco = {
  id: string;
  tipo: Conteudo["tipo"];
  enunciado: string;
  imagem_path: string | null;
  tempo_limite_s: number;
  relampago?: boolean;
  conteudo: Conteudo["conteudo"];
};

const comoConteudo = (q: QuestaoBanco) => ({ tipo: q.tipo, conteudo: q.conteudo }) as Conteudo;

/** Questões publicadas de cada era, para saber quais desafios já podem abrir. */
export async function questoesPorEra(db: SupabaseClient): Promise<Record<EraId, number>> {
  const contagem = Object.fromEntries(ERAS.map((e) => [e.id, 0])) as Record<EraId, number>;
  const { data } = await db
    .from("questoes")
    .select("era_publica")
    .eq("status", "publicada")
    .not("era_publica", "is", null);
  for (const q of data ?? []) {
    const era = q.era_publica as EraId;
    if (era in contagem) contagem[era]++;
  }
  return contagem;
}

/** Partidas do jogador, da mais recente para a mais antiga. */
export async function partidasDoJogador(db: SupabaseClient, jogadorId: string): Promise<Partida[]> {
  const { data } = await db
    .from("partidas_publicas")
    .select("*")
    .eq("jogador_id", jogadorId)
    .order("iniciada_em", { ascending: false });
  return (data ?? []) as Partida[];
}

export async function partidaDoJogador(db: SupabaseClient, jogadorId: string, partidaId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(partidaId)) return null;
  const { data } = await db
    .from("partidas_publicas")
    .select("*")
    .eq("id", partidaId)
    .eq("jogador_id", jogadorId)
    .maybeSingle();
  return (data as Partida | null) ?? null;
}

async function partidaEmAndamento(db: SupabaseClient, jogadorId: string, era: EraId) {
  const { data } = await db
    .from("partidas_publicas")
    .select("*")
    .eq("jogador_id", jogadorId)
    .eq("era", era)
    .is("concluida_em", null)
    .maybeSingle();
  return (data as Partida | null) ?? null;
}

/**
 * Começa uma partida da era (ou devolve a que está em andamento). A primeira
 * partida de cada era vale para o ranking; as seguintes são treino.
 */
export async function comecarPartida(
  db: SupabaseClient,
  jogador: JogadorSessao,
  era: EraId,
): Promise<{ partidaId: string } | { erro: string }> {
  const andamento = await partidaEmAndamento(db, jogador.id, era);
  if (andamento) return { partidaId: andamento.id };

  const { data: banco } = await db.from("questoes").select("id, tipo").eq("era_publica", era).eq("status", "publicada");
  if ((banco ?? []).length < QUESTOES_POR_PARTIDA)
    return { erro: "Este desafio ainda está sendo preparado. Volte em breve!" };

  const anteriores = (await partidasDoJogador(db, jogador.id)).filter((p) => p.era === era);
  const vistas = new Set(anteriores.flatMap((p) => p.ordem));
  const ordem = sortearQuestoes(banco ?? [], QUESTOES_POR_PARTIDA, vistas);
  const { data: nova, error } = await db
    .from("partidas_publicas")
    .insert({ jogador_id: jogador.id, era, ordem, vale_ranking: !anteriores.some((p) => p.vale_ranking) })
    .select("id")
    .single();
  if (error || !nova) {
    // Dois cliques ao mesmo tempo: a outra requisição criou primeiro.
    const outra = await partidaEmAndamento(db, jogador.id, era);
    return outra ? { partidaId: outra.id } : { erro: "Não foi possível começar. Tente de novo." };
  }
  return { partidaId: nova.id };
}

async function carregarQuestao(db: SupabaseClient, id: string): Promise<QuestaoBanco> {
  const { data, error } = await db.from("questoes").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Questão não encontrada");
  return data as QuestaoBanco;
}

async function recalcularPartida(db: SupabaseClient, partida: Partida, novoIndice: number) {
  const { data: respostas } = await db.from("respostas_publicas").select("pontos").eq("partida_id", partida.id);
  const pontos = arredondarPontos((respostas ?? []).reduce((s, r) => s + Number(r.pontos ?? 0), 0));
  await db
    .from("partidas_publicas")
    .update({
      indice_atual: novoIndice,
      pontos,
      concluida_em: novoIndice >= partida.ordem.length ? new Date().toISOString() : null,
    })
    .eq("id", partida.id)
    .eq("indice_atual", partida.indice_atual);
}

/**
 * Grava a resposta (ou o tempo esgotado). Só a primeira gravação vale.
 * Na rodada final, sair da tela, apertar tecla ou clicar fora zera a questão.
 */
async function registrar(
  db: SupabaseClient,
  partida: Partida,
  linha: RespostaPublica,
  questao: QuestaoBanco,
  resposta: Resposta | null,
  saidasTela: number,
  motivo: MotivoZerada | null,
): Promise<MotivoZerada | null> {
  const agora = new Date();
  const servida = new Date(linha.servida_em);
  const esgotado = tempoEsgotado(servida, agora, questao.tempo_limite_s);
  const causa = esgotado || !linha.final ? null : (motivo ?? (saidasTela > 0 ? "saida" : null));
  const fracao = esgotado || causa ? 0 : corrigir(comoConteudo(questao), linha.permutacao, resposta);
  const pontos = pontosPublicos(fracao, agora.getTime() - servida.getTime(), questao.tempo_limite_s, linha.final);
  const { data: gravada } = await db
    .from("respostas_publicas")
    .update({
      respondida_em: agora.toISOString(),
      resposta,
      fracao,
      pontos,
      tempo_esgotado: esgotado,
      motivo_zerada: causa,
      saidas_tela: Math.max(0, Math.min(saidasTela, 999)),
    })
    .eq("id", linha.id)
    .is("respondida_em", null)
    .select("id");
  if (gravada?.length) await recalcularPartida(db, partida, partida.indice_atual + 1);
  return gravada?.length ? causa : null;
}

/**
 * Estado atual da partida, servindo a próxima questão se preciso. Antes da
 * rodada final, para no aviso até o jogador pedir para começar. Questão com o
 * tempo estourado (o jogador saiu e voltou) vale zero e o jogo avança.
 */
export async function estadoPartida(
  db: SupabaseClient,
  jogador: JogadorSessao,
  partidaId: string,
  iniciarFinal = false,
): Promise<EstadoPartida> {
  for (let guarda = 0; guarda < 50; guarda++) {
    const partida = await partidaDoJogador(db, jogador.id, partidaId);
    if (!partida) return { fase: "erro", mensagem: "Partida não encontrada." };
    if (partida.concluida_em || partida.indice_atual >= partida.ordem.length) return { fase: "fim" };

    const indice = partida.indice_atual;
    const final = ehFinal(indice);
    const questaoId = partida.ordem[indice];
    const { data: existente } = await db
      .from("respostas_publicas")
      .select("*")
      .eq("partida_id", partida.id)
      .eq("questao_id", questaoId)
      .maybeSingle();
    let linha = existente as RespostaPublica | null;
    if (linha?.respondida_em) {
      await recalcularPartida(db, partida, indice + 1);
      continue;
    }
    if (!linha && indice === QUESTOES_POR_PARTIDA - QUESTOES_FINAIS && !iniciarFinal) {
      return { fase: "aviso_final", pontos: Number(partida.pontos) };
    }

    const questao = await carregarQuestao(db, questaoId);
    if (!linha) {
      const { data: nova } = await db
        .from("respostas_publicas")
        .upsert(
          {
            partida_id: partida.id,
            questao_id: questaoId,
            posicao: indice,
            final,
            permutacao: permutacaoAleatoria(tamanhoPermutacao(comoConteudo(questao))),
          },
          { onConflict: "partida_id,questao_id", ignoreDuplicates: true },
        )
        .select("*");
      linha = (nova?.[0] as RespostaPublica | undefined) ?? null;
      if (!linha) continue; // outra aba criou: relê
    }

    const agora = new Date();
    if (tempoEsgotado(new Date(linha.servida_em), agora, questao.tempo_limite_s)) {
      await registrar(db, partida, linha, questao, null, 0, null);
      continue;
    }
    const decorrido = agora.getTime() - new Date(linha.servida_em).getTime();
    return {
      fase: "questao",
      posicao: indice + 1,
      total: partida.ordem.length,
      final: linha.final,
      pontos: Number(partida.pontos),
      questao: {
        id: questao.id,
        enunciado: questao.enunciado,
        imagemUrl: urlImagem(questao.imagem_path),
        vista: montarVista(comoConteudo(questao), linha.permutacao),
        tempoLimite: questao.tempo_limite_s,
        restanteMs: Math.max(0, questao.tempo_limite_s * 1000 - decorrido),
        relampago: Boolean(questao.relampago),
      },
    };
  }
  return { fase: "erro", mensagem: "Não foi possível carregar a questão. Tente de novo." };
}

export async function responderPartida(
  db: SupabaseClient,
  jogador: JogadorSessao,
  partidaId: string,
  questaoId: string,
  resposta: Resposta | null,
  saidasTela: number,
  motivo: MotivoZerada | null,
): Promise<EstadoPartida> {
  const partida = await partidaDoJogador(db, jogador.id, partidaId);
  if (!partida) return { fase: "erro", mensagem: "Partida não encontrada." };

  let zerada: MotivoZerada | null = null;
  if (!partida.concluida_em && partida.ordem[partida.indice_atual] === questaoId) {
    const { data: linha } = await db
      .from("respostas_publicas")
      .select("*")
      .eq("partida_id", partida.id)
      .eq("questao_id", questaoId)
      .maybeSingle();
    if (linha && !linha.respondida_em) {
      const questao = await carregarQuestao(db, questaoId);
      zerada = await registrar(db, partida, linha as RespostaPublica, questao, resposta, saidasTela, motivo);
    }
  }
  const estado = await estadoPartida(db, jogador, partidaId);
  if (zerada && estado.fase !== "erro") estado.aviso = AVISO_ZERADA[zerada];
  return estado;
}

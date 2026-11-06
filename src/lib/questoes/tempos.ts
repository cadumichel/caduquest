/**
 * Tempo de resposta de cada questão num desafio e da verificação de leitura.
 * Campo vazio = automático: vale o tempo da própria questão (o padrão do tipo
 * ou o que o professor escreveu nela) e 15 s na verificação.
 */
import { RELAMPAGO_MAX_S, RELAMPAGO_MIN_S } from "./relampago";
import { TEMPO_MAX_S, TEMPO_MIN_S } from "./tipos";
import { VERIFICACAO_TEMPO_S } from "./verificacao";

/** Limites do tempo da verificação: curta, só para marcar o tema. */
export const VERIFICACAO_MIN_S = 5;
export const VERIFICACAO_MAX_S = 60;

export type TemposQuestao = {
  /** Tempo da própria questão (banco de questões). */
  daQuestao: number;
  relampago?: boolean;
  /** Tempo escrito para esta questão neste desafio (null = automático). */
  noDesafio?: number | null;
  /** Tempo único do desafio para todas (null = o de cada questão). */
  fixoDoDesafio?: number | null;
};

/**
 * Ordem: o tempo escrito para a questão no desafio vence; depois o tempo único
 * do desafio (a relâmpago nunca ganha mais que o seu próprio); depois o da questão.
 */
export function tempoEfetivo({ daQuestao, relampago, noDesafio, fixoDoDesafio }: TemposQuestao): number {
  if (noDesafio != null) return noDesafio;
  if (fixoDoDesafio == null) return daQuestao;
  return relampago ? Math.min(fixoDoDesafio, daQuestao) : fixoDoDesafio;
}

export const tempoVerificacao = (desafio: { tempo_verificacao_s?: number | null }) =>
  desafio.tempo_verificacao_s ?? VERIFICACAO_TEMPO_S;

/** Problema com o tempo escrito para uma questão no desafio, ou null. */
export function problemaTempoQuestao(segundos: number, relampago: boolean): string | null {
  if (!Number.isInteger(segundos)) return "Use um número inteiro de segundos.";
  if (relampago && (segundos < RELAMPAGO_MIN_S || segundos > RELAMPAGO_MAX_S)) {
    return `Questão relâmpago: de ${RELAMPAGO_MIN_S} a ${RELAMPAGO_MAX_S} s.`;
  }
  if (segundos < TEMPO_MIN_S || segundos > TEMPO_MAX_S) return `De ${TEMPO_MIN_S} a ${TEMPO_MAX_S} s.`;
  return null;
}

export function problemaTempoVerificacao(segundos: number): string | null {
  if (!Number.isInteger(segundos) || segundos < VERIFICACAO_MIN_S || segundos > VERIFICACAO_MAX_S) {
    return `Verificação de leitura: de ${VERIFICACAO_MIN_S} a ${VERIFICACAO_MAX_S} s.`;
  }
  return null;
}

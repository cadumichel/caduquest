import type { Conteudo, TipoQuestao } from "./tipos";

/**
 * Questão relâmpago: pergunta direta, sem texto motivador, para responder em
 * 5 a 20 segundos. O app sugere o tempo pelo tamanho do que o aluno precisa
 * ler; o professor ajusta dentro da faixa.
 */

export const RELAMPAGO_MIN_S = 5;
export const RELAMPAGO_MAX_S = 20;

/** Formatos que cabem em poucos segundos: uma decisão sobre itens curtos. */
export const TIPOS_RELAMPAGO: readonly TipoQuestao[] = ["multipla_escolha", "intruso", "quem_disse", "vf_bloco"];

export const LIMITE_ENUNCIADO = 180;
export const LIMITE_ITEM = 90;
export const LIMITE_CITACAO = 160;
/** Enunciado + itens somados: acima disso não dá para ler em 20 s. */
export const LIMITE_TOTAL = 320;
export const MAX_AFIRMATIVAS = 4;

/** Caracteres lidos por segundo por um aluno do fundamental II, com folga para pensar. */
const CARACTERES_POR_S = 17;

/** Pedido de leitura de um texto de apoio: é o que o relâmpago não pode ter. */
const TEXTO_MOTIVADOR =
  /\b(leia|releia|analise|considere|observe|com base n[oa]s?|de acordo com|segundo [oa]s?|conforme|a partir d[oa]s?)\b[^.?!]{0,40}\b(texto|trecho|fragmento|excerto|documento|cita[çc][ãa]o|poema|letra|reportagem|not[íi]cia|passagem)\b/i;

/** Itens que o aluno lê além do enunciado. */
export function itensDaQuestao(c: Conteudo): string[] {
  switch (c.tipo) {
    case "multipla_escolha":
    case "interpretacao":
      return c.conteudo.alternativas;
    case "intruso":
      return c.conteudo.itens;
    case "quem_disse":
      return [c.conteudo.citacao, ...c.conteudo.autores];
    case "vf_bloco":
      return c.conteudo.afirmativas.map((a) => a.texto);
    default:
      return [];
  }
}

const tamanho = (s: string) => s.trim().length;

/** Tempo sugerido, em segundos: leitura + meio segundo por item + 3 s se tiver imagem. */
export function sugerirTempoRelampago(enunciado: string, conteudo: Conteudo, temImagem = false): number {
  const itens = itensDaQuestao(conteudo);
  const caracteres = tamanho(enunciado) + itens.reduce((s, i) => s + tamanho(i), 0);
  // No V ou F cada afirmativa é uma decisão: pesa mais que escolher uma alternativa.
  const porItem = conteudo.tipo === "vf_bloco" ? 1.5 : 0.5;
  const bruto = 2 + caracteres / CARACTERES_POR_S + itens.length * porItem + (temImagem ? 3 : 0);
  return Math.min(RELAMPAGO_MAX_S, Math.max(RELAMPAGO_MIN_S, Math.round(bruto)));
}

/**
 * Problemas que impedem a questão de ser relâmpago (vazio = pode).
 * O primeiro é o que o editor e o conector mostram.
 */
export function problemasRelampago(enunciado: string, conteudo: Conteudo, tempo: number): string[] {
  const problemas: string[] = [];
  if (!TIPOS_RELAMPAGO.includes(conteudo.tipo)) {
    problemas.push("Relâmpago só em múltipla escolha, intruso, quem disse ou V ou F com até 4 afirmativas.");
    return problemas;
  }
  const e = enunciado.trim();
  if (/\n\s*\S/.test(e)) problemas.push("Relâmpago: enunciado direto, num parágrafo só, sem texto de apoio.");
  if (TEXTO_MOTIVADOR.test(e))
    problemas.push("Relâmpago não usa texto motivador: pergunte direto, sem pedir para ler um texto.");
  if (e.length > LIMITE_ENUNCIADO) {
    problemas.push(`Relâmpago: enunciado de até ${LIMITE_ENUNCIADO} caracteres (está com ${e.length}).`);
  }
  if (conteudo.tipo === "quem_disse" && tamanho(conteudo.conteudo.citacao) > LIMITE_CITACAO) {
    problemas.push(`Relâmpago: citação de até ${LIMITE_CITACAO} caracteres.`);
  }
  if (conteudo.tipo === "vf_bloco" && conteudo.conteudo.afirmativas.length > MAX_AFIRMATIVAS) {
    problemas.push(`Relâmpago: no máximo ${MAX_AFIRMATIVAS} afirmativas.`);
  }
  const itens = conteudo.tipo === "quem_disse" ? conteudo.conteudo.autores : itensDaQuestao(conteudo);
  if (itens.some((i) => tamanho(i) > LIMITE_ITEM)) {
    problemas.push(`Relâmpago: cada alternativa ou item com até ${LIMITE_ITEM} caracteres.`);
  }
  const total = tamanho(e) + itensDaQuestao(conteudo).reduce((s, i) => s + tamanho(i), 0);
  if (total > LIMITE_TOTAL) {
    problemas.push(
      `Relâmpago: texto longo demais para ler em ${RELAMPAGO_MAX_S} s (${total} de ${LIMITE_TOTAL} caracteres, somando enunciado e itens).`,
    );
  }
  if (!Number.isInteger(tempo) || tempo < RELAMPAGO_MIN_S || tempo > RELAMPAGO_MAX_S) {
    problemas.push(`Relâmpago: tempo de ${RELAMPAGO_MIN_S} a ${RELAMPAGO_MAX_S} segundos.`);
  }
  return problemas;
}

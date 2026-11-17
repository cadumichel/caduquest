/**
 * Investigue: o aluno pesquisa e digita a resposta. Vale qualquer resposta da
 * lista de aceitas, sem diferença de maiúsculas, acentos, pontuação e artigo
 * no começo, tolerando letras trocadas (1 em palavras médias, 2 nas longas).
 */

const ARTIGOS = /^(o|a|os|as|um|uma|uns|umas|the)\s+/;

export function normalizarDigitado(t: string): string {
  return t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(ARTIGOS, "")
    .replace(/\s+/g, " ");
}

/** Letras trocadas, faltando ou sobrando (distância de Levenshtein). */
export function distanciaLetras(a: string, b: string): number {
  if (a === b) return 0;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

/** Quantas letras erradas a resposta aceita tolera, pelo tamanho dela. */
export const toleranciaLetras = (tamanho: number) => (tamanho <= 4 ? 0 : tamanho <= 9 ? 1 : 2);

export function respostaAceita(digitado: string, aceitas: readonly string[]): boolean {
  const d = normalizarDigitado(digitado);
  if (!d) return false;
  return aceitas.some((a) => {
    const n = normalizarDigitado(a);
    return n.length > 0 && distanciaLetras(d, n) <= toleranciaLetras(n.length);
  });
}

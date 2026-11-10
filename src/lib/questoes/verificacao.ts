/**
 * Verificação de leitura: em algumas questões, logo depois de responder, o
 * aluno marca qual era o tema da questão. Errou (ou deixou o tempo acabar),
 * a questão vale zero. A verificação não pontua sozinha.
 */

/** A cada bloco de 10 questões, 2 têm verificação, em posições sorteadas. */
export const BLOCO_VERIFICACAO = 10;
export const VERIFICACOES_POR_BLOCO = 2;
/** Tempo para escolher o tema (o servidor dá a folga de sempre). */
export const VERIFICACAO_TEMPO_S = 15;
/** Alternativas erradas: temas de outras questões. */
export const DISTRATORES_VERIFICACAO = 3;

export const PERGUNTA_VERIFICACAO = "Qual era o tema da questão que você acabou de responder?";
export const AVISO_VERIFICACAO = "Você errou a verificação de leitura, então a questão anterior valeu zero.";

/** Para comparar temas sem ligar para maiúsculas, acentos e espaços. */
export const chaveTema = (t: string) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Quantas verificações o professor pode pedir num desafio (0 = nenhuma). */
export const VERIFICACOES_MIN = 0;
export const VERIFICACOES_MAX = 15;

export const problemaVerificacoes = (n: number) =>
  !Number.isInteger(n) || n < VERIFICACOES_MIN || n > VERIFICACOES_MAX
    ? `Questões teste: de ${VERIFICACOES_MIN} a ${VERIFICACOES_MAX}.`
    : null;

/** Quantas verificações o automático dá num desafio de `total` questões (2 a cada 10). */
export function verificacoesAutomaticas(total: number) {
  let n = 0;
  for (let inicio = 0; inicio < total; inicio += BLOCO_VERIFICACAO) {
    n += Math.round(
      ((Math.min(total, inicio + BLOCO_VERIFICACAO) - inicio) * VERIFICACOES_POR_BLOCO) / BLOCO_VERIFICACAO,
    );
  }
  return n;
}

/**
 * Sorteia as posições com verificação. Só entram as posições elegíveis
 * (questão com tema e que não é relâmpago).
 *
 * `quantas` = número escolhido pelo professor para o desafio: as elegíveis
 * são divididas em faixas iguais e sai uma de cada faixa, para as
 * verificações ficarem espalhadas. Sem número (null), o automático: 2 a cada
 * bloco de 10 (num bloco final menor, a mesma proporção, arredondada).
 */
export function sortearVerificacoes(
  elegiveis: readonly boolean[],
  aleatorio: () => number = Math.random,
  quantas: number | null = null,
): number[] {
  const escolhidas: number[] = [];
  if (quantas !== null) {
    const candidatas = elegiveis.flatMap((ok, i) => (ok ? [i] : []));
    const k = Math.max(0, Math.min(Math.floor(quantas), candidatas.length));
    for (let g = 0; g < k; g++) {
      const de = Math.floor((g * candidatas.length) / k);
      const ate = Math.floor(((g + 1) * candidatas.length) / k);
      escolhidas.push(candidatas[de + Math.floor(aleatorio() * (ate - de))]);
    }
    return escolhidas.sort((a, b) => a - b);
  }
  for (let inicio = 0; inicio < elegiveis.length; inicio += BLOCO_VERIFICACAO) {
    const fim = Math.min(elegiveis.length, inicio + BLOCO_VERIFICACAO);
    const quantasNoBloco = Math.round(((fim - inicio) * VERIFICACOES_POR_BLOCO) / BLOCO_VERIFICACAO);
    const candidatas: number[] = [];
    for (let i = inicio; i < fim; i++) if (elegiveis[i]) candidatas.push(i);
    for (let k = 0; k < quantasNoBloco && candidatas.length; k++) {
      escolhidas.push(candidatas.splice(Math.floor(aleatorio() * candidatas.length), 1)[0]);
    }
  }
  return escolhidas.sort((a, b) => a - b);
}

/**
 * Monta as alternativas: o tema real e 3 temas de outras questões, sem repetir.
 * `fontes` vem em ordem de preferência (primeiro as do desafio, depois as do
 * capítulo no banco); dentro de cada fonte a escolha é sorteada.
 * null = não há temas diferentes suficientes.
 */
export function montarOpcoesVerificacao(
  real: string,
  fontes: readonly (readonly (string | null | undefined)[])[],
  aleatorio: () => number = Math.random,
): { opcoes: string[]; correta: number } | null {
  const tema = real.trim();
  if (!tema) return null;
  const usadas = new Set([chaveTema(tema)]);
  const distratores: string[] = [];
  for (const fonte of fontes) {
    const lista = fonte.map((t) => t?.trim() ?? "").filter(Boolean);
    while (lista.length && distratores.length < DISTRATORES_VERIFICACAO) {
      const t = lista.splice(Math.floor(aleatorio() * lista.length), 1)[0];
      const chave = chaveTema(t);
      if (usadas.has(chave)) continue;
      usadas.add(chave);
      distratores.push(t);
    }
  }
  if (distratores.length < DISTRATORES_VERIFICACAO) return null;
  const correta = Math.floor(aleatorio() * (DISTRATORES_VERIFICACAO + 1));
  const opcoes = [...distratores];
  opcoes.splice(correta, 0, tema);
  return { opcoes, correta };
}

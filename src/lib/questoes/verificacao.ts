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

/**
 * Sorteia as posições com verificação: 2 a cada bloco de 10 (num bloco final
 * menor, a mesma proporção, arredondada). Só entram as posições elegíveis
 * (questão com tema e que não é relâmpago).
 */
export function sortearVerificacoes(elegiveis: readonly boolean[], aleatorio: () => number = Math.random): number[] {
  const escolhidas: number[] = [];
  for (let inicio = 0; inicio < elegiveis.length; inicio += BLOCO_VERIFICACAO) {
    const fim = Math.min(elegiveis.length, inicio + BLOCO_VERIFICACAO);
    const quantas = Math.round(((fim - inicio) * VERIFICACOES_POR_BLOCO) / BLOCO_VERIFICACAO);
    const candidatas: number[] = [];
    for (let i = inicio; i < fim; i++) if (elegiveis[i]) candidatas.push(i);
    for (let k = 0; k < quantas && candidatas.length; k++) {
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

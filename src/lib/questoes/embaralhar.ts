/** Fisher–Yates. `aleatorio` é injetável para testes. */
export function embaralhar<T>(itens: readonly T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Permutação aleatória de 0..n-1: posição exibida -> índice original. */
export function permutacaoAleatoria(n: number, aleatorio: () => number = Math.random): number[] {
  return embaralhar(
    Array.from({ length: n }, (_, i) => i),
    aleatorio,
  );
}

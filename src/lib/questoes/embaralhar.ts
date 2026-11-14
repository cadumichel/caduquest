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

/** A permutação devolvida pelo aluno é mesmo uma permutação de 0..n-1? */
export function permutacaoValida(permutacao: unknown, n: number): permutacao is number[] {
  return (
    Array.isArray(permutacao) &&
    permutacao.length === n &&
    new Set(permutacao).size === n &&
    permutacao.every((i) => Number.isInteger(i) && i >= 0 && i < n)
  );
}

/** Formatos em que a explicação cita as alternativas pela letra ("B) ..."). */
const TIPOS_COM_LETRAS = ["multipla_escolha", "interpretacao", "quem_disse"];

/**
 * Permutação para o treino e a revisão, que não valem ranking: nos formatos
 * com letras as alternativas ficam na ordem original, para as letras da
 * questão baterem com as do gabarito e da explicação. Os outros formatos
 * (ordenar, ligar pares...) continuam embaralhados, senão a resposta apareceria pronta.
 */
export function permutacaoSemRanking(tipo: string, n: number, aleatorio: () => number = Math.random): number[] {
  return TIPOS_COM_LETRAS.includes(tipo) ? Array.from({ length: n }, (_, i) => i) : permutacaoAleatoria(n, aleatorio);
}

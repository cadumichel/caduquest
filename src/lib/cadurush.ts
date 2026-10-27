/** Regras do CaduRush, o desafio relâmpago feito em sala. */

export const PONTOS_RELAMPAGO = 30;
export const DURACAO_PADRAO_MIN = 45;

// Sem letras e números que se confundem no projetor (0/O, 1/I/L, 2/Z, 5/S, 8/B).
const ALFABETO = "ACDEFGHJKMNPQRTUVWXY34679";

export function gerarCodigoDia(aleatorio: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => ALFABETO[Math.floor(aleatorio() * ALFABETO.length)]).join("");
}

/** Compara o código digitado pelo aluno, sem diferenciar maiúsculas nem espaços. */
export function codigoConfere(digitado: string | null | undefined, codigo: string | null | undefined): boolean {
  if (!codigo) return true;
  return (digitado ?? "").replace(/\s/g, "").toUpperCase() === codigo;
}

/** "Liberar agora": abre já e mantém a duração planejada (mínimo de 5 min). */
export function janelaLiberadaAgora(abre: string, fecha: string, agora = new Date()) {
  const duracao = Math.max(5 * 60_000, new Date(fecha).getTime() - new Date(abre).getTime());
  return { abre_em: agora.toISOString(), fecha_em: new Date(agora.getTime() + duracao).toISOString() };
}

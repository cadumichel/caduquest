import type { ConteudoDetalheImagem, ConteudoEnquantoIsso } from "./tipos";

/**
 * Detalhe na imagem: o aluno toca no ponto da imagem pedido no enunciado.
 * A área certa é um círculo (centro x, y e raio em % da largura); como a
 * imagem nem sempre é quadrada, na altura o raio é corrigido pela proporção.
 */

/** Raio da área na altura, em % da altura da imagem. */
export const raioNaAltura = (c: Pick<ConteudoDetalheImagem, "raio" | "proporcao">) => c.raio * (c.proporcao ?? 1);

export function dentroDaArea(c: ConteudoDetalheImagem, ponto: { x: number; y: number } | null): boolean {
  if (!ponto) return false;
  const dx = (ponto.x - c.x) / c.raio;
  const dy = (ponto.y - c.y) / raioNaAltura(c);
  return dx * dx + dy * dy <= 1;
}

/** Quartos da imagem: 0 = cima à esquerda, 1 = cima à direita, 2 = baixo à esquerda, 3 = baixo à direita. */
export const quartoDoPonto = (p: { x: number; y: number }) => (p.y < 50 ? 0 : 2) + (p.x < 50 ? 0 : 1);

/** O quarto encosta na área certa? (pela caixa em volta do círculo: na dúvida, não é eliminado) */
function quartoTocaArea(c: ConteudoDetalheImagem, q: number): boolean {
  const [x0, y0] = [q % 2 ? 50 : 0, q < 2 ? 0 : 50];
  const ry = raioNaAltura(c);
  return c.x + c.raio > x0 && c.x - c.raio < x0 + 50 && c.y + ry > y0 && c.y - ry < y0 + 50;
}

/** Eliminações do detalhe: esconde um quarto sem a área certa, até 2 quartos (sempre sobra metade). */
export const MAX_QUARTOS_ESCONDIDOS = 2;
export function candidatasDetalhe(c: ConteudoDetalheImagem, eliminadas: readonly number[]): number[] {
  if (eliminadas.length >= MAX_QUARTOS_ESCONDIDOS) return [];
  return [0, 1, 2, 3].filter((q) => !eliminadas.includes(q) && !quartoTocaArea(c, q));
}

/**
 * Enquanto isso…: cada evento vai para uma célula da grade (linha × período).
 * Célula = linha × nº de períodos + período. Acertar a linha vale meio ponto
 * do evento; acertar o período, a outra metade.
 */
export const celulaDoEvento = (c: ConteudoEnquantoIsso, e: { linha: number; periodo: number }) =>
  e.linha * c.periodos.length + e.periodo;

export function notaEvento(c: ConteudoEnquantoIsso, e: { linha: number; periodo: number }, celula: number | null) {
  if (celula === null || celula < 0 || celula >= 2 * c.periodos.length) return 0;
  const p = c.periodos.length;
  return (Math.floor(celula / p) === e.linha ? 0.5 : 0) + (celula % p === e.periodo ? 0.5 : 0);
}

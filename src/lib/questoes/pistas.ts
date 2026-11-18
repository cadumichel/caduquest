import type { Vista } from "./tipos";

/**
 * Quem sou eu? (pistas): as pistas abrem uma a uma, da mais difícil para a mais
 * fácil. Quem arrisca com menos pistas ganha mais: com 5 pistas, acertar na 1ª
 * vale 100%, na 2ª 80% ... na 5ª 20%. Só se arrisca uma vez.
 */

/** Fração da nota por acertar com `abertas` pistas de `total`. */
export function fatorPistas(abertas: number, total: number): number {
  if (total <= 0) return 1;
  const a = Math.max(1, Math.min(Math.floor(abertas) || 1, total));
  return (total - a + 1) / total;
}

/** Pistas abertas gravadas no servidor (a primeira já vem aberta). */
export function pistasGravadas(resposta: unknown): number {
  const r = resposta as { tipo?: string; pistas?: unknown } | null;
  const n = r?.tipo === "quem_sou_eu" && typeof r.pistas === "number" ? Math.floor(r.pistas) : 1;
  return Math.max(1, n);
}

/** Vista do desafio: só as pistas já abertas chegam à tela. */
export function vistaComPistas(vista: Vista, abertas: number): Vista {
  if (vista.tipo !== "quem_sou_eu") return vista;
  return { ...vista, pistas: vista.pistas.slice(0, Math.max(1, Math.min(abertas, vista.total))) };
}

import type { Conteudo } from "./tipos";

/** Cota de cada aluno por temporada. */
export const ELIMINACOES_POR_TEMPORADA = 6;
export const DICAS_POR_TEMPORADA = 3;
/** Eliminar nunca deixa menos que isto de alternativas na tela. */
export const MINIMO_ALTERNATIVAS = 2;

/** Tipos de uma resposta só, em que dá para eliminar alternativas erradas. */
type Eliminavel = Extract<Conteudo, { tipo: "multipla_escolha" | "interpretacao" | "quem_disse" | "intruso" }>;

function eliminavel(c: Conteudo): c is Eliminavel {
  return c.tipo === "multipla_escolha" || c.tipo === "interpretacao" || c.tipo === "quem_disse" || c.tipo === "intruso";
}

/** Total de opções e índice (original) da certa; null se o tipo não aceita eliminação. */
function opcoes(c: Conteudo): { total: number; certa: number } | null {
  if (!eliminavel(c)) return null;
  switch (c.tipo) {
    case "multipla_escolha":
    case "interpretacao":
      return { total: c.conteudo.alternativas.length, certa: c.conteudo.correta };
    case "quem_disse":
      return { total: c.conteudo.autores.length, certa: c.conteudo.correta };
    case "intruso":
      return { total: c.conteudo.itens.length, certa: c.conteudo.intruso };
  }
}

/** Alternativas erradas que ainda podem sair, respeitando o mínimo na tela. */
export function candidatasEliminacao(c: Conteudo, eliminadas: number[]): number[] {
  const o = opcoes(c);
  if (!o) return [];
  const ja = new Set(eliminadas);
  if (o.total - ja.size <= MINIMO_ALTERNATIVAS) return [];
  return Array.from({ length: o.total }, (_, i) => i).filter((i) => i !== o.certa && !ja.has(i));
}

/** Converte índices originais eliminados para as posições na tela deste aluno. */
export function eliminadasNaVista(permutacao: number[], eliminadas: number[]): number[] {
  const ja = new Set(eliminadas);
  return permutacao.flatMap((original, posicao) => (ja.has(original) ? [posicao] : []));
}

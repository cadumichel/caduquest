/**
 * Edição de questões que já estão no banco (pelo conector). Regras puras, para testar.
 */

/**
 * Forma do gabarito de um conteúdo: o mesmo JSON com todo texto apagado.
 * Duas versões com a mesma forma têm a mesma quantidade de itens, os mesmos
 * índices de resposta e os mesmos números e marcas (V/F, errado, grupo...),
 * e só diferem no texto.
 */
export function formaDoConteudo(valor: unknown): unknown {
  if (typeof valor === "string") return "";
  if (Array.isArray(valor)) return valor.map(formaDoConteudo);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map((k) => [k, formaDoConteudo((valor as Record<string, unknown>)[k])]),
    );
  }
  return valor;
}

/** true quando as duas versões só diferem no texto (respostas antigas continuam valendo). */
export function soMudaTexto(antes: unknown, depois: unknown): boolean {
  return JSON.stringify(formaDoConteudo(antes)) === JSON.stringify(formaDoConteudo(depois));
}

/** Campos do conteúdo que a edição pelo conector não mexe: imagem e posições ficam como estão. */
const CAMPOS_PRESERVADOS = ["imagem", "retrato", "posicionar"] as const;

/** Junta o conteúdo novo com a imagem/retrato que a questão já tinha. */
export function preservarImagem(antigo: unknown, novo: Record<string, unknown>): Record<string, unknown> {
  const velho = (antigo ?? {}) as Record<string, unknown>;
  const resultado = { ...novo };
  for (const campo of CAMPOS_PRESERVADOS) {
    if (velho[campo] !== undefined) resultado[campo] = velho[campo];
    else delete resultado[campo];
  }
  return resultado;
}

/** Tipos cujo conteúdo depende de posições marcadas na imagem: pelo conector, só os textos de fora mudam. */
export const SEM_EDICAO_DE_CONTEUDO = ["mapa", "detalhe_imagem"] as const;

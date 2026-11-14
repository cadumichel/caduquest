/** Pontos sempre com no máximo 2 casas decimais (somas de frações geram dízimas). */
export const arredondarPontos = (p: number) => Math.round((p + Number.EPSILON) * 100) / 100;

const FORMATO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Pontos para exibir: vírgula decimal e no máximo 2 casas (12,5 · 7,33 · 40). */
export const formatarPontos = (p: number | string | null | undefined) =>
  FORMATO.format(arredondarPontos(Number(p ?? 0)));

const FORMATO_ACERTOS = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Só o número de acertos, com vírgula e no máximo 1 casa: "9,4". */
export const formatarNumeroAcertos = (acertos: number | string | null | undefined) =>
  FORMATO_ACERTOS.format(Number(acertos ?? 0));

/** Acertos com crédito parcial para exibir: "9,4 de 12". */
export const formatarAcertos = (acertos: number | string | null | undefined, total: number) =>
  `${formatarNumeroAcertos(acertos)} de ${total}`;

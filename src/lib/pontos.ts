/** Pontos sempre com no máximo 2 casas decimais (somas de frações geram dízimas). */
export const arredondarPontos = (p: number) => Math.round((p + Number.EPSILON) * 100) / 100;

const FORMATO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Pontos para exibir: vírgula decimal e no máximo 2 casas (12,5 · 7,33 · 40). */
export const formatarPontos = (p: number | string | null | undefined) =>
  FORMATO.format(arredondarPontos(Number(p ?? 0)));

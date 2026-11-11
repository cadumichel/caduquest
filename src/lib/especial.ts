/**
 * Desafio especial: qualquer desafio (com ou sem consulta) pode ser marcado como
 * especial. Ganha visual dourado, pontos multiplicados e, se o professor quiser,
 * menos tempo em cada questão. O cronômetro conta normalmente: só o tempo é menor.
 * "Só em sala" (tipo relampago) pede o código do dia, como o antigo CaduRush.
 */

export const MULTIPLICADORES = [1.5, 2, 3] as const;
export const PERCENTUAIS_TEMPO = [100, 75, 50] as const;
export const MULTIPLICADOR_PADRAO = 2;
export const PERCENTUAL_PADRAO = 75;
/** Tempo mínimo de uma questão, mesmo com a redução do especial. */
export const TEMPO_MIN_ESPECIAL_S = 5;

export type DadosEspecial = {
  especial: boolean;
  multiplicador: number | null;
  /** 100 = tempo normal. */
  tempo_percentual: number | null;
};

export const ehMultiplicador = (n: unknown): n is number =>
  typeof n === "number" && (MULTIPLICADORES as readonly number[]).includes(n);
export const ehPercentual = (n: unknown): n is number =>
  typeof n === "number" && (PERCENTUAIS_TEMPO as readonly number[]).includes(n);

/** Pontos por acerto já multiplicados (o placar inteiro usa este número). */
export const pontosDoEspecial = (base: number, multiplicador: number) =>
  Math.min(100, Math.max(1, Math.round(base * multiplicador)));

/** Pontos de base de um desafio, desfazendo o multiplicador. */
export const pontosBase = (d: { pontos_por_acerto: number; especial?: boolean; multiplicador?: number | null }) =>
  d.especial && d.multiplicador
    ? Math.max(1, Math.round(d.pontos_por_acerto / Number(d.multiplicador)))
    : d.pontos_por_acerto;

/** Percentual de tempo que vale no jogo (null = tempo normal). */
export const percentualEmVigor = (d: { especial?: boolean; tempo_percentual?: number | null }) =>
  d.especial && d.tempo_percentual && d.tempo_percentual < 100 ? d.tempo_percentual : null;

export function reduzirTempo(segundos: number, percentual: number | null | undefined): number {
  if (!percentual || percentual >= 100) return segundos;
  return Math.max(TEMPO_MIN_ESPECIAL_S, Math.round((segundos * percentual) / 100));
}

export const formatarMultiplicador = (n: number | string | null | undefined) =>
  `${String(Number(n ?? 1)).replace(".", ",")}×`;

/** Resumo curto: "2× pontos · 75% do tempo". */
export function descreverEspecial(d: {
  especial?: boolean;
  multiplicador?: number | null;
  tempo_percentual?: number | null;
}) {
  if (!d.especial) return "";
  const partes = [`${formatarMultiplicador(d.multiplicador ?? 1)} pontos`];
  const pct = percentualEmVigor(d);
  partes.push(pct ? `${pct}% do tempo` : "tempo normal");
  return partes.join(" · ");
}

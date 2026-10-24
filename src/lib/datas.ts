export const FUSO = "America/Sao_Paulo";

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const formatarDataHora = (iso: string | Date) => fmtDataHora.format(new Date(iso));

/** Para colunas `date` (sem fuso). */
export const formatarData = (data: string) => fmtData.format(new Date(`${data}T00:00:00Z`));

/** Converte o valor de um <input type="datetime-local"> (horário de Brasília) para ISO. */
export function dataHoraLocalParaIso(valor: string): string {
  // O Brasil não tem horário de verão desde 2019: Brasília é sempre UTC-3.
  return new Date(`${valor}:00-03:00`).toISOString();
}

/** ISO -> valor para <input type="datetime-local"> em horário de Brasília. */
export function isoParaDataHoraLocal(iso: string | Date): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

/** Data de hoje (AAAA-MM-DD) em Brasília. */
export function hojeEmBrasilia(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function diasAte(data: string): number {
  const hoje = new Date(`${hojeEmBrasilia()}T00:00:00Z`).getTime();
  return Math.round((new Date(`${data}T00:00:00Z`).getTime() - hoje) / 86_400_000);
}

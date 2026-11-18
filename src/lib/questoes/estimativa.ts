import { formatarAno, type ConteudoEstimativa } from "./tipos";

/**
 * Estimativa na régua: o aluno arrasta um marcador até o número (ou o ano).
 * Nota cheia até `acerto` de distância da resposta, zero a partir de `margem`
 * e, entre as duas, a nota cai em linha reta.
 */

type Regua = Pick<ConteudoEstimativa, "minimo" | "maximo" | "passo">;

/** Arredonda erros de ponto flutuante (0.1 + 0.2). */
const limpo = (v: number) => Number(v.toFixed(6));

export const totalPassos = (c: Regua) => Math.round((c.maximo - c.minimo) / c.passo);
export const indiceDoValor = (c: Regua, v: number) => Math.round((v - c.minimo) / c.passo);
export const valorDoIndice = (c: Regua, i: number) => limpo(c.minimo + i * c.passo);

/** Fração de acerto (0 a 1) de um valor marcado. */
export function notaEstimativa(c: ConteudoEstimativa, marcado: number | null | undefined): number {
  if (marcado === null || marcado === undefined || !Number.isFinite(marcado)) return 0;
  const distancia = Math.abs(marcado - c.valor);
  // Folga mínima para a nota cheia: meio passo (o marcador anda de passo em passo).
  if (distancia <= c.acerto + c.passo / 2 - 1e-9) return 1;
  if (distancia >= c.margem) return 0;
  return Math.max(0, Math.min(1, 1 - (distancia - c.acerto) / (c.margem - c.acerto)));
}

/** Eliminações na estimativa: no máximo 2, e a régua nunca fica com menos de 4 passos. */
export const MAX_ELIMINACOES_ESTIMATIVA = 2;
const MIN_PASSOS_JANELA = 4;

/**
 * Trecho da régua que sobra depois das eliminações, em índices de passo.
 * Cada eliminação gravada é o início do novo trecho; o tamanho cai pela metade a cada uma.
 */
export function janelaEmPassos(c: Regua, eliminadas: readonly number[]): { inicio: number; passos: number } {
  let inicio = 0;
  let passos = totalPassos(c);
  for (const e of eliminadas.slice(0, MAX_ELIMINACOES_ESTIMATIVA)) {
    passos = Math.ceil(passos / 2);
    inicio = Math.max(0, Math.min(e, totalPassos(c) - passos));
  }
  return { inicio, passos };
}

/** O mesmo trecho em valores da régua: [início, fim]. */
export function janelaEstimativa(c: Regua, eliminadas: readonly number[]): [number, number] {
  const { inicio, passos } = janelaEmPassos(c, eliminadas);
  return [valorDoIndice(c, inicio), valorDoIndice(c, inicio + passos)];
}

/**
 * Inícios possíveis do próximo trecho (metade do atual), sempre com a resposta
 * dentro e longe das pontas, para a posição dela não ficar óbvia.
 */
export function candidatasEstimativa(c: ConteudoEstimativa, eliminadas: readonly number[]): number[] {
  if (eliminadas.length >= MAX_ELIMINACOES_ESTIMATIVA) return [];
  const { inicio, passos } = janelaEmPassos(c, eliminadas);
  const novo = Math.ceil(passos / 2);
  if (novo < MIN_PASSOS_JANELA || novo >= passos) return [];
  const v = indiceDoValor(c, c.valor);
  const folga = Math.floor(novo * 0.15);
  let de = Math.max(inicio, v - novo + folga);
  let ate = Math.min(inicio + passos - novo, v - folga);
  if (de > ate) {
    de = Math.max(inicio, v - novo);
    ate = Math.min(inicio + passos - novo, v);
  }
  return de > ate ? [] : Array.from({ length: ate - de + 1 }, (_, i) => de + i);
}

/** 1822 (ano) → "1822"; -27 (ano) → "27 a.C."; 15 com "%" → "15%"; 4,8 com "milhões" → "4,8 milhões". */
export function formatarEstimativa(v: number, c: { ano: boolean; unidade: string }): string {
  if (c.ano) return formatarAno(Math.round(v));
  const numero = v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  const u = c.unidade.trim();
  if (!u) return numero;
  return u === "%" ? `${numero}%` : `${numero} ${u}`;
}

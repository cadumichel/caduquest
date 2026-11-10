import {
  ehRegraCliques,
  ehRegraSaidas,
  problemaTolerancia,
  type RegraCliques,
  type RegraSaidas,
} from "../tela-protegida";
import { problemaVerificacoes } from "./verificacao";

/** Teto de eliminações ou dicas por desafio (além da cota da temporada). */
export const AJUDAS_MAX_DESAFIO = 10;

/** Regras do desafio editáveis pelo professor. */
export type DadosRegras = {
  regra_cliques: RegraCliques;
  /** Só na regra "tolerancia". */
  tolerancia_cliques: number | null;
  /** null = automático (2 a cada 10); 0 = sem questões teste. */
  verificacoes: number | null;
  regra_saidas: RegraSaidas;
  tolerancia_saidas: number | null;
  /** null = só a cota da temporada; 0 = desligadas neste desafio. */
  eliminacoes_max: number | null;
  dicas_max: number | null;
  ordem_fixa: boolean;
  embaralhar_alternativas: boolean;
  teclado_bloqueado: boolean;
  gabarito_nunca: boolean;
  treino_liberado: boolean;
  bonus_rapidez: boolean;
};

export const REGRAS_PADRAO: DadosRegras = {
  regra_cliques: "proibido",
  tolerancia_cliques: null,
  verificacoes: null,
  regra_saidas: "proibido",
  tolerancia_saidas: null,
  eliminacoes_max: null,
  dicas_max: null,
  ordem_fixa: false,
  embaralhar_alternativas: true,
  teclado_bloqueado: true,
  gabarito_nunca: false,
  treino_liberado: true,
  bonus_rapidez: false,
};

export const ERRO_SQL_REGRAS =
  "Rode antes no Supabase os SQL 20261110120000_regras_cliques_verificacoes.sql e 20261110140000_regras_extras.sql.";

const vazio = (v: unknown) => v === null || v === undefined || v === "";

function inteiroOpcional(v: unknown, min: number, max: number, nome: string): { erro: string } | { n: number | null } {
  if (vazio(v)) return { n: null };
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return { erro: `${nome}: de ${min} a ${max}.` };
  return { n };
}

const booleano = (v: unknown, padrao: boolean) => (typeof v === "boolean" ? v : padrao);

/** Lê as regras do desafio como estão no banco (colunas ausentes = padrão). */
export function regrasDoDesafio(d: Partial<Record<keyof DadosRegras, unknown>>): DadosRegras {
  const r = conferirRegras(d);
  return "erro" in r ? REGRAS_PADRAO : r.regras;
}

/** Confere e normaliza as regras. Devolve o problema em texto, se houver. */
export function conferirRegras(
  d: Partial<Record<keyof DadosRegras, unknown>>,
): { erro: string } | { regras: DadosRegras } {
  const regra = vazio(d.regra_cliques) ? "proibido" : d.regra_cliques;
  if (!ehRegraCliques(regra)) return { erro: "Regra de cliques inválida." };
  let tolerancia: number | null = null;
  if (regra === "tolerancia") {
    tolerancia = Number(d.tolerancia_cliques);
    const problema = problemaTolerancia(tolerancia);
    if (problema) return { erro: problema };
  }
  const regraSaida = vazio(d.regra_saidas) ? "proibido" : d.regra_saidas;
  if (!ehRegraSaidas(regraSaida)) return { erro: "Regra de saída da tela inválida." };
  let toleranciaSaidas: number | null = null;
  if (regraSaida === "tolerancia") {
    toleranciaSaidas = Number(d.tolerancia_saidas);
    const problema = problemaTolerancia(toleranciaSaidas);
    if (problema) return { erro: problema.replace("Cliques tolerados", "Saídas toleradas") };
  }
  let verificacoes: number | null = null;
  if (!vazio(d.verificacoes)) {
    verificacoes = Number(d.verificacoes);
    const problema = problemaVerificacoes(verificacoes);
    if (problema) return { erro: problema };
  }
  const eliminacoes = inteiroOpcional(d.eliminacoes_max, 0, AJUDAS_MAX_DESAFIO, "Eliminações por desafio");
  if ("erro" in eliminacoes) return eliminacoes;
  const dicas = inteiroOpcional(d.dicas_max, 0, AJUDAS_MAX_DESAFIO, "Dicas por desafio");
  if ("erro" in dicas) return dicas;
  return {
    regras: {
      regra_cliques: regra,
      tolerancia_cliques: tolerancia,
      verificacoes,
      regra_saidas: regraSaida,
      tolerancia_saidas: toleranciaSaidas,
      eliminacoes_max: eliminacoes.n,
      dicas_max: dicas.n,
      ordem_fixa: booleano(d.ordem_fixa, false),
      embaralhar_alternativas: booleano(d.embaralhar_alternativas, true),
      teclado_bloqueado: booleano(d.teclado_bloqueado, true),
      gabarito_nunca: booleano(d.gabarito_nunca, false),
      treino_liberado: booleano(d.treino_liberado, true),
      bonus_rapidez: booleano(d.bonus_rapidez, false),
    },
  };
}

/** Só as colunas que mudam do padrão: sem o SQL das regras, um desafio padrão ainda é criado. */
export function regrasParaGravar(r: DadosRegras): Partial<DadosRegras> {
  return Object.fromEntries(
    (Object.keys(r) as (keyof DadosRegras)[]).filter((k) => r[k] !== REGRAS_PADRAO[k]).map((k) => [k, r[k]]),
  );
}

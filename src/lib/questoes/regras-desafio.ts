import { ehRegraCliques, problemaTolerancia, type RegraCliques } from "../tela-protegida";
import { problemaVerificacoes } from "./verificacao";

/** Regras do desafio editáveis pelo professor: cliques fora e número de questões teste. */
export type DadosRegras = {
  regra_cliques: RegraCliques;
  /** Só na regra "tolerancia". */
  tolerancia_cliques: number | null;
  /** null = automático (2 a cada 10); 0 = sem questões teste. */
  verificacoes: number | null;
};

export const ERRO_SQL_REGRAS = "Rode antes o SQL 20261110120000_regras_cliques_verificacoes.sql no Supabase.";

/** Confere e normaliza as regras. Devolve o problema em texto, se houver. */
export function conferirRegras(d: {
  regra_cliques?: unknown;
  tolerancia_cliques?: unknown;
  verificacoes?: unknown;
}): { erro: string } | { regras: DadosRegras } {
  const regra = d.regra_cliques ?? "proibido";
  if (!ehRegraCliques(regra)) return { erro: "Regra de cliques inválida." };
  let tolerancia: number | null = null;
  if (regra === "tolerancia") {
    tolerancia = Number(d.tolerancia_cliques);
    const problema = problemaTolerancia(tolerancia);
    if (problema) return { erro: problema };
  }
  let verificacoes: number | null = null;
  if (d.verificacoes !== null && d.verificacoes !== undefined && d.verificacoes !== "") {
    verificacoes = Number(d.verificacoes);
    const problema = problemaVerificacoes(verificacoes);
    if (problema) return { erro: problema };
  }
  return { regras: { regra_cliques: regra, tolerancia_cliques: tolerancia, verificacoes } };
}

/** Só as colunas que mudam do padrão: sem o SQL das regras, um desafio padrão ainda é criado. */
export function regrasParaGravar(r: DadosRegras) {
  const padrao = r.regra_cliques === "proibido" && r.verificacoes === null;
  return padrao ? {} : r;
}

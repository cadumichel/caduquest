/**
 * Padrões do professor (tela Configurações): valem para todo desafio novo,
 * pelo painel e pelo conector. Cada desafio ainda pode mudar o que quiser.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ehMultiplicador, ehPercentual, MULTIPLICADOR_PADRAO, PERCENTUAL_PADRAO } from "./especial";
import { conferirRegras, REGRAS_PADRAO, type DadosRegras } from "./questoes/regras-desafio";
import { VERIFICACAO_MAX_S, VERIFICACAO_MIN_S } from "./questoes/tempos";

export type Padroes = {
  regras: DadosRegras;
  /** true = sem consulta (sair da tela zera a questão). */
  pesquisa_bloqueada: boolean;
  pontos_por_acerto: number;
  /** null = 15 s. */
  tempo_verificacao_s: number | null;
  /** Quantos dias o desafio fica aberto. */
  dias_aberto: number;
  especial_multiplicador: number;
  especial_tempo_percentual: number;
};

export const PADROES_FABRICA: Padroes = {
  regras: REGRAS_PADRAO,
  pesquisa_bloqueada: false,
  pontos_por_acerto: 10,
  tempo_verificacao_s: null,
  dias_aberto: 7,
  especial_multiplicador: MULTIPLICADOR_PADRAO,
  especial_tempo_percentual: PERCENTUAL_PADRAO,
};

export const DIAS_MIN = 1;
export const DIAS_MAX = 14;

const inteiroEntre = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Confere os padrões vindos do formulário. */
export function conferirPadroes(d: Record<string, unknown>): { erro: string } | { padroes: Padroes } {
  const regras = conferirRegras((d.regras ?? {}) as Record<string, unknown>);
  if ("erro" in regras) return regras;
  if (!inteiroEntre(d.pontos_por_acerto, 1, 100)) return { erro: "Pontos por acerto: de 1 a 100." };
  if (d.tempo_verificacao_s !== null && !inteiroEntre(d.tempo_verificacao_s, VERIFICACAO_MIN_S, VERIFICACAO_MAX_S))
    return { erro: `Tempo da questão teste: de ${VERIFICACAO_MIN_S} a ${VERIFICACAO_MAX_S} s.` };
  if (!inteiroEntre(d.dias_aberto, DIAS_MIN, DIAS_MAX)) return { erro: `Dias aberto: de ${DIAS_MIN} a ${DIAS_MAX}.` };
  if (!ehMultiplicador(d.especial_multiplicador)) return { erro: "Multiplicador do especial inválido." };
  if (!ehPercentual(d.especial_tempo_percentual)) return { erro: "Tempo do especial inválido." };
  return {
    padroes: {
      regras: regras.regras,
      pesquisa_bloqueada: d.pesquisa_bloqueada === true,
      pontos_por_acerto: d.pontos_por_acerto as number,
      tempo_verificacao_s: (d.tempo_verificacao_s as number | null) ?? null,
      dias_aberto: d.dias_aberto as number,
      especial_multiplicador: d.especial_multiplicador as number,
      especial_tempo_percentual: d.especial_tempo_percentual as number,
    },
  };
}

/** Lê o que está gravado; campo ausente ou inválido volta ao padrão de fábrica. */
export function lerPadroes(json: unknown): Padroes {
  const g = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const mesclado = { ...PADROES_FABRICA, ...g, regras: { ...REGRAS_PADRAO, ...((g.regras as object) ?? {}) } };
  const r = conferirPadroes(mesclado as Record<string, unknown>);
  if (!("erro" in r)) return r.padroes;
  // Um campo ruim não derruba os outros: confere um a um.
  const p = { ...PADROES_FABRICA };
  for (const k of Object.keys(PADROES_FABRICA) as (keyof Padroes)[]) {
    const teste = conferirPadroes({ ...PADROES_FABRICA, [k]: mesclado[k] } as Record<string, unknown>);
    if (!("erro" in teste)) (p as Record<string, unknown>)[k] = teste.padroes[k];
  }
  return p;
}

/**
 * Padrões do professor. Com o cliente do professor (RLS) basta o select; com o
 * cliente admin (conector), passe o id. Sem o SQL da tabela, volta o de fábrica.
 */
export async function padroesDoProfessor(db: SupabaseClient, professorId?: string): Promise<Padroes> {
  let consulta = db.from("configuracoes_professor").select("padroes");
  if (professorId) consulta = consulta.eq("professor_id", professorId);
  const { data, error } = await consulta.maybeSingle();
  if (error || !data) return PADROES_FABRICA;
  return lerPadroes(data.padroes);
}

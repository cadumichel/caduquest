/**
 * Desafios públicos: qualquer pessoa joga um desafio de História por era.
 * Regras puras (sem banco), para testar.
 */
import { arredondarPontos } from "../pontos";

export const ERAS = [
  {
    id: "pre_historia",
    nome: "Pré-História",
    emoji: "🪨",
    resumo: "Caçadores-coletores, a revolução agrícola e as primeiras aldeias.",
    cor: "from-amber-700 to-stone-800",
  },
  {
    id: "antiga",
    nome: "História Antiga",
    emoji: "🏛️",
    resumo: "Mesopotâmia, Egito, Grécia, Roma e outros povos da Antiguidade.",
    cor: "from-sky-700 to-indigo-900",
  },
  {
    id: "medieval",
    nome: "Idade Média",
    emoji: "🏰",
    resumo: "Feudalismo, Igreja, Islã, cidades e a crise do mundo medieval.",
    cor: "from-emerald-700 to-teal-900",
  },
  {
    id: "moderna",
    nome: "Idade Moderna",
    emoji: "🧭",
    resumo: "Expansão marítima, Reformas, absolutismo e Iluminismo.",
    cor: "from-orange-600 to-rose-800",
  },
  {
    id: "contemporanea",
    nome: "Idade Contemporânea",
    emoji: "🏭",
    resumo: "Revoluções, indústria, imperialismo, guerras mundiais e mundo atual.",
    cor: "from-slate-600 to-slate-900",
  },
  {
    id: "brasil",
    nome: "História do Brasil",
    emoji: "🇧🇷",
    resumo: "Da colonização à República: sociedade, trabalho, poder e cultura.",
    cor: "from-green-600 to-yellow-700",
  },
  {
    id: "tematica",
    nome: "História Temática",
    emoji: "🧩",
    resumo: "Grandes temas através dos tempos: trabalho, cidadania, religião, ciência.",
    cor: "from-fuchsia-700 to-marca-900",
  },
] as const;

export type EraId = (typeof ERAS)[number]["id"];
export type Era = (typeof ERAS)[number];
export const ERA_IDS = ERAS.map((e) => e.id) as [EraId, ...EraId[]];

export const ehEra = (v: unknown): v is EraId => typeof v === "string" && (ERA_IDS as string[]).includes(v);
export const eraPorId = (id: string): Era | undefined => ERAS.find((e) => e.id === id);

/** Questões por partida; as duas últimas são a rodada final, sem consulta. */
export const QUESTOES_POR_PARTIDA = 10;
export const QUESTOES_FINAIS = 2;
export const ehFinal = (posicao: number) => posicao >= QUESTOES_POR_PARTIDA - QUESTOES_FINAIS;

/** Pontos por acerto e bônus máximo de rapidez. A rodada final vale o dobro. */
export const PONTOS_ACERTO = 10;
export const BONUS_RAPIDEZ = 5;
export const PESO_FINAL = 2;
export const PONTUACAO_MAXIMA =
  (QUESTOES_POR_PARTIDA - QUESTOES_FINAIS) * (PONTOS_ACERTO + BONUS_RAPIDEZ) +
  QUESTOES_FINAIS * PESO_FINAL * (PONTOS_ACERTO + BONUS_RAPIDEZ);

/**
 * Pontos de uma questão: acerto (com crédito parcial) mais bônus pela rapidez,
 * proporcional ao tempo que sobrou e à fração acertada. Errou, não ganha bônus.
 */
export function pontosPublicos(fracao: number, decorridoMs: number, limiteS: number, final: boolean): number {
  const f = Math.max(0, Math.min(1, fracao));
  if (f === 0) return 0;
  const sobra = Math.max(0, Math.min(1, 1 - decorridoMs / (limiteS * 1000)));
  const peso = final ? PESO_FINAL : 1;
  return arredondarPontos(peso * f * (PONTOS_ACERTO + BONUS_RAPIDEZ * sobra));
}

/**
 * Sorteia as questões de uma partida, variando os formatos: embaralha o banco e
 * vai pegando um formato de cada vez, em rodízio, até completar. Questões que o
 * jogador ainda não viu vêm antes das já vistas.
 */
export function sortearQuestoes<T extends { id: string; tipo: string }>(
  banco: T[],
  quantidade = QUESTOES_POR_PARTIDA,
  vistas: ReadonlySet<string> = new Set(),
  aleatorio: () => number = Math.random,
): string[] {
  const embaralhar = <X>(lista: X[]) => {
    const l = [...lista];
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  };
  const escolhidas: string[] = [];
  for (const grupo of [banco.filter((q) => !vistas.has(q.id)), banco.filter((q) => vistas.has(q.id))]) {
    const porTipo = new Map<string, T[]>();
    for (const q of embaralhar(grupo)) porTipo.set(q.tipo, [...(porTipo.get(q.tipo) ?? []), q]);
    const filas = embaralhar([...porTipo.values()]);
    while (escolhidas.length < quantidade && filas.some((f) => f.length)) {
      for (const fila of filas) {
        const q = fila.shift();
        if (q && escolhidas.length < quantidade) escolhidas.push(q.id);
      }
    }
  }
  // A ordem final também é sorteada: o rodízio não deve ditar a sequência.
  return embaralhar(escolhidas);
}

export type PartidaRanking = {
  jogadorId: string;
  era: string;
  pontos: number;
  /** Duração em ms, para desempate. */
  duracaoMs: number;
};

export type LinhaRankingPublico = {
  posicao: number;
  jogadorId: string;
  pontos: number;
  /** Eras jogadas (no ranking geral) ou 1 (no ranking da era). */
  eras: number;
  duracaoMs: number;
};

/**
 * Ranking de uma era (era informada) ou geral (soma das eras). Desempate: menos
 * tempo total. Empate completo divide a posição.
 */
export function montarRankingPublico(partidas: PartidaRanking[], era?: string): LinhaRankingPublico[] {
  const porJogador = new Map<string, { pontos: number; eras: number; duracaoMs: number }>();
  for (const p of partidas) {
    if (era && p.era !== era) continue;
    const atual = porJogador.get(p.jogadorId) ?? { pontos: 0, eras: 0, duracaoMs: 0 };
    porJogador.set(p.jogadorId, {
      pontos: arredondarPontos(atual.pontos + p.pontos),
      eras: atual.eras + 1,
      duracaoMs: atual.duracaoMs + p.duracaoMs,
    });
  }
  const linhas = [...porJogador.entries()]
    .map(([jogadorId, v]) => ({ jogadorId, ...v }))
    .sort((a, b) => b.pontos - a.pontos || a.duracaoMs - b.duracaoMs || a.jogadorId.localeCompare(b.jogadorId));
  let posicao = 0;
  return linhas.map((l, i) => {
    const anterior = linhas[i - 1];
    if (!anterior || anterior.pontos !== l.pontos || anterior.duracaoMs !== l.duracaoMs) posicao = i + 1;
    return { posicao, ...l };
  });
}

import { describe, expect, it } from "vitest";
import {
  ehEra,
  ehFinal,
  montarRankingPublico,
  pontosPublicos,
  PONTUACAO_MAXIMA,
  QUESTOES_POR_PARTIDA,
  sortearQuestoes,
} from "../publico/regras";

/** Gerador previsível para os testes. */
function semente(n: number) {
  let x = n;
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

describe("pontos do desafio público", () => {
  it("acerto instantâneo vale 15 e na rodada final vale o dobro", () => {
    expect(pontosPublicos(1, 0, 60, false)).toBe(15);
    expect(pontosPublicos(1, 0, 60, true)).toBe(30);
  });
  it("o bônus cai com o tempo e some no fim", () => {
    expect(pontosPublicos(1, 30_000, 60, false)).toBe(12.5);
    expect(pontosPublicos(1, 60_000, 60, false)).toBe(10);
    expect(pontosPublicos(1, 90_000, 60, false)).toBe(10);
  });
  it("erro não ganha bônus; crédito parcial é proporcional", () => {
    expect(pontosPublicos(0, 0, 60, false)).toBe(0);
    expect(pontosPublicos(0.5, 0, 60, false)).toBe(7.5);
  });
  it("as duas últimas questões são a rodada final", () => {
    expect([...Array(QUESTOES_POR_PARTIDA).keys()].filter(ehFinal)).toEqual([8, 9]);
    expect(PONTUACAO_MAXIMA).toBe(180);
  });
  it("reconhece as eras", () => {
    expect(ehEra("brasil")).toBe(true);
    expect(ehEra("futuro")).toBe(false);
  });
});

describe("sorteio das questões", () => {
  const banco = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: `me${i}`, tipo: "multipla_escolha" })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `vf${i}`, tipo: "vf_bloco" })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `fp${i}`, tipo: "fonte_primaria" })),
    ...Array.from({ length: 2 }, (_, i) => ({ id: `cc${i}`, tipo: "causa_consequencia" })),
  ];
  it("pega 10 questões diferentes, variando os formatos", () => {
    for (let s = 1; s < 30; s++) {
      const ids = sortearQuestoes(banco, 10, new Set(), semente(s));
      expect(new Set(ids).size).toBe(10);
      // Rodízio: todos os 2-3 de cada formato raro entram antes de sobrar só múltipla escolha.
      expect(ids.filter((id) => id.startsWith("me")).length).toBeLessThanOrEqual(4);
    }
  });
  it("prefere questões que o jogador ainda não viu", () => {
    const vistas = new Set(banco.slice(0, 10).map((q) => q.id));
    const ids = sortearQuestoes(banco, 10, vistas, semente(7));
    expect(ids.every((id) => !vistas.has(id))).toBe(true);
  });
  it("completa com questões já vistas quando faltam novas", () => {
    const vistas = new Set(banco.slice(0, 15).map((q) => q.id));
    const ids = sortearQuestoes(banco, 10, vistas, semente(3));
    expect(new Set(ids).size).toBe(10);
    expect(ids.filter((id) => !vistas.has(id)).length).toBe(5);
  });
});

describe("ranking público", () => {
  const partidas = [
    { jogadorId: "a", era: "brasil", pontos: 100, duracaoMs: 300_000 },
    { jogadorId: "a", era: "antiga", pontos: 50, duracaoMs: 200_000 },
    { jogadorId: "b", era: "brasil", pontos: 120, duracaoMs: 400_000 },
    { jogadorId: "c", era: "brasil", pontos: 100, duracaoMs: 250_000 },
  ];
  it("ranking da era: pontos e depois menos tempo", () => {
    expect(montarRankingPublico(partidas, "brasil").map((l) => [l.jogadorId, l.posicao])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });
  it("ranking geral soma as eras", () => {
    const r = montarRankingPublico(partidas);
    expect(r.map((l) => [l.jogadorId, l.pontos, l.eras])).toEqual([
      ["a", 150, 2],
      ["b", 120, 1],
      ["c", 100, 1],
    ]);
  });
  it("empate completo divide a posição", () => {
    const r = montarRankingPublico([
      { jogadorId: "x", era: "brasil", pontos: 10, duracaoMs: 1 },
      { jogadorId: "y", era: "brasil", pontos: 10, duracaoMs: 1 },
    ]);
    expect(r.map((l) => l.posicao)).toEqual([1, 1]);
  });
});

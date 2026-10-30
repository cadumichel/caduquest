import { describe, expect, it } from "vitest";
import { candidatasEliminacao, eliminadasNaVista } from "../questoes/ajudas";
import { permutacaoValida } from "../questoes/embaralhar";
import type { Conteudo } from "../questoes/tipos";

const me: Conteudo = {
  tipo: "multipla_escolha",
  conteudo: { alternativas: ["A", "B", "C", "D", "E"], correta: 2 },
};

describe("eliminar alternativas", () => {
  it("nunca oferece a correta", () => {
    expect(candidatasEliminacao(me, [])).toEqual([0, 1, 3, 4]);
    expect(candidatasEliminacao(me, [0, 4])).toEqual([1, 3]);
  });
  it("sempre deixa pelo menos 2 alternativas", () => {
    expect(candidatasEliminacao(me, [0, 1])).toEqual([3, 4]);
    expect(candidatasEliminacao(me, [0, 1, 3])).toEqual([]);
    const quatro: Conteudo = {
      tipo: "quem_disse",
      conteudo: { citacao: "x", autores: ["a", "b", "c", "d"], correta: 0 },
    };
    expect(candidatasEliminacao(quatro, [1, 2])).toEqual([]);
  });
  it("no intruso, só sai item que não é o intruso", () => {
    const c: Conteudo = { tipo: "intruso", conteudo: { itens: ["a", "b", "c", "d"], intruso: 3, criterio: "x" } };
    expect(candidatasEliminacao(c, [])).toEqual([0, 1, 2]);
  });
  it("tipos sem alternativa única não aceitam", () => {
    const vf: Conteudo = {
      tipo: "vf_bloco",
      conteudo: { afirmativas: [0, 1, 2].map(() => ({ texto: "x", verdadeira: true })) },
    };
    expect(candidatasEliminacao(vf, [])).toEqual([]);
  });
  it("traduz para as posições na tela do aluno", () => {
    // tela 0 = original 4, tela 1 = original 2, ...
    expect(eliminadasNaVista([4, 2, 0, 1, 3], [0, 4])).toEqual([0, 2]);
  });
});

describe("permutação devolvida pelo aluno", () => {
  it("aceita só permutações completas de 0..n-1", () => {
    expect(permutacaoValida([2, 0, 1], 3)).toBe(true);
    expect(permutacaoValida([0, 0, 1], 3)).toBe(false);
    expect(permutacaoValida([0, 1], 3)).toBe(false);
    expect(permutacaoValida([0, 1, 3], 3)).toBe(false);
    expect(permutacaoValida("012", 3)).toBe(false);
  });
});

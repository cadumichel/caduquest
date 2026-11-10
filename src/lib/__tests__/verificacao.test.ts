import { describe, expect, it } from "vitest";
import {
  chaveTema,
  montarOpcoesVerificacao,
  sortearVerificacoes,
  verificacoesAutomaticas,
} from "../questoes/verificacao";
import { conferirRegras, REGRAS_PADRAO, regrasParaGravar } from "../questoes/regras-desafio";

describe("sorteio das verificações", () => {
  it("2 a cada 10 questões", () => {
    for (let i = 0; i < 50; i++) {
      const p = sortearVerificacoes(Array(10).fill(true));
      expect(p).toHaveLength(2);
      expect(new Set(p).size).toBe(2);
      expect(p.every((x) => x >= 0 && x < 10)).toBe(true);
    }
  });

  it("2 por bloco de 10, e a proporção no bloco final", () => {
    for (let i = 0; i < 50; i++) {
      const p = sortearVerificacoes(Array(15).fill(true));
      expect(p.filter((x) => x < 10)).toHaveLength(2);
      expect(p.filter((x) => x >= 10)).toHaveLength(1);
    }
    expect(sortearVerificacoes(Array(5).fill(true))).toHaveLength(1);
    expect(sortearVerificacoes(Array(20).fill(true))).toHaveLength(4);
  });

  it("só sorteia posições elegíveis", () => {
    const elegiveis = [false, true, false, false, true, false, false, false, false, false];
    expect(sortearVerificacoes(elegiveis)).toEqual([1, 4]);
    expect(sortearVerificacoes([false, false, true, false, false, false, false, false, false, false])).toEqual([2]);
    expect(sortearVerificacoes(Array(10).fill(false))).toEqual([]);
  });
});

describe("alternativas da verificação", () => {
  it("tema real + 3 temas diferentes de outras questões", () => {
    const r = montarOpcoesVerificacao("Revolta da Vacina", [
      ["Revolta da Chibata", "Canudos", "Contestado", "Cangaço"],
    ]);
    expect(r).not.toBeNull();
    expect(r!.opcoes).toHaveLength(4);
    expect(r!.opcoes[r!.correta]).toBe("Revolta da Vacina");
    expect(new Set(r!.opcoes.map(chaveTema)).size).toBe(4);
  });

  it("ignora temas iguais ao real ou repetidos (sem ligar para acento e maiúscula)", () => {
    const r = montarOpcoesVerificacao("Revolução Francesa", [
      ["revolucao francesa", "Iluminismo", "ILUMINISMO", "Absolutismo"],
      ["Era Napoleônica"],
    ]);
    expect(r!.opcoes.filter((o) => chaveTema(o) === "iluminismo")).toHaveLength(1);
    expect(r!.opcoes).toContain("Era Napoleônica");
  });

  it("prefere a primeira fonte (o próprio desafio)", () => {
    const r = montarOpcoesVerificacao("A", [
      ["B", "C", "D"],
      ["E", "F"],
    ]);
    expect([...r!.opcoes].sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("sem temas suficientes não monta", () => {
    expect(montarOpcoesVerificacao("A", [["B", "b", "A"]])).toBeNull();
    expect(montarOpcoesVerificacao("  ", [["B", "C", "D"]])).toBeNull();
  });

  it("a correta cai em qualquer posição", () => {
    const posicoes = new Set<number>();
    for (let i = 0; i < 200; i++) posicoes.add(montarOpcoesVerificacao("A", [["B", "C", "D"]])!.correta);
    expect(posicoes).toEqual(new Set([0, 1, 2, 3]));
  });
});

describe("número de questões teste escolhido pelo professor", () => {
  it("dá exatamente o número pedido, espalhado pelas faixas", () => {
    for (let i = 0; i < 50; i++) {
      const p = sortearVerificacoes(Array(12).fill(true), Math.random, 3);
      expect(p).toHaveLength(3);
      expect(p[0]).toBeLessThan(4);
      expect(p[1]).toBeGreaterThanOrEqual(4);
      expect(p[1]).toBeLessThan(8);
      expect(p[2]).toBeGreaterThanOrEqual(8);
    }
  });
  it("0 = nenhuma; mais que as elegíveis = todas as elegíveis", () => {
    expect(sortearVerificacoes(Array(10).fill(true), Math.random, 0)).toEqual([]);
    expect(sortearVerificacoes([true, false, true, false, false], Math.random, 5)).toEqual([0, 2]);
  });
  it("automático conta 2 a cada 10", () => {
    expect(verificacoesAutomaticas(10)).toBe(2);
    expect(verificacoesAutomaticas(15)).toBe(3);
    expect(verificacoesAutomaticas(5)).toBe(1);
  });
});

describe("conferirRegras", () => {
  it("padrão: proibido e automático", () => {
    expect(conferirRegras({})).toEqual({ regras: REGRAS_PADRAO });
    expect(regrasParaGravar(REGRAS_PADRAO)).toEqual({});
  });
  it("tolerância exige de 1 a 20", () => {
    expect(conferirRegras({ regra_cliques: "tolerancia", tolerancia_cliques: 0 })).toHaveProperty("erro");
    expect(conferirRegras({ regra_cliques: "tolerancia", tolerancia_cliques: 3 })).toMatchObject({
      regras: { regra_cliques: "tolerancia", tolerancia_cliques: 3, verificacoes: null },
    });
  });
  it("questões teste de 0 a 15", () => {
    expect(conferirRegras({ verificacoes: 16 })).toHaveProperty("erro");
    expect(conferirRegras({ verificacoes: 0 })).toMatchObject({
      regras: { regra_cliques: "proibido", tolerancia_cliques: null, verificacoes: 0 },
    });
  });
  it("regras extras: saídas, ajudas e opções", () => {
    expect(conferirRegras({ regra_saidas: "tolerancia", tolerancia_saidas: 0 })).toHaveProperty("erro");
    expect(conferirRegras({ eliminacoes_max: 11 })).toHaveProperty("erro");
    const r = conferirRegras({ regra_saidas: "tolerancia", tolerancia_saidas: 2, dicas_max: 0, bonus_rapidez: true });
    expect(r).toMatchObject({ regras: { regra_saidas: "tolerancia", tolerancia_saidas: 2, dicas_max: 0 } });
    if ("regras" in r)
      expect(regrasParaGravar(r.regras)).toEqual({
        regra_saidas: "tolerancia",
        tolerancia_saidas: 2,
        dicas_max: 0,
        bonus_rapidez: true,
      });
  });
});

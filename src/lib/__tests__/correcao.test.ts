import { describe, expect, it } from "vitest";
import { montarVista } from "../questoes/apresentacao";
import { calcularPontos, corrigir, tempoEsgotado } from "../questoes/correcao";
import { permutacaoAleatoria } from "../questoes/embaralhar";
import type { Conteudo } from "../questoes/tipos";

const me: Conteudo = {
  tipo: "multipla_escolha",
  conteudo: { alternativas: ["A", "B", "C", "D"], correta: 2 },
};

describe("múltipla escolha", () => {
  it("traduz a escolha exibida para a original", () => {
    const perm = [3, 2, 0, 1]; // exibida 1 = original 2 (correta)
    expect(montarVista(me, perm)).toEqual({ tipo: "multipla_escolha", alternativas: ["D", "C", "A", "B"] });
    expect(corrigir(me, perm, { tipo: "multipla_escolha", escolha: 1 })).toBe(1);
    expect(corrigir(me, perm, { tipo: "multipla_escolha", escolha: 2 })).toBe(0);
  });
  it("sem resposta ou fora do intervalo vale zero", () => {
    expect(corrigir(me, [0, 1, 2, 3], { tipo: "multipla_escolha", escolha: null })).toBe(0);
    expect(corrigir(me, [0, 1, 2, 3], { tipo: "multipla_escolha", escolha: 9 })).toBe(0);
    expect(corrigir(me, [0, 1, 2, 3], null)).toBe(0);
  });
  it("tipo de resposta diferente vale zero", () => {
    expect(corrigir(me, [0, 1, 2, 3], { tipo: "vf_bloco", valores: [true] })).toBe(0);
  });
});

describe("verdadeiro ou falso em bloco", () => {
  const vf: Conteudo = {
    tipo: "vf_bloco",
    conteudo: {
      afirmativas: [
        { texto: "a", verdadeira: true },
        { texto: "b", verdadeira: false },
        { texto: "c", verdadeira: true },
        { texto: "d", verdadeira: false },
      ],
    },
  };
  it("dá crédito proporcional", () => {
    const perm = [1, 0, 3, 2]; // exibidas: b(F) a(V) d(F) c(V)
    expect(corrigir(vf, perm, { tipo: "vf_bloco", valores: [false, true, false, true] })).toBe(1);
    expect(corrigir(vf, perm, { tipo: "vf_bloco", valores: [false, true, true, null] })).toBe(0.5);
  });
});

describe("linha do tempo", () => {
  const lt: Conteudo = {
    tipo: "linha_do_tempo",
    conteudo: { eventos: [{ texto: "1789" }, { texto: "1792" }, { texto: "1799" }, { texto: "1804" }] },
  };
  it("conta eventos na posição certa", () => {
    const perm = [2, 0, 3, 1]; // exibidos: 1799, 1789, 1804, 1792
    expect(corrigir(lt, perm, { tipo: "linha_do_tempo", ordem: [1, 3, 0, 2] })).toBe(1);
    // troca os dois últimos
    expect(corrigir(lt, perm, { tipo: "linha_do_tempo", ordem: [1, 3, 2, 0] })).toBe(0.5);
  });
  it("rejeita ordem que não é permutação", () => {
    expect(corrigir(lt, [0, 1, 2, 3], { tipo: "linha_do_tempo", ordem: [0, 0, 1, 2] })).toBe(0);
    expect(corrigir(lt, [0, 1, 2, 3], { tipo: "linha_do_tempo", ordem: [0, 1, 2] })).toBe(0);
  });
});

describe("pares", () => {
  const pares: Conteudo = {
    tipo: "pares",
    conteudo: {
      pares: [
        { esquerda: "Locke", direita: "propriedade" },
        { esquerda: "Montesquieu", direita: "três poderes" },
        { esquerda: "Rousseau", direita: "vontade geral" },
      ],
    },
  };
  it("conta ligações certas e ignora direita repetida", () => {
    const perm = [2, 0, 1]; // direita exibida: vontade geral, propriedade, três poderes
    expect(montarVista(pares, perm)).toMatchObject({ direita: ["vontade geral", "propriedade", "três poderes"] });
    expect(corrigir(pares, perm, { tipo: "pares", ligacoes: [1, 2, 0] })).toBe(1);
    expect(corrigir(pares, perm, { tipo: "pares", ligacoes: [1, 1, null] })).toBeCloseTo(1 / 3);
  });
});

describe("pontos e tempo", () => {
  it("arredonda pontos a duas casas", () => {
    expect(calcularPontos(1 / 3, 10)).toBe(3.33);
    expect(calcularPontos(1, 10)).toBe(10);
  });
  it("aplica folga de 3 s ao tempo limite", () => {
    const servida = new Date("2026-10-24T12:00:00Z");
    expect(tempoEsgotado(servida, new Date("2026-10-24T12:00:42Z"), 40)).toBe(false);
    expect(tempoEsgotado(servida, new Date("2026-10-24T12:00:44Z"), 40)).toBe(true);
  });
  it("permutação aleatória contém todos os índices", () => {
    expect([...permutacaoAleatoria(5)].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

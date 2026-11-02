import { describe, expect, it } from "vitest";
import {
  ajudaNaVista,
  aplicarAjuda,
  candidatasEliminacao,
  eliminadasNaVista,
  fixarOrdem,
  respostaComAjuda,
} from "../questoes/ajudas";
import { montarVista } from "../questoes/apresentacao";
import { corrigir } from "../questoes/correcao";
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

describe("eliminação nos outros formatos", () => {
  const cc: Conteudo = {
    tipo: "causa_consequencia",
    conteudo: {
      relacoes: [0, 1, 2].map((i) => ({ causa: `c${i}`, consequencia: `q${i}` })),
      extras: ["x", "y"],
    },
  };
  it("causa e consequência: tira as extras antes de travar", () => {
    expect(candidatasEliminacao(cc, [])).toEqual([3, 4]);
    expect(candidatasEliminacao(cc, [3])).toEqual([4]);
    expect(candidatasEliminacao(cc, [3, 4])).toEqual([0, 1, 2]);
    // Sempre sobram 2 causas em aberto.
    expect(candidatasEliminacao(cc, [3, 4, 1])).toEqual([]);
  });
  it("causa e consequência: monta a tela e trava a ligação certa", () => {
    // tela: [q2, x, q0, y, q1]
    const perm = [2, 3, 0, 4, 1];
    const ajuda = ajudaNaVista(cc, perm, [3, 0]);
    expect(ajuda).toEqual({ removidas: [1], fixas: [[0, 2]] });
    const vista = montarVista(cc, perm);
    const r = aplicarAjuda(vista, { tipo: "causa_consequencia", ligacoes: [null, 2, 1] }, ajuda);
    // A causa 0 ganha q0 (tela 2), que sai da causa 1; a extra riscada sai da causa 2.
    expect(r).toEqual({ tipo: "causa_consequencia", ligacoes: [2, null, null] });
    expect(
      corrigir(cc, perm, respostaComAjuda(cc, perm, [3, 0], { tipo: "causa_consequencia", ligacoes: [null, 4, 0] })),
    ).toBe(1);
  });
  it("V ou F revela o valor certo", () => {
    const vf: Conteudo = {
      tipo: "vf_bloco",
      conteudo: { afirmativas: [true, false, true, false].map((v) => ({ texto: "x", verdadeira: v })) },
    };
    expect(candidatasEliminacao(vf, [])).toEqual([0, 1, 2, 3]);
    expect(candidatasEliminacao(vf, [0, 1])).toEqual([]);
    const perm = [3, 2, 1, 0];
    const ajuda = ajudaNaVista(vf, perm, [1]);
    expect(ajuda.fixas).toEqual([[2, 0]]);
    const r = aplicarAjuda(montarVista(vf, perm), { tipo: "vf_bloco", valores: [null, null, true, null] }, ajuda);
    expect(r).toEqual({ tipo: "vf_bloco", valores: [null, null, false, null] });
  });
  it("ordenar: o item travado fica na posição certa e os outros mantêm a ordem", () => {
    expect(fixarOrdem([0, 1, 2, 3], [[2, 0]])).toEqual([2, 0, 1, 3]);
    expect(
      fixarOrdem(
        [3, 2, 1, 0],
        [
          [0, 3],
          [1, 0],
        ],
      ),
    ).toEqual([1, 3, 2, 0]);
    const of: Conteudo = { tipo: "ordenar_frases", conteudo: { frases: ["a", "b", "c", "d"] } };
    const perm = [2, 0, 3, 1]; // tela 0 = frase c
    const ajuda = ajudaNaVista(of, perm, [2]);
    expect(ajuda.fixas).toEqual([[0, 2]]);
  });
  it("encontrar o erro: só marca trechos certos e sempre deixa um certo", () => {
    const ee: Conteudo = {
      tipo: "encontrar_erro",
      conteudo: { trechos: [false, true, false, false].map((errado) => ({ texto: "t", errado })) },
    };
    expect(candidatasEliminacao(ee, [])).toEqual([0, 2, 3]);
    expect(candidatasEliminacao(ee, [0])).toEqual([2, 3]);
    expect(candidatasEliminacao(ee, [0, 2])).toEqual([]);
    const r = aplicarAjuda(montarVista(ee, []), { tipo: "encontrar_erro", marcados: [0] }, ajudaNaVista(ee, [], [0]));
    expect(r).toEqual({ tipo: "encontrar_erro", marcados: [] });
  });
  it("fonte primária: tira errada de uma pergunta, deixando 2 em cada", () => {
    const fp: Conteudo = {
      tipo: "fonte_primaria",
      conteudo: {
        documento: "",
        perguntas: [
          { pergunta: "p1", alternativas: ["a", "b", "c"], correta: 0 },
          { pergunta: "p2", alternativas: ["a", "b", "c", "d"], correta: 3 },
        ],
      },
    };
    expect(candidatasEliminacao(fp, [])).toEqual([1, 2, 3, 4, 5]);
    expect(candidatasEliminacao(fp, [1, 3, 4])).toEqual([]);
    const perm = [2, 1, 0, 6, 5, 4, 3];
    const ajuda = ajudaNaVista(fp, perm, [1, 3]);
    // p1 tela: [c, b, a] → b na posição 1; p2 tela: [d, c, b, a] → a (orig 3) na posição 3 → global 3 + 3.
    expect(ajuda.removidas).toEqual([1, 6]);
    const r = aplicarAjuda(montarVista(fp, perm), { tipo: "fonte_primaria", escolhas: [1, 3] }, ajuda);
    expect(r).toEqual({ tipo: "fonte_primaria", escolhas: [null, null] });
  });
  it("lacunas e mapa travam a opção certa e a tiram das outras", () => {
    const cl: Conteudo = {
      tipo: "completar_lacunas",
      conteudo: { texto: "___ e ___ e ___", lacunas: ["a", "b", "c"], extras: [] },
    };
    expect(candidatasEliminacao(cl, [])).toEqual([0, 1, 2]);
    const perm = [1, 2, 0];
    const ajuda = ajudaNaVista(cl, perm, [0]);
    expect(ajuda.fixas).toEqual([[0, 2]]);
    const r = aplicarAjuda(montarVista(cl, perm), { tipo: "completar_lacunas", preenchidas: [null, 2, 0] }, ajuda);
    expect(r).toEqual({ tipo: "completar_lacunas", preenchidas: [2, null, 0] });
  });
});

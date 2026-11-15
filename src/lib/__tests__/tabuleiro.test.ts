import { describe, expect, it } from "vitest";
import { ajudaNaVista, aplicarAjuda, candidatasEliminacao, respostaComAjuda } from "../questoes/ajudas";
import { montarVista, respostaCompleta, respostaInicial } from "../questoes/apresentacao";
import { corrigir } from "../questoes/correcao";
import { permutacaoAleatoria } from "../questoes/embaralhar";
import { schemaResposta, tamanhoPermutacao, validarConteudo, type Conteudo } from "../questoes/tipos";

const lincoln: Conteudo = {
  tipo: "tabuleiro",
  conteudo: {
    personagem: "Abraham Lincoln",
    casas: [
      { certa: "Presidente", errada: "Senado" },
      { certa: "Fim da escravidão", errada: "Manutenção" },
      { certa: "Liderou a União", errada: "Liderou os Confederados" },
      { certa: "Durante a guerra", errada: "Após a guerra" },
      { certa: "Teatro", errada: "Tuberculose" },
    ],
  },
};
// Casas 0, 2 e 4 com a certa à esquerda; 1 e 3 com a certa à direita.
const perm = [0, 1, 3, 2, 4, 5, 7, 6, 8, 9];

describe("tabuleiro", () => {
  it("valida de 3 a 6 casas", () => {
    expect(validarConteudo("tabuleiro", lincoln.conteudo).success).toBe(true);
    expect(validarConteudo("tabuleiro", { personagem: "X", casas: [{ certa: "a", errada: "b" }] }).success).toBe(false);
  });

  it("monta a vista com as opções na ordem sorteada e o retrato do personagem", () => {
    expect(tamanhoPermutacao(lincoln)).toBe(10);
    const vista = montarVista(lincoln, perm);
    expect(vista).toEqual({
      tipo: "tabuleiro",
      personagem: "Abraham Lincoln",
      avatar: "/personagens/abraham-lincoln.webp",
      casas: [
        ["Presidente", "Senado"],
        ["Manutenção", "Fim da escravidão"],
        ["Liderou a União", "Liderou os Confederados"],
        ["Após a guerra", "Durante a guerra"],
        ["Teatro", "Tuberculose"],
      ],
    });
    expect(respostaInicial(vista)).toEqual({ tipo: "tabuleiro", escolhas: [null, null, null, null, null] });
  });

  it("personagem sem retrato fica sem avatar", () => {
    const c = { ...lincoln, conteudo: { ...lincoln.conteudo, personagem: "Fulano de Tal" } } as Conteudo;
    expect(montarVista(c, perm)).toMatchObject({ avatar: null });
  });

  it("corrige por casa", () => {
    expect(corrigir(lincoln, perm, { tipo: "tabuleiro", escolhas: [0, 1, 0, 1, 0] })).toBe(1);
    expect(corrigir(lincoln, perm, { tipo: "tabuleiro", escolhas: [0, 1, 0, 0, 0] })).toBe(0.8);
    expect(corrigir(lincoln, perm, { tipo: "tabuleiro", escolhas: [1, 0, 1, 0, 1] })).toBe(0);
    expect(corrigir(lincoln, perm, { tipo: "tabuleiro", escolhas: [0, null, null, null, null] })).toBe(0.2);
    expect(respostaCompleta({ tipo: "tabuleiro", escolhas: [0, null, 1, 1, 1] })).toBe(false);
  });

  it("a resposta só aceita 0 ou 1 por casa", () => {
    expect(schemaResposta.safeParse({ tipo: "tabuleiro", escolhas: [0, 1, null] }).success).toBe(true);
    expect(schemaResposta.safeParse({ tipo: "tabuleiro", escolhas: [2] }).success).toBe(false);
  });

  it("eliminar trava uma casa com a opção certa e deixa ao menos 2 em aberto", () => {
    expect(candidatasEliminacao(lincoln, [])).toEqual([0, 1, 2, 3, 4]);
    expect(candidatasEliminacao(lincoln, [0, 1, 2])).toEqual([]);
    const ajuda = ajudaNaVista(lincoln, perm, [1, 3]);
    expect(ajuda.fixas).toEqual([
      [1, 1],
      [3, 1],
    ]);
    const vista = montarVista(lincoln, perm);
    expect(aplicarAjuda(vista, { tipo: "tabuleiro", escolhas: [0, 0, null, 0, null] }, ajuda)).toEqual({
      tipo: "tabuleiro",
      escolhas: [0, 1, null, 1, null],
    });
    const r = respostaComAjuda(lincoln, perm, [1], { tipo: "tabuleiro", escolhas: [0, 0, 0, 1, 0] });
    expect(corrigir(lincoln, perm, r)).toBe(1);
  });

  it("qualquer sorteio corrige a resposta certa como 100%", () => {
    for (let t = 0; t < 20; t++) {
      const p = permutacaoAleatoria(10);
      const vista = montarVista(lincoln, p);
      if (vista.tipo !== "tabuleiro") throw new Error();
      const certas = lincoln.tipo === "tabuleiro" ? lincoln.conteudo.casas.map((c) => c.certa) : [];
      const escolhas = vista.casas.map((casa, k) => casa.indexOf(certas[k]));
      expect(corrigir(lincoln, p, { tipo: "tabuleiro", escolhas })).toBe(1);
    }
  });
});

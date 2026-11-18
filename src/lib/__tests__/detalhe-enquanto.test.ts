import { describe, expect, it } from "vitest";
import { aplicarAjuda, ajudaNaVista, candidatasEliminacao, respostaComAjuda } from "../questoes/ajudas";
import { montarVista, respostaCompleta, respostaInicial } from "../questoes/apresentacao";
import { corrigir } from "../questoes/correcao";
import { candidatasDetalhe, dentroDaArea, notaEvento, quartoDoPonto } from "../questoes/detalhe";
import { schemaResposta, tamanhoPermutacao, validarConteudo, type Conteudo } from "../questoes/tipos";

const independencia: Conteudo = {
  tipo: "detalhe_imagem",
  conteudo: { imagem: "prof/quadro.jpg", x: 30, y: 40, raio: 8, proporcao: 1.5 },
};
const cd = independencia.conteudo as Extract<Conteudo, { tipo: "detalhe_imagem" }>["conteudo"];

const paralelas: Conteudo = {
  tipo: "enquanto_isso",
  conteudo: {
    linhas: ["Brasil", "Europa"],
    periodos: ["1750–1800", "1800–1850", "1850–1900"],
    eventos: [
      { texto: "Inconfidência Mineira", linha: 0, periodo: 0 },
      { texto: "Revolução Francesa", linha: 1, periodo: 0 },
      { texto: "Vinda da Corte portuguesa", linha: 0, periodo: 1 },
      { texto: "Congresso de Viena", linha: 1, periodo: 1 },
      { texto: "Lei Áurea", linha: 0, periodo: 2 },
      { texto: "Unificação alemã", linha: 1, periodo: 2 },
    ],
  },
};
const ce = paralelas.conteudo as Extract<Conteudo, { tipo: "enquanto_isso" }>["conteudo"];
const perm = [3, 0, 5, 1, 4, 2];

describe("detalhe na imagem", () => {
  it("valida e não tem permutação", () => {
    expect(validarConteudo("detalhe_imagem", cd).success).toBe(true);
    expect(validarConteudo("detalhe_imagem", { ...cd, posicionar: true }).success).toBe(false);
    expect(validarConteudo("detalhe_imagem", { ...cd, raio: 50 }).success).toBe(false);
    expect(tamanhoPermutacao(independencia)).toBe(0);
  });

  it("a tela recebe só a imagem, nunca a área", () => {
    const v = montarVista(independencia, []);
    expect(Object.keys(v).sort()).toEqual(["imagem", "tipo"]);
    expect(respostaCompleta(respostaInicial(v))).toBe(false);
  });

  it("acerta dentro do círculo, corrigido pela proporção da imagem", () => {
    expect(dentroDaArea(cd, { x: 30, y: 40 })).toBe(true);
    expect(dentroDaArea(cd, { x: 37, y: 40 })).toBe(true);
    expect(dentroDaArea(cd, { x: 39, y: 40 })).toBe(false);
    // Na altura, o raio é 8 × 1,5 = 12 pontos percentuais.
    expect(dentroDaArea(cd, { x: 30, y: 51 })).toBe(true);
    expect(dentroDaArea(cd, null)).toBe(false);
    expect(corrigir(independencia, [], { tipo: "detalhe_imagem", ponto: { x: 31, y: 42 } })).toBe(1);
    expect(corrigir(independencia, [], { tipo: "detalhe_imagem", ponto: { x: 80, y: 80 } })).toBe(0);
  });

  it("eliminação esconde quartos sem a área, no máximo 2", () => {
    // Área em x 22–38, y 28–52: encosta nos quartos 0 e 2.
    expect(candidatasDetalhe(cd, [])).toEqual([1, 3]);
    expect(candidatasEliminacao(independencia, [1])).toEqual([3]);
    expect(candidatasEliminacao(independencia, [1, 3])).toEqual([]);
    // Área no meio encosta nos 4 quartos: nada a esconder.
    expect(candidatasDetalhe({ ...cd, x: 50, y: 50 }, [])).toEqual([]);
  });

  it("ponto num quarto escondido não vale", () => {
    expect(quartoDoPonto({ x: 70, y: 20 })).toBe(1);
    const v = montarVista(independencia, []);
    const ajuda = ajudaNaVista(independencia, [], [1]);
    const r = aplicarAjuda(v, { tipo: "detalhe_imagem", ponto: { x: 70, y: 20 } }, ajuda);
    expect(r).toEqual({ tipo: "detalhe_imagem", ponto: null });
    expect(schemaResposta.safeParse({ tipo: "detalhe_imagem", ponto: { x: 120, y: 0 } }).success).toBe(false);
  });
});

describe("enquanto isso", () => {
  it("valida a grade", () => {
    expect(validarConteudo("enquanto_isso", ce).success).toBe(true);
    expect(validarConteudo("enquanto_isso", { ...ce, linhas: ["Brasil"] }).success).toBe(false);
    expect(
      validarConteudo("enquanto_isso", { ...ce, eventos: ce.eventos.map((e) => ({ ...e, linha: 0 })) }).success,
    ).toBe(false);
    expect(
      validarConteudo("enquanto_isso", { ...ce, eventos: ce.eventos.map((e) => ({ ...e, periodo: 5 })) }).success,
    ).toBe(false);
  });

  it("embaralha os eventos e não manda linha nem período", () => {
    const v = montarVista(paralelas, perm);
    if (v.tipo !== "enquanto_isso") throw new Error();
    expect(v.eventos[0]).toBe("Congresso de Viena");
    expect(v.eventos.every((e) => typeof e === "string")).toBe(true);
  });

  it("meio ponto pela linha, meio pelo período", () => {
    const e = ce.eventos[3]; // Europa, 1800–1850 → célula 4
    expect(notaEvento(ce, e, 4)).toBe(1);
    expect(notaEvento(ce, e, 1)).toBe(0.5); // Brasil, período certo
    expect(notaEvento(ce, e, 5)).toBe(0.5); // Europa, período errado
    expect(notaEvento(ce, e, 0)).toBe(0);
    expect(notaEvento(ce, e, null)).toBe(0);
  });

  it("corrige pela permutação", () => {
    // Tela: [Viena, Inconfidência, Unificação, Rev. Francesa, Lei Áurea, Corte]
    const certas = [4, 0, 5, 3, 2, 1];
    expect(corrigir(paralelas, perm, { tipo: "enquanto_isso", celulas: certas })).toBe(1);
    const trocada = [1, 0, 5, 3, 2, 1];
    expect(corrigir(paralelas, perm, { tipo: "enquanto_isso", celulas: trocada })).toBeCloseTo(5.5 / 6);
    expect(corrigir(paralelas, perm, { tipo: "enquanto_isso", celulas: [null, null, null, null, null, null] })).toBe(0);
  });

  it("eliminação trava um evento na célula certa", () => {
    expect(candidatasEliminacao(paralelas, [])).toEqual([0, 1, 2, 3, 4, 5]);
    const ajuda = ajudaNaVista(paralelas, perm, [3]); // Viena, na tela posição 0
    expect(ajuda.fixas).toEqual([[0, 4]]);
    const r = respostaComAjuda(paralelas, perm, [3], { tipo: "enquanto_isso", celulas: [0, 0, 5, 3, 2, 1] });
    expect(r).toEqual({ tipo: "enquanto_isso", celulas: [4, 0, 5, 3, 2, 1] });
    expect(respostaCompleta({ tipo: "enquanto_isso", celulas: [4, null] })).toBe(false);
  });
});

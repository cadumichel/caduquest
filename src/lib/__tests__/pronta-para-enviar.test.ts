import { describe, expect, it } from "vitest";
import { montarVista, oQueFalta, prontaParaEnviar, respostaInicial } from "../questoes/apresentacao";
import { TIPOS, type Conteudo, type Vista } from "../questoes/tipos";

const vista = (c: Conteudo, n: number) =>
  montarVista(
    c,
    Array.from({ length: n }, (_, i) => i),
  );

describe("prontaParaEnviar", () => {
  it("múltipla escolha só libera com uma alternativa escolhida", () => {
    const v = vista({ tipo: "multipla_escolha", conteudo: { alternativas: ["a", "b", "c", "d"], correta: 0 } }, 4);
    expect(prontaParaEnviar(v, respostaInicial(v), true)).toBe(false);
    expect(prontaParaEnviar(v, { tipo: "multipla_escolha", escolha: 2 }, true)).toBe(true);
  });

  it("V/F e pares exigem todos os itens", () => {
    const v = vista(
      {
        tipo: "vf_bloco",
        conteudo: {
          afirmativas: [
            { texto: "a", verdadeira: true },
            { texto: "b", verdadeira: false },
            { texto: "c", verdadeira: true },
          ],
        },
      },
      3,
    );
    expect(prontaParaEnviar(v, { tipo: "vf_bloco", valores: [true, null, false] }, true)).toBe(false);
    expect(prontaParaEnviar(v, { tipo: "vf_bloco", valores: [true, true, false] }, true)).toBe(true);
  });

  it("ordenar começa montado: só libera depois que o aluno mexe", () => {
    const v = vista({ tipo: "ordenar_frases", conteudo: { frases: ["a", "b", "c", "d"] } }, 4);
    const r = respostaInicial(v);
    expect(prontaParaEnviar(v, r, false)).toBe(false);
    expect(prontaParaEnviar(v, r, true)).toBe(true);
  });

  it("encontrar o erro exige marcar todos os trechos errados", () => {
    const v = vista(
      {
        tipo: "encontrar_erro",
        conteudo: {
          trechos: [
            { texto: "a", errado: true },
            { texto: "b", errado: false },
            { texto: "c", errado: true },
          ],
        },
      } as Conteudo,
      3,
    );
    expect(prontaParaEnviar(v, { tipo: "encontrar_erro", marcados: [0] }, true)).toBe(false);
    expect(prontaParaEnviar(v, { tipo: "encontrar_erro", marcados: [0, 1] }, true)).toBe(true);
  });

  it("textos para o aluno nunca falam em mouse", () => {
    for (const tipo of TIPOS) {
      expect(oQueFalta({ tipo, erros: 2 } as unknown as Vista)).not.toMatch(/mouse/i);
    }
  });
});

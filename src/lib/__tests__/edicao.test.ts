import { describe, expect, it } from "vitest";
import { formaDoConteudo, preservarImagem, soMudaTexto } from "../questoes/edicao";

describe("edição de questões", () => {
  const me = { alternativas: ["a", "b", "c", "d"], correta: 0 };

  it("aceita trocar só os textos", () => {
    expect(soMudaTexto(me, { alternativas: ["w", "x", "y", "z"], correta: 0 })).toBe(true);
    expect(
      soMudaTexto(
        { afirmativas: [{ texto: "a", verdadeira: true }, { texto: "b", verdadeira: false }] },
        { afirmativas: [{ verdadeira: true, texto: "c" }, { texto: "d", verdadeira: false }] },
      ),
    ).toBe(true);
  });

  it("recusa mudar a resposta ou a quantidade de itens", () => {
    expect(soMudaTexto(me, { alternativas: ["a", "b", "c", "d"], correta: 1 })).toBe(false);
    expect(soMudaTexto(me, { alternativas: ["a", "b", "c", "d", "e"], correta: 0 })).toBe(false);
    expect(
      soMudaTexto(
        { afirmativas: [{ texto: "a", verdadeira: true }] },
        { afirmativas: [{ texto: "a", verdadeira: false }] },
      ),
    ).toBe(false);
  });

  it("apaga o texto e mantém números e marcas", () => {
    expect(formaDoConteudo({ itens: [{ texto: "x", grupo: 2 }], grupos: ["A"] })).toEqual({
      grupos: [""],
      itens: [{ grupo: 2, texto: "" }],
    });
  });

  it("mantém a imagem e o retrato que a questão já tinha", () => {
    expect(preservarImagem({ retrato: "r.png", casas: [] }, { casas: [1] })).toEqual({ casas: [1], retrato: "r.png" });
    expect(preservarImagem({}, { casas: [1], retrato: "outro.png" })).toEqual({ casas: [1] });
  });
});

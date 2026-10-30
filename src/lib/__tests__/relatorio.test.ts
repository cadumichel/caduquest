import { describe, expect, it } from "vitest";
import { celulaCsv, marcaResultado, rotuloResultado } from "../relatorio";

const r = (fracao: number | null, extra: { esgotada?: boolean; zerada?: boolean } = {}) => ({
  fracao,
  esgotada: false,
  zerada: false,
  ...extra,
});

describe("relatório de desempenho", () => {
  it("diz se o aluno acertou, errou ou acertou em parte", () => {
    expect(rotuloResultado(r(1))).toBe("acertou");
    expect(rotuloResultado(r(0))).toBe("errou");
    expect(rotuloResultado(r(0.5))).toBe("parcial (50%)");
    expect(rotuloResultado(undefined)).toBe("não respondeu");
  });

  it("explica o zero por tempo ou por sair da tela", () => {
    expect(rotuloResultado(r(0, { esgotada: true }))).toBe("tempo esgotado");
    expect(rotuloResultado(r(0, { zerada: true }))).toBe("zerada (saiu da tela)");
  });

  it("marca a grade da tela", () => {
    expect(marcaResultado(r(1))).toBe("certa");
    expect(marcaResultado(r(0))).toBe("errada");
    expect(marcaResultado(r(0.33))).toBe("parcial");
    expect(marcaResultado(r(null))).toBe("vazia");
  });

  it("protege células com ; e aspas no CSV", () => {
    expect(celulaCsv('Brasil; "Império"')).toBe('"Brasil; ""Império"""');
    expect(celulaCsv(null)).toBe("");
  });
});

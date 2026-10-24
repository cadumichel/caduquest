import { describe, expect, it } from "vitest";
import { INICIO_ESPECIAIS, medalhasNecessarias, PERSONAGENS, TOTAL_PERSONAGENS } from "../personagens";

describe("personagens", () => {
  it("tem 20 básicos e 10 especiais, sem repetição", () => {
    expect(INICIO_ESPECIAIS).toBe(20);
    expect(TOTAL_PERSONAGENS).toBe(30);
    expect(new Set(PERSONAGENS.map((p) => p.nome)).size).toBe(30);
  });

  it("libera um especial por desafio vencido", () => {
    expect(medalhasNecessarias(0)).toBe(0);
    expect(medalhasNecessarias(19)).toBe(0);
    expect(medalhasNecessarias(20)).toBe(1);
    expect(medalhasNecessarias(29)).toBe(10);
  });
});

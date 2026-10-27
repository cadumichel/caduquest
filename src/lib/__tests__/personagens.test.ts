import { describe, expect, it } from "vitest";
import { BASICOS, medalhasNecessarias, ORDEM_ESPECIAIS, PERSONAGENS, TOTAL_PERSONAGENS } from "../personagens";

describe("personagens", () => {
  it("tem 30 básicos e 15 especiais, sem repetição", () => {
    expect(TOTAL_PERSONAGENS).toBe(45);
    expect(new Set(PERSONAGENS.map((p) => p.nome)).size).toBe(45);
    expect(new Set(BASICOS).size).toBe(30);
    expect(new Set(ORDEM_ESPECIAIS).size).toBe(15);
    expect(ORDEM_ESPECIAIS).not.toContain(-1);
    expect([...BASICOS, ...ORDEM_ESPECIAIS].sort((a, b) => a - b)).toEqual(PERSONAGENS.map((_, i) => i));
  });

  it("mantém os índices já salvos pelos alunos", () => {
    expect(PERSONAGENS[7].nome).toBe("Samurai");
    expect(PERSONAGENS[20].nome).toBe("Cleópatra");
    expect(PERSONAGENS[29].nome).toBe("Albert Einstein");
  });

  it("libera um especial por desafio vencido", () => {
    expect(medalhasNecessarias(0)).toBe(0);
    expect(medalhasNecessarias(35)).toBe(0);
    expect(medalhasNecessarias(20)).toBe(1);
    expect(medalhasNecessarias(ORDEM_ESPECIAIS[14])).toBe(15);
  });
});

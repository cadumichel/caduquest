import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BASICOS, medalhasNecessarias, ORDEM_ESPECIAIS, PERSONAGENS, TOTAL_PERSONAGENS } from "../personagens";

describe("personagens", () => {
  it("tem 113 básicos e 24 especiais, sem repetição", () => {
    expect(TOTAL_PERSONAGENS).toBe(137);
    expect(new Set(PERSONAGENS.map((p) => p.nome)).size).toBe(137);
    expect(new Set(BASICOS).size).toBe(113);
    expect(new Set(ORDEM_ESPECIAIS).size).toBe(24);
    expect(ORDEM_ESPECIAIS).not.toContain(-1);
    expect([...BASICOS, ...ORDEM_ESPECIAIS].sort((a, b) => a - b)).toEqual(PERSONAGENS.map((_, i) => i));
  });

  it("mantém os índices já salvos pelos alunos", () => {
    expect(PERSONAGENS[7].nome).toBe("Samurai");
    expect(PERSONAGENS[20].nome).toBe("Cleópatra");
    expect(PERSONAGENS[29].nome).toBe("Albert Einstein");
    expect(PERSONAGENS[44].nome).toBe("Malala");
    expect(PERSONAGENS[45].nome).toBe("Antonieta de Barros");
  });

  it("libera um especial por desafio vencido", () => {
    expect(medalhasNecessarias(0)).toBe(0);
    expect(medalhasNecessarias(35)).toBe(0);
    expect(medalhasNecessarias(20)).toBe(1);
    expect(medalhasNecessarias(ORDEM_ESPECIAIS[14])).toBe(15);
    expect(medalhasNecessarias(ORDEM_ESPECIAIS[21])).toBe(22);
  });

  it("tem uma ilustração para cada personagem", () => {
    for (const p of PERSONAGENS) expect(existsSync(join(process.cwd(), "public", p.imagem)), p.nome).toBe(true);
  });
});

describe("curiosidades dos personagens", () => {
  it("todo personagem tem uma curiosidade no álbum", async () => {
    const { PERSONAGENS } = await import("../personagens");
    const { CURIOSIDADE_PERSONAGEM } = await import("../personagens-curiosidades");
    for (const p of PERSONAGENS) expect(CURIOSIDADE_PERSONAGEM[p.nome], p.nome).toBeTruthy();
  });
});

describe("desbloqueio dos personagens", async () => {
  const { INICIAIS, ORDEM_BASICOS, nivelNecessario, personagemLiberado } = await import("../personagens");
  it("começa com 10 básicos e libera 3 por nível até todos", () => {
    expect(INICIAIS).toHaveLength(10);
    expect(INICIAIS).not.toContain(-1);
    expect(new Set(ORDEM_BASICOS).size).toBe(113);
    expect(ORDEM_BASICOS.filter((i) => nivelNecessario(i) === 1)).toHaveLength(10);
    expect(ORDEM_BASICOS.filter((i) => nivelNecessario(i) === 2)).toHaveLength(3);
    expect(Math.max(...ORDEM_BASICOS.map(nivelNecessario))).toBe(36);
  });
  it("lista inicial diversa: metade meninas e Antonieta de Barros no lugar da Baiana", () => {
    const nomes = INICIAIS.map((i) => PERSONAGENS[i].nome);
    expect(nomes).toContain("Antonieta de Barros");
    expect(nomes).not.toContain("Baiana do acarajé");
  });
  it("lendários só com desafios vencidos, básicos só com nível", () => {
    expect(personagemLiberado(ORDEM_ESPECIAIS[0], { nivel: 50, medalhas: 0 })).toBe(false);
    expect(personagemLiberado(ORDEM_ESPECIAIS[0], { nivel: 1, medalhas: 1 })).toBe(true);
    expect(personagemLiberado(ORDEM_BASICOS[10], { nivel: 1, medalhas: 10 })).toBe(false);
    expect(personagemLiberado(ORDEM_BASICOS[10], { nivel: 2, medalhas: 0 })).toBe(true);
  });
});

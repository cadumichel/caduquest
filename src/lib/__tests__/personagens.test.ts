import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BASICOS, numeroDoLendario, ORDEM_ESPECIAIS, PERSONAGENS, TOTAL_PERSONAGENS } from "../personagens";

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

  it("numera os lendários na ordem de liberação", () => {
    expect(numeroDoLendario(0)).toBe(0);
    expect(numeroDoLendario(20)).toBe(1);
    expect(numeroDoLendario(ORDEM_ESPECIAIS[14])).toBe(15);
    expect(numeroDoLendario(ORDEM_ESPECIAIS[23])).toBe(24);
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
  const { INICIAIS, ORDEM_BASICOS, calcularDesbloqueios, personagemLiberado, basicosLiberados } =
    await import("../personagens");
  it("começa com os 10 iniciais", () => {
    expect(INICIAIS).toHaveLength(10);
    expect(INICIAIS).not.toContain(-1);
    expect(new Set(ORDEM_BASICOS).size).toBe(113);
    const nada = { basicos: 0, lendarios: 0 };
    expect(basicosLiberados(nada)).toBe(10);
    expect(personagemLiberado(ORDEM_BASICOS[9], nada)).toBe(true);
    expect(personagemLiberado(ORDEM_BASICOS[10], nada)).toBe(false);
    expect(personagemLiberado(ORDEM_ESPECIAIS[0], nada)).toBe(false);
  });
  it("lista inicial diversa: Antonieta de Barros no lugar da Baiana", () => {
    const nomes = INICIAIS.map((i) => PERSONAGENS[i].nome);
    expect(nomes).toContain("Antonieta de Barros");
    expect(nomes).not.toContain("Baiana do acarajé");
  });
  it("desafio com mais da metade de acertos libera 4; metade ou menos, 1", () => {
    const d = calcularDesbloqueios({
      desafios: [
        { id: "a", acerto: 0.6 },
        { id: "b", acerto: 0.5 },
        { id: "c", acerto: 0.2 },
      ],
      temporadas: [],
      vitorias: 0,
    });
    expect(d).toEqual({ basicos: 6, lendarios: 0 });
    expect(personagemLiberado(ORDEM_BASICOS[15], d)).toBe(true);
    expect(personagemLiberado(ORDEM_BASICOS[16], d)).toBe(false);
  });
  it("temporada completa e encerrada: lendário com 50% ou mais, básico abaixo", () => {
    const desafios = [
      { id: "a", acerto: 0.8 },
      { id: "b", acerto: 0.2 },
      { id: "c", acerto: 0.3 },
      { id: "d", acerto: 0.3 },
    ];
    const d = calcularDesbloqueios({
      desafios,
      temporadas: [
        { desafios: ["a", "b"], encerrada: true }, // média 0,5: lendário
        { desafios: ["c", "d"], encerrada: true }, // média 0,3: básico
        { desafios: ["a", "x"], encerrada: true }, // faltou um desafio: nada
        { desafios: ["a"], encerrada: false }, // ainda em andamento: nada
      ],
      vitorias: 2,
    });
    expect(d).toEqual({ basicos: 4 + 1 + 1 + 1 + 1, lendarios: 1 + 2 });
    expect(personagemLiberado(ORDEM_ESPECIAIS[2], d)).toBe(true);
    expect(personagemLiberado(ORDEM_ESPECIAIS[3], d)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { contarVitorias } from "../medalhas";

describe("contarVitorias", () => {
  it("dá a medalha a quem fez mais pontos em cada desafio, incluindo empates", () => {
    const v = contarVitorias([
      { desafio_id: "d1", aluno_id: "ana", pontos: 40 },
      { desafio_id: "d1", aluno_id: "bia", pontos: 30 },
      { desafio_id: "d2", aluno_id: "ana", pontos: 20 },
      { desafio_id: "d2", aluno_id: "bia", pontos: 20 },
      { desafio_id: "d2", aluno_id: "caio", pontos: 10 },
    ]);
    expect(Object.fromEntries(v)).toEqual({ ana: 2, bia: 1 });
  });

  it("não dá medalha em desafio sem pontos", () => {
    const v = contarVitorias([
      { desafio_id: "d1", aluno_id: "ana", pontos: 0 },
      { desafio_id: "d1", aluno_id: "bia", pontos: 0 },
    ]);
    expect(v.size).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { permutacaoSemRanking, permutacaoValida } from "../questoes/embaralhar";

describe("permutacaoSemRanking", () => {
  it("mantém a ordem original nos formatos com letras", () => {
    for (const tipo of ["multipla_escolha", "interpretacao", "quem_disse"]) {
      expect(permutacaoSemRanking(tipo, 5, () => 0.1)).toEqual([0, 1, 2, 3, 4]);
    }
  });
  it("continua embaralhando os outros formatos", () => {
    const p = permutacaoSemRanking("ordenar_frases", 5, () => 0.1);
    expect(permutacaoValida(p, 5)).toBe(true);
    expect(p).not.toEqual([0, 1, 2, 3, 4]);
  });
});

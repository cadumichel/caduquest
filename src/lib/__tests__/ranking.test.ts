import { describe, expect, it } from "vitest";
import { montarRanking, rankingParaAluno } from "../ranking";

describe("ranking da temporada", () => {
  it("ordena por pontos e desempata por acerto", () => {
    const r = montarRanking([
      { alunoId: "a", apelido: "Ana", pontos: 50, somaFracoes: 4, questoes: 5 },
      { alunoId: "b", apelido: "Beto", pontos: 50, somaFracoes: 5, questoes: 5 },
      { alunoId: "c", apelido: "Caio", pontos: 80, somaFracoes: 4, questoes: 5 },
      { alunoId: "d", apelido: "Duda", pontos: 0, somaFracoes: 0, questoes: 0 },
    ]);
    expect(r.map((l) => [l.apelido, l.posicao])).toEqual([
      ["Caio", 1],
      ["Beto", 2],
      ["Ana", 3],
      ["Duda", 4],
    ]);
  });
  it("empate total divide a posição", () => {
    const r = montarRanking([
      { alunoId: "a", apelido: "Ana", pontos: 10, somaFracoes: 1, questoes: 1 },
      { alunoId: "b", apelido: "Beto", pontos: 10, somaFracoes: 1, questoes: 1 },
      { alunoId: "c", apelido: "Caio", pontos: 5, somaFracoes: 1, questoes: 2 },
    ]);
    expect(r.map((l) => l.posicao)).toEqual([1, 1, 3]);
  });
  it("aluno vê só o top 10 e a própria posição", () => {
    const entradas = Array.from({ length: 15 }, (_, i) => ({
      alunoId: String(i),
      apelido: `A${String(i).padStart(2, "0")}`,
      pontos: 100 - i,
      somaFracoes: 1,
      questoes: 1,
    }));
    const vista = rankingParaAluno(montarRanking(entradas), "14");
    expect(vista.top).toHaveLength(10);
    expect(vista.eu?.posicao).toBe(15);
    expect(vista.top.some((l) => l.alunoId === "14")).toBe(false);
  });
});

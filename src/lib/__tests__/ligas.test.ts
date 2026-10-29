import { describe, expect, it } from "vitest";
import { calcularMetaTurma, montarLigas } from "../ligas";

describe("montarLigas", () => {
  it("com poucos alunos pontuando, joga uma liga só", () => {
    const ligas = montarLigas([
      { alunoId: "a", pontosAntes: 10, pontosSemana: 0 },
      { alunoId: "b", pontosAntes: 0, pontosSemana: 5 },
    ]);
    expect(ligas).toHaveLength(1);
    expect(ligas[0].divisao).toBe("Turma");
    expect(ligas[0].membros.map((m) => m.alunoId)).toEqual(["b", "a"]);
  });
  it("divide em Ouro, Prata e Bronze pelos pontos anteriores e ordena pelos da semana", () => {
    const entradas = Array.from({ length: 9 }, (_, i) => ({
      alunoId: `a${i}`,
      pontosAntes: 100 - i * 10,
      pontosSemana: i,
    }));
    const ligas = montarLigas(entradas);
    expect(ligas.map((l) => l.divisao)).toEqual(["Ouro", "Prata", "Bronze"]);
    expect(ligas[2].membros.map((m) => m.alunoId)).toEqual(["a8", "a7", "a6"]);
    expect(ligas[2].membros[0].posicao).toBe(1);
  });
});

describe("calcularMetaTurma", () => {
  const agora = new Date("2026-11-04T15:00:00Z");
  const semanas = [
    [{ id: "d1", abre_em: "2026-10-26T11:00:00Z", fecha_em: "2026-10-30T23:00:00Z" }],
    [{ id: "d2", abre_em: "2026-11-02T11:00:00Z", fecha_em: "2026-11-06T23:00:00Z" }],
  ];
  const alunos = ["a", "b", "c", "d", "e"];
  it("dá bônus a todos quando 80% conclui a semana", () => {
    const concluidos = new Map([
      ["a", new Set(["d1", "d2"])],
      ["b", new Set(["d1", "d2"])],
      ["c", new Set(["d1"])],
      ["d", new Set(["d1"])],
    ]);
    const meta = calcularMetaTurma(semanas, concluidos, alunos, agora);
    expect(meta.semanasBatidas).toBe(1);
    expect(meta.bonus).toBe(10);
    expect(meta.atual).toMatchObject({ participantes: 2, total: 5, batida: false, faltam: 2 });
  });
});

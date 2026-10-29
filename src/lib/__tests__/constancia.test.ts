import { describe, expect, it } from "vitest";
import { agruparPorSemana, calcularConstancia, segundaDaSemana } from "../constancia";

const agora = new Date("2026-11-20T12:00:00Z");
// Semanas de novembro de 2026: 02, 09, 16 (em andamento).
const d = (id: string, segunda: string, fechada = true) => ({
  id,
  abre_em: `${segunda}T11:00:00Z`,
  fecha_em: fechada ? `${segunda}T23:00:00Z` : "2026-11-22T23:00:00Z",
});

describe("segundaDaSemana", () => {
  it("usa o horário de Brasília", () => {
    expect(segundaDaSemana("2026-11-04T15:00:00Z")).toBe("2026-11-02"); // quarta
    expect(segundaDaSemana("2026-11-09T02:00:00Z")).toBe("2026-11-02"); // domingo 23h em Brasília
    expect(segundaDaSemana("2026-11-09T03:00:00Z")).toBe("2026-11-09"); // segunda 0h
  });
});

describe("calcularConstancia", () => {
  const semanas = agruparPorSemana([
    d("a", "2026-11-02"),
    d("b", "2026-11-04"),
    d("c", "2026-11-09"),
    d("e", "2026-11-16", false),
  ]);

  it("agrupa por semana", () => {
    expect(semanas.map((s) => s.map((x) => x.id))).toEqual([["a", "b"], ["c"], ["e"]]);
  });

  it("dá 20 na primeira semana e 25 nas seguidas", () => {
    expect(calcularConstancia(semanas, new Set(["a", "b", "c", "e"]), agora)).toEqual({
      bonus: 20 + 25 + 25,
      sequencia: 3,
      semanasCompletas: 3,
      maiorSequencia: 3,
    });
  });

  it("semana incompleta zera a sequência, não os pontos", () => {
    expect(calcularConstancia(semanas, new Set(["a", "c"]), agora)).toEqual({
      bonus: 20,
      sequencia: 1,
      semanasCompletas: 1,
      maiorSequencia: 1,
    });
  });

  it("semana em andamento não quebra a ofensiva", () => {
    expect(calcularConstancia(semanas, new Set(["a", "b", "c"]), agora)).toEqual({
      bonus: 45,
      sequencia: 2,
      semanasCompletas: 2,
      maiorSequencia: 2,
    });
  });
});

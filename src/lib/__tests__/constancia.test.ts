import { describe, expect, it } from "vitest";
import { agruparPorSemana, calcularConstancia, passosDaOfensiva, segundaDaSemana } from "../constancia";

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

describe("agruparPorSemana", () => {
  it("agrupa por semana", () => {
    const semanas = agruparPorSemana([d("a", "2026-11-02"), d("b", "2026-11-04"), d("c", "2026-11-09")]);
    expect(semanas.map((s) => s.map((x) => x.id))).toEqual([["a", "b"], ["c"]]);
  });
});

describe("calcularConstancia (ofensiva até a prova)", () => {
  const desafios = [d("a", "2026-11-02"), d("b", "2026-11-04"), d("c", "2026-11-09"), d("e", "2026-11-16", false)];

  it("dá +10 no primeiro desafio e +2 a mais a cada desafio seguido", () => {
    expect(calcularConstancia(desafios, new Set(["a", "b", "c", "e"]), agora)).toEqual({
      bonus: 10 + 12 + 14 + 16,
      sequencia: 4,
      desafiosCompletos: 4,
      maiorSequencia: 4,
    });
  });

  it("desafio perdido zera a sequência, não os pontos", () => {
    expect(calcularConstancia(desafios, new Set(["a", "c"]), agora)).toEqual({
      bonus: 10 + 10,
      sequencia: 1,
      desafiosCompletos: 2,
      maiorSequencia: 1,
    });
  });

  it("desafio aberto não quebra a ofensiva", () => {
    expect(calcularConstancia(desafios, new Set(["a", "b", "c"]), agora)).toMatchObject({ sequencia: 3 });
  });

  it("o bônus por desafio não passa de +20", () => {
    const muitos = Array.from({ length: 10 }, (_, i) => d(`x${i}`, `2026-10-${String(10 + i).padStart(2, "0")}`));
    const r = calcularConstancia(muitos, new Set(muitos.map((x) => x.id)), agora);
    expect(r.bonus).toBe(10 + 12 + 14 + 16 + 18 + 20 * 5);
  });
});

describe("passosDaOfensiva", () => {
  it("marca feito, perdido, aberto e futuro", () => {
    const futuro = { id: "f", abre_em: "2026-11-30T11:00:00Z", fecha_em: "2026-12-04T23:00:00Z" };
    const passos = passosDaOfensiva(
      [d("a", "2026-11-02"), d("c", "2026-11-09"), d("e", "2026-11-16", false), futuro],
      new Set(["a"]),
      agora,
    );
    expect(passos.map((p) => p.passo)).toEqual(["feito", "perdido", "aberto", "futuro"]);
  });
});

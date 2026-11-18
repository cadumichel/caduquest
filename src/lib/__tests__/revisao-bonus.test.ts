import { describe, expect, it } from "vitest";
import { BONUS_REVISAO, bonusDeRevisoes, diaEmBrasilia, LIMITE_REVISAO_DIA } from "../revisao-bonus";

describe("bonusDeRevisoes", () => {
  it("vale BONUS_REVISAO por erro corrigido", () => {
    expect(bonusDeRevisoes(["2026-11-10T15:00:00Z", "2026-11-11T15:00:00Z"], "2026-11-01", "2026-11-30")).toEqual({
      corrigidos: 2,
      bonus: 2 * BONUS_REVISAO,
    });
  });
  it("limita por dia de Brasília", () => {
    const mesmoDia = Array.from({ length: LIMITE_REVISAO_DIA + 3 }, (_, i) => `2026-11-10T1${i}:00:00Z`);
    // 02:30 UTC do dia 11 ainda é dia 10 em Brasília.
    const r = bonusDeRevisoes(
      [...mesmoDia, "2026-11-11T02:30:00Z", "2026-11-11T04:00:00Z"],
      "2026-11-01",
      "2026-11-30",
    );
    expect(r.corrigidos).toBe(LIMITE_REVISAO_DIA + 1);
  });
  it("só conta dentro da temporada", () => {
    expect(bonusDeRevisoes(["2026-10-31T20:00:00Z", "2026-12-01T12:00:00Z"], "2026-11-01", "2026-11-30").bonus).toBe(0);
    expect(diaEmBrasilia("2026-12-01T02:59:00Z")).toBe("2026-11-30");
  });
});

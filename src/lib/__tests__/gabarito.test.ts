import { describe, expect, it } from "vitest";
import { tempoEsgotado } from "../questoes/correcao";
import { gabaritoLiberado } from "../tipos-banco";

describe("gabarito liberado", () => {
  const desafio = { fecha_em: "2026-10-30T15:00:00Z" };

  it("não aparece logo que o desafio fecha", () => {
    expect(gabaritoLiberado(desafio, new Date("2026-10-30T15:00:01Z"))).toBe(false);
    expect(gabaritoLiberado(desafio, new Date("2026-10-30T15:03:00Z"))).toBe(false);
  });

  it("aparece depois que a última questão possível acabou", () => {
    expect(gabaritoLiberado(desafio, new Date("2026-10-30T15:03:04Z"))).toBe(true);
  });

  it("questão aberta um segundo antes de fechar esgota antes do gabarito sair", () => {
    // Tempo máximo de questão aceito depois do fechamento: 180 s.
    const servida = new Date("2026-10-30T14:59:59Z");
    const fimDaQuestao = new Date(servida.getTime() + (180 + 3) * 1000 + 1);
    expect(tempoEsgotado(servida, fimDaQuestao, 180)).toBe(true);
    expect(gabaritoLiberado(desafio, fimDaQuestao)).toBe(false);
  });

  it("com liberação manual, espera o professor mesmo depois do prazo", () => {
    const manual = { ...desafio, gabarito_manual: true, gabarito_liberado_em: null };
    expect(gabaritoLiberado(manual, new Date("2026-10-31T15:00:00Z"))).toBe(false);
    const liberado = { ...manual, gabarito_liberado_em: "2026-10-30T15:01:00Z" };
    expect(gabaritoLiberado(liberado, new Date("2026-10-30T15:02:00Z"))).toBe(false);
    expect(gabaritoLiberado(liberado, new Date("2026-10-30T15:03:04Z"))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { tempoEsgotado } from "../questoes/correcao";
import { faseDaTemporada, fimDaPontuacao, gabaritoLiberado, pontuacaoEncerrada } from "../tipos-banco";

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

describe("encerramento da temporada", () => {
  const temporada = { data_prova: "2026-11-20", encerramento: "2026-11-13" };
  const manual = { fecha_em: "2026-11-05T15:00:00Z", gabarito_manual: true, gabarito_liberado_em: null };

  it("a pontuação vai até 23h59 do encerramento; sem encerramento, até o dia da prova", () => {
    expect(fimDaPontuacao(temporada).toISOString()).toBe("2026-11-14T02:59:00.000Z");
    expect(fimDaPontuacao({ data_prova: "2026-11-20" }).toISOString()).toBe("2026-11-21T02:59:00.000Z");
    expect(pontuacaoEncerrada(temporada, new Date("2026-11-14T02:58:00Z"))).toBe(false);
    expect(pontuacaoEncerrada(temporada, new Date("2026-11-14T03:00:00Z"))).toBe(true);
  });

  it("encerrar na mão antecipa o fim da pontuação", () => {
    const antes = { ...temporada, encerrada_em: "2026-11-10T12:00:00Z" };
    expect(fimDaPontuacao(antes).toISOString()).toBe("2026-11-10T12:00:00.000Z");
  });

  it("libera no encerramento o gabarito guardado para liberação manual", () => {
    const d = { ...manual, temporadas: temporada };
    expect(gabaritoLiberado(d, new Date("2026-11-13T15:00:00Z"))).toBe(false);
    expect(gabaritoLiberado(d, new Date("2026-11-14T03:00:00Z"))).toBe(true);
  });

  it("respeita quem desligou a liberação no encerramento e o 'nunca mostrar'", () => {
    const desligado = { ...manual, temporadas: { ...temporada, gabarito_no_encerramento: false } };
    expect(gabaritoLiberado(desligado, new Date("2026-11-15T12:00:00Z"))).toBe(false);
    const nunca = { fecha_em: manual.fecha_em, gabarito_nunca: true, temporadas: temporada };
    expect(gabaritoLiberado(nunca, new Date("2026-11-15T12:00:00Z"))).toBe(false);
  });
});

describe("fase da temporada", () => {
  const t = { data_prova: "2026-11-20", encerramento: "2026-11-13" };
  it("pontos até o encerramento, estudo até a prova, depois encerrada", () => {
    expect(faseDaTemporada(t, new Date("2026-11-13T20:00:00Z"))).toBe("pontos");
    expect(faseDaTemporada(t, new Date("2026-11-15T12:00:00Z"))).toBe("estudo");
    expect(faseDaTemporada(t, new Date("2026-11-20T23:00:00Z"))).toBe("estudo");
    expect(faseDaTemporada(t, new Date("2026-11-21T12:00:00Z"))).toBe("encerrada");
  });
});

import { describe, expect, it } from "vitest";
import { problemaTempoQuestao, problemaTempoVerificacao, tempoEfetivo, tempoVerificacao } from "../questoes/tempos";

describe("tempo de cada questão no desafio", () => {
  it("vazio = tempo da própria questão", () => {
    expect(tempoEfetivo({ daQuestao: 40 })).toBe(40);
    expect(tempoEfetivo({ daQuestao: 40, noDesafio: null, fixoDoDesafio: null })).toBe(40);
  });

  it("tempo único do desafio vale para todas, sem aumentar a relâmpago", () => {
    expect(tempoEfetivo({ daQuestao: 40, fixoDoDesafio: 90 })).toBe(90);
    expect(tempoEfetivo({ daQuestao: 12, relampago: true, fixoDoDesafio: 90 })).toBe(12);
    expect(tempoEfetivo({ daQuestao: 12, relampago: true, fixoDoDesafio: 8 })).toBe(8);
  });

  it("o tempo escrito para a questão no desafio vence os outros", () => {
    expect(tempoEfetivo({ daQuestao: 40, noDesafio: 75, fixoDoDesafio: 90 })).toBe(75);
    expect(tempoEfetivo({ daQuestao: 12, relampago: true, noDesafio: 18, fixoDoDesafio: 8 })).toBe(18);
  });

  it("valida os limites", () => {
    expect(problemaTempoQuestao(30, false)).toBeNull();
    expect(problemaTempoQuestao(4, false)).not.toBeNull();
    expect(problemaTempoQuestao(601, false)).not.toBeNull();
    expect(problemaTempoQuestao(25, true)).not.toBeNull();
    expect(problemaTempoQuestao(20, true)).toBeNull();
    expect(problemaTempoQuestao(12.5, false)).not.toBeNull();
  });
});

describe("tempo da verificação de leitura", () => {
  it("vazio = 15 s", () => {
    expect(tempoVerificacao({})).toBe(15);
    expect(tempoVerificacao({ tempo_verificacao_s: null })).toBe(15);
    expect(tempoVerificacao({ tempo_verificacao_s: 25 })).toBe(25);
  });

  it("valida os limites", () => {
    expect(problemaTempoVerificacao(5)).toBeNull();
    expect(problemaTempoVerificacao(60)).toBeNull();
    expect(problemaTempoVerificacao(4)).not.toBeNull();
    expect(problemaTempoVerificacao(61)).not.toBeNull();
  });
});

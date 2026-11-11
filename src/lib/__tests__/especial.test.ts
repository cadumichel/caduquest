import { describe, expect, it } from "vitest";
import { descreverEspecial, percentualEmVigor, pontosBase, pontosDoEspecial, reduzirTempo } from "../especial";
import { conferirPadroes, lerPadroes, PADROES_FABRICA } from "../padroes";
import { tempoEfetivo } from "../questoes/tempos";

describe("desafio especial", () => {
  it("multiplica os pontos e desfaz o multiplicador", () => {
    expect(pontosDoEspecial(10, 2)).toBe(20);
    expect(pontosDoEspecial(10, 1.5)).toBe(15);
    expect(pontosDoEspecial(50, 3)).toBe(100);
    expect(pontosBase({ pontos_por_acerto: 20, especial: true, multiplicador: 2 })).toBe(10);
    expect(pontosBase({ pontos_por_acerto: 20, especial: false, multiplicador: 2 })).toBe(20);
  });

  it("reduz o tempo só no especial, com mínimo de 5 s", () => {
    expect(percentualEmVigor({ especial: true, tempo_percentual: 75 })).toBe(75);
    expect(percentualEmVigor({ especial: true, tempo_percentual: 100 })).toBeNull();
    expect(percentualEmVigor({ especial: false, tempo_percentual: 50 })).toBeNull();
    expect(reduzirTempo(40, 75)).toBe(30);
    expect(reduzirTempo(8, 50)).toBe(5);
    expect(reduzirTempo(40, null)).toBe(40);
  });

  it("o tempo escrito para a questão no desafio não é reduzido", () => {
    expect(tempoEfetivo({ daQuestao: 40, percentual: 50 })).toBe(20);
    expect(tempoEfetivo({ daQuestao: 40, fixoDoDesafio: 60, percentual: 50 })).toBe(30);
    expect(tempoEfetivo({ daQuestao: 40, noDesafio: 33, percentual: 50 })).toBe(33);
  });

  it("descreve o especial", () => {
    expect(descreverEspecial({ especial: true, multiplicador: 1.5, tempo_percentual: 75 })).toBe(
      "1,5× pontos · 75% do tempo",
    );
    expect(descreverEspecial({ especial: false })).toBe("");
  });
});

describe("padrões do professor", () => {
  it("sem nada gravado vale o de fábrica", () => {
    expect(lerPadroes(null)).toEqual(PADROES_FABRICA);
    expect(lerPadroes({})).toEqual(PADROES_FABRICA);
  });

  it("um campo ruim não derruba os outros", () => {
    const p = lerPadroes({ pontos_por_acerto: 999, dias_aberto: 5, regras: { regra_cliques: "permitido" } });
    expect(p.pontos_por_acerto).toBe(10);
    expect(p.dias_aberto).toBe(5);
    expect(p.regras.regra_cliques).toBe("permitido");
  });

  it("confere o formulário", () => {
    expect("erro" in conferirPadroes({ ...PADROES_FABRICA, especial_multiplicador: 4 })).toBe(true);
    expect("erro" in conferirPadroes({ ...PADROES_FABRICA, dias_aberto: 0 })).toBe(true);
    expect("padroes" in conferirPadroes({ ...PADROES_FABRICA, especial_tempo_percentual: 50 })).toBe(true);
  });
});

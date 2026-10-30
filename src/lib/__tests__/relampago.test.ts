import { describe, expect, it } from "vitest";
import { problemasRelampago, RELAMPAGO_MAX_S, RELAMPAGO_MIN_S, sugerirTempoRelampago } from "../questoes/relampago";
import type { Conteudo } from "../questoes/tipos";

const me = (alternativas: string[]): Conteudo => ({ tipo: "multipla_escolha", conteudo: { alternativas, correta: 0 } });
const curta = me(["1822", "1808", "1831", "1889"]);

describe("tempo sugerido", () => {
  it("questão curta fica perto do mínimo, mas dentro da faixa", () => {
    const t = sugerirTempoRelampago("Ano da Independência do Brasil?", curta);
    expect(t).toBeGreaterThanOrEqual(RELAMPAGO_MIN_S);
    expect(t).toBeLessThanOrEqual(8);
  });
  it("cresce com o texto e com a imagem, sem passar de 20 s", () => {
    const longa = me([
      "Expansão do café no Oeste Paulista",
      "Crise do açúcar no Nordeste",
      "Fim do tráfico negreiro em 1850",
      "Chegada da família real em 1808",
    ]);
    const enunciado = "Qual fator explica a chegada de imigrantes europeus a São Paulo no fim do século XIX?";
    const sem = sugerirTempoRelampago(enunciado, longa);
    expect(sem).toBeGreaterThan(sugerirTempoRelampago("Ano da Independência do Brasil?", curta));
    expect(sugerirTempoRelampago(enunciado, longa, true)).toBe(Math.min(RELAMPAGO_MAX_S, sem + 3));
    expect(sugerirTempoRelampago("x".repeat(400), longa)).toBe(RELAMPAGO_MAX_S);
  });
  it("V ou F pesa mais por afirmativa", () => {
    const vf: Conteudo = {
      tipo: "vf_bloco",
      conteudo: { afirmativas: ["aaaa", "bbbb", "cccc", "dddd"].map((texto) => ({ texto, verdadeira: true })) },
    };
    expect(sugerirTempoRelampago("Marque V ou F.", vf)).toBeGreaterThan(
      sugerirTempoRelampago("Marque V ou F.", me(["aaaa", "bbbb", "cccc", "dddd"])),
    );
  });
});

describe("validação do relâmpago", () => {
  it("aceita pergunta direta no tempo da faixa", () => {
    expect(problemasRelampago("Em que ano o Brasil se tornou independente?", curta, 8)).toEqual([]);
  });
  it("recusa texto motivador", () => {
    expect(problemasRelampago("Leia o trecho e responda: quem foi o autor?", curta, 10)).not.toEqual([]);
    expect(problemasRelampago("De acordo com o texto, o que mudou?", curta, 10)).not.toEqual([]);
    expect(problemasRelampago("“Independência ou morte!”\nQuem disse?", curta, 10)).not.toEqual([]);
    // "segundo" como ordinal não é texto motivador.
    expect(problemasRelampago("Qual foi o segundo documento assinado por D. Pedro I?", curta, 10)).toEqual([]);
  });
  it("recusa enunciado ou itens longos", () => {
    expect(problemasRelampago("x".repeat(181), curta, 10)).not.toEqual([]);
    expect(problemasRelampago("Qual?", me(["x".repeat(91), "b", "c", "d"]), 10)).not.toEqual([]);
  });
  it("recusa tempo fora de 5 a 20 s", () => {
    expect(problemasRelampago("Qual?", curta, 4)).not.toEqual([]);
    expect(problemasRelampago("Qual?", curta, 21)).not.toEqual([]);
    expect(problemasRelampago("Qual?", curta, 20)).toEqual([]);
  });
  it("recusa formatos longos", () => {
    const fonte: Conteudo = { tipo: "ordenar_frases", conteudo: { frases: ["a", "b", "c"] } };
    expect(problemasRelampago("Ordene.", fonte, 10)).not.toEqual([]);
    const vf: Conteudo = {
      tipo: "vf_bloco",
      conteudo: { afirmativas: ["a", "b", "c", "d", "e"].map((texto) => ({ texto, verdadeira: true })) },
    };
    expect(problemasRelampago("V ou F?", vf, 15)).not.toEqual([]);
  });
});

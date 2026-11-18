import { describe, expect, it } from "vitest";
import { aplicarAjuda, ajudaNaVista, candidatasEliminacao, respostaComAjuda } from "../questoes/ajudas";
import { montarVista, respostaCompleta, respostaInicial } from "../questoes/apresentacao";
import { corrigir } from "../questoes/correcao";
import { candidatasEstimativa, formatarEstimativa, janelaEstimativa, notaEstimativa } from "../questoes/estimativa";
import { distanciaLetras, normalizarDigitado, respostaAceita } from "../questoes/investigue";
import { fatorPistas, pistasGravadas, vistaComPistas } from "../questoes/pistas";
import { respostaParaCorrigir } from "../questoes/tabuleiro";
import { foraDaRodadaFinal, sortearQuestoes } from "../publico/regras";
import { schemaResposta, tamanhoPermutacao, validarConteudo, type Conteudo } from "../questoes/tipos";

const censo: Conteudo = {
  tipo: "estimativa",
  conteudo: { valor: 15, minimo: 0, maximo: 60, passo: 1, unidade: "%", ano: false, acerto: 3, margem: 20 },
};

const bonifacio: Conteudo = {
  tipo: "quem_sou_eu",
  conteudo: {
    candidatos: ["José Bonifácio", "Gonçalves Ledo", "Frei Caneca", "Diogo Feijó", "Hipólito da Costa", "Cipriano Barata"],
    correta: 0,
    pistas: [
      "Estudei mineralogia na Europa.",
      "Voltei ao Brasil em 1819.",
      "Defendi o fim gradual do tráfico.",
      "Fui ministro de D. Pedro I e depois exilado por ele.",
      "Sou o Patriarca da Independência.",
    ],
  },
};

const corte: Conteudo = {
  tipo: "monte_resposta",
  conteudo: {
    espacos: [
      { rotulo: "Fato", trecho: "A abertura dos portos acabou com o monopólio." },
      { rotulo: "Consequência", trecho: "Em 1815 o Brasil virou Reino Unido." },
      { rotulo: "Conclusão", trecho: "A elite resistiu à recolonização." },
    ],
    distratores: ["A Corte veio conter revoltas.", "A Inconfidência mudou a capital."],
  },
};

const pintor: Conteudo = { tipo: "investigue", conteudo: { aceitas: ["Pedro Américo", "Pedro Américo de Figueiredo e Melo"] } };

describe("estimativa", () => {
  it("valida a régua", () => {
    expect(validarConteudo("estimativa", censo.conteudo).success).toBe(true);
    expect(validarConteudo("estimativa", { ...censo.conteudo, valor: 80 }).success).toBe(false);
    expect(validarConteudo("estimativa", { ...censo.conteudo, margem: 2 }).success).toBe(false);
    expect(validarConteudo("estimativa", { ...censo.conteudo, passo: 30 }).success).toBe(false);
  });
  it("nota cheia perto, cai em linha reta e zera longe", () => {
    expect(notaEstimativa(censo.conteudo as never, 15)).toBe(1);
    expect(notaEstimativa(censo.conteudo as never, 18)).toBe(1);
    expect(notaEstimativa(censo.conteudo as never, 11.5)).toBeCloseTo(1 - 0.5 / 17);
    expect(corrigir(censo, [], { tipo: "estimativa", valor: 26.5 })).toBeCloseTo(0.5);
    expect(corrigir(censo, [], { tipo: "estimativa", valor: 35 })).toBe(0);
    expect(corrigir(censo, [], { tipo: "estimativa", valor: null })).toBe(0);
  });
  it("vista sem a resposta", () => {
    const vista = montarVista(censo, []);
    expect(JSON.stringify(vista)).not.toContain('"valor"');
    expect(respostaCompleta(respostaInicial(vista))).toBe(false);
    expect(tamanhoPermutacao(censo)).toBe(0);
  });
  it("eliminação encolhe a régua pela metade, com a resposta dentro", () => {
    const c = censo.conteudo as never;
    for (let t = 0; t < 30; t++) {
      const e1 = candidatasEliminacao(censo, []);
      const primeira = e1[Math.floor(Math.random() * e1.length)];
      const [a, b] = janelaEstimativa(c, [primeira]);
      expect(b - a).toBe(30);
      expect(a).toBeLessThan(15);
      expect(b).toBeGreaterThan(15);
      const e2 = candidatasEstimativa(c, [primeira]);
      const segunda = e2[Math.floor(Math.random() * e2.length)];
      const [a2, b2] = janelaEstimativa(c, [primeira, segunda]);
      expect(b2 - a2).toBe(15);
      expect(a2 <= 15 && b2 >= 15).toBe(true);
      expect(candidatasEstimativa(c, [primeira, segunda])).toEqual([]);
    }
  });
  it("o marcador fica dentro do trecho que sobrou", () => {
    const vista = montarVista(censo, []);
    const ajuda = { removidas: [], fixas: [[10, 40]] as [number, number][] };
    expect(aplicarAjuda(vista, { tipo: "estimativa", valor: 55 }, ajuda)).toEqual({ tipo: "estimativa", valor: 40 });
  });
  it("formata anos e unidades", () => {
    expect(formatarEstimativa(-27, { ano: true, unidade: "" })).toBe("27 a.C.");
    expect(formatarEstimativa(1822, { ano: true, unidade: "" })).toBe("1822");
    expect(formatarEstimativa(15, { ano: false, unidade: "%" })).toBe("15%");
    expect(formatarEstimativa(4.8, { ano: false, unidade: "milhões" })).toBe("4,8 milhões");
  });
});

describe("quem sou eu", () => {
  const perm = [3, 0, 5, 1, 4, 2];
  it("vale menos a cada pista", () => {
    expect([1, 2, 3, 4, 5].map((k) => fatorPistas(k, 5))).toEqual([1, 0.8, 0.6, 0.4, 0.2]);
    expect(corrigir(bonifacio, perm, { tipo: "quem_sou_eu", escolha: 1, pistas: 2 })).toBe(0.8);
    expect(corrigir(bonifacio, perm, { tipo: "quem_sou_eu", escolha: 0, pistas: 1 })).toBe(0);
  });
  it("no desafio só as pistas abertas chegam à tela", () => {
    const vista = vistaComPistas(montarVista(bonifacio, perm), 2);
    expect(vista.tipo === "quem_sou_eu" && vista.pistas).toHaveLength(2);
    expect(vista.tipo === "quem_sou_eu" && vista.total).toBe(5);
    expect(JSON.stringify(vista)).not.toContain("Patriarca");
  });
  it("vale o número de pistas gravado no servidor, não o da tela", () => {
    expect(pistasGravadas(null)).toBe(1);
    expect(pistasGravadas({ tipo: "quem_sou_eu", pistas: 4 })).toBe(4);
    const r = respostaParaCorrigir(bonifacio, perm, [], { tipo: "quem_sou_eu", pistas: 4 }, {
      tipo: "quem_sou_eu",
      escolha: 1,
      pistas: 1,
    });
    expect(r).toEqual({ tipo: "quem_sou_eu", escolha: 1, pistas: 4 });
    expect(corrigir(bonifacio, perm, r)).toBeCloseTo(0.4);
  });
  it("eliminação tira candidatos errados", () => {
    const cands = candidatasEliminacao(bonifacio, []);
    expect(cands).not.toContain(0);
    const ajuda = ajudaNaVista(bonifacio, perm, [3]);
    expect(ajuda.removidas).toEqual([0]);
  });
  it("aceita a resposta com pistas", () => {
    expect(schemaResposta.safeParse({ tipo: "quem_sou_eu", escolha: 2, pistas: 3 }).success).toBe(true);
  });
});

describe("monte a resposta", () => {
  const perm = [4, 2, 0, 3, 1];
  it("crédito parcial por espaço", () => {
    // tela: 0=distrator2, 1=Conclusão, 2=Fato, 3=distrator1, 4=Consequência
    expect(corrigir(corte, perm, { tipo: "monte_resposta", preenchidas: [2, 4, 1] })).toBe(1);
    expect(corrigir(corte, perm, { tipo: "monte_resposta", preenchidas: [2, 3, 0] })).toBeCloseTo(1 / 3);
    expect(corrigir(corte, perm, { tipo: "monte_resposta", preenchidas: [2, 2, 2] })).toBeCloseTo(1 / 3);
  });
  it("eliminação tira os distratores e depois trava um espaço", () => {
    expect(candidatasEliminacao(corte, []).sort()).toEqual([3, 4]);
    expect(candidatasEliminacao(corte, [3, 4]).sort()).toEqual([0, 1, 2]);
    const r = respostaComAjuda(corte, perm, [3, 4, 1], { tipo: "monte_resposta", preenchidas: [0, null, null] });
    expect(r).toEqual({ tipo: "monte_resposta", preenchidas: [null, 4, null] });
  });
});

describe("investigue", () => {
  it("ignora maiúsculas, acentos, pontuação e artigo", () => {
    expect(normalizarDigitado("  O Museu do Ipiranga! ")).toBe("museu do ipiranga");
    expect(respostaAceita("pedro americo", ["Pedro Américo"])).toBe(true);
    expect(respostaAceita("Pedro Amérco", ["Pedro Américo"])).toBe(true);
    expect(respostaAceita("Pedro Almeida", ["Pedro Américo"])).toBe(false);
    expect(respostaAceita("Rio", ["Rio"])).toBe(true);
    expect(respostaAceita("Rih", ["Rio"])).toBe(false);
    expect(distanciaLetras("kitten", "sitting")).toBe(3);
  });
  it("corrige e não tem eliminação", () => {
    expect(corrigir(pintor, [], { tipo: "investigue", texto: "pedro américo de figueiredo e melo" })).toBe(1);
    expect(corrigir(pintor, [], { tipo: "investigue", texto: "Victor Meirelles" })).toBe(0);
    expect(candidatasEliminacao(pintor, [])).toEqual([]);
    expect(schemaResposta.safeParse({ tipo: "investigue", texto: "x".repeat(200) }).success).toBe(false);
  });
  it("não cai na rodada final do desafio público", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `q${i}`);
    const pesquisa = new Set(["q8", "q9"]);
    const nova = foraDaRodadaFinal(ids, (id) => pesquisa.has(id), 2);
    expect(nova.slice(8).some((id) => pesquisa.has(id))).toBe(false);
    expect([...nova].sort()).toEqual([...ids].sort());
    for (let t = 0; t < 20; t++) {
      const banco = ids.map((id) => ({ id, tipo: pesquisa.has(id) ? "investigue" : "multipla_escolha" }));
      const ordem = sortearQuestoes(banco, 10);
      expect(ordem.slice(-2).some((id) => pesquisa.has(id))).toBe(false);
    }
  });
});

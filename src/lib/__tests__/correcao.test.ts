import { describe, expect, it } from "vitest";
import { montarVista } from "../questoes/apresentacao";
import { calcularPontos, corrigir, tempoEsgotado } from "../questoes/correcao";
import { permutacaoAleatoria } from "../questoes/embaralhar";
import { validarConteudo, type Conteudo } from "../questoes/tipos";

const me: Conteudo = {
  tipo: "multipla_escolha",
  conteudo: { alternativas: ["A", "B", "C", "D"], correta: 2 },
};

describe("múltipla escolha", () => {
  it("traduz a escolha exibida para a original", () => {
    const perm = [3, 2, 0, 1]; // exibida 1 = original 2 (correta)
    expect(montarVista(me, perm)).toEqual({ tipo: "multipla_escolha", alternativas: ["D", "C", "A", "B"] });
    expect(corrigir(me, perm, { tipo: "multipla_escolha", escolha: 1 })).toBe(1);
    expect(corrigir(me, perm, { tipo: "multipla_escolha", escolha: 2 })).toBe(0);
  });
  it("sem resposta ou fora do intervalo vale zero", () => {
    expect(corrigir(me, [0, 1, 2, 3], { tipo: "multipla_escolha", escolha: null })).toBe(0);
    expect(corrigir(me, [0, 1, 2, 3], { tipo: "multipla_escolha", escolha: 9 })).toBe(0);
    expect(corrigir(me, [0, 1, 2, 3], null)).toBe(0);
  });
  it("tipo de resposta diferente vale zero", () => {
    expect(corrigir(me, [0, 1, 2, 3], { tipo: "vf_bloco", valores: [true] })).toBe(0);
  });
});

describe("verdadeiro ou falso em bloco", () => {
  const vf: Conteudo = {
    tipo: "vf_bloco",
    conteudo: {
      afirmativas: [
        { texto: "a", verdadeira: true },
        { texto: "b", verdadeira: false },
        { texto: "c", verdadeira: true },
        { texto: "d", verdadeira: false },
      ],
    },
  };
  it("dá crédito proporcional", () => {
    const perm = [1, 0, 3, 2]; // exibidas: b(F) a(V) d(F) c(V)
    expect(corrigir(vf, perm, { tipo: "vf_bloco", valores: [false, true, false, true] })).toBe(1);
    expect(corrigir(vf, perm, { tipo: "vf_bloco", valores: [false, true, true, null] })).toBe(0.5);
  });
});

describe("linha do tempo", () => {
  const lt: Conteudo = {
    tipo: "linha_do_tempo",
    conteudo: { eventos: [{ texto: "1789" }, { texto: "1792" }, { texto: "1799" }, { texto: "1804" }] },
  };
  it("conta eventos na posição certa", () => {
    const perm = [2, 0, 3, 1]; // exibidos: 1799, 1789, 1804, 1792
    expect(corrigir(lt, perm, { tipo: "linha_do_tempo", ordem: [1, 3, 0, 2] })).toBe(1);
    // troca os dois últimos
    expect(corrigir(lt, perm, { tipo: "linha_do_tempo", ordem: [1, 3, 2, 0] })).toBe(0.5);
  });
  it("rejeita ordem que não é permutação", () => {
    expect(corrigir(lt, [0, 1, 2, 3], { tipo: "linha_do_tempo", ordem: [0, 0, 1, 2] })).toBe(0);
    expect(corrigir(lt, [0, 1, 2, 3], { tipo: "linha_do_tempo", ordem: [0, 1, 2] })).toBe(0);
  });
});

describe("pares", () => {
  const pares: Conteudo = {
    tipo: "pares",
    conteudo: {
      pares: [
        { esquerda: "Locke", direita: "propriedade" },
        { esquerda: "Montesquieu", direita: "três poderes" },
        { esquerda: "Rousseau", direita: "vontade geral" },
      ],
    },
  };
  it("conta ligações certas e ignora direita repetida", () => {
    const perm = [2, 0, 1]; // direita exibida: vontade geral, propriedade, três poderes
    expect(montarVista(pares, perm)).toMatchObject({ direita: ["vontade geral", "propriedade", "três poderes"] });
    expect(corrigir(pares, perm, { tipo: "pares", ligacoes: [1, 2, 0] })).toBe(1);
    expect(corrigir(pares, perm, { tipo: "pares", ligacoes: [1, 1, null] })).toBeCloseTo(1 / 3);
  });
});

describe("pontos e tempo", () => {
  it("arredonda pontos a duas casas", () => {
    expect(calcularPontos(1 / 3, 10)).toBe(3.33);
    expect(calcularPontos(1, 10)).toBe(10);
  });
  it("aplica folga de 3 s ao tempo limite", () => {
    const servida = new Date("2026-10-24T12:00:00Z");
    expect(tempoEsgotado(servida, new Date("2026-10-24T12:00:42Z"), 40)).toBe(false);
    expect(tempoEsgotado(servida, new Date("2026-10-24T12:00:44Z"), 40)).toBe(true);
  });
  it("permutação aleatória contém todos os índices", () => {
    expect([...permutacaoAleatoria(5)].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("fonte primária", () => {
  const fp: Conteudo = {
    tipo: "fonte_primaria",
    conteudo: {
      documento: "Carta de Pero Vaz de Caminha",
      perguntas: [
        { pergunta: "De quando?", alternativas: ["1500", "1530", "1549"], correta: 0 },
        { pergunta: "Quem?", alternativas: ["escrivão", "jesuíta", "donatário", "governador"], correta: 0 },
      ],
    },
  };

  it("embaralha cada pergunta só com as próprias alternativas", () => {
    // Índices 0-2 são da 1ª pergunta e 3-6 da 2ª.
    const perm = [5, 2, 3, 0, 6, 1, 4];
    const vista = montarVista(fp, perm);
    expect(vista).toMatchObject({
      perguntas: [
        { alternativas: ["1549", "1500", "1530"] },
        { alternativas: ["donatário", "escrivão", "governador", "jesuíta"] },
      ],
    });
    expect(corrigir(fp, perm, { tipo: "fonte_primaria", escolhas: [1, 1] })).toBe(1);
    expect(corrigir(fp, perm, { tipo: "fonte_primaria", escolhas: [1, 0] })).toBe(0.5);
    expect(corrigir(fp, perm, { tipo: "fonte_primaria", escolhas: [null, 9] })).toBe(0);
  });
});

describe("causa e consequência", () => {
  const cc: Conteudo = {
    tipo: "causa_consequencia",
    conteudo: {
      relacoes: [
        { causa: "Crise financeira", consequencia: "Convocação dos Estados Gerais" },
        { causa: "Fuga do rei", consequencia: "Perda de confiança na monarquia" },
        { causa: "Invasão estrangeira", consequencia: "Radicalização jacobina" },
      ],
      extras: ["Bloqueio Continental"],
    },
  };

  it("dá crédito por relação e não aceita a consequência extra", () => {
    const perm = [3, 2, 0, 1]; // exibidas: extra, 2, 0, 1
    expect(montarVista(cc, perm)).toMatchObject({
      consequencias: [
        "Bloqueio Continental",
        "Radicalização jacobina",
        "Convocação dos Estados Gerais",
        "Perda de confiança na monarquia",
      ],
    });
    expect(corrigir(cc, perm, { tipo: "causa_consequencia", ligacoes: [2, 3, 1] })).toBe(1);
    expect(corrigir(cc, perm, { tipo: "causa_consequencia", ligacoes: [2, 0, 1] })).toBeCloseTo(2 / 3);
    expect(corrigir(cc, perm, { tipo: "causa_consequencia", ligacoes: [2, 2, 2] })).toBeCloseTo(1 / 3);
  });
});

describe("encontrar o erro", () => {
  const ee: Conteudo = {
    tipo: "encontrar_erro",
    conteudo: {
      trechos: [
        { texto: "Em 1789,", errado: false },
        { texto: "Luís XIV convocou os Estados Gerais.", errado: true, correcao: "Luís XVI" },
        { texto: "O Terceiro Estado formou a Assembleia.", errado: false },
        { texto: "A Bastilha caiu em 1815.", errado: true, correcao: "14 de julho de 1789" },
        { texto: "Começava a Revolução.", errado: false },
      ],
    },
  };

  it("vale a fração dos erros achados e ignora marcações além do limite", () => {
    expect(montarVista(ee, [])).toMatchObject({ erros: 2 });
    expect(corrigir(ee, [], { tipo: "encontrar_erro", marcados: [3, 1] })).toBe(1);
    expect(corrigir(ee, [], { tipo: "encontrar_erro", marcados: [1, 2] })).toBe(0.5);
    expect(corrigir(ee, [], { tipo: "encontrar_erro", marcados: [0, 2, 1, 3] })).toBe(0);
    expect(corrigir(ee, [], { tipo: "encontrar_erro", marcados: [1, 1] })).toBe(0.5);
  });
});

describe("completar lacunas", () => {
  const cl: Conteudo = {
    tipo: "completar_lacunas",
    conteudo: {
      texto: "O ___ dividiu o mundo entre ___ e Espanha; depois, Portugal criou as ___.",
      lacunas: ["Tratado de Tordesilhas", "Portugal", "capitanias hereditárias"],
      extras: ["sesmarias"],
    },
  };

  it("divide o texto nas lacunas e confere pelo texto da palavra", () => {
    const perm = [3, 1, 0, 2]; // banco exibido: sesmarias, Portugal, Tratado, capitanias
    const vista = montarVista(cl, perm);
    expect(vista).toMatchObject({
      partes: ["O ", " dividiu o mundo entre ", " e Espanha; depois, Portugal criou as ", "."],
    });
    expect(corrigir(cl, perm, { tipo: "completar_lacunas", preenchidas: [2, 1, 3] })).toBe(1);
    expect(corrigir(cl, perm, { tipo: "completar_lacunas", preenchidas: [2, 1, 0] })).toBeCloseTo(2 / 3);
    expect(corrigir(cl, perm, { tipo: "completar_lacunas", preenchidas: [2, 2, null] })).toBeCloseTo(1 / 3);
  });

  it("exige uma marca ___ por resposta", () => {
    expect(validarConteudo("completar_lacunas", { texto: "Só ___ aqui", lacunas: ["a", "b"] }).success).toBe(false);
    expect(validarConteudo("completar_lacunas", { texto: "Só ___ aqui", lacunas: ["a"] }).success).toBe(true);
  });
});

describe("ordenar frases, interpretação e quem disse", () => {
  it("ordena como a linha do tempo", () => {
    const of: Conteudo = { tipo: "ordenar_frases", conteudo: { frases: ["a", "b", "c"] } };
    expect(corrigir(of, [2, 0, 1], { tipo: "ordenar_frases", ordem: [1, 2, 0] })).toBe(1);
    expect(corrigir(of, [2, 0, 1], { tipo: "ordenar_frases", ordem: [1, 0, 2] })).toBeCloseTo(1 / 3);
  });

  it("escolha única vale tudo ou nada", () => {
    const qd: Conteudo = {
      tipo: "quem_disse",
      conteudo: {
        citacao: "Independência ou morte!",
        autores: ["D. Pedro I", "José Bonifácio", "D. João VI", "Leopoldina"],
        correta: 0,
      },
    };
    expect(montarVista(qd, [1, 0, 2, 3])).toMatchObject({
      alternativas: ["José Bonifácio", "D. Pedro I", "D. João VI", "Leopoldina"],
    });
    expect(corrigir(qd, [1, 0, 2, 3], { tipo: "quem_disse", escolha: 1 })).toBe(1);
    expect(corrigir(qd, [1, 0, 2, 3], { tipo: "quem_disse", escolha: 0 })).toBe(0);
  });
});

describe("classificar, intruso e ponto de vista", () => {
  it("classificar dá crédito por item", () => {
    const cl: Conteudo = {
      tipo: "classificar",
      conteudo: {
        grupos: ["Absolutismo", "Iluminismo"],
        itens: [
          { texto: "Direito divino", grupo: 0 },
          { texto: "Separação dos poderes", grupo: 1 },
          { texto: "Mercantilismo", grupo: 0 },
          { texto: "Liberdade de expressão", grupo: 1 },
        ],
      },
    };
    const perm = [3, 2, 1, 0];
    expect(corrigir(cl, perm, { tipo: "classificar", grupos: [1, 0, 1, 0] })).toBe(1);
    expect(corrigir(cl, perm, { tipo: "classificar", grupos: [1, 0, 0, null] })).toBe(0.5);
  });

  it("intruso vale tudo ou nada", () => {
    const it_: Conteudo = {
      tipo: "intruso",
      conteudo: { itens: ["Voltaire", "Rousseau", "Montesquieu", "Bossuet"], intruso: 3, criterio: "Iluministas" },
    };
    expect(corrigir(it_, [3, 0, 1, 2], { tipo: "intruso", escolha: 0 })).toBe(1);
    expect(corrigir(it_, [3, 0, 1, 2], { tipo: "intruso", escolha: 1 })).toBe(0);
  });

  it("ponto de vista ignora a perspectiva extra", () => {
    const pv: Conteudo = {
      tipo: "ponto_de_vista",
      conteudo: {
        relatos: [
          { texto: "a", perspectiva: "Jesuíta" },
          { texto: "b", perspectiva: "Colono" },
        ],
        extras: ["Holandês"],
      },
    };
    const perm = [2, 1, 0];
    expect(montarVista(pv, perm)).toMatchObject({ perspectivas: ["Holandês", "Colono", "Jesuíta"] });
    expect(corrigir(pv, perm, { tipo: "ponto_de_vista", ligacoes: [2, 1] })).toBe(1);
    expect(corrigir(pv, perm, { tipo: "ponto_de_vista", ligacoes: [0, 1] })).toBe(0.5);
  });
});

describe("linha do tempo com datas", () => {
  const ld: Conteudo = {
    tipo: "linha_do_tempo_datas",
    conteudo: {
      inicio: 1500,
      fim: 1900,
      passo: 100,
      eventos: [
        { texto: "Chegada de Cabral", ano: 1500 },
        { texto: "Governo-geral", ano: 1549 },
        { texto: "Descoberta do ouro", ano: 1693 },
        { texto: "Independência", ano: 1822 },
      ],
    },
  };

  it("monta as faixas e dá meio ponto na faixa vizinha", () => {
    const perm = [0, 1, 2, 3];
    expect(montarVista(ld, perm)).toMatchObject({
      faixas: ["1500 – 1600", "1600 – 1700", "1700 – 1800", "1800 – 1900"],
    });
    expect(corrigir(ld, perm, { tipo: "linha_do_tempo_datas", faixas: [0, 0, 1, 3] })).toBe(1);
    expect(corrigir(ld, perm, { tipo: "linha_do_tempo_datas", faixas: [0, 0, 2, 1] })).toBe(2.5 / 4);
  });

  it("recusa régua com faixas demais ou evento fora", () => {
    const base = ld.conteudo as { inicio: number; fim: number; passo: number; eventos: unknown[] };
    expect(validarConteudo("linha_do_tempo_datas", { ...base, passo: 10 }).success).toBe(false);
    expect(validarConteudo("linha_do_tempo_datas", { ...base, fim: 1800 }).success).toBe(false);
  });
});

describe("mapa", () => {
  const mp: Conteudo = {
    tipo: "mapa",
    conteudo: {
      imagem: "prof/mapa.png",
      marcadores: [
        { nome: "São Vicente", x: 60, y: 80 },
        { nome: "Pernambuco", x: 85, y: 30 },
        { nome: "Bahia", x: 75, y: 45 },
      ],
    },
  };

  it("embaralha os nomes e mantém os pinos", () => {
    const perm = [2, 0, 1];
    expect(montarVista(mp, perm)).toMatchObject({ nomes: ["Bahia", "São Vicente", "Pernambuco"] });
    expect(corrigir(mp, perm, { tipo: "mapa", pinos: [2, 0, 1] })).toBe(1);
    expect(corrigir(mp, perm, { tipo: "mapa", pinos: [2, 1, 0] })).toBeCloseTo(1 / 3);
  });

  it("não publica com pinos por posicionar", () => {
    expect(validarConteudo("mapa", { ...mp.conteudo, posicionar: true }).success).toBe(false);
  });
});

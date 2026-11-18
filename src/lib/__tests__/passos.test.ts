import { describe, expect, it } from "vitest";
import { aplicarAjuda, ajudaNaVista, candidatasEliminacao, respostaComAjuda } from "../questoes/ajudas";
import { montarVista, respostaCompleta, respostaInicial, segredoPublico } from "../questoes/apresentacao";
import { corrigir } from "../questoes/correcao";
import {
  candidatasConceito,
  darPasso,
  notaConceito,
  notaConversa,
  ordemDoTurno,
  padraoDaPalavra,
  progressoConceito,
  progressoGravado,
  respostaComPassos,
  vidasDaConversa,
} from "../questoes/passos";
import { respostaParaCorrigir } from "../questoes/tabuleiro";
import { schemaResposta, tamanhoPermutacao, validarConteudo, type Conteudo } from "../questoes/tipos";

const pedro: Conteudo = {
  tipo: "conversa",
  conteudo: {
    personagem: "Dom Pedro II",
    turnos: [
      {
        mensagem: "O que acha da Lei do Ventre Livre?",
        certa: "Liberta os filhos de escravizadas.",
        erradas: ["Liberta os idosos.", "Acaba com o tráfico."],
        reacao: "Exato, 1871.",
      },
      {
        mensagem: "E a Lei Eusébio de Queirós?",
        certa: "Proibiu o tráfico.",
        erradas: ["Aboliu a escravidão.", "Criou a Guarda Nacional."],
      },
      { mensagem: "Quem assinou a Lei Áurea?", certa: "A princesa Isabel.", erradas: ["Eu mesmo.", "Deodoro."] },
      { mensagem: "Em que ano?", certa: "1888.", erradas: ["1889.", "1871."] },
      { mensagem: "E o que veio depois?", certa: "A República.", erradas: ["O Segundo Reinado.", "A Regência."] },
    ],
  },
};
const c = pedro.conteudo as Extract<Conteudo, { tipo: "conversa" }>["conteudo"];

const absolutismo: Conteudo = {
  tipo: "conceito_secreto",
  conteudo: { palavra: "Absolutismo", definicao: "Poder concentrado no rei, sem limites de leis ou parlamento." },
};
const ca = absolutismo.conteudo as Extract<Conteudo, { tipo: "conceito_secreto" }>["conteudo"];

// Permutação fixa: em cada turno, tela [errada1, certa, errada2] → original [1, 0, 2].
const perm = Array.from({ length: 15 }, (_, i) => 3 * Math.floor(i / 3) + [1, 0, 2][i % 3]);

describe("conversa com o personagem", () => {
  it("valida conteúdo e permutação", () => {
    expect(validarConteudo("conversa", pedro.conteudo).success).toBe(true);
    expect(tamanhoPermutacao(pedro)).toBe(15);
    expect(validarConteudo("conversa", { ...c, turnos: c.turnos.slice(0, 2) }).success).toBe(false);
    expect(ordemDoTurno(perm, 2)).toEqual([1, 0, 2]);
  });

  it("vidas crescem com o número de turnos", () => {
    expect([3, 4, 5, 6, 7, 8].map(vidasDaConversa)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("a vista não leva a resposta certa nem as reações", () => {
    const v = montarVista(pedro, perm);
    expect(JSON.stringify(v)).not.toContain("Exato, 1871");
    if (v.tipo !== "conversa") throw new Error();
    expect(v.opcoes[0]).toEqual(["Liberta os idosos.", "Liberta os filhos de escravizadas.", "Acaba com o tráfico."]);
    expect(segredoPublico(pedro)?.reacoes?.[0]).toBe("Exato, 1871.");
  });

  it("o servidor confere turno a turno e grava o andamento", () => {
    let resposta: unknown = null;
    const r1 = darPasso(pedro, perm, [], resposta, 1);
    if ("erro" in r1) throw new Error(r1.erro);
    expect(r1.progresso).toMatchObject({ escolhas: [1], certas: [1], erros: 0, encerrado: false });
    resposta = r1.gravar;
    const r2 = darPasso(pedro, perm, [], resposta, 0);
    if ("erro" in r2) throw new Error(r2.erro);
    expect(r2.progresso).toMatchObject({ erros: 1, encerrado: false });
    resposta = r2.gravar;
    expect(darPasso(pedro, perm, [], resposta, 7)).toEqual({ erro: "Resposta inválida." });
  });

  it("sem vidas a conversa acaba e não aceita mais passos", () => {
    // 5 turnos = 2 vidas; 3 erros encerram.
    let resposta: unknown = null;
    for (let k = 0; k < 3; k++) {
      const r = darPasso(pedro, perm, [], resposta, 0);
      if ("erro" in r) throw new Error(r.erro);
      resposta = r.gravar;
    }
    const p = progressoGravado(pedro, perm, [], resposta);
    expect(p).toMatchObject({ erros: 3, encerrado: true });
    expect(darPasso(pedro, perm, [], resposta, 1)).toEqual({ erro: "Esta conversa já acabou." });
  });

  it("nota = turnos certos / total; turnos que faltaram valem zero", () => {
    expect(notaConversa(c, perm, [1, 1, 1, 1, 1])).toBe(1);
    expect(notaConversa(c, perm, [1, 0, 1, null, null])).toBeCloseTo(0.4);
    expect(corrigir(pedro, perm, { tipo: "conversa", escolhas: [1, 1, 1, 1, 1], fim: true })).toBe(1);
  });

  it("eliminação risca uma errada do turno, e a riscada não pode ser escolhida", () => {
    const cands = candidatasEliminacao(pedro, []);
    expect(cands).toContain(1);
    expect(cands).not.toContain(0);
    const vistaAjuda = ajudaNaVista(pedro, perm, [1]);
    // original 1 do turno 0 fica na tela na posição 0
    expect(vistaAjuda.removidas).toEqual([0]);
    expect(darPasso(pedro, perm, [1], null, 0)).toEqual({ erro: "Essa resposta foi eliminada." });
    expect(candidatasEliminacao(pedro, [1])).not.toContain(2);
    const v = montarVista(pedro, perm);
    const r = aplicarAjuda(v, { tipo: "conversa", escolhas: [0, null, null, null, null] }, vistaAjuda);
    expect(r.tipo === "conversa" && r.escolhas[0]).toBe(null);
  });

  it("corrige pelo andamento gravado no servidor, não pelo que a tela mandou", () => {
    const gravada = { tipo: "conversa", escolhas: [1, 0] };
    const enviada = { tipo: "conversa" as const, escolhas: [1, 1, 1, 1, 1], fim: true };
    const r = respostaParaCorrigir(pedro, perm, [], gravada, enviada);
    expect(r?.tipo === "conversa" && r.escolhas).toEqual([1, 0, null, null, null]);
  });

  it("a tela volta com os turnos já feitos e só fica completa no fim", () => {
    const v = montarVista(pedro, perm);
    const inicial = respostaInicial(v);
    expect(respostaCompleta(inicial)).toBe(false);
    const p = progressoGravado(pedro, perm, [], { tipo: "conversa", escolhas: [1, 1] });
    const r = respostaComPassos(inicial, p);
    expect(r.tipo === "conversa" && r.escolhas).toEqual([1, 1, null, null, null]);
    expect(
      schemaResposta.safeParse({ tipo: "conversa", escolhas: [1, null, null, null, null], fim: true }).success,
    ).toBe(true);
  });
});

describe("conceito secreto", () => {
  it("valida a palavra", () => {
    expect(validarConteudo("conceito_secreto", absolutismo.conteudo).success).toBe(true);
    expect(validarConteudo("conceito_secreto", { ...ca, palavra: "abc" }).success).toBe(false);
    expect(validarConteudo("conceito_secreto", { ...ca, palavra: "Lei 1888" }).success).toBe(false);
    expect(tamanhoPermutacao(absolutismo)).toBe(0);
  });

  it("a tela só recebe o padrão, nunca a palavra", () => {
    const v = montarVista(absolutismo, []);
    expect(JSON.stringify(v).toUpperCase()).not.toContain("ABSOLUTISMO");
    expect(padraoDaPalavra("Pão-de-ló")).toEqual(["_", "_", "_", "-", "_", "_", "-", "_", "_"]);
  });

  it("acentos contam como a letra sem acento", () => {
    const p = progressoConceito({ palavra: "Abolição", definicao: "x".repeat(20) }, ["A", "O", "C", "I"]);
    expect(p.reveladas.join("")).toContain("ÇÃO");
  });

  it("o servidor confere letra a letra, sem repetir", () => {
    let resposta: unknown = null;
    for (const l of "ABS") {
      const r = darPasso(absolutismo, [], [], resposta, l);
      if ("erro" in r) throw new Error(r.erro);
      resposta = r.gravar;
    }
    expect(darPasso(absolutismo, [], [], resposta, "a")).toEqual({ erro: "Essa letra já foi." });
    expect(darPasso(absolutismo, [], [], resposta, "1")).toEqual({ erro: "Letra inválida." });
    const r = darPasso(absolutismo, [], [], resposta, "Z");
    if ("erro" in r) throw new Error(r.erro);
    expect(r.progresso).toMatchObject({ erros: 1, descoberta: false });
  });

  it("na 6ª letra errada acaba e vale zero", () => {
    let resposta: unknown = null;
    for (const l of "QWERZY") {
      const r = darPasso(absolutismo, [], [], resposta, l);
      if ("erro" in r) throw new Error(r.erro);
      resposta = r.gravar;
    }
    expect(progressoGravado(absolutismo, [], [], resposta)).toMatchObject({ erros: 6, encerrado: true });
    expect(darPasso(absolutismo, [], [], resposta, "A")).toEqual({ erro: "Este conceito já acabou." });
    expect(notaConceito(ca, [..."QWERZYABSOLUTIM"])).toBe(0);
  });

  it("descobriu: 100% menos 15% por letra errada", () => {
    expect(notaConceito(ca, [..."ABSOLUTIM"])).toBe(1);
    expect(notaConceito(ca, [..."ZXABSOLUTIM"])).toBeCloseTo(0.7);
    expect(notaConceito(ca, [..."ABSOL"])).toBe(0);
    expect(corrigir(absolutismo, [], { tipo: "conceito_secreto", letras: [..."ABSOLUTIM"], fim: true })).toBe(1);
  });

  it("eliminação revela uma letra e deixa ao menos 2 escondidas", () => {
    const cands = candidatasConceito(ca, []);
    expect(cands.length).toBe(9); // A B S O L U T I M
    expect(candidatasConceito(ca, [], [..."ABSOLUT"])).toEqual([]);
    const ajuda = ajudaNaVista(absolutismo, [], [0]); // A
    expect(ajuda.fixas).toEqual([[0, 65]]);
    const v = montarVista(absolutismo, []);
    const r = aplicarAjuda(v, respostaInicial(v), ajuda);
    expect(r.tipo === "conceito_secreto" && r.letras).toEqual(["A"]);
    // letra revelada não pode ser chutada de novo
    expect(darPasso(absolutismo, [], [0], null, "A")).toEqual({ erro: "Essa letra já foi." });
  });

  it("corrige pelas letras gravadas, somando as reveladas pela eliminação", () => {
    const gravada = { tipo: "conceito_secreto", letras: [..."BSOLUTIM"] };
    const enviada = { tipo: "conceito_secreto" as const, letras: [..."ABSOLUTIM"], fim: true };
    const r = respostaParaCorrigir(absolutismo, [], [0], gravada, enviada);
    expect(corrigir(absolutismo, [], respostaComAjuda(absolutismo, [], [0], r))).toBe(1);
    const semAjuda = respostaParaCorrigir(absolutismo, [], [], gravada, enviada);
    expect(corrigir(absolutismo, [], semAjuda)).toBe(0);
  });
});

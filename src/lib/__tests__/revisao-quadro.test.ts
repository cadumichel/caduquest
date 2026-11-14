import { describe, expect, it } from "vitest";
import type { Conteudo } from "../questoes/tipos";
import { questoesMaisErradas } from "../revisao-quadro";

const multipla = (correta: number) =>
  ({ tipo: "multipla_escolha", conteudo: { alternativas: ["a", "b", "c", "d"], correta } }) as Conteudo;
const conteudos = new Map<string, Conteudo>([
  ["q1", multipla(0)],
  ["q2", multipla(2)],
  ["q3", { tipo: "vf_bloco", conteudo: {} } as unknown as Conteudo],
]);
const r = (questaoId: string, fracao: number, permutacao: number[] | null, escolha: number | null) => ({
  questaoId,
  fracao,
  permutacao,
  resposta: escolha === null ? null : { tipo: "multipla_escolha", escolha },
});

describe("questoesMaisErradas", () => {
  const respostas = [
    // q1: 1 certa de 4; a alternativa "b" (original 1) atraiu dois alunos.
    r("q1", 1, [0, 1, 2, 3], 0),
    r("q1", 0, [3, 2, 1, 0], 2),
    r("q1", 0, [1, 0, 2, 3], 0),
    r("q1", 0, [0, 1, 2, 3], null),
    // q2: todos acertam.
    r("q2", 1, [2, 0, 1, 3], 0),
    r("q2", 1, [0, 1, 2, 3], 2),
    r("q2", 1, [0, 1, 2, 3], 2),
    // q3: formato sem escolha única.
    r("q3", 0.5, [0, 1], null),
    r("q3", 0.5, [0, 1], null),
    r("q3", 0, [0, 1], null),
  ];

  it("ordena da mais errada para a menos e conta na ordem original", () => {
    const lista = questoesMaisErradas(respostas, conteudos);
    expect(lista.map((q) => q.questaoId)).toEqual(["q1", "q3", "q2"]);
    expect(lista[0]).toMatchObject({ acerto: 0.25, respostas: 4, distribuicao: [1, 2, 0, 0], semEscolha: 1 });
    expect(lista[1].distribuicao).toBeNull();
  });

  it("respeita o limite e o mínimo de respostas", () => {
    expect(questoesMaisErradas(respostas, conteudos, { limite: 1 }).map((q) => q.questaoId)).toEqual(["q1"]);
    expect(questoesMaisErradas(respostas, conteudos, { minimo: 4 }).map((q) => q.questaoId)).toEqual(["q1"]);
  });
});

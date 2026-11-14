import { describe, expect, it } from "vitest";
import { mesmaSerie, ordenarDisputa, placarDaTurma, recadoDaDisputa } from "../disputa-turmas";

const turma = (turmaId: string, media: number, participacao = 1) => ({
  turmaId,
  nome: turmaId,
  media,
  participacao,
  alunos: 20,
});

describe("placarDaTurma", () => {
  it("divide pelos alunos e pelos desafios, contando quem não fez", () => {
    expect(placarDaTurma([100, 50, 0, 0], 2)).toEqual({ media: 18.8, participacao: 0.5 });
  });
  it("turma vazia ou sem desafio aberto fica zerada", () => {
    expect(placarDaTurma([], 2)).toEqual({ media: 0, participacao: 0 });
    expect(placarDaTurma([10], 0)).toEqual({ media: 0, participacao: 0 });
  });
});

describe("disputa", () => {
  it("compara a série sem ligar para maiúsculas e espaços", () => {
    expect(mesmaSerie("8º ano", " 8º Ano ")).toBe(true);
    expect(mesmaSerie("8º ano", "7º ano")).toBe(false);
    expect(mesmaSerie(null, null)).toBe(false);
  });
  it("ordena pela média e monta o recado da turma de quem olha", () => {
    const turmas = [turma("183", 40), turma("184", 52.5)];
    expect(ordenarDisputa(turmas).map((t) => t.turmaId)).toEqual(["184", "183"]);
    expect(recadoDaDisputa(turmas, "184")).toContain("na frente da 183");
    expect(recadoDaDisputa(turmas, "183")).toContain("Faltam 12,5 pontos de média para passar a 184");
  });
});

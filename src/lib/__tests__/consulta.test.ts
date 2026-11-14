import { describe, expect, it } from "vitest";
import { agruparConsulta, resumoConsulta, somarConsultas, textoConsulta } from "../consulta";

const respostas = (alunoId: string, semConsulta: boolean, fracoes: number[]) =>
  fracoes.map((fracao) => ({ alunoId, semConsulta, fracao }));

describe("com consulta × sem consulta", () => {
  const mapa = agruparConsulta([
    ...respostas("a", false, [1, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1]),
    ...respostas("a", true, [1, 0, 0, 0, 0, 0.5, 0, 1, 0, 0]),
    ...respostas("b", false, [1, 0]),
  ]);

  it("separa os dois lados por aluno", () => {
    expect(resumoConsulta(mapa.get("a")!)).toEqual({ com: 90, sem: 25, diferenca: 65, faltaFixar: true });
    expect(textoConsulta(mapa.get("a")!)).toBe("com consulta 90% · sem consulta 25%");
  });

  it("não compara com poucas questões ou sem um dos lados", () => {
    expect(resumoConsulta(mapa.get("b")!)).toEqual({ com: 50, sem: null, diferenca: null, faltaFixar: false });
    expect(textoConsulta(mapa.get("b")!)).toBe("com consulta 50%");
  });

  it("soma a turma", () => {
    const turma = somarConsultas(mapa.values());
    expect(turma.com.n).toBe(12);
    expect(resumoConsulta(turma).sem).toBe(25);
  });
});

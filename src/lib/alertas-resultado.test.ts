import { describe, expect, it } from "vitest";
import { descreverAlertas } from "./alertas-resultado";

const zero = {
  zeradasPorSaida: 0,
  zeradasTeclado: 0,
  zeradasTela: 0,
  zeradasClique: 0,
  zeradasSemMouse: 0,
  verificacoes: 0,
  verificacoesErradas: 0,
  saidasTela: 0,
  esgotadas: 0,
};

describe("descreverAlertas", () => {
  it("sem nada, sem alertas", () => {
    expect(descreverAlertas(zero)).toEqual({ graves: [], avisos: [] });
  });
  it("separa zeradas por motivo e o resto por saída da tela", () => {
    const r = descreverAlertas({
      ...zero,
      zeradasPorSaida: 3,
      zeradasClique: 1,
      saidasTela: 2,
      verificacoesErradas: 1,
    });
    expect(r.graves).toEqual(["1 zerada por clique fora", "2 zeradas por sair da tela", "1 questão teste errada"]);
    expect(r.avisos).toEqual([]);
  });
  it("saída sem zerar vira só aviso", () => {
    expect(descreverAlertas({ ...zero, saidasTela: 2, esgotadas: 1 }).avisos).toEqual([
      "saiu da tela 2×",
      "1 com tempo esgotado",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { listarPaginas, montarPlano, paginasCitadas, SEM_CAPITULO } from "../plano-estudo";

const r = (questaoId: string, capitulo: string | null, fracao: number, enunciado = "", habilidades: string[] = []) => ({
  questaoId,
  capitulo,
  habilidades,
  enunciado,
  fracao,
});

describe("paginasCitadas", () => {
  it("acha páginas em vários jeitos de escrever", () => {
    expect(paginasCitadas("Segundo o texto (p. 42), qual...")).toEqual([42]);
    expect(paginasCitadas("Veja a pág. 7 e a página 12.")).toEqual([7, 12]);
    expect(paginasCitadas("Leia pp. 30-32 da apostila")).toEqual([30, 31, 32]);
    expect(paginasCitadas("(p. 15 e 18)")).toEqual([15, 18]);
  });
  it("não confunde anos e outros números com página", () => {
    expect(paginasCitadas("Em 1494, Portugal e Espanha assinaram o tratado.")).toEqual([]);
    expect(paginasCitadas("O mapa mostra 3 rotas.")).toEqual([]);
  });
});

describe("montarPlano", () => {
  const plano = montarPlano([
    r("a", "Cap. 5", 0, "Sobre o mercantilismo (p. 40)", ["Causa e consequência"]),
    r("b", "Cap. 5", 0.5, "Veja a p. 41", ["Leitura de fonte"]),
    r("c", "Cap. 6", 1, "Certa (p. 60)", ["Leitura de fonte"]),
    r("d", null, 1),
    r("a", "Cap. 5", 1, "resposta antiga da mesma questão"),
  ]);
  it("ordena do capítulo mais fraco para o mais forte", () => {
    expect(plano.capitulos.map((c) => c.nome)).toEqual(["Cap. 5", "Cap. 6", SEM_CAPITULO]);
    expect(plano.capitulos[0]).toMatchObject({ acerto: 0.25, questoes: 2, erradas: 2, situacao: "reforcar" });
    expect(plano.capitulos[1].situacao).toBe("dominado");
  });
  it("junta só as páginas das questões erradas", () => {
    expect(plano.paginas).toEqual([40, 41]);
    expect(plano.capitulos[0].paginas).toEqual([40, 41]);
    expect(plano.capitulos[1].paginas).toEqual([]);
  });
  it("conta cada questão uma vez e agrupa por habilidade", () => {
    expect(plano.questoes).toBe(4);
    expect(plano.erradas).toBe(2);
    expect(plano.habilidades.map((h) => h.nome)).toEqual(["Causa e consequência", "Leitura de fonte"]);
  });
});

describe("listarPaginas", () => {
  it("escreve a lista por extenso", () => {
    expect(listarPaginas([42])).toBe("42");
    expect(listarPaginas([42, 43, 51])).toBe("42, 43 e 51");
  });
});

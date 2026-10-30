import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { escolherFundo, FUNDOS_TEMPORADA, imagemDoFundo, TOTAL_FUNDOS } from "../fundos-temporada";

const t = (nome: string, capitulos: string[] = [], narrativa: string | null = null) => ({ nome, narrativa, capitulos });

describe("fundos da temporada", () => {
  it("tem 20 cenários, todos com imagem", () => {
    expect(TOTAL_FUNDOS).toBe(20);
    for (let i = 0; i < TOTAL_FUNDOS; i++) expect(existsSync(`public${imagemDoFundo(i)}`)).toBe(true);
  });

  it("escolhe o cenário pelo tema da temporada", () => {
    const nome = (i: number) => FUNDOS_TEMPORADA[i].nome;
    expect(nome(escolherFundo(t("Os segredos do Nilo", ["Egito Antigo"]), 0))).toBe("Pirâmides de Gizé");
    expect(nome(escolherFundo(t("Temporada 2", ["Revolução Industrial"]), 5))).toBe("Fábricas a vapor");
    expect(nome(escolherFundo(t("Rumo à prova", ["Brasil Colônia", "Engenhos de açúcar"]), 0))).toBe(
      "Engenho de açúcar",
    );
  });

  it("sem tema reconhecido, troca a cada temporada", () => {
    const a = escolherFundo(t("Temporada A"), 0);
    const b = escolherFundo(t("Temporada B"), 1);
    expect(a).not.toBe(b);
    expect(escolherFundo(t("X"), 23)).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import { capituloDaTemporada, escolherAutomatico } from "./montar-desafio";

describe("capituloDaTemporada", () => {
  const temporada = ["Cap. 10 – O início da Era Moderna", "Cap. 11 – Reformas"];
  it("aceita o mesmo capítulo escrito de outro jeito", () => {
    expect(capituloDaTemporada("Cap. 10 – O início da Era Moderna", temporada)).toBe(true);
    expect(capituloDaTemporada("Capítulo 11", temporada)).toBe(true);
    expect(capituloDaTemporada("cap 10", temporada)).toBe(true);
  });
  it("recusa outros capítulos e vazios", () => {
    expect(capituloDaTemporada("Cap. 1 – Pré-história", temporada)).toBe(false);
    expect(capituloDaTemporada("Brasil Império", temporada)).toBe(false);
    expect(capituloDaTemporada(null, temporada)).toBe(false);
    expect(capituloDaTemporada("Cap. 10", [])).toBe(false);
  });
  it("não confunde módulo com capítulo de mesmo número", () => {
    expect(capituloDaTemporada("Módulo 10", temporada)).toBe(false);
  });
});

describe("escolherAutomatico", () => {
  const q = (id: string, tipo: string, temImagem = false, usos = 0, relampago = false) => ({
    id,
    tipo,
    temImagem,
    usos,
    relampago,
  });
  const fixo = () => 0;

  it("prefere nunca usadas, varia formatos e busca 40% com imagem", () => {
    const lista = [
      q("a1", "multipla"),
      q("a2", "multipla"),
      q("a3", "multipla"),
      q("b1", "ordenar"),
      q("c1", "vf"),
      q("i1", "multipla", true),
      q("i2", "mapa", true),
      q("u1", "pares", false, 3),
    ];
    const r = escolherAutomatico(lista, 5, fixo);
    expect(r).toHaveLength(5);
    expect(r).toContain("i1");
    expect(r).toContain("i2");
    expect(r).not.toContain("u1");
    expect(new Set(r).size).toBe(5);
  });

  it("deixa relâmpago de fora e devolve menos se faltar questão", () => {
    const r = escolherAutomatico([q("a", "multipla"), q("r", "multipla", false, 0, true)], 10, fixo);
    expect(r).toEqual(["a"]);
  });
});

import { describe, expect, it } from "vitest";
import { emPedacos, lerPorIds, lerTudo, respostasCorrigidas } from "../paginar";

/** Banco de mentira: devolve no máximo 1000 linhas por consulta, como o Supabase. */
function bancoFalso(linhas: { id: string; dono: string; fracao: number | null }[]) {
  const pedidos: { ids: number; de: number }[] = [];
  const db = {
    from: () => {
      let filtradas = linhas;
      let ids = 0;
      const consulta = {
        select: () => consulta,
        in: (_: string, lista: string[]) => {
          ids = lista.length;
          filtradas = filtradas.filter((l) => lista.includes(l.dono));
          return consulta;
        },
        not: () => {
          filtradas = filtradas.filter((l) => l.fracao !== null);
          return consulta;
        },
        order: () => {
          filtradas = [...filtradas].sort((a, b) => a.id.localeCompare(b.id));
          return consulta;
        },
        range: (de: number, ate: number) => {
          pedidos.push({ ids, de });
          return Promise.resolve({ data: filtradas.slice(de, Math.min(ate + 1, de + 1000)), error: null });
        },
      };
      return consulta;
    },
  };
  return { db, pedidos };
}

const id = (n: number) => String(n).padStart(6, "0");

describe("leitura página a página", () => {
  it("emPedacos divide sem perder nem repetir", () => {
    const itens = Array.from({ length: 401 }, (_, i) => i);
    const pedacos = emPedacos(itens);
    expect(pedacos.map((p) => p.length)).toEqual([150, 150, 101]);
    expect(pedacos.flat()).toEqual(itens);
  });

  it("lerTudo passa do limite de 1000 linhas e propaga erro", async () => {
    const tudo = Array.from({ length: 2500 }, (_, i) => i);
    const lidas = await lerTudo<number>((de, ate) => Promise.resolve({ data: tudo.slice(de, ate + 1) }));
    expect(lidas).toHaveLength(2500);
    await expect(lerTudo(() => Promise.resolve({ data: null, error: { message: "falhou" } }))).rejects.toThrow(
      "falhou",
    );
  });

  it("lerPorIds lê tudo com muitos ids e muitas linhas", async () => {
    // 400 tentativas com 9 respostas cada = 3600 linhas (o ranking de uma temporada).
    const donos = Array.from({ length: 400 }, (_, i) => `t${i}`);
    const linhas = donos.flatMap((dono, i) =>
      Array.from({ length: 9 }, (_, k) => ({ id: id(i * 9 + k), dono, fracao: k === 0 ? null : 1 })),
    );
    const { db, pedidos } = bancoFalso(linhas);
    const todas = await lerPorIds<{ id: string }>(db, "respostas", "*", "tentativa_id", donos);
    expect(new Set(todas.map((l) => l.id)).size).toBe(3600);
    // Nenhum pedido leva mais de 150 ids.
    expect(Math.max(...pedidos.map((p) => p.ids))).toBeLessThanOrEqual(150);
    // Os pedaços de 150 tentativas têm 1350 linhas: precisam da segunda página.
    expect(pedidos.some((p) => p.de === 1000)).toBe(true);

    const corrigidas = await respostasCorrigidas<{ id: string }>(db, "*", donos);
    expect(corrigidas).toHaveLength(3200);
  });

  it("lerPorIds sem ids não vai ao banco", async () => {
    const { db, pedidos } = bancoFalso([]);
    expect(await lerPorIds(db, "respostas", "*", "tentativa_id", [])).toEqual([]);
    expect(pedidos).toHaveLength(0);
  });
});

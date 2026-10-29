import { describe, expect, it } from "vitest";
import { calcularConquistas, calcularNivel, calcularProgresso, dominioCapitulo, xpDoNivel } from "../progresso";

describe("calcularNivel", () => {
  it("segue a curva 0, 100, 300, 600", () => {
    expect([1, 2, 3, 4].map(xpDoNivel)).toEqual([0, 100, 300, 600]);
    expect(calcularNivel(0).nivel).toBe(1);
    expect(calcularNivel(99).nivel).toBe(1);
    expect(calcularNivel(100)).toMatchObject({ nivel: 2, noNivel: 0, paraProximo: 200 });
    expect(calcularNivel(450)).toMatchObject({ nivel: 3, noNivel: 150, paraProximo: 300 });
  });
});

const desafio = (id: string, dia: number, concluido = true, tipo = "semanal") => ({
  id,
  titulo: id,
  tipo,
  abre_em: `2026-11-${String(dia).padStart(2, "0")}T11:00:00Z`,
  questoes: 2,
  concluido,
});
const questoes = new Map([
  ["q1", { habilidades: ["Cronologia"], capitulo: "Roma Antiga" }],
  ["q2", { habilidades: ["Cronologia", "Conceitos"], capitulo: "Roma antiga" }],
]);
const resp = (desafioId: string, a: number, b: number) => [
  { desafioId, questaoId: "q1", fracao: a },
  { desafioId, questaoId: "q2", fracao: b },
];

describe("calcularProgresso", () => {
  const p = calcularProgresso({
    respostas: [...resp("d1", 0, 0.5), ...resp("d2", 1, 1)],
    desafios: [desafio("d2", 9), desafio("d1", 2)],
    questoes,
    revisoesAcertadas: 2,
  });
  it("soma XP de questões, acertos, desafios e revisões", () => {
    // 4 questões × 5 + 2,5 acertos × 10 + 2 desafios × 20 + 2 revisões × 5
    expect(p.xp).toBe(20 + 25 + 40 + 10);
  });
  it("agrupa por habilidade e por capítulo (sem ligar para maiúsculas)", () => {
    const crono = p.habilidades.find((h) => h.nome === "Cronologia")!;
    expect(crono.questoes).toBe(4);
    expect(crono.acerto).toBeCloseTo(2.5 / 4);
    expect(p.habilidades.find((h) => h.nome === "Análise de fonte")!.questoes).toBe(0);
    expect(p.capitulos.get("roma antiga")!.questoes).toBe(4);
  });
  it("monta o histórico em ordem", () => {
    expect(p.historico.map((h) => [h.id, h.acerto])).toEqual([
      ["d1", 0.25],
      ["d2", 1],
    ]);
  });
});

describe("calcularConquistas", () => {
  const extra = { posicao: 12, pontos: 50, medalhas: 0, maiorSequencia: 0 };
  const conquistas = (acertos: number[]) => {
    const respostas = acertos.flatMap((a, i) => resp(`d${i}`, a, a));
    const desafios = acertos.map((_, i) => desafio(`d${i}`, i + 1));
    const p = calcularProgresso({ respostas, desafios, questoes, revisoesAcertadas: 0 });
    return new Set(
      calcularConquistas(p, extra)
        .filter((c) => c.conquistada)
        .map((c) => c.id),
    );
  };
  it("premia quem melhora", () => {
    const c = conquistas([0.3, 0.4, 0.8]);
    expect(c.has("primeiro")).toBe(true);
    expect(c.has("superacao")).toBe(true);
    expect(c.has("ascensao")).toBe(true);
    expect(c.has("top10")).toBe(false);
  });
  it("recorde pessoal só a partir do 4º desafio", () => {
    expect(conquistas([0.5, 0.6, 0.7]).has("recorde")).toBe(false);
    expect(conquistas([0.5, 0.6, 0.6, 0.7]).has("recorde")).toBe(true);
  });
});

describe("dominioCapitulo", () => {
  it("classifica pelo acerto", () => {
    expect(dominioCapitulo(undefined)).toBe("novo");
    expect(dominioCapitulo({ nome: "x", acerto: 0.3, questoes: 4 })).toBe("comecando");
    expect(dominioCapitulo({ nome: "x", acerto: 0.6, questoes: 4 })).toBe("avancando");
    expect(dominioCapitulo({ nome: "x", acerto: 0.9, questoes: 4 })).toBe("dominado");
  });
});

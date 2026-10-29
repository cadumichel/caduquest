import { describe, expect, it } from "vitest";
import { calcularMissao, prazo, proximoCaduRush } from "../missao";

const agora = new Date("2026-11-04T15:00:00Z");
const aberto = {
  id: "s1",
  tipo: "semanal" as const,
  titulo: "Semana 1",
  abre_em: "2026-11-02T11:00:00Z",
  fecha_em: "2026-11-06T23:00:00Z",
};
const rush = {
  id: "r1",
  tipo: "relampago" as const,
  titulo: "Rush",
  abre_em: "2026-11-04T14:00:00Z",
  fecha_em: "2026-11-04T15:45:00Z",
};
const futuro = {
  id: "s2",
  tipo: "semanal" as const,
  titulo: "Semana 2",
  abre_em: "2026-11-09T11:00:00Z",
  fecha_em: "2026-11-13T23:00:00Z",
};
const base = {
  concluidos: new Set<string>(),
  iniciados: new Set<string>(),
  errosParaRevisar: 0,
  diasAteProva: 10,
  agora,
};

describe("prazo", () => {
  it("fala em horas no último dia e em dias antes", () => {
    expect(prazo("2026-11-04T15:30:00Z", agora)).toBe("fecha em menos de 1 hora");
    expect(prazo("2026-11-04T20:00:00Z", agora)).toBe("fecha em 5 horas");
    expect(prazo("2026-11-06T23:00:00Z", agora)).toBe("faltam 2 dias para fechar");
  });
});

describe("calcularMissao", () => {
  it("CaduRush aberto vem primeiro", () => {
    expect(calcularMissao({ ...base, desafios: [aberto, rush] }).tipo).toBe("cadurush");
  });
  it("depois o desafio aberto não concluído", () => {
    const m = calcularMissao({ ...base, desafios: [aberto, rush], concluidos: new Set(["r1"]) });
    expect(m.tipo).toBe("desafio");
    expect(m.href).toBe("/aluno/desafio/s1");
  });
  it("com tudo feito, sugere a revisão de erros", () => {
    const m = calcularMissao({ ...base, desafios: [aberto], concluidos: new Set(["s1"]), errosParaRevisar: 3 });
    expect(m.tipo).toBe("revisao");
    expect(m.href).toBe("/aluno/revisao");
  });
  it("sem nada a fazer, mostra o próximo desafio ou a prova", () => {
    expect(calcularMissao({ ...base, desafios: [aberto, futuro], concluidos: new Set(["s1"]) }).tipo).toBe("aguardar");
    expect(calcularMissao({ ...base, desafios: [] }).tipo).toBe("prova");
    expect(calcularMissao({ ...base, desafios: [], diasAteProva: -1 }).tipo).toBe("encerrada");
  });
});

describe("proximoCaduRush", () => {
  it("acha o relâmpago agendado mais próximo", () => {
    const r2 = { ...rush, id: "r2", abre_em: "2026-11-11T14:00:00Z", fecha_em: "2026-11-11T15:00:00Z" };
    expect(proximoCaduRush([rush, r2, futuro], agora)?.id).toBe("r2");
    expect(proximoCaduRush([rush], agora)).toBeNull();
  });
});

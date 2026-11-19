import { describe, expect, it } from "vitest";
import {
  diaBrasilia,
  montarRelatorio,
  partidasDoJogador,
  resolverPeriodo,
  type PartidaRel,
  type RespostaRel,
} from "../publico/relatorio";

const hoje = "2026-11-19";

describe("resolverPeriodo", () => {
  it("usa 7 dias por padrão e aceita os atalhos", () => {
    expect(resolverPeriodo({}, hoje, "2026-11-01")).toEqual({ id: "7", de: "2026-11-13", ate: hoje });
    expect(resolverPeriodo({ periodo: "hoje" }, hoje, "2026-11-01")).toEqual({ id: "hoje", de: hoje, ate: hoje });
    expect(resolverPeriodo({ periodo: "30" }, hoje, "2026-11-01").de).toBe("2026-10-21");
    expect(resolverPeriodo({ periodo: "tudo" }, hoje, "2026-11-01").de).toBe("2026-11-01");
  });
  it("datas escolhidas: valida e põe em ordem", () => {
    expect(resolverPeriodo({ periodo: "datas", de: "2026-11-10", ate: "2026-11-05" }, hoje, hoje)).toEqual({
      id: "datas",
      de: "2026-11-05",
      ate: "2026-11-10",
    });
    expect(resolverPeriodo({ periodo: "datas", de: "lixo" }, hoje, hoje).de).toBe("2026-11-13");
  });
});

describe("diaBrasilia", () => {
  it("usa o horário de Brasília", () => {
    expect(diaBrasilia("2026-11-19T02:00:00Z")).toBe("2026-11-18");
    expect(diaBrasilia("2026-11-19T03:00:00Z")).toBe("2026-11-19");
  });
});

const jogadores = [
  { id: "a", apelido: "Ana", avatar: 0, cor: 0, criado_em: "2026-11-18T15:00:00Z", ultimo_acesso: null },
  { id: "b", apelido: "Beto", avatar: 1, cor: 1, criado_em: "2026-11-01T15:00:00Z", ultimo_acesso: null },
  { id: "c", apelido: "Caio", avatar: 2, cor: 2, criado_em: "2026-11-01T15:00:00Z", ultimo_acesso: null },
];
const partidas: PartidaRel[] = [
  {
    id: "p1",
    jogador_id: "a",
    era: "antiga",
    vale_ranking: true,
    iniciada_em: "2026-11-18T15:00:00Z",
    concluida_em: "2026-11-18T15:10:00Z",
    pontos: 100,
  },
  {
    id: "p2",
    jogador_id: "b",
    era: "antiga",
    vale_ranking: true,
    iniciada_em: "2026-11-19T12:00:00Z",
    concluida_em: null,
    pontos: 0,
  },
  {
    id: "p3",
    jogador_id: "b",
    era: "medieval",
    vale_ranking: false,
    iniciada_em: "2026-11-10T12:00:00Z",
    concluida_em: null,
    pontos: 0,
  },
];
const respostas: RespostaRel[] = [
  ...Array.from({ length: 5 }, (_, i) => ({
    partida_id: i < 3 ? "p1" : "p2",
    questao_id: "q1",
    final: false,
    fracao: i === 0 ? 1 : 0,
    motivo_zerada: null,
  })),
  { partida_id: "p1", questao_id: "q2", final: true, fracao: 0, motivo_zerada: "saida" },
  { partida_id: "p2", questao_id: "q3", final: false, fracao: null, motivo_zerada: null },
];
const acessos = [
  { jogador_id: "a", dia: "2026-11-18" },
  { jogador_id: "b", dia: "2026-11-19" },
  { jogador_id: "c", dia: "2026-11-02" },
];
const agora = new Date("2026-11-19T20:00:00Z");

describe("montarRelatorio", () => {
  const rel = montarRelatorio(
    { jogadores, acessos, partidas, respostas },
    { id: "7", de: "2026-11-13", ate: hoje },
    { agora },
  );

  it("resumo do período", () => {
    expect(rel.resumo).toEqual({
      inscritosNovos: 1,
      jogadoresAtivos: 2,
      acessos: 2,
      partidasIniciadas: 2,
      partidasConcluidas: 1,
      taxaConclusao: 0.5,
      acertoMedio: 1 / 6,
    });
  });

  it("um ponto por dia do período", () => {
    expect(rel.porDia).toHaveLength(7);
    expect(rel.porDia.find((d) => d.dia === "2026-11-18")).toEqual({
      dia: "2026-11-18",
      inscritos: 1,
      ativos: 1,
      partidas: 1,
    });
  });

  it("por era: andamento, rodada final e zeradas", () => {
    expect(rel.porEra).toHaveLength(1);
    const e = rel.porEra[0];
    expect(e).toMatchObject({ era: "antiga", partidas: 2, concluidas: 1, abandonadas: 0, emAndamento: 1 });
    expect(e.acertoFinal).toBe(0);
    expect(e.zeradasFinal).toBe(1);
    expect(e.mediaPontos).toBe(100);
  });

  it("questões mais erradas só com o mínimo de respostas", () => {
    expect(rel.maisErradas).toEqual([{ questaoId: "q1", respostas: 5, acerto: 0.2, erros: 4 }]);
  });

  it("jogadores ativos no período e ranking do período", () => {
    expect(rel.jogadores.map((j) => j.apelido)).toEqual(["Beto", "Ana"]);
    expect(rel.jogadores.find((j) => j.id === "a")).toMatchObject({ pontosRanking: 100, zeradasFinal: 1 });
    expect(rel.ranking.map((l) => l.jogadorId)).toEqual(["a"]);
  });

  it("filtro de era", () => {
    const so = montarRelatorio(
      { jogadores, acessos, partidas, respostas },
      { id: "tudo", de: "2026-11-01", ate: hoje },
      { agora, era: "medieval" },
    );
    expect(so.resumo.partidasIniciadas).toBe(1);
    expect(so.porEra[0]).toMatchObject({ era: "medieval", abandonadas: 1 });
    expect(so.ranking).toEqual([]);
  });
});

describe("partidasDoJogador", () => {
  it("situação e acertos de cada partida", () => {
    const ps = partidasDoJogador(
      partidas.filter((p) => p.jogador_id === "b"),
      respostas,
      agora,
    );
    expect(ps.map((p) => [p.id, p.situacao, p.acertos, p.respondidas])).toEqual([
      ["p2", "andamento", 0, 2],
      ["p3", "abandonada", 0, 0],
    ]);
  });
});

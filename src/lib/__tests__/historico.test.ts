import { describe, expect, it } from "vitest";
import { montarHistorico, resumirHistorico, type DesafioHistorico } from "../historico";

const agora = new Date("2026-11-10T12:00:00Z");
const desafio = (id: string, abre: string, fecha: string, extra: Partial<DesafioHistorico> = {}): DesafioHistorico => ({
  id,
  temporada_id: "t1",
  titulo: id,
  abre_em: abre,
  fecha_em: fecha,
  questoes: 10,
  temporadas: { data_prova: "2026-12-01" },
  ...extra,
});
const tentativa = (desafio_id: string, extra: Partial<{ concluida_em: string | null; indice_atual: number }> = {}) => ({
  id: `t-${desafio_id}`,
  desafio_id,
  pontos: 30,
  concluida_em: "2026-11-01T10:00:00Z",
  indice_atual: 3,
  ordem: ["a", "b", "c"],
  ...extra,
});

describe("histórico do aluno", () => {
  const fechado = desafio("fechado", "2026-11-01T10:00:00Z", "2026-11-02T10:00:00Z");
  const aberto = desafio("aberto", "2026-11-10T10:00:00Z", "2026-11-11T10:00:00Z");
  const futuro = desafio("futuro", "2026-11-20T10:00:00Z", "2026-11-21T10:00:00Z");
  const perdido = desafio("perdido", "2026-11-03T10:00:00Z", "2026-11-04T10:00:00Z");
  const respostas = [
    { tentativa_id: "t-fechado", fracao: 1 },
    { tentativa_id: "t-fechado", fracao: 0.5 },
    { tentativa_id: "t-aberto", fracao: 1 },
  ];

  it("mostra o que o aluno fez, o que perdeu, e esconde o futuro", () => {
    const itens = montarHistorico(
      [fechado, aberto, futuro, perdido],
      [tentativa("fechado"), tentativa("aberto", { concluida_em: null, indice_atual: 1 })],
      respostas,
      agora,
    );
    expect(itens.map((i) => [i.desafio.id, i.estado])).toEqual([
      ["aberto", "andamento"],
      ["perdido", "perdeu"],
      ["fechado", "fez"],
    ]);
    expect(itens[2]).toMatchObject({ pontos: 30, acertos: 1.5, total: 3, gabarito: "liberado" });
  });

  it("não mostra números de um desafio aberto que o aluno ainda está respondendo", () => {
    const [item] = montarHistorico(
      [aberto],
      [tentativa("aberto", { concluida_em: null, indice_atual: 1 })],
      respostas,
      agora,
    );
    expect(item).toMatchObject({ estado: "andamento", pontos: 0, acertos: 0 });
  });

  it("segue as regras do gabarito", () => {
    const so = desafio("so", "2026-11-01T10:00:00Z", "2026-11-02T10:00:00Z", {
      temporadas: { data_prova: "2026-12-01", gabarito_so_no_encerramento: true },
    });
    const manual = desafio("manual", "2026-11-01T10:00:00Z", "2026-11-02T10:00:00Z", { gabarito_manual: true });
    const nunca = desafio("nunca", "2026-11-01T10:00:00Z", "2026-11-02T10:00:00Z", { gabarito_nunca: true });
    const terminouAberto = montarHistorico([aberto], [tentativa("aberto")], [], agora)[0];
    const itens = montarHistorico(
      [so, manual, nunca],
      [tentativa("so"), tentativa("manual"), tentativa("nunca")],
      [],
      agora,
    );
    expect(Object.fromEntries(itens.map((i) => [i.desafio.id, i.gabarito]))).toEqual({
      so: "encerramento",
      manual: "professor",
      nunca: "nunca",
    });
    expect(terminouAberto).toMatchObject({ estado: "fez", gabarito: "aguarda" });
  });

  it("resume só os desafios feitos", () => {
    const itens = montarHistorico([fechado, perdido], [tentativa("fechado")], respostas, agora);
    expect(resumirHistorico(itens)).toEqual({ feitos: 1, perdidos: 1, pontos: 30, acertos: 1.5, questoes: 3 });
  });
});

/**
 * Relatório do desafio aberto (painel do professor): acessos e desempenho dos
 * jogadores públicos num período. Regras puras (sem banco), para testar.
 */
import { arredondarPontos } from "../pontos";
import { montarRankingPublico, type LinhaRankingPublico } from "./regras";

export type JogadorRel = {
  id: string;
  apelido: string;
  avatar: number;
  cor: number;
  criado_em: string;
  ultimo_acesso: string | null;
};
export type AcessoRel = { jogador_id: string; dia: string };
export type PartidaRel = {
  id: string;
  jogador_id: string;
  era: string;
  vale_ranking: boolean;
  iniciada_em: string;
  concluida_em: string | null;
  pontos: number | string;
};
export type RespostaRel = {
  partida_id: string;
  questao_id: string;
  final: boolean;
  fracao: number | string | null;
  motivo_zerada: string | null;
};

export type Periodo = { id: PeriodoId; de: string; ate: string };
export const PERIODOS = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7", rotulo: "7 dias" },
  { id: "30", rotulo: "30 dias" },
  { id: "tudo", rotulo: "Tudo" },
  { id: "datas", rotulo: "Escolher datas" },
] as const;
export type PeriodoId = (typeof PERIODOS)[number]["id"];

/** Mínimo de respostas para a questão entrar em "mais erradas". */
export const MIN_RESPOSTAS_QUESTAO = 5;
/** Partida parada há mais que isto, sem concluir, conta como abandonada. */
export const HORAS_ABANDONO = 24;

const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia (AAAA-MM-DD) no horário de Brasília (sempre UTC-3). */
export const diaBrasilia = (iso: string | Date) =>
  new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);

export function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lê ?periodo, ?de e ?ate. `inicio` é o primeiro dia com dados (para "Tudo"). */
export function resolverPeriodo(
  params: { periodo?: unknown; de?: unknown; ate?: unknown },
  hoje: string,
  inicio: string,
): Periodo {
  const id = PERIODOS.some((p) => p.id === params.periodo) ? (params.periodo as PeriodoId) : "7";
  if (id === "hoje") return { id, de: hoje, ate: hoje };
  if (id === "7") return { id, de: somarDias(hoje, -6), ate: hoje };
  if (id === "30") return { id, de: somarDias(hoje, -29), ate: hoje };
  const comeco = inicio < hoje ? inicio : hoje;
  if (id === "tudo") return { id, de: comeco, ate: hoje };
  let de = typeof params.de === "string" && DIA_RE.test(params.de) ? params.de : somarDias(hoje, -6);
  let ate = typeof params.ate === "string" && DIA_RE.test(params.ate) ? params.ate : hoje;
  if (de > ate) [de, ate] = [ate, de];
  return { id, de, ate };
}

const noPeriodo = (dia: string, p: Periodo) => dia >= p.de && dia <= p.ate;
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const fr = (r: RespostaRel) => (r.fracao === null ? null : Number(r.fracao));

export type ResumoRel = {
  inscritosNovos: number;
  jogadoresAtivos: number;
  acessos: number;
  partidasIniciadas: number;
  partidasConcluidas: number;
  /** 0..1, ou null sem partidas. */
  taxaConclusao: number | null;
  /** 0..1, ou null sem respostas. */
  acertoMedio: number | null;
};
export type DiaRel = { dia: string; inscritos: number; ativos: number; partidas: number };
export type EraRel = {
  era: string;
  partidas: number;
  ranking: number;
  treino: number;
  concluidas: number;
  abandonadas: number;
  emAndamento: number;
  acertoMedio: number | null;
  acertoConsulta: number | null;
  acertoFinal: number | null;
  mediaPontos: number | null;
  zeradasFinal: number;
};
export type QuestaoRel = { questaoId: string; respostas: number; acerto: number; erros: number };
export type JogadorLinhaRel = {
  id: string;
  apelido: string;
  avatar: number;
  cor: number;
  criadoEm: string;
  /** ISO com horário, ou só o dia (AAAA-MM-DD). */
  ultimoAcesso: string | null;
  diasAtivos: number;
  eras: number;
  partidas: number;
  pontosRanking: number;
  acertoMedio: number | null;
  zeradasFinal: number;
};
export type Relatorio = {
  resumo: ResumoRel;
  porDia: DiaRel[];
  porEra: EraRel[];
  maisErradas: QuestaoRel[];
  jogadores: JogadorLinhaRel[];
  ranking: LinhaRankingPublico[];
};

/** Partidas da era (ou todas) iniciadas no período. */
export const partidasDoPeriodo = (partidas: PartidaRel[], p: Periodo, era?: string) =>
  partidas.filter((x) => noPeriodo(diaBrasilia(x.iniciada_em), p) && (!era || x.era === era));

export function montarRelatorio(
  dados: { jogadores: JogadorRel[]; acessos: AcessoRel[]; partidas: PartidaRel[]; respostas: RespostaRel[] },
  periodo: Periodo,
  opcoes: { era?: string; agora?: Date } = {},
): Relatorio {
  const { era } = opcoes;
  const agora = (opcoes.agora ?? new Date()).getTime();
  const acessos = dados.acessos.filter((a) => noPeriodo(a.dia, periodo));
  const novos = dados.jogadores.filter((j) => noPeriodo(diaBrasilia(j.criado_em), periodo));
  const partidas = partidasDoPeriodo(dados.partidas, periodo, era);
  const idsPartidas = new Set(partidas.map((x) => x.id));
  const respostas = dados.respostas.filter((r) => idsPartidas.has(r.partida_id));
  const corrigidas = respostas.filter((r) => fr(r) !== null);
  const concluidas = partidas.filter((x) => x.concluida_em);

  const resumo: ResumoRel = {
    inscritosNovos: novos.length,
    jogadoresAtivos: new Set(acessos.map((a) => a.jogador_id)).size,
    acessos: acessos.length,
    partidasIniciadas: partidas.length,
    partidasConcluidas: concluidas.length,
    taxaConclusao: partidas.length ? concluidas.length / partidas.length : null,
    acertoMedio: media(corrigidas.map((r) => fr(r)!)),
  };

  const porDia: DiaRel[] = [];
  for (let d = periodo.de; d <= periodo.ate; d = somarDias(d, 1)) {
    porDia.push({ dia: d, inscritos: 0, ativos: 0, partidas: 0 });
  }
  const indiceDia = new Map(porDia.map((d, i) => [d.dia, i]));
  for (const j of novos) porDia[indiceDia.get(diaBrasilia(j.criado_em))!].inscritos++;
  for (const a of acessos) porDia[indiceDia.get(a.dia)!].ativos++;
  for (const x of partidas) porDia[indiceDia.get(diaBrasilia(x.iniciada_em))!].partidas++;

  const limiteAbandono = agora - HORAS_ABANDONO * 3600 * 1000;
  const porEra: EraRel[] = [];
  for (const id of [...new Set(partidas.map((x) => x.era))]) {
    const ps = partidas.filter((x) => x.era === id);
    const ids = new Set(ps.map((x) => x.id));
    const rs = corrigidas.filter((r) => ids.has(r.partida_id));
    const feitas = ps.filter((x) => x.concluida_em);
    const abandonadas = ps.filter((x) => !x.concluida_em && new Date(x.iniciada_em).getTime() < limiteAbandono);
    porEra.push({
      era: id,
      partidas: ps.length,
      ranking: ps.filter((x) => x.vale_ranking).length,
      treino: ps.filter((x) => !x.vale_ranking).length,
      concluidas: feitas.length,
      abandonadas: abandonadas.length,
      emAndamento: ps.length - feitas.length - abandonadas.length,
      acertoMedio: media(rs.map((r) => fr(r)!)),
      acertoConsulta: media(rs.filter((r) => !r.final).map((r) => fr(r)!)),
      acertoFinal: media(rs.filter((r) => r.final).map((r) => fr(r)!)),
      mediaPontos: feitas.length ? arredondarPontos(media(feitas.map((x) => Number(x.pontos)))!) : null,
      zeradasFinal: respostas.filter((r) => ids.has(r.partida_id) && r.final && r.motivo_zerada).length,
    });
  }
  porEra.sort((a, b) => b.partidas - a.partidas || a.era.localeCompare(b.era));

  const porQuestao = new Map<string, number[]>();
  for (const r of corrigidas) porQuestao.set(r.questao_id, [...(porQuestao.get(r.questao_id) ?? []), fr(r)!]);
  const maisErradas = [...porQuestao.entries()]
    .filter(([, v]) => v.length >= MIN_RESPOSTAS_QUESTAO)
    .map(([questaoId, v]) => ({
      questaoId,
      respostas: v.length,
      acerto: media(v)!,
      erros: v.filter((f) => f < 1).length,
    }))
    .sort((a, b) => a.acerto - b.acerto || b.respostas - a.respostas || a.questaoId.localeCompare(b.questaoId))
    .slice(0, 10);

  // Jogadores com alguma atividade no período: cadastro, acesso ou partida.
  const ativos = new Set([
    ...novos.map((j) => j.id),
    ...acessos.map((a) => a.jogador_id),
    ...partidas.map((x) => x.jogador_id),
  ]);
  const ultimoDia = new Map<string, string>();
  for (const a of dados.acessos) {
    if ((ultimoDia.get(a.jogador_id) ?? "") < a.dia) ultimoDia.set(a.jogador_id, a.dia);
  }
  const jogadores: JogadorLinhaRel[] = dados.jogadores
    .filter((j) => ativos.has(j.id))
    .map((j) => {
      const ps = partidas.filter((x) => x.jogador_id === j.id);
      const ids = new Set(ps.map((x) => x.id));
      const rs = respostas.filter((r) => ids.has(r.partida_id));
      // Horário do último login, ou só o dia (AAAA-MM-DD) quando o acesso mais recente foi sem login.
      const dia = ultimoDia.get(j.id);
      const ultimoAcesso =
        j.ultimo_acesso && (!dia || diaBrasilia(j.ultimo_acesso) >= dia) ? j.ultimo_acesso : (dia ?? null);
      return {
        id: j.id,
        apelido: j.apelido,
        avatar: j.avatar,
        cor: j.cor,
        criadoEm: j.criado_em,
        ultimoAcesso,
        diasAtivos: acessos.filter((a) => a.jogador_id === j.id).length,
        eras: new Set(ps.map((x) => x.era)).size,
        partidas: ps.length,
        pontosRanking: arredondarPontos(
          ps.filter((x) => x.vale_ranking && x.concluida_em).reduce((s, x) => s + Number(x.pontos), 0),
        ),
        acertoMedio: media(rs.filter((r) => fr(r) !== null).map((r) => fr(r)!)),
        zeradasFinal: rs.filter((r) => r.final && r.motivo_zerada).length,
      };
    })
    .sort(
      (a, b) =>
        (b.ultimoAcesso ?? "").localeCompare(a.ultimoAcesso ?? "") ||
        b.partidas - a.partidas ||
        a.apelido.localeCompare(b.apelido),
    );

  // Ranking do período: partidas de ranking concluídas no período.
  const ranking = montarRankingPublico(
    dados.partidas
      .filter(
        (x) =>
          x.vale_ranking &&
          x.concluida_em &&
          noPeriodo(diaBrasilia(x.concluida_em), periodo) &&
          (!era || x.era === era),
      )
      .map((x) => ({
        jogadorId: x.jogador_id,
        era: x.era,
        pontos: Number(x.pontos),
        duracaoMs: new Date(x.concluida_em!).getTime() - new Date(x.iniciada_em).getTime(),
      })),
  );

  return { resumo, porDia, porEra, maisErradas, jogadores, ranking };
}

export type PartidaDoJogador = {
  id: string;
  era: string;
  valeRanking: boolean;
  iniciadaEm: string;
  concluidaEm: string | null;
  pontos: number;
  /** Soma das frações acertadas (0..10). */
  acertos: number;
  respondidas: number;
  zeradasFinal: number;
  situacao: "concluida" | "andamento" | "abandonada";
};

/** Partidas de um jogador, da mais recente para a mais antiga. */
export function partidasDoJogador(
  partidas: PartidaRel[],
  respostas: RespostaRel[],
  agora: Date = new Date(),
): PartidaDoJogador[] {
  const limite = agora.getTime() - HORAS_ABANDONO * 3600 * 1000;
  return [...partidas]
    .sort((a, b) => b.iniciada_em.localeCompare(a.iniciada_em))
    .map((x) => {
      const rs = respostas.filter((r) => r.partida_id === x.id && fr(r) !== null);
      return {
        id: x.id,
        era: x.era,
        valeRanking: x.vale_ranking,
        iniciadaEm: x.iniciada_em,
        concluidaEm: x.concluida_em,
        pontos: Number(x.pontos),
        acertos: arredondarPontos(rs.reduce((s, r) => s + fr(r)!, 0)),
        respondidas: rs.length,
        zeradasFinal: respostas.filter((r) => r.partida_id === x.id && r.final && r.motivo_zerada).length,
        situacao: x.concluida_em
          ? "concluida"
          : new Date(x.iniciada_em).getTime() < limite
            ? "abandonada"
            : "andamento",
      };
    });
}

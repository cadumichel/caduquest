import { segundaDaSemana, type DesafioDaSemana } from "./constancia";

/**
 * Liga da semana: a turma é dividida em Ouro, Prata e Bronze pelos pontos da
 * temporada até a semana passada, e cada divisão disputa só os pontos desta
 * semana. Assim quem está atrás no ranking geral disputa com quem está perto.
 */

export const DIVISOES = ["Ouro", "Prata", "Bronze"] as const;
export type Divisao = (typeof DIVISOES)[number] | "Turma";
/** Abaixo disso (alunos com pontos), a turma joga uma liga só. */
export const MINIMO_PARA_DIVIDIR = 6;

export type EntradaLiga = { alunoId: string; pontosAntes: number; pontosSemana: number };
export type Liga = { divisao: Divisao; membros: (EntradaLiga & { posicao: number })[] };

export function montarLigas(entradas: EntradaLiga[]): Liga[] {
  const ordenados = [...entradas].sort((a, b) => b.pontosAntes - a.pontosAntes || a.alunoId.localeCompare(b.alunoId));
  const comPontos = ordenados.filter((e) => e.pontosAntes > 0).length;
  const grupos: [Divisao, EntradaLiga[]][] =
    comPontos < MINIMO_PARA_DIVIDIR
      ? [["Turma", ordenados]]
      : DIVISOES.map((d, i) => {
          const tam = Math.ceil(ordenados.length / 3);
          return [d, ordenados.slice(i * tam, (i + 1) * tam)];
        });
  return grupos
    .filter(([, m]) => m.length)
    .map(([divisao, membros]) => {
      const porSemana = [...membros].sort((a, b) => b.pontosSemana - a.pontosSemana || b.pontosAntes - a.pontosAntes);
      const comPosicao = porSemana.map((m) => ({ ...m, posicao: 0 }));
      comPosicao.forEach((m, i) => {
        const ant = comPosicao[i - 1];
        m.posicao = ant && ant.pontosSemana === m.pontosSemana ? ant.posicao : i + 1;
      });
      return { divisao, membros: comPosicao };
    });
}

/**
 * Meta coletiva: se 80% da turma concluir todos os desafios semanais da semana,
 * todos ganham +10 pontos. O CaduRush não conta.
 */
export const META_PARTICIPACAO = 0.8;
export const BONUS_META = 10;

export type MetaSemana = {
  semana: string;
  participantes: number;
  total: number;
  batida: boolean;
  /** Quantos alunos ainda faltam para bater a meta. */
  faltam: number;
};

export function calcularMetaTurma(
  semanas: DesafioDaSemana[][],
  concluidosPorAluno: Map<string, Set<string>>,
  alunos: string[],
  agora = new Date(),
) {
  const total = alunos.length;
  const porSemana: MetaSemana[] = semanas
    .filter((ds) => ds.length)
    .map((ds) => {
      const participantes = alunos.filter((a) => ds.every((d) => concluidosPorAluno.get(a)?.has(d.id))).length;
      return {
        semana: segundaDaSemana(ds[0].abre_em),
        participantes,
        total,
        batida: total > 0 && participantes / total >= META_PARTICIPACAO,
        faltam: Math.max(0, Math.ceil(total * META_PARTICIPACAO - 1e-9) - participantes),
      };
    });
  const semanaAtual = segundaDaSemana(agora.toISOString());
  const batidas = porSemana.filter((s) => s.batida).length;
  return {
    semanasBatidas: batidas,
    bonus: batidas * BONUS_META,
    atual: porSemana.find((s) => s.semana === semanaAtual) ?? null,
  };
}

export type MetaTurma = ReturnType<typeof calcularMetaTurma>;

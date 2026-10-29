export type LinhaRanking = {
  alunoId: string;
  apelido: string;
  avatar: number;
  cor: number;
  pontos: number;
  /** Taxa de acerto de 0 a 1 (média das frações de todas as questões respondidas). */
  acerto: number;
  questoes: number;
  /** Bônus de constância já somado em pontos. */
  bonus: number;
  /** Bônus da meta coletiva da turma, já somado em pontos. */
  bonusTurma: number;
  /** Ofensiva atual (desafios seguidos concluídos). */
  sequencia: number;
  desafiosCompletos: number;
  maiorSequencia: number;
  posicao: number;
};

type Entrada = {
  alunoId: string;
  apelido: string;
  avatar?: number;
  cor?: number;
  pontos: number;
  somaFracoes: number;
  questoes: number;
  bonus?: number;
  bonusTurma?: number;
  sequencia?: number;
  desafiosCompletos?: number;
  maiorSequencia?: number;
};

/**
 * Ranking da temporada: soma de pontos (com o bônus de constância); desempate pela
 * maior taxa de acerto e depois por mais desafios concluídos na ofensiva.
 * Empate completo divide a posição (1, 2, 2, 4).
 */
export function montarRanking(entradas: Entrada[]): LinhaRanking[] {
  const linhas = entradas.map((e) => ({
    alunoId: e.alunoId,
    apelido: e.apelido,
    avatar: e.avatar ?? 0,
    cor: e.cor ?? 0,
    pontos: Math.round((e.pontos + (e.bonus ?? 0) + (e.bonusTurma ?? 0)) * 100) / 100,
    acerto: e.questoes > 0 ? e.somaFracoes / e.questoes : 0,
    questoes: e.questoes,
    bonus: e.bonus ?? 0,
    bonusTurma: e.bonusTurma ?? 0,
    sequencia: e.sequencia ?? 0,
    desafiosCompletos: e.desafiosCompletos ?? 0,
    maiorSequencia: e.maiorSequencia ?? 0,
    posicao: 0,
  }));
  linhas.sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.acerto - a.acerto ||
      b.desafiosCompletos - a.desafiosCompletos ||
      a.apelido.localeCompare(b.apelido, "pt-BR"),
  );
  linhas.forEach((l, i) => {
    const anterior = linhas[i - 1];
    const empatado =
      anterior &&
      anterior.pontos === l.pontos &&
      anterior.acerto === l.acerto &&
      anterior.desafiosCompletos === l.desafiosCompletos;
    l.posicao = empatado ? anterior.posicao : i + 1;
  });
  return linhas;
}

/** O que a turma vê: top 10 e a posição do próprio aluno. As últimas posições nunca aparecem. */
export function rankingParaAluno(ranking: LinhaRanking[], alunoId: string) {
  return {
    top: ranking.slice(0, 10),
    eu: ranking.find((l) => l.alunoId === alunoId) ?? null,
    total: ranking.length,
  };
}

export type LinhaRanking = {
  alunoId: string;
  apelido: string;
  pontos: number;
  /** Taxa de acerto de 0 a 1 (média das frações de todas as questões respondidas). */
  acerto: number;
  questoes: number;
  posicao: number;
};

type Entrada = { alunoId: string; apelido: string; pontos: number; somaFracoes: number; questoes: number };

/**
 * Ranking da temporada: soma de pontos; desempate pela maior taxa de acerto.
 * Empate completo divide a posição (1, 2, 2, 4).
 */
export function montarRanking(entradas: Entrada[]): LinhaRanking[] {
  const linhas = entradas.map((e) => ({
    alunoId: e.alunoId,
    apelido: e.apelido,
    pontos: Math.round(e.pontos * 100) / 100,
    acerto: e.questoes > 0 ? e.somaFracoes / e.questoes : 0,
    questoes: e.questoes,
    posicao: 0,
  }));
  linhas.sort((a, b) => b.pontos - a.pontos || b.acerto - a.acerto || a.apelido.localeCompare(b.apelido, "pt-BR"));
  linhas.forEach((l, i) => {
    const anterior = linhas[i - 1];
    l.posicao = anterior && anterior.pontos === l.pontos && anterior.acerto === l.acerto ? anterior.posicao : i + 1;
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

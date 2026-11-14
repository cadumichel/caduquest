/**
 * Disputa entre turmas da mesma série (e da mesma escola). O placar é a média
 * de pontos por aluno em cada desafio já aberto: turma maior ou com mais
 * desafios não leva vantagem, e quem deixa de fazer puxa a média para baixo.
 */

export type TurmaNaDisputa = {
  turmaId: string;
  nome: string;
  /** Média de pontos por aluno, por desafio. */
  media: number;
  /** Parte dos alunos que já pontuou, de 0 a 1. */
  participacao: number;
  alunos: number;
};

export type Disputa = { serie: string; turmas: TurmaNaDisputa[] };

/** Menos alunos que isso não forma uma turma para disputar (turma de teste, turma vazia). */
export const ALUNOS_MINIMOS = 3;

export const mesmaSerie = (a: string | null | undefined, b: string | null | undefined) =>
  !!a?.trim() && a.trim().toLowerCase() === b?.trim().toLowerCase();

export function placarDaTurma(pontos: number[], desafiosAbertos: number): { media: number; participacao: number } {
  if (!pontos.length || desafiosAbertos <= 0) return { media: 0, participacao: 0 };
  const soma = pontos.reduce((s, p) => s + p, 0);
  return {
    media: Math.round((soma / (pontos.length * desafiosAbertos)) * 10) / 10,
    participacao: pontos.filter((p) => p > 0).length / pontos.length,
  };
}

/** Da maior média para a menor; empate, quem tem mais participação. */
export const ordenarDisputa = (turmas: TurmaNaDisputa[]) =>
  [...turmas].sort(
    (a, b) => b.media - a.media || b.participacao - a.participacao || a.nome.localeCompare(b.nome, "pt-BR"),
  );

/** Frase para a turma de quem olha. */
export function recadoDaDisputa(turmas: TurmaNaDisputa[], minhaTurmaId: string): string {
  const ordem = ordenarDisputa(turmas);
  const posicao = ordem.findIndex((t) => t.turmaId === minhaTurmaId);
  if (posicao < 0) return "";
  const minha = ordem[posicao];
  if (posicao === 0) {
    const segunda = ordem[1];
    if (!segunda || minha.media === segunda.media) return "Está tudo empatado. Cada desafio feito conta!";
    return `Sua turma está na frente da ${segunda.nome}. Não deixem a média cair!`;
  }
  const daFrente = ordem[posicao - 1];
  const falta = Math.round((daFrente.media - minha.media) * 10) / 10;
  return `Faltam ${String(falta).replace(".", ",")} pontos de média para passar a ${daFrente.nome}. Quem ainda não fez o desafio pode virar o jogo.`;
}

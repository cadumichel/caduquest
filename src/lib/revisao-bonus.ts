/**
 * Bônus por erro corrigido: cada questão que o aluno errou num desafio e depois
 * acerta na revisão de erros vale pontos no ranking geral da temporada. Só a
 * primeira vez que ele acerta cada questão conta (depois ela sai da revisão), e
 * no máximo LIMITE_REVISAO_DIA por dia: o bônus é pequeno perto do que uma
 * questão vale no desafio, então errar de propósito sempre sai mais caro.
 * Vale do início da temporada até o último dia com pontos (o período de estudo
 * depois do encerramento não pontua, como os desafios). Não entra na liga da semana.
 */

export const BONUS_REVISAO = 2;
export const LIMITE_REVISAO_DIA = 5;

/** Dia (AAAA-MM-DD) de um instante no horário de Brasília. */
export const diaEmBrasilia = (iso: string) =>
  new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);

/** Primeiro instante (ISO) de um dia de Brasília. */
export const inicioDoDiaEmBrasilia = (dia: string) => `${dia}T03:00:00.000Z`;

/**
 * Bônus de um aluno numa temporada, a partir dos instantes em que ele acertou
 * cada questão na revisão. `inicio` e `fim` são dias (AAAA-MM-DD), inclusive.
 */
export function bonusDeRevisoes(acertos: string[], inicio: string, fim: string) {
  const porDia = new Map<string, number>();
  for (const a of acertos) {
    const dia = diaEmBrasilia(a);
    if (dia < inicio || dia > fim) continue;
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  let corrigidos = 0;
  for (const n of porDia.values()) corrigidos += Math.min(n, LIMITE_REVISAO_DIA);
  return { corrigidos, bonus: corrigidos * BONUS_REVISAO };
}

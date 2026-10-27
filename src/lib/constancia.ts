/**
 * Ofensiva semanal (constância): +20 em cada semana em que o aluno conclui todos os
 * desafios semanais, +5 por semana seguida, até +25 por semana. Faltar uma semana
 * zera só a sequência, não os pontos. O CaduRush (em sala) não conta.
 */

export const BONUS_SEMANA = 20;
export const BONUS_SEQUENCIA = 5;
export const BONUS_MAXIMO = 25;

export type DesafioDaSemana = { id: string; abre_em: string; fecha_em: string };

export type Constancia = {
  /** Pontos de bônus somados na temporada. */
  bonus: number;
  /** Semanas seguidas completas até agora (a ofensiva atual). */
  sequencia: number;
  /** Total de semanas completas na temporada. */
  semanasCompletas: number;
};

/** Segunda-feira (AAAA-MM-DD, horário de Brasília) da semana de um instante. */
export function segundaDaSemana(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  const diasDesdeSegunda = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - diasDesdeSegunda * 86_400_000).toISOString().slice(0, 10);
}

/** Agrupa os desafios semanais pela semana em que abrem, em ordem. */
export function agruparPorSemana<D extends DesafioDaSemana>(desafios: D[]): D[][] {
  const semanas = new Map<string, D[]>();
  for (const d of desafios) {
    const chave = segundaDaSemana(d.abre_em);
    semanas.set(chave, [...(semanas.get(chave) ?? []), d]);
  }
  return [...semanas.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, ds]) => ds);
}

/**
 * Semana completa: o aluno concluiu todos os desafios dela. Semana ainda em andamento
 * (algum desafio aberto ou por abrir) não quebra a sequência; ela só conta quando completa.
 */
export function calcularConstancia(
  semanas: DesafioDaSemana[][],
  concluidos: Set<string>,
  agora = new Date(),
): Constancia {
  let bonus = 0;
  let sequencia = 0;
  let semanasCompletas = 0;
  for (const desafios of semanas) {
    if (!desafios.length) continue;
    if (desafios.every((d) => concluidos.has(d.id))) {
      sequencia += 1;
      semanasCompletas += 1;
      bonus += Math.min(BONUS_SEMANA + BONUS_SEQUENCIA * (sequencia - 1), BONUS_MAXIMO);
    } else if (desafios.every((d) => new Date(d.fecha_em) < agora)) {
      sequencia = 0;
    }
  }
  return { bonus, sequencia, semanasCompletas };
}

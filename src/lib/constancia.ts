/**
 * Ofensiva da temporada: dura do início da temporada até a prova. Cada desafio
 * concluído em sequência dá +10, e +2 a mais a cada desafio seguido, até +20 por
 * desafio. Perder um desafio (fechou sem fazer) zera só a sequência, não os
 * pontos. O CaduRush (em sala) não conta.
 */

export const BONUS_DESAFIO = 10;
export const BONUS_SEQUENCIA = 2;
export const BONUS_MAXIMO = 20;

export type DesafioDaSemana = { id: string; abre_em: string; fecha_em: string };

export type Constancia = {
  /** Pontos de bônus somados na temporada. */
  bonus: number;
  /** Desafios seguidos concluídos até agora (a ofensiva atual). */
  sequencia: number;
  /** Total de desafios concluídos na ofensiva. */
  desafiosCompletos: number;
  /** Maior sequência da temporada (para as conquistas). */
  maiorSequencia: number;
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

/** Situação de cada desafio da ofensiva para o aluno, na ordem em que abrem. */
export type PassoOfensiva = "feito" | "perdido" | "aberto" | "futuro";

export function passosDaOfensiva(
  desafios: DesafioDaSemana[],
  concluidos: Set<string>,
  agora = new Date(),
): { id: string; passo: PassoOfensiva }[] {
  return [...desafios]
    .sort((a, b) => a.abre_em.localeCompare(b.abre_em))
    .map((d) => ({
      id: d.id,
      passo: concluidos.has(d.id)
        ? "feito"
        : new Date(d.fecha_em) < agora
          ? "perdido"
          : new Date(d.abre_em) > agora
            ? "futuro"
            : "aberto",
    }));
}

/** Desafio aberto ou por abrir não quebra a sequência: só conta quando é feito ou fecha. */
export function calcularConstancia(
  desafios: DesafioDaSemana[],
  concluidos: Set<string>,
  agora = new Date(),
): Constancia {
  let bonus = 0;
  let sequencia = 0;
  let desafiosCompletos = 0;
  let maiorSequencia = 0;
  for (const { passo } of passosDaOfensiva(desafios, concluidos, agora)) {
    if (passo === "feito") {
      sequencia += 1;
      desafiosCompletos += 1;
      maiorSequencia = Math.max(maiorSequencia, sequencia);
      bonus += Math.min(BONUS_DESAFIO + BONUS_SEQUENCIA * (sequencia - 1), BONUS_MAXIMO);
    } else if (passo === "perdido") {
      sequencia = 0;
    }
  }
  return { bonus, sequencia, desafiosCompletos, maiorSequencia };
}

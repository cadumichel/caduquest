import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarRanking, type LinhaRanking } from "@/lib/ranking";
import { rankingDaTemporada } from "@/lib/temporada-dados";
import { situacaoDesafio, type Desafio, type Temporada } from "@/lib/tipos-banco";

export type RankingDesafio = {
  desafio: Pick<Desafio, "id" | "titulo" | "tipo" | "abre_em" | "fecha_em">;
  ranking: LinhaRanking[];
  /** Alunos aprovados que não fizeram o desafio. */
  naoFizeram: number;
};

export type RankingsTemporada = { temporada: Temporada; ranking: LinhaRanking[]; desafios: RankingDesafio[] };

type AlunoRanking = { id: string; apelido: string; avatar: number; cor: number };

type TentativaDesafio = {
  aluno_id: string;
  desafio_id: string;
  pontos: number;
  respostas: { fracao: number | null }[];
};

/**
 * Ranking de cada temporada da turma e de cada desafio dela (só o professor vê).
 * No desafio entram só os pontos do próprio desafio, sem bônus de ofensiva.
 */
export async function rankingsDaTurma(
  db: SupabaseClient,
  temporadas: Temporada[],
  alunos: AlunoRanking[],
): Promise<RankingsTemporada[]> {
  if (!temporadas.length) return [];
  const ids = temporadas.map((t) => t.id);
  const [rankings, { data: desafiosBrutos }, { data: tentativasBrutas }] = await Promise.all([
    Promise.all(temporadas.map((t) => rankingDaTemporada(db, t))),
    db
      .from("desafios")
      .select("id, temporada_id, titulo, tipo, abre_em, fecha_em")
      .in("temporada_id", ids)
      .order("abre_em"),
    db
      .from("tentativas")
      .select("aluno_id, desafio_id, pontos, respostas(fracao), desafios!inner(temporada_id)")
      .in("desafios.temporada_id", ids),
  ]);
  const desafios = (desafiosBrutos ?? []) as (RankingDesafio["desafio"] & { temporada_id: string })[];
  const porDesafio = new Map<string, TentativaDesafio[]>();
  for (const t of (tentativasBrutas ?? []) as unknown as TentativaDesafio[]) {
    porDesafio.set(t.desafio_id, [...(porDesafio.get(t.desafio_id) ?? []), t]);
  }
  const aluno = new Map(alunos.map((a) => [a.id, a]));

  return temporadas.map((temporada, i) => ({
    temporada,
    ranking: rankings[i],
    desafios: desafios
      .filter((d) => d.temporada_id === temporada.id && situacaoDesafio(d) !== "agendado")
      .reverse()
      .map((d) => {
        const tentativas = (porDesafio.get(d.id) ?? []).filter((t) => aluno.has(t.aluno_id));
        const ranking = montarRanking(
          tentativas.map((t) => {
            const a = aluno.get(t.aluno_id)!;
            const respondidas = t.respostas.filter((r) => r.fracao !== null);
            return {
              alunoId: a.id,
              apelido: a.apelido,
              avatar: a.avatar,
              cor: a.cor,
              pontos: Number(t.pontos),
              somaFracoes: respondidas.reduce((s, r) => s + Number(r.fracao), 0),
              questoes: respondidas.length,
            };
          }),
        );
        return { desafio: d, ranking, naoFizeram: alunos.length - tentativas.length };
      }),
  }));
}

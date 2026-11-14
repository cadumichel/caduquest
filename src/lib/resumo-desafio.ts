import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlunoSessao } from "@/lib/aluno-sessao";
import { desafioDoAluno } from "@/lib/jogo";
import { nivelNecessario, ORDEM_BASICOS } from "@/lib/personagens";
import { calcularNivel, nomeDoNivel, xpDeUmDesafio } from "@/lib/progresso";
import { progressoDoAluno } from "@/lib/progresso-dados";
import { errosParaRevisar } from "@/lib/revisao";
import { situacaoDaTemporada } from "@/lib/temporada-dados";
import { situacaoDesafio, type Desafio, type Tentativa } from "@/lib/tipos-banco";

/** O que o aluno vê ao terminar um desafio: quanto fez, o que ganhou e o próximo passo. */
export type ResumoDesafio = {
  concluido: boolean;
  pontos: number;
  acertos: number;
  total: number;
  xp: number;
  nivel: number;
  nomeNivel: string;
  subiuDeNivel: boolean;
  /** Personagens liberados pelo nível que ele acabou de alcançar. */
  personagensNovos: number;
  posicao: number | null;
  alunosNaTurma: number;
  sequencia: number;
  bonusOfensiva: number;
  proximo: { tipo: "desafio" | "revisao"; href: string; titulo: string } | null;
};

const terminou = (t: Pick<Tentativa, "concluida_em" | "indice_atual" | "ordem">) =>
  Boolean(t.concluida_em || t.indice_atual >= t.ordem.length);

export async function resumoDoDesafio(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
): Promise<ResumoDesafio | null> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio) return null;
  const { data: tentativaBruta } = await db
    .from("tentativas")
    .select("*")
    .eq("desafio_id", desafioId)
    .eq("aluno_id", aluno.id)
    .maybeSingle();
  const tentativa = tentativaBruta as Tentativa | null;
  if (!tentativa) return null;

  const [{ data: respostas }, situacao, progresso, { data: outrosBrutos }, { data: minhasBrutas }, erros] =
    await Promise.all([
      db.from("respostas").select("fracao").eq("tentativa_id", tentativa.id).not("fracao", "is", null),
      situacaoDaTemporada(db, desafio.temporadas, aluno.id),
      progressoDoAluno(aluno.id, aluno.turmaId),
      db.from("desafios").select("*").eq("temporada_id", desafio.temporada_id).neq("id", desafioId).order("fecha_em"),
      db
        .from("tentativas")
        .select("desafio_id, concluida_em, indice_atual, ordem, desafios!inner(temporada_id)")
        .eq("aluno_id", aluno.id)
        .eq("desafios.temporada_id", desafio.temporada_id),
      errosParaRevisar(db, aluno.id, aluno.turmaId),
    ]);

  const fracoes = (respostas ?? []).map((r) => Number(r.fracao));
  const concluido = terminou(tentativa);
  const xp = xpDeUmDesafio(fracoes, concluido);
  const nivelAntes = calcularNivel(Math.max(0, progresso.xp - xp)).nivel;
  const eu = situacao.ranking.find((l) => l.alunoId === aluno.id) ?? null;

  const feitos = new Set(
    (
      (minhasBrutas ?? []) as unknown as (Pick<Tentativa, "concluida_em" | "indice_atual" | "ordem"> & {
        desafio_id: string;
      })[]
    )
      .filter(terminou)
      .map((t) => t.desafio_id),
  );
  const outro = ((outrosBrutos ?? []) as Desafio[]).find((d) => situacaoDesafio(d) === "aberto" && !feitos.has(d.id));

  return {
    concluido,
    pontos: Number(tentativa.pontos ?? 0),
    acertos: fracoes.reduce((s, f) => s + f, 0),
    total: tentativa.ordem.length,
    xp,
    nivel: progresso.nivel,
    nomeNivel: nomeDoNivel(progresso.nivel),
    subiuDeNivel: progresso.nivel > nivelAntes,
    personagensNovos: ORDEM_BASICOS.filter((a) => {
      const n = nivelNecessario(a);
      return n > nivelAntes && n <= progresso.nivel;
    }).length,
    posicao: eu?.posicao ?? null,
    alunosNaTurma: situacao.ranking.length,
    sequencia: eu?.sequencia ?? 0,
    bonusOfensiva: eu?.bonus ?? 0,
    proximo: outro
      ? { tipo: "desafio", href: `/aluno/desafio/${outro.id}`, titulo: outro.titulo }
      : erros.length > 0
        ? { tipo: "revisao", href: "/aluno/revisao", titulo: `${erros.length}` }
        : null,
  };
}

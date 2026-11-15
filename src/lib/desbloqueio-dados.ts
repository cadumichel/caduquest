import "server-only";
import { cache } from "react";
import { medalhasDaTurmaDoAluno } from "@/lib/aluno-dados";
import { calcularDesbloqueios, type Desbloqueios } from "@/lib/personagens";
import { progressoDoAluno } from "@/lib/progresso-dados";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { pontuacaoEncerrada, type Temporada } from "@/lib/tipos-banco";

/** Personagens que o aluno já ganhou, pelas regras de calcularDesbloqueios. */
export const desbloqueiosDoAluno = cache(async (alunoId: string, turmaId: string): Promise<Desbloqueios> => {
  const db = criarClienteAdmin();
  const [progresso, medalhas, { data: temporadas }, { data: desafios }] = await Promise.all([
    progressoDoAluno(alunoId, turmaId),
    medalhasDaTurmaDoAluno(turmaId),
    db.from("temporadas").select("*").eq("turma_id", turmaId),
    db.from("desafios").select("id, temporada_id, tipo, temporadas!inner(turma_id)").eq("temporadas.turma_id", turmaId),
  ]);
  const lista = (desafios ?? []) as { id: string; temporada_id: string; tipo: string | null }[];
  return calcularDesbloqueios({
    desafios: progresso.historico.map((d) => ({ id: d.id, acerto: d.acerto })),
    // O CaduRush é em sala: quem faltou à aula não perde o lendário da temporada.
    temporadas: ((temporadas ?? []) as Temporada[]).map((t) => ({
      desafios: lista.filter((d) => d.temporada_id === t.id && d.tipo !== "relampago").map((d) => d.id),
      encerrada: pontuacaoEncerrada(t),
    })),
    vitorias: medalhas.get(alunoId) ?? 0,
  });
});

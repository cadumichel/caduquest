import "server-only";
import { cache } from "react";
import { escolherCuriosidade, sementeDoDia } from "@/lib/curiosidades";
import { hojeEmBrasilia } from "@/lib/datas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { temporadaAtual } from "@/lib/temporada-dados";
import type { Temporada } from "@/lib/tipos-banco";

/*
 * Consultas que o layout do aluno e as páginas pedem na mesma navegação.
 * Com o cache por requisição, cada uma vai ao banco uma vez só.
 */
export const medalhasDaTurmaDoAluno = cache((turmaId: string) => medalhasDaTurma(criarClienteAdmin(), turmaId));

export const temporadaAtualDoAluno = cache((turmaId: string) => temporadaAtual(criarClienteAdmin(), turmaId));

/** Curiosidade do dia da turma (a mesma para todos no mesmo dia). */
export const curiosidadeDoDia = cache(async (temporada: Temporada) => {
  let doProfessor: { capitulo: string | null; texto: string }[] = [];
  if (temporada.professor_id) {
    const { data } = await criarClienteAdmin()
      .from("curiosidades")
      .select("capitulo, texto")
      .eq("professor_id", temporada.professor_id)
      .order("criado_em");
    doProfessor = data ?? [];
  }
  return escolherCuriosidade(doProfessor, temporada.capitulos, sementeDoDia(hojeEmBrasilia(), temporada.turma_id));
});

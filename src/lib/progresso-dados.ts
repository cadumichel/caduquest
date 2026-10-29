import "server-only";
import { cache } from "react";
import { calcularProgresso, type DesafioProgresso, type RespostaProgresso } from "@/lib/progresso";
import { revisoesAcertadas } from "@/lib/revisao";
import { criarClienteAdmin } from "@/lib/supabase/admin";

type TentativaComDesafio = {
  id: string;
  desafio_id: string;
  concluida_em: string | null;
  indice_atual: number;
  ordem: string[];
  desafios: { titulo: string; tipo: string; abre_em: string };
};

/** Progresso do aluno em todas as temporadas da turma (uma ida ao banco por tabela). */
export const progressoDoAluno = cache(async (alunoId: string, turmaId: string) => {
  const db = criarClienteAdmin();
  const [{ data: tentativasBrutas }, revisoes] = await Promise.all([
    db
      .from("tentativas")
      .select(
        "id, desafio_id, concluida_em, indice_atual, ordem, desafios!inner(titulo, tipo, abre_em, temporadas!inner(turma_id))",
      )
      .eq("aluno_id", alunoId)
      .eq("desafios.temporadas.turma_id", turmaId),
    revisoesAcertadas(db, alunoId),
  ]);
  const tentativas = (tentativasBrutas ?? []) as unknown as TentativaComDesafio[];
  const ids = tentativas.map((t) => t.id);

  const { data: respostasBrutas } = ids.length
    ? await db
        .from("respostas")
        .select("tentativa_id, questao_id, fracao")
        .in("tentativa_id", ids)
        .not("fracao", "is", null)
    : { data: [] as { tentativa_id: string; questao_id: string; fracao: number }[] };
  const desafioDaTentativa = new Map(tentativas.map((t) => [t.id, t.desafio_id]));
  const respostas: RespostaProgresso[] = (respostasBrutas ?? []).map((r) => ({
    desafioId: desafioDaTentativa.get(r.tentativa_id) ?? "",
    questaoId: r.questao_id,
    fracao: Number(r.fracao),
  }));

  const idsQuestoes = [...new Set(respostas.map((r) => r.questaoId))];
  const { data: questoesBrutas } = idsQuestoes.length
    ? await db.from("questoes").select("id, habilidades, capitulo").in("id", idsQuestoes)
    : { data: [] as { id: string; habilidades: string[]; capitulo: string | null }[] };

  const desafios: DesafioProgresso[] = tentativas.map((t) => ({
    id: t.desafio_id,
    titulo: t.desafios.titulo,
    tipo: t.desafios.tipo,
    abre_em: t.desafios.abre_em,
    questoes: t.ordem.length,
    concluido: Boolean(t.concluida_em || t.indice_atual >= t.ordem.length),
  }));

  return calcularProgresso({
    respostas,
    desafios,
    questoes: new Map(
      (questoesBrutas ?? []).map((q) => [q.id, { habilidades: q.habilidades ?? [], capitulo: q.capitulo }]),
    ),
    revisoesAcertadas: revisoes,
  });
});

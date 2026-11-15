import "server-only";
import { cache } from "react";
import { calcularProgresso, type DesafioProgresso, type RespostaProgresso } from "@/lib/progresso";
import { lerPorIds, respostasCorrigidas } from "@/lib/paginar";
import { revisoesAcertadas } from "@/lib/revisao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { situacaoDesafio } from "@/lib/tipos-banco";

type TentativaComDesafio = {
  id: string;
  desafio_id: string;
  concluida_em: string | null;
  indice_atual: number;
  ordem: string[];
  desafios: { titulo: string; tipo: string; abre_em: string; fecha_em: string };
};

/** Progresso do aluno em todas as temporadas da turma (uma ida ao banco por tabela). */
export const progressoDoAluno = cache(async (alunoId: string, turmaId: string) => {
  const db = criarClienteAdmin();
  const [{ data: tentativasBrutas }, revisoes] = await Promise.all([
    db
      .from("tentativas")
      .select(
        "id, desafio_id, concluida_em, indice_atual, ordem, desafios!inner(titulo, tipo, abre_em, fecha_em, temporadas!inner(turma_id))",
      )
      .eq("aluno_id", alunoId)
      .eq("desafios.temporadas.turma_id", turmaId),
    revisoesAcertadas(db, alunoId),
  ]);
  // O desafio que o aluno ainda está respondendo só conta (XP, habilidades) quando
  // ele termina ou o desafio fecha: o XP subindo a cada questão entregaria os acertos.
  const tentativas = ((tentativasBrutas ?? []) as unknown as TentativaComDesafio[]).filter(
    (t) => Boolean(t.concluida_em) || t.indice_atual >= t.ordem.length || situacaoDesafio(t.desafios) !== "aberto",
  );
  const ids = tentativas.map((t) => t.id);

  const respostasBrutas = await respostasCorrigidas<{ tentativa_id: string; questao_id: string; fracao: number }>(
    db,
    "tentativa_id, questao_id, fracao",
    ids,
  );
  const desafioDaTentativa = new Map(tentativas.map((t) => [t.id, t.desafio_id]));
  const respostas: RespostaProgresso[] = respostasBrutas.map((r) => ({
    desafioId: desafioDaTentativa.get(r.tentativa_id) ?? "",
    questaoId: r.questao_id,
    fracao: Number(r.fracao),
  }));

  const idsQuestoes = [...new Set(respostas.map((r) => r.questaoId))];
  // Em pedaços: o aluno responde centenas de questões no ano, e a lista de ids não cabe num pedido só.
  const questoesBrutas = await lerPorIds<{ id: string; habilidades: string[] | null; capitulo: string | null }>(
    db,
    "questoes",
    "id, habilidades, capitulo",
    "id",
    idsQuestoes,
  );

  const desafios: DesafioProgresso[] = tentativas.map((t) => ({
    id: t.desafio_id,
    titulo: t.desafios.titulo,
    tipo: t.desafios.tipo,
    abre_em: t.desafios.abre_em,
    questoes: t.ordem.length,
    concluido: Boolean(t.concluida_em || t.indice_atual >= t.ordem.length),
    concluidoEm: t.concluida_em,
  }));

  return calcularProgresso({
    respostas,
    desafios,
    questoes: new Map(questoesBrutas.map((q) => [q.id, { habilidades: q.habilidades ?? [], capitulo: q.capitulo }])),
    revisoesAcertadas: revisoes,
  });
});

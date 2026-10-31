import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { exigirAluno } from "@/lib/aluno-sessao";
import { desafioDoAluno } from "@/lib/jogo";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { situacaoDesafio } from "@/lib/tipos-banco";
import { Jogo } from "./Jogo";

export const metadata: Metadata = { title: "Desafio" };

export default async function PaginaDesafio({ params }: PageProps<"/aluno/desafio/[id]">) {
  const { id } = await params;
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const desafio = await desafioDoAluno(db, aluno, id);
  if (!desafio) notFound();

  const [{ data: tentativa }, { count }, { data: perfil }] = await Promise.all([
    db
      .from("tentativas")
      .select("concluida_em, indice_atual, ordem")
      .eq("desafio_id", id)
      .eq("aluno_id", aluno.id)
      .maybeSingle(),
    db.from("desafio_questoes").select("*", { count: "exact", head: true }).eq("desafio_id", id),
    db.from("alunos").select("teclado_liberado").eq("id", aluno.id).single(),
  ]);
  const concluido = tentativa && (tentativa.concluida_em || tentativa.indice_atual >= tentativa.ordem.length);
  if (concluido || situacaoDesafio(desafio) === "encerrado") redirect(`/aluno/desafio/${id}/resultado`);
  if (situacaoDesafio(desafio) === "agendado") redirect("/aluno");

  return (
    <Jogo
      desafioId={id}
      titulo={desafio.titulo}
      totalQuestoes={count ?? 0}
      jaComecou={Boolean(tentativa)}
      tempoFixo={desafio.tempo_por_questao_s}
      saidaZera={desafio.saida_zera_questao}
      tecladoLiberado={Boolean(perfil?.teclado_liberado)}
      identificacao={`${aluno.apelido} · ${aluno.turmaNome}`}
      relampago={desafio.tipo === "relampago"}
      pontosPorAcerto={desafio.pontos_por_acerto}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirAluno } from "@/lib/aluno-sessao";
import { desafioDoAluno } from "@/lib/jogo";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { Treino } from "./Treino";

export const metadata: Metadata = { title: "Treino" };

export default async function PaginaTreino({ params }: PageProps<"/aluno/desafio/[id]/treino">) {
  const { id } = await params;
  const aluno = await exigirAluno();
  const desafio = await desafioDoAluno(criarClienteAdmin(), aluno, id);
  if (!desafio) notFound();
  return <Treino desafioId={id} titulo={desafio.titulo} />;
}

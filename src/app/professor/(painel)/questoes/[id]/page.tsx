import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Titulo } from "@/components/ui";
import { exigirProfessor } from "@/lib/professor";
import type { Questao } from "@/lib/tipos-banco";
import { EditorQuestao } from "../EditorQuestao";

export const metadata: Metadata = { title: "Editar questão" };

export default async function EditarQuestao({ params }: PageProps<"/professor/questoes/[id]">) {
  const { id } = await params;
  const { supabase, professorId } = await exigirProfessor();
  const [{ data: questao }, { data: caps }, { count }] = await Promise.all([
    supabase.from("questoes").select("*").eq("id", id).maybeSingle(),
    supabase.from("questoes").select("capitulo").not("capitulo", "is", null),
    supabase.from("respostas").select("*", { count: "exact", head: true }).eq("questao_id", id),
  ]);
  if (!questao) notFound();
  const capitulos = [...new Set((caps ?? []).map((c) => c.capitulo as string))].sort();
  return (
    <div className="space-y-4">
      <Link href="/professor/questoes" className="text-sm text-marca-700">
        ← Banco de questões
      </Link>
      <Titulo>Editar questão</Titulo>
      <EditorQuestao
        key={id}
        inicial={questao as Questao}
        professorId={professorId}
        capitulos={capitulos}
        usada={Boolean(count)}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Titulo } from "@/components/ui";
import { exigirProfessor } from "@/lib/professor";
import { EditorQuestao } from "../EditorQuestao";

export const metadata: Metadata = { title: "Nova questão" };

export default async function NovaQuestao() {
  const { supabase, professorId } = await exigirProfessor();
  const { data } = await supabase.from("questoes").select("capitulo").not("capitulo", "is", null);
  const capitulos = [...new Set((data ?? []).map((c) => c.capitulo as string))].sort();
  return (
    <div className="space-y-4">
      <Link href="/professor/questoes" className="text-sm text-marca-700">
        ← Banco de questões
      </Link>
      <Titulo>Nova questão</Titulo>
      <EditorQuestao inicial={null} professorId={professorId} capitulos={capitulos} usada={false} />
    </div>
  );
}

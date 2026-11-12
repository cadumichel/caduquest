import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Titulo } from "@/components/ui";
import { exigirProfessor } from "@/lib/professor";
import type { Questao } from "@/lib/tipos-banco";
import { EditorQuestao } from "../EditorQuestao";

export const metadata: Metadata = { title: "Editar questão" };

export default async function EditarQuestao({ params, searchParams }: PageProps<"/professor/questoes/[id]">) {
  const { id } = await params;
  const emRevisao = (await searchParams).revisao === "1";
  const { supabase, professorId } = await exigirProfessor();
  const [{ data: questao }, { data: caps }, { count }, { count: publicas }] = await Promise.all([
    supabase.from("questoes").select("*").eq("id", id).maybeSingle(),
    supabase.from("questoes").select("capitulo").not("capitulo", "is", null),
    supabase.from("respostas").select("*", { count: "exact", head: true }).eq("questao_id", id),
    supabase.from("respostas_publicas").select("*", { count: "exact", head: true }).eq("questao_id", id),
  ]);
  if (!questao) notFound();
  // Revisão em sequência: posição entre os rascunhos (mesma ordem da aba "Para revisar") e o próximo.
  let revisao: { posicao: number; total: number; proximaId: string | null } | null = null;
  if (emRevisao) {
    const { data: rascunhos } = await supabase
      .from("questoes")
      .select("id")
      .eq("status", "rascunho")
      .order("criado_em", { ascending: false })
      .limit(500);
    const ids = (rascunhos ?? []).map((r) => r.id as string);
    const i = ids.indexOf(id);
    const seguintes = i >= 0 ? ids.slice(i + 1) : ids.filter((x) => x !== id);
    revisao = { posicao: i >= 0 ? i + 1 : 0, total: ids.length, proximaId: seguintes[0] ?? null };
  }
  const capitulos = [...new Set((caps ?? []).map((c) => c.capitulo as string))].sort();
  return (
    <div className="space-y-4">
      <Link
        href={emRevisao ? "/professor/questoes?aba=revisar" : "/professor/questoes"}
        className="text-sm text-marca-700"
      >
        ← Banco de questões
      </Link>
      <Titulo>
        {revisao
          ? `Revisando rascunhos${revisao.posicao ? `: ${revisao.posicao} de ${revisao.total}` : ""}`
          : "Editar questão"}
      </Titulo>
      <EditorQuestao
        key={id}
        inicial={questao as Questao}
        professorId={professorId}
        capitulos={capitulos}
        usada={Boolean(count || publicas)}
        revisao={revisao}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { exigirProfessor } from "@/lib/professor";

/** A temporada agora vive na primeira aba da página da turma. Links antigos (e o conector) caem aqui. */
export default async function PaginaTemporada({ params }: PageProps<"/professor/temporadas/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("temporadas").select("turma_id").eq("id", id).maybeSingle();
  if (!data) notFound();
  redirect(`/professor/turmas/${data.turma_id}?temporada=${id}`);
}

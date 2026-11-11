import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Titulo } from "@/components/ui";
import { isoParaDataHoraLocal } from "@/lib/datas";
import { padroesDoProfessor } from "@/lib/padroes";
import { exigirProfessor } from "@/lib/professor";
import type { TipoQuestao } from "@/lib/questoes/tipos";
import { MontarDesafio } from "./MontarDesafio";

export const metadata: Metadata = { title: "Montar desafio" };

export default async function NovoDesafio({ searchParams }: PageProps<"/professor/desafios/novo">) {
  const { temporada: temporadaId, tipo } = await searchParams;
  // Links antigos de "Novo CaduRush" chegam com tipo=relampago: abre já como especial em sala.
  const emSala = tipo === "relampago";
  if (typeof temporadaId !== "string") notFound();
  const { supabase } = await exigirProfessor();

  const [{ data: temporada }, { data: questoes }, padroes] = await Promise.all([
    supabase.from("temporadas").select("id, nome, capitulos, turmas(nome)").eq("id", temporadaId).maybeSingle(),
    supabase
      .from("questoes")
      .select(
        "id, tipo, enunciado, capitulo, habilidades, dificuldade, imagem_path, relampago, desafio_questoes(count)",
      )
      .eq("status", "publicada")
      .order("capitulo")
      .order("criado_em", { ascending: false }),
    padroesDoProfessor(supabase),
  ]);
  if (!temporada) notFound();

  const agora = new Date();

  return (
    <div className="space-y-4">
      <Link href={`/professor/temporadas/${temporada.id}`} className="text-sm text-marca-700">
        ← {temporada.nome} · {(temporada.turmas as unknown as { nome: string }).nome}
      </Link>
      <Titulo>Montar desafio</Titulo>
      <MontarDesafio
        temporadaId={temporada.id}
        emSalaInicial={emSala}
        padroes={padroes}
        capitulosTemporada={temporada.capitulos}
        abrePadrao={isoParaDataHoraLocal(agora)}
        questoes={(questoes ?? []).map((q) => ({
          id: q.id,
          tipo: q.tipo as TipoQuestao,
          enunciado: q.enunciado,
          capitulo: q.capitulo,
          habilidades: q.habilidades,
          dificuldade: q.dificuldade,
          temImagem: Boolean(q.imagem_path),
          relampago: Boolean(q.relampago),
          usos: (q.desafio_questoes as { count: number }[])[0]?.count ?? 0,
        }))}
      />
    </div>
  );
}

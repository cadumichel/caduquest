import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Titulo } from "@/components/ui";
import { hojeEmBrasilia, isoParaDataHoraLocal } from "@/lib/datas";
import { padroesDoProfessor } from "@/lib/padroes";
import { exigirProfessor } from "@/lib/professor";
import type { Conteudo, TipoQuestao } from "@/lib/questoes/tipos";
import { MontarDesafio } from "./MontarDesafio";

export const metadata: Metadata = { title: "Montar desafio" };

export default async function NovoDesafio({ searchParams }: PageProps<"/professor/desafios/novo">) {
  const { temporada: temporadaId, tipo } = await searchParams;
  // Links antigos de "Novo CaduRush" chegam com tipo=relampago: abre já como especial em sala.
  const emSala = tipo === "relampago";
  if (typeof temporadaId !== "string") notFound();
  const { supabase } = await exigirProfessor();

  const [{ data: temporada }, { data: questoes }, padroes] = await Promise.all([
    supabase
      .from("temporadas")
      .select("id, nome, capitulos, turma_id, turmas(nome, serie, escola_id)")
      .eq("id", temporadaId)
      .maybeSingle(),
    supabase
      .from("questoes")
      .select(
        "id, tipo, enunciado, conteudo, capitulo, habilidades, dificuldade, imagem_path, relampago, desafio_questoes(count)",
      )
      .eq("status", "publicada")
      .order("capitulo")
      .order("criado_em", { ascending: false }),
    padroesDoProfessor(supabase),
  ]);
  if (!temporada) notFound();
  const turma = temporada.turmas as unknown as { nome: string; serie: string | null; escola_id: string };

  // Outras turmas da mesma série (ou da mesma escola, sem série), com temporada em andamento.
  const hoje = hojeEmBrasilia();
  const { data: outrasBrutas } = await supabase
    .from("turmas")
    .select("id, nome, serie, escola_id, escolas(nome), temporadas(id, nome, inicio, data_prova, encerrada_em)")
    .neq("id", temporada.turma_id)
    .order("nome");
  const mesmaSerie = (t: { serie: string | null; escola_id: string }) =>
    turma.serie?.trim()
      ? t.serie?.trim().toLowerCase() === turma.serie.trim().toLowerCase()
      : t.escola_id === turma.escola_id;
  const outrasTurmas = (
    (outrasBrutas ?? []) as unknown as {
      id: string;
      nome: string;
      serie: string | null;
      escola_id: string;
      escolas: { nome: string };
      temporadas: { id: string; nome: string; inicio: string; data_prova: string; encerrada_em: string | null }[];
    }[]
  )
    .filter(mesmaSerie)
    .flatMap((t) => {
      const abertas = t.temporadas
        .filter((tp) => !tp.encerrada_em && tp.data_prova >= hoje)
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
      const atual = abertas.find((tp) => tp.inicio <= hoje) ?? abertas[0];
      return atual
        ? [{ temporadaId: atual.id, temporadaNome: atual.nome, turmaNome: t.nome, escolaNome: t.escolas.nome }]
        : [];
    });

  const agora = new Date();

  return (
    <div className="space-y-4">
      <Link href={`/professor/temporadas/${temporada.id}`} className="text-sm text-marca-700">
        ← {temporada.nome} · {turma.nome}
      </Link>
      <Titulo>Montar desafio</Titulo>
      <MontarDesafio
        temporadaId={temporada.id}
        emSalaInicial={emSala}
        padroes={padroes}
        capitulosTemporada={temporada.capitulos}
        turmaNome={turma.nome}
        outrasTurmas={outrasTurmas}
        abrePadrao={isoParaDataHoraLocal(agora)}
        questoes={(questoes ?? []).map((q) => ({
          id: q.id,
          tipo: q.tipo as TipoQuestao,
          enunciado: q.enunciado,
          conteudo: { tipo: q.tipo, conteudo: q.conteudo } as Conteudo,
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

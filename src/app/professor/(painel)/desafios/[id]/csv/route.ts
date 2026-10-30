import { NextResponse } from "next/server";
import { exigirProfessor } from "@/lib/professor";
import { resultadosDoDesafio } from "@/lib/resultados-desafio";
import { formatarPontos } from "@/lib/pontos";
import { respostaCsv, rotuloResultado } from "@/lib/relatorio";

/** Planilha do desafio: uma linha por aluno, com o resultado de cada questão. */
export async function GET(_: Request, ctx: RouteContext<"/professor/desafios/[id]/csv">) {
  const { id } = await ctx.params;
  const { supabase } = await exigirProfessor();
  const { data: desafio } = await supabase
    .from("desafios")
    .select("titulo, temporadas(turma_id), desafio_questoes(posicao, questao_id)")
    .eq("id", id)
    .maybeSingle();
  if (!desafio) return new NextResponse("Não encontrado", { status: 404 });
  const turmaId = (desafio.temporadas as unknown as { turma_id: string }).turma_id;
  const questoes = [...(desafio.desafio_questoes as { posicao: number; questao_id: string }[])]
    .sort((a, b) => a.posicao - b.posicao)
    .map((dq) => dq.questao_id);
  const { linhas } = await resultadosDoDesafio(supabase, id, turmaId);

  const cabecalho = [
    "Apelido",
    "Nome real",
    "Situação",
    "Pontos",
    "Acertos",
    "Respondidas",
    "Tempo esgotado",
    "Saídas da tela",
    "Zeradas por saída",
    ...questoes.map((_, i) => `Q${i + 1}`),
  ];
  const corpo = linhas.map((l) => [
    l.apelido,
    l.nomeReal,
    l.situacao,
    formatarPontos(l.pontos),
    String(l.acertos).replace(".", ","),
    l.respondidas,
    l.esgotadas,
    l.saidasTela,
    l.zeradasPorSaida,
    // O aluno vê as questões em ordem embaralhada; aqui vale a numeração do desafio.
    ...questoes.map((q) => (l.situacao === "não fez" ? "" : rotuloResultado(l.questoes.get(q)))),
  ]);
  return respostaCsv([cabecalho, ...corpo], desafio.titulo);
}

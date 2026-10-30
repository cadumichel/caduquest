import { NextResponse } from "next/server";
import { exigirProfessor } from "@/lib/professor";
import { resultadosDoDesafio } from "@/lib/resultados-desafio";
import { formatarPontos } from "@/lib/pontos";

const celula = (v: string | number | null) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Planilha do desafio (CSV com ; para abrir direto no Excel em português). */
export async function GET(_: Request, ctx: RouteContext<"/professor/desafios/[id]/csv">) {
  const { id } = await ctx.params;
  const { supabase } = await exigirProfessor();
  const { data: desafio } = await supabase
    .from("desafios")
    .select("titulo, temporadas(turma_id)")
    .eq("id", id)
    .maybeSingle();
  if (!desafio) return new NextResponse("Não encontrado", { status: 404 });
  const turmaId = (desafio.temporadas as unknown as { turma_id: string }).turma_id;
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
  ];
  const corpo = linhas.map((l) =>
    [
      l.apelido,
      l.nomeReal,
      l.situacao,
      formatarPontos(l.pontos),
      String(l.acertos).replace(".", ","),
      l.respondidas,
      l.esgotadas,
      l.saidasTela,
      l.zeradasPorSaida,
    ]
      .map(celula)
      .join(";"),
  );
  const csv = "﻿" + [cabecalho.join(";"), ...corpo].join("\n");
  const nome = desafio.titulo.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "desafio";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nome)}.csv"`,
    },
  });
}

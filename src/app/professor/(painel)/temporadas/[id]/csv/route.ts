import { NextResponse } from "next/server";
import { formatarDataHora } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import { formatarPontos } from "@/lib/pontos";
import type { Conteudo, Resposta } from "@/lib/questoes/tipos";
import { escolhaEmTexto, respostaCsv, rotuloResultado, type ResultadoQuestao } from "@/lib/relatorio";

type DesafioRelatorio = {
  id: string;
  titulo: string;
  tipo: string | null;
  abre_em: string;
  desafio_questoes: {
    posicao: number;
    questoes: {
      id: string;
      tipo: string;
      conteudo: unknown;
      enunciado: string;
      capitulo: string | null;
      habilidades: string[];
    };
  }[];
};

type TentativaRelatorio = {
  aluno_id: string;
  desafio_id: string;
  respostas: {
    questao_id: string;
    fracao: number | null;
    pontos: number | null;
    tempo_esgotado: boolean;
    zerada_por_saida: boolean;
    resposta: unknown;
    permutacao: number[] | null;
  }[];
};

const resumir = (texto: string, max = 140) => {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo;
};

/**
 * Relatório da temporada: uma linha por aluno e questão de cada desafio, com
 * acertou/errou. Dá para filtrar no Excel por aluno, desafio, capítulo ou habilidade.
 */
export async function GET(_: Request, ctx: RouteContext<"/professor/temporadas/[id]/csv">) {
  const { id } = await ctx.params;
  const { supabase } = await exigirProfessor();
  const { data: temporada } = await supabase.from("temporadas").select("nome, turma_id").eq("id", id).maybeSingle();
  if (!temporada) return new NextResponse("Não encontrado", { status: 404 });

  const [{ data: alunos }, { data: desafiosBrutos }, { data: tentativasBrutas }] = await Promise.all([
    supabase
      .from("alunos")
      .select("id, apelido, nome_real")
      .eq("turma_id", temporada.turma_id)
      .eq("aprovado", true)
      .order("apelido"),
    supabase
      .from("desafios")
      .select(
        "id, titulo, tipo, abre_em, desafio_questoes(posicao, questoes(id, tipo, conteudo, enunciado, capitulo, habilidades))",
      )
      .eq("temporada_id", id)
      .order("abre_em"),
    supabase
      .from("tentativas")
      .select(
        "aluno_id, desafio_id, respostas(questao_id, fracao, pontos, tempo_esgotado, zerada_por_saida, resposta, permutacao), desafios!inner(temporada_id)",
      )
      .eq("desafios.temporada_id", id),
  ]);
  const desafios = (desafiosBrutos ?? []) as unknown as DesafioRelatorio[];
  const tentativas = new Map(
    ((tentativasBrutas ?? []) as unknown as TentativaRelatorio[]).map((t) => [`${t.aluno_id}:${t.desafio_id}`, t]),
  );

  const linhas: (string | number | null)[][] = [
    [
      "Apelido",
      "Nome real",
      "Desafio",
      "Abriu em",
      "Questão",
      "Enunciado",
      "Capítulo",
      "Habilidades",
      "Resultado",
      "Resposta do aluno",
      "Resposta correta",
      "Acerto",
      "Pontos",
    ],
  ];
  for (const a of alunos ?? []) {
    for (const d of desafios) {
      const t = tentativas.get(`${a.id}:${d.id}`);
      const respostas = new Map((t?.respostas ?? []).map((r) => [r.questao_id, r]));
      const questoes = [...d.desafio_questoes].sort((x, y) => x.posicao - y.posicao);
      questoes.forEach(({ questoes: q }, i) => {
        const r = respostas.get(q.id);
        const resultado: ResultadoQuestao | undefined = r && {
          fracao: r.fracao === null ? null : Number(r.fracao),
          esgotada: r.tempo_esgotado,
          zerada: r.zerada_por_saida,
        };
        const escolha = escolhaEmTexto(
          { tipo: q.tipo, conteudo: q.conteudo } as Conteudo,
          r?.permutacao,
          r?.resposta as Resposta | null,
        );
        linhas.push([
          a.apelido,
          a.nome_real,
          `${d.tipo === "relampago" ? "⚡ " : ""}${d.titulo}`,
          formatarDataHora(d.abre_em),
          i + 1,
          resumir(q.enunciado),
          q.capitulo,
          (q.habilidades ?? []).join(", "),
          t ? rotuloResultado(resultado) : "não fez",
          !r ? "" : escolha ? escolha.aluno : "ver no app",
          escolha?.correta ?? "",
          resultado?.fracao === null || resultado?.fracao === undefined
            ? ""
            : String(Math.round(resultado.fracao * 100) / 100).replace(".", ","),
          r?.pontos === null || r?.pontos === undefined ? "" : formatarPontos(Number(r.pontos)),
        ]);
      });
    }
  }
  return respostaCsv(linhas, `${temporada.nome} - desempenho`);
}

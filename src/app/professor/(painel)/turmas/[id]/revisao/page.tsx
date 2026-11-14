import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Titulo, Vazio } from "@/components/ui";
import { emPedacos, lerTudo } from "@/lib/paginar";
import { exigirProfessor } from "@/lib/professor";
import type { Conteudo } from "@/lib/questoes/tipos";
import { alternativasDe, questoesMaisErradas, type RespostaQuadro } from "@/lib/revisao-quadro";
import { temporadaAtual } from "@/lib/temporada-dados";
import { situacaoDesafio, urlImagem, type Questao, type Temporada } from "@/lib/tipos-banco";
import { RevisaoNoQuadro, type SlideQuadro } from "./RevisaoNoQuadro";

export const metadata: Metadata = { title: "Revisão no quadro" };

type RespostaLida = {
  tentativa_id: string;
  questao_id: string;
  fracao: number;
  permutacao: number[] | null;
  resposta: unknown;
};

/**
 * Revisão no quadro: as questões em que a turma mais errou na temporada, uma
 * por vez e em letras grandes, para projetar e corrigir com a sala.
 */
export default async function PaginaRevisaoNoQuadro({
  params,
  searchParams,
}: PageProps<"/professor/turmas/[id]/revisao">) {
  const { id } = await params;
  const sp = await searchParams;
  const comAbertos = sp.abertos === "1";
  const { supabase } = await exigirProfessor();
  const { data: turma } = await supabase.from("turmas").select("id, nome").eq("id", id).maybeSingle();
  if (!turma) notFound();

  const pedida =
    typeof sp.temporada === "string"
      ? ((await supabase.from("temporadas").select("*").eq("id", sp.temporada).eq("turma_id", id).maybeSingle())
          .data as Temporada | null)
      : null;
  const temporada = pedida ?? (await temporadaAtual(supabase, id));

  const { data: desafiosBrutos } = temporada
    ? await supabase
        .from("desafios")
        .select("id, titulo, abre_em, fecha_em, desafio_questoes(questoes(*))")
        .eq("temporada_id", temporada.id)
    : { data: [] };
  const todos = (desafiosBrutos ?? []) as unknown as {
    id: string;
    titulo: string;
    abre_em: string;
    fecha_em: string;
    desafio_questoes: { questoes: Questao }[];
  }[];
  const abertos = todos.filter((d) => situacaoDesafio(d) === "aberto");
  const desafios = todos.filter((d) => {
    const situacao = situacaoDesafio(d);
    return situacao === "encerrado" || (comAbertos && situacao === "aberto");
  });

  const questoes = new Map<string, { questao: Questao; desafio: string }>();
  for (const d of desafios)
    for (const dq of d.desafio_questoes)
      if (dq.questoes) questoes.set(dq.questoes.id, { questao: dq.questoes, desafio: d.titulo });
  const conteudos = new Map(
    [...questoes].map(([qid, { questao }]) => [qid, { tipo: questao.tipo, conteudo: questao.conteudo } as Conteudo]),
  );

  const idsDesafios = desafios.map((d) => d.id);
  const { data: tentativas } = idsDesafios.length
    ? await supabase.from("tentativas").select("id").in("desafio_id", idsDesafios)
    : { data: [] };
  const respostas = (
    await Promise.all(
      emPedacos((tentativas ?? []).map((t) => t.id as string)).map((ids) =>
        lerTudo<RespostaLida>((de, ate) =>
          supabase
            .from("respostas")
            .select("tentativa_id, questao_id, fracao, permutacao, resposta")
            .in("tentativa_id", ids)
            .not("fracao", "is", null)
            .order("id")
            .range(de, ate),
        ),
      ),
    )
  ).flat();

  const maisErradas = questoesMaisErradas(
    respostas.map((r): RespostaQuadro => ({
      questaoId: r.questao_id,
      fracao: Number(r.fracao),
      permutacao: r.permutacao,
      resposta: r.resposta,
    })),
    conteudos,
  );
  const slides: SlideQuadro[] = maisErradas.map((m) => {
    const { questao, desafio } = questoes.get(m.questaoId)!;
    const conteudo = conteudos.get(m.questaoId)!;
    return {
      id: questao.id,
      desafio,
      enunciado: questao.enunciado,
      imagemUrl: urlImagem(questao.imagem_path),
      conteudo,
      alternativas: alternativasDe(conteudo),
      explicacao: questao.explicacao,
      acerto: m.acerto,
      respostas: m.respostas,
      distribuicao: m.distribuicao,
      semEscolha: m.semEscolha,
    };
  });

  const voltar = `/professor/turmas/${id}?aba=temporada${pedida ? `&temporada=${pedida.id}` : ""}`;
  const aqui = (extra: string) =>
    `/professor/turmas/${id}/revisao?${[pedida && `temporada=${pedida.id}`, extra].filter(Boolean).join("&")}`;

  return (
    <div className="space-y-5">
      <div>
        <Link href={voltar} className="text-sm text-marca-700">
          ← Turma {turma.nome}
        </Link>
        <Titulo>📺 Revisão no quadro</Titulo>
        <p className="text-sm text-slate-600">
          {temporada ? `${temporada.nome} · ` : ""}
          as {slides.length > 1 ? `${slides.length} questões` : "questões"} em que a turma mais errou
          {comAbertos ? ", contando os desafios abertos" : " nos desafios já encerrados"}.
        </p>
      </div>

      {!comAbertos && abertos.length > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {abertos.length === 1 ? "Há 1 desafio aberto" : `Há ${abertos.length} desafios abertos`} que ficou de fora,
          porque a revisão mostra o gabarito.{" "}
          <Link href={aqui("abertos=1")} className="font-medium underline">
            Incluir mesmo assim
          </Link>
        </p>
      )}
      {comAbertos && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Atenção: há questões de desafios ainda abertos, e a revisão mostra o gabarito.{" "}
          <Link href={aqui("")} className="font-medium underline">
            Só os encerrados
          </Link>
        </p>
      )}

      {slides.length === 0 ? (
        <Vazio>
          Ainda não há respostas suficientes para montar a revisão. Ela aparece quando um desafio da temporada encerra
          com pelo menos 3 respostas por questão.
        </Vazio>
      ) : (
        <RevisaoNoQuadro slides={slides} turma={turma.nome} />
      )}
    </div>
  );
}

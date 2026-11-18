import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import emblema from "../../../../../public/marca/emblema.png";
import { Avatar } from "@/components/Avatar";
import { META_PARTICIPACAO } from "@/lib/ligas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { formatarPontos } from "@/lib/pontos";
import { exigirProfessor } from "@/lib/professor";
import { rankingParaAluno, type LinhaRanking } from "@/lib/ranking";
import { situacaoDaTemporada, temporadaAtual, VISAO_DA_TURMA } from "@/lib/temporada-dados";
import type { Temporada } from "@/lib/tipos-banco";
import { ControlesProjetor } from "./ControlesProjetor";

export const metadata: Metadata = { title: "Ranking no projetor" };

/** De quanto em quanto tempo a tela busca o ranking de novo. */
const ATUALIZAR_A_CADA_S = 60;
const MEDALHAS = ["🥇", "🥈", "🥉"];

/**
 * Ranking da turma em tela cheia, para projetar na sala. Mostra o mesmo que o aluno vê
 * (top 10 com apelido, personagem, ofensiva e pontos), nunca o nome real.
 * Cores só em hexadecimal: o Chrome antigo dos Chromebooks não entende oklch nem color-mix.
 */
export default async function RankingNoProjetor({ params, searchParams }: PageProps<"/professor/projetor/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await exigirProfessor();
  const { data: turma, error } = await supabase.from("turmas").select("id, nome").eq("id", id).maybeSingle();
  if (error) throw new Error(`Falha ao carregar a turma: ${error.message}`);
  if (!turma) notFound();

  // A temporada escolhida no painel (se for desta turma), senão a atual.
  let temporada: Temporada | null = null;
  if (typeof sp.temporada === "string") {
    const { data } = await supabase
      .from("temporadas")
      .select("*")
      .eq("id", sp.temporada)
      .eq("turma_id", id)
      .maybeSingle();
    temporada = (data as Temporada | null) ?? null;
  }
  temporada ??= await temporadaAtual(supabase, id);

  const [situacao, medalhas] = await Promise.all([
    temporada ? situacaoDaTemporada(supabase, temporada, VISAO_DA_TURMA) : null,
    medalhasDaTurma(supabase, id),
  ]);
  const { top, total } = rankingParaAluno(situacao?.ranking ?? [], "");
  const colunas = top.length > 5 ? [top.slice(0, 5), top.slice(5)] : [top];
  const meta = situacao?.meta.atual;
  const atualizadoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto bg-marca-950 bg-gradient-to-br from-marca-950 via-marca-900 to-marca-800 px-[3vw] py-[3vh] text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image src={emblema} alt="" style={{ height: "9vh", minHeight: 48, width: "auto" }} sizes="96px" priority />
          <div>
            <p className="text-[2.4vh] font-medium text-ouro-claro">{temporada ? temporada.nome : "CaduQuest"}</p>
            <h1 className="text-[5vh] leading-tight font-black">Ranking · Turma {turma.nome}</h1>
          </div>
        </div>
        <ControlesProjetor
          segundos={ATUALIZAR_A_CADA_S}
          atualizadoEm={atualizadoEm}
          voltar={`/professor/turmas/${id}${temporada ? `?temporada=${temporada.id}` : ""}`}
        />
      </header>

      {!temporada ? (
        <p className="m-auto text-[4vh] text-marca-200">Esta turma ainda não tem temporada.</p>
      ) : !top.length ? (
        <p className="m-auto text-[4vh] text-marca-200">Ninguém entrou na turma ainda.</p>
      ) : (
        <main className={`mt-[3vh] grid flex-1 gap-x-[3vw] ${colunas.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {colunas.map((linhas, i) => (
            <ol key={i} className="flex flex-col gap-[1.4vh]">
              {linhas.map((l) => (
                <LinhaProjetor key={l.alunoId} linha={l} medalhas={medalhas.get(l.alunoId) ?? 0} />
              ))}
            </ol>
          ))}
        </main>
      )}

      <footer className="mt-[2.5vh] flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[2vh] text-marca-200">
        {meta && meta.total > 0 && (
          <p className="font-semibold text-white">
            🤝 Meta da turma:{" "}
            {meta.batida
              ? "batida nesta semana! 🎉"
              : `${meta.participantes}/${meta.total} fizeram os desafios da semana (meta: ${Math.round(META_PARTICIPACAO * 100)}%)`}
          </p>
        )}
        <p>
          {total} {total === 1 ? "aluno" : "alunos"} · pontos da temporada com os bônus · quem está no meio de um
          desafio sobe quando terminar
        </p>
      </footer>
    </div>
  );
}

function LinhaProjetor({ linha: l, medalhas }: { linha: LinhaRanking; medalhas: number }) {
  const podio = l.posicao <= 3;
  return (
    <li
      className={`flex flex-1 items-center gap-[1.5vw] rounded-2xl px-[1.5vw] py-[1vh] ${
        podio ? "bg-[#2e1a85] ring-2 ring-ouro" : "bg-[#1d0d63]"
      }`}
    >
      <span className="w-[4.5vw] min-w-12 text-center text-[4.5vh] font-black tabular-nums">
        {MEDALHAS[l.posicao - 1] ?? `${l.posicao}º`}
      </span>
      <Avatar avatar={l.avatar} cor={l.cor} medalhas={medalhas} tamanho={64} />
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="truncate text-[4.2vh] font-bold">{l.apelido}</span>
        {l.sequencia > 0 && <span className="shrink-0 text-[3vh] font-bold text-[#fb923c]">🔥{l.sequencia}</span>}
      </span>
      <span className={`text-[4.2vh] font-black tabular-nums ${podio ? "text-ouro" : "text-ouro-claro"}`}>
        {formatarPontos(l.pontos)}
        <span className="ml-1 text-[2.4vh] font-semibold text-marca-200">pts</span>
      </span>
    </li>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { Cartao, Vazio } from "@/components/ui";
import { medalhasDaTurmaDoAluno, temporadaAtualDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import { rankingParaAluno } from "@/lib/ranking";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { situacaoDaTemporada } from "@/lib/temporada-dados";
import { MetaTurma } from "@/components/MetaTurma";
import type { Divisao } from "@/lib/ligas";
import { formatarPontos } from "@/lib/pontos";

export const metadata: Metadata = { title: "Ranking" };

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default async function Ranking() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const temporada = await temporadaAtualDoAluno(aluno.turmaId);
  if (!temporada) return <Vazio>Ainda não há temporada.</Vazio>;

  const [{ ranking, meta, ligas }, medalhas] = await Promise.all([
    situacaoDaTemporada(db, temporada),
    medalhasDaTurmaDoAluno(aluno.turmaId),
  ]);
  const { top, eu, total } = rankingParaAluno(ranking, aluno.id);
  const euNoTop = eu && top.some((l) => l.alunoId === eu.alunoId);
  const minhaLiga = ligas.find((l) => l.membros.some((m) => m.alunoId === aluno.id));
  const linhaDe = new Map(ranking.map((l) => [l.alunoId, l]));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-marca-900 text-white shadow-lg shadow-marca-900/20">
        <Image
          src="/ilustracoes/cartao-ranking.webp"
          alt=""
          fill
          sizes="(max-width: 672px) 100vw, 672px"
          className="object-cover object-top opacity-70"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-marca-950/90 via-marca-900/60 to-transparent" />
        <div className="relative px-6 py-8">
          <p className="text-sm font-medium text-ouro-claro">{temporada.nome}</p>
          <h1 className="text-2xl font-extrabold">Ranking da temporada</h1>
          <p className="mt-1 text-sm text-marca-100">Veja sua posição e compare seu desempenho.</p>
        </div>
      </section>
      {minhaLiga && <LigaDaSemana liga={minhaLiga} alunoId={aluno.id} linhaDe={linhaDe} medalhas={medalhas} />}

      <MetaTurma meta={meta} />

      <h2 className="text-lg font-extrabold text-marca-900">Ranking geral da temporada</h2>
      <Cartao className="p-0">
        <ol className="divide-y divide-slate-100">
          {top.map((l) => (
            <li
              key={l.alunoId}
              className={`flex items-center gap-3 px-4 py-3 ${l.alunoId === aluno.id ? "bg-marca-50 font-semibold" : ""}`}
            >
              <span className="w-8 text-center text-lg">{MEDALHAS[l.posicao - 1] ?? `${l.posicao}º`}</span>
              <Avatar avatar={l.avatar} cor={l.cor} medalhas={medalhas.get(l.alunoId) ?? 0} tamanho={36} />
              <span className="flex-1">
                {l.apelido}
                {l.sequencia > 0 && <span className="ml-1 text-xs text-orange-600">🔥{l.sequencia}</span>}
              </span>
              <span className="tabular-nums">{formatarPontos(l.pontos)} pts</span>
            </li>
          ))}
        </ol>
      </Cartao>
      {eu && !euNoTop && (
        <Cartao className="flex items-center gap-3 bg-marca-50">
          <span className="w-8 text-center font-bold">{eu.posicao}º</span>
          <Avatar avatar={eu.avatar} cor={eu.cor} medalhas={medalhas.get(eu.alunoId) ?? 0} tamanho={36} />
          <span className="flex-1 font-semibold">Você ({eu.apelido})</span>
          <span className="tabular-nums font-semibold">{formatarPontos(eu.pontos)} pts</span>
        </Cartao>
      )}
      <p className="text-center text-xs text-slate-500">
        {total} alunos na turma. Os pontos incluem o bônus da ofensiva (🔥) e o da meta da turma (🤝). Desempate pela
        maior taxa de acerto. Só o top 10 aparece para todos. 🏅 = desafios vencidos.
      </p>
    </div>
  );
}

const ESTILO_DIVISAO: Record<Divisao, { fundo: string; icone: string }> = {
  Ouro: { fundo: "from-amber-300 to-amber-500 text-marca-950", icone: "🥇" },
  Prata: { fundo: "from-slate-200 to-slate-400 text-marca-950", icone: "🥈" },
  Bronze: { fundo: "from-orange-300 to-orange-500 text-marca-950", icone: "🥉" },
  Turma: { fundo: "from-marca-500 to-marca-700 text-white", icone: "🏟️" },
};

/** Liga da semana: só a divisão do aluno, com o top 5 e a posição dele. */
function LigaDaSemana({
  liga,
  alunoId,
  linhaDe,
  medalhas,
}: {
  liga: { divisao: Divisao; membros: { alunoId: string; pontosSemana: number; posicao: number }[] };
  alunoId: string;
  linhaDe: Map<string, { apelido: string; avatar: number; cor: number }>;
  medalhas: Map<string, number>;
}) {
  const estilo = ESTILO_DIVISAO[liga.divisao];
  const top = liga.membros.slice(0, 5);
  const eu = liga.membros.find((m) => m.alunoId === alunoId);
  const euNoTop = top.some((m) => m.alunoId === alunoId);
  const linha = (m: (typeof liga.membros)[number]) => {
    const l = linhaDe.get(m.alunoId);
    return (
      <li
        key={m.alunoId}
        className={`flex items-center gap-3 px-4 py-2.5 ${m.alunoId === alunoId ? "bg-marca-50 font-semibold" : ""}`}
      >
        <span className="w-8 text-center font-bold">{m.posicao}º</span>
        {l && <Avatar avatar={l.avatar} cor={l.cor} medalhas={medalhas.get(m.alunoId) ?? 0} tamanho={32} />}
        <span className="flex-1">{m.alunoId === alunoId ? `Você (${l?.apelido})` : l?.apelido}</span>
        <span className="tabular-nums">{formatarPontos(m.pontosSemana)} pts</span>
      </li>
    );
  };
  return (
    <Cartao className="overflow-hidden p-0">
      <div className={`bg-gradient-to-r ${estilo.fundo} px-4 py-3`}>
        <p className="text-xs font-bold tracking-widest uppercase opacity-80">Liga da semana</p>
        <p className="text-lg font-extrabold">
          {estilo.icone} {liga.divisao === "Turma" ? "Liga da turma" : `Divisão ${liga.divisao}`}
        </p>
        <p className="text-xs opacity-80">
          {liga.divisao === "Turma"
            ? "Quando mais alunos pontuarem, a turma se divide em Ouro, Prata e Bronze."
            : "Você disputa com quem tem pontuação parecida. Só valem os pontos desta semana!"}
        </p>
      </div>
      <ol className="divide-y divide-slate-100">
        {top.map(linha)}
        {eu && !euNoTop && linha(eu)}
      </ol>
    </Cartao>
  );
}

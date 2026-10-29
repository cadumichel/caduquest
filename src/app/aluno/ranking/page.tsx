import type { Metadata } from "next";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { Cartao, Vazio } from "@/components/ui";
import { medalhasDaTurmaDoAluno, temporadaAtualDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import { rankingParaAluno } from "@/lib/ranking";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { rankingDaTemporada } from "@/lib/temporada-dados";

export const metadata: Metadata = { title: "Ranking" };

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default async function Ranking() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const temporada = await temporadaAtualDoAluno(aluno.turmaId);
  if (!temporada) return <Vazio>Ainda não há temporada.</Vazio>;

  const [ranking, medalhas] = await Promise.all([
    rankingDaTemporada(db, temporada),
    medalhasDaTurmaDoAluno(aluno.turmaId),
  ]);
  const { top, eu, total } = rankingParaAluno(ranking, aluno.id);
  const euNoTop = eu && top.some((l) => l.alunoId === eu.alunoId);

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
              <span className="tabular-nums">{l.pontos} pts</span>
            </li>
          ))}
        </ol>
      </Cartao>
      {eu && !euNoTop && (
        <Cartao className="flex items-center gap-3 bg-marca-50">
          <span className="w-8 text-center font-bold">{eu.posicao}º</span>
          <Avatar avatar={eu.avatar} cor={eu.cor} medalhas={medalhas.get(eu.alunoId) ?? 0} tamanho={36} />
          <span className="flex-1 font-semibold">Você ({eu.apelido})</span>
          <span className="tabular-nums font-semibold">{eu.pontos} pts</span>
        </Cartao>
      )}
      <p className="text-center text-xs text-slate-500">
        {total} alunos na turma. Os pontos incluem o bônus de constância (🔥). Desempate pela maior taxa de acerto. Só o
        top 10 aparece para todos. 🏅 = desafios vencidos.
      </p>
    </div>
  );
}

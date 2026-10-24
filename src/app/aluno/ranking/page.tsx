import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { Cartao, Vazio } from "@/components/ui";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurma } from "@/lib/medalhas";
import { rankingParaAluno } from "@/lib/ranking";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";

export const metadata: Metadata = { title: "Ranking" };

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default async function Ranking() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const temporada = await temporadaAtual(db, aluno.turmaId);
  if (!temporada) return <Vazio>Ainda não há temporada.</Vazio>;

  const [ranking, medalhas] = await Promise.all([
    rankingDaTemporada(db, temporada),
    medalhasDaTurma(db, aluno.turmaId),
  ]);
  const { top, eu, total } = rankingParaAluno(ranking, aluno.id);
  const euNoTop = eu && top.some((l) => l.alunoId === eu.alunoId);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">{temporada.nome}</p>
        <h1 className="text-2xl font-bold">Ranking da temporada</h1>
      </div>
      <Cartao className="p-0">
        <ol className="divide-y divide-slate-100">
          {top.map((l) => (
            <li
              key={l.alunoId}
              className={`flex items-center gap-3 px-4 py-3 ${l.alunoId === aluno.id ? "bg-marca-50 font-semibold" : ""}`}
            >
              <span className="w-8 text-center text-lg">{MEDALHAS[l.posicao - 1] ?? `${l.posicao}º`}</span>
              <Avatar avatar={l.avatar} cor={l.cor} medalhas={medalhas.get(l.alunoId) ?? 0} tamanho={36} />
              <span className="flex-1">{l.apelido}</span>
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
        {total} alunos na turma. Desempate pela maior taxa de acerto. Só o top 10 aparece para todos. 🏅 = desafios
        vencidos.
      </p>
    </div>
  );
}

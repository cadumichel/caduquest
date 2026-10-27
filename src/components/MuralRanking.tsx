import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { LinhaRanking } from "@/lib/ranking";

const DEGRAU = {
  1: { altura: "h-24", cor: "from-amber-300 to-amber-500", coroa: "👑", tamanho: 64 },
  2: { altura: "h-16", cor: "from-slate-200 to-slate-400", coroa: "🥈", tamanho: 52 },
  3: { altura: "h-12", cor: "from-orange-200 to-orange-400", coroa: "🥉", tamanho: 52 },
} as const;

/** Mural do ranking: pódio dos três primeiros, top 10 e a posição do próprio aluno. */
export function MuralRanking({
  top,
  eu,
  total,
  medalhas,
  alunoId,
}: {
  top: LinhaRanking[];
  eu: LinhaRanking | null;
  total: number;
  medalhas: Map<string, number>;
  alunoId: string;
}) {
  const ninguemPontuou = top.every((l) => l.pontos === 0);
  const podio = top.slice(0, 3);
  const resto = top.slice(3);
  const euNoTop = eu && top.some((l) => l.alunoId === eu.alunoId);

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-marca-900">
          <Image src="/ilustracoes/icone-ranking.png" alt="" width={28} height={28} className="size-7 object-contain" />
          Mural da turma
        </h2>
        <Link href="/aluno/ranking" className="text-sm font-semibold text-marca-700 underline">
          Ver ranking
        </Link>
      </div>

      {ninguemPontuou ? (
        <p className="px-5 pt-2 pb-5 text-sm text-amber-900">
          Ninguém pontuou ainda nesta temporada. Jogue um desafio e seja o primeiro do mural!
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 items-end gap-2 px-4">
            {[podio[1], podio[0], podio[2]].map((l, i) =>
              l ? (
                <Degrau key={l.alunoId} linha={l} medalhas={medalhas.get(l.alunoId) ?? 0} eu={l.alunoId === alunoId} />
              ) : (
                <div key={`vazio-${i}`} />
              ),
            )}
          </div>

          {resto.length > 0 && (
            <ol className="divide-y divide-amber-100 border-t border-amber-200 bg-white">
              {resto.map((l) => (
                <Linha key={l.alunoId} linha={l} medalhas={medalhas.get(l.alunoId) ?? 0} eu={l.alunoId === alunoId} />
              ))}
            </ol>
          )}
          {eu && !euNoTop && (
            <ol className="border-t-2 border-dashed border-amber-200 bg-white">
              <Linha linha={eu} medalhas={medalhas.get(eu.alunoId) ?? 0} eu />
            </ol>
          )}
          <p className="bg-white px-5 pb-3 pt-1 text-center text-xs text-slate-500">
            {total} alunos na turma · só o top 10 aparece para todos
          </p>
        </>
      )}
    </section>
  );
}

function Degrau({ linha, medalhas, eu }: { linha: LinhaRanking; medalhas: number; eu: boolean }) {
  const d = DEGRAU[Math.min(linha.posicao, 3) as 1 | 2 | 3];
  return (
    <div className="flex min-w-0 flex-col items-center">
      <span className="text-xl leading-none">{d.coroa}</span>
      <Avatar
        avatar={linha.avatar}
        cor={linha.cor}
        medalhas={medalhas}
        tamanho={d.tamanho}
        className="mt-1 drop-shadow"
      />
      <p
        className={`mt-1 w-full truncate text-center text-sm ${eu ? "font-extrabold text-marca-700" : "font-semibold"}`}
      >
        {eu ? "Você" : linha.apelido}
      </p>
      <p className="text-xs font-semibold tabular-nums text-slate-600">{linha.pontos} pts</p>
      <div
        className={`mt-1 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b ${d.cor} ${d.altura} pt-1 text-2xl font-black text-white/90`}
      >
        {linha.posicao}
      </div>
    </div>
  );
}

function Linha({ linha, medalhas, eu }: { linha: LinhaRanking; medalhas: number; eu: boolean }) {
  return (
    <li className={`flex items-center gap-3 px-4 py-2 ${eu ? "bg-marca-50 font-semibold" : ""}`}>
      <span className="w-7 text-center text-sm font-bold text-slate-500">{linha.posicao}º</span>
      <Avatar avatar={linha.avatar} cor={linha.cor} medalhas={medalhas} tamanho={32} />
      <span className="flex-1 truncate">{eu ? `Você (${linha.apelido})` : linha.apelido}</span>
      <span className="text-sm tabular-nums">{linha.pontos} pts</span>
    </li>
  );
}

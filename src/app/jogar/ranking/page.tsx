import type { Metadata } from "next";
import { IconeEra } from "@/components/IconeEra";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Vazio } from "@/components/ui";
import { formatarPontos } from "@/lib/pontos";
import { rankingPublico } from "@/lib/publico/ranking";
import { ehEra, ERAS } from "@/lib/publico/regras";
import { obterJogador } from "@/lib/publico/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Ranking" };

const MOSTRAR = 50;

export default async function RankingPublico({ searchParams }: PageProps<"/jogar/ranking">) {
  const { era: eraParam } = await searchParams;
  const era = ehEra(eraParam) ? eraParam : undefined;
  const [ranking, jogador] = await Promise.all([rankingPublico(criarClienteAdmin(), era), obterJogador()]);
  const eu = jogador ? ranking.find((l) => l.jogadorId === jogador.id) : undefined;
  const topo = ranking.slice(0, MOSTRAR);
  const nomeEra = ERAS.find((e) => e.id === era);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-marca-900">🏆 Ranking {nomeEra ? `· ${nomeEra.nome}` : "geral"}</h1>
        <p className="text-sm text-slate-500">
          {era
            ? "Primeira partida de cada jogador nesta era. Empate: vence quem terminou em menos tempo."
            : "Soma da primeira partida de cada era. Quem joga mais eras pode somar mais pontos."}
        </p>
      </div>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-semibold">
        <Link
          href="/jogar/ranking"
          className={`shrink-0 rounded-full px-3 py-1.5 ${!era ? "bg-marca-700 text-white" : "bg-marca-50 text-marca-800"}`}
        >
          Geral
        </Link>
        {ERAS.map((e) => (
          <Link
            key={e.id}
            href={`/jogar/ranking?era=${e.id}`}
            className={`shrink-0 rounded-full px-3 py-1.5 ${era === e.id ? "bg-marca-700 text-white" : "bg-marca-50 text-marca-800"}`}
          >
            <IconeEra era={e.id} /> {e.nome}
          </Link>
        ))}
      </nav>

      {eu && (
        <p className="rounded-xl bg-ouro/15 px-4 py-3 text-sm font-semibold text-marca-900">
          Você está em {eu.posicao}º lugar, com {formatarPontos(eu.pontos)} pontos.
        </p>
      )}

      {!topo.length ? (
        <Vazio>Ninguém jogou ainda. Seja o primeiro!</Vazio>
      ) : (
        <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {topo.map((l) => (
            <li
              key={l.jogadorId}
              className={`flex items-center gap-3 px-4 py-2.5 ${l.jogadorId === jogador?.id ? "bg-marca-50" : ""}`}
            >
              <span className="w-8 text-right font-bold tabular-nums">
                {l.posicao <= 3 ? ["🥇", "🥈", "🥉"][l.posicao - 1] : `${l.posicao}º`}
              </span>
              <Avatar avatar={l.avatar} cor={l.cor} tamanho={32} />
              <span className="flex-1 truncate font-medium">{l.apelido}</span>
              {!era && (
                <span className="text-xs text-slate-500">
                  {l.eras} {l.eras === 1 ? "era" : "eras"}
                </span>
              )}
              <span className="font-bold tabular-nums">{formatarPontos(l.pontos)}</span>
            </li>
          ))}
        </ol>
      )}
      <Link href="/jogar" className="block text-center text-sm font-semibold text-marca-700 underline">
        Voltar aos desafios
      </Link>
    </div>
  );
}

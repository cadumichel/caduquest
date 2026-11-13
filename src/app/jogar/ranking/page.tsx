import type { Metadata } from "next";
import { IconeEra } from "@/components/IconeEra";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Vazio } from "@/components/ui";
import { formatarPontos } from "@/lib/pontos";
import { rankingPublico } from "@/lib/publico/ranking";
import {
  BONUS_RAPIDEZ,
  ehEra,
  ERAS,
  PESO_FINAL,
  PONTOS_ACERTO,
  PONTUACAO_MAXIMA,
  QUESTOES_FINAIS,
  QUESTOES_POR_PARTIDA,
} from "@/lib/publico/regras";
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

      <ComoFuncionaPontuacao />

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

/** Caixa de info: como os pontos da partida e do ranking são contados. */
function ComoFuncionaPontuacao() {
  return (
    <details className="group rounded-3xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-extrabold text-marca-900">
        <span>ℹ️ Como funcionam os pontos e os bônus</span>
        <span className="text-sm text-sky-700 group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>
          Cada partida tem {QUESTOES_POR_PARTIDA} questões. Cada acerto vale {PONTOS_ACERTO} pontos.
        </li>
        <li>
          ⚡ Bônus por rapidez: até +{BONUS_RAPIDEZ} por questão certa. Quanto mais tempo sobrar quando você responder,
          maior o bônus. Errou, não ganha bônus.
        </li>
        <li>Nas questões com vários itens, acertar só uma parte vale parte dos pontos (e do bônus).</li>
        <li>
          🏁 Rodada final: as {QUESTOES_FINAIS} últimas questões valem o dobro (até{" "}
          {PESO_FINAL * (PONTOS_ACERTO + BONUS_RAPIDEZ)} pontos cada), sem consulta e sem ajudas. Quebrar uma regra zera
          a questão.
        </li>
        <li>Uma partida vale no máximo {PONTUACAO_MAXIMA} pontos.</li>
        <li>
          Só a primeira partida de cada era conta. O ranking de uma era mostra essa partida, e o ranking geral soma a
          primeira partida de cada era: quem joga mais eras soma mais.
        </li>
      </ul>
    </details>
  );
}

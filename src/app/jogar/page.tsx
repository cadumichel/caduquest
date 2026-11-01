import Link from "next/link";
import { BotaoLink, Etiqueta } from "@/components/ui";
import { formatarPontos } from "@/lib/pontos";
import { partidasDoJogador, questoesPorEra } from "@/lib/publico/jogo";
import { ERAS, PONTUACAO_MAXIMA, QUESTOES_FINAIS, QUESTOES_POR_PARTIDA } from "@/lib/publico/regras";
import { obterJogador } from "@/lib/publico/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BotaoJogar } from "./BotaoJogar";

export default async function DesafiosPublicos() {
  const db = criarClienteAdmin();
  const jogador = await obterJogador();
  const [banco, partidas] = await Promise.all([
    questoesPorEra(db),
    jogador ? partidasDoJogador(db, jogador.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-marca-800 via-marca-900 to-marca-950 p-6 text-white shadow-lg">
        <p className="text-xs font-bold tracking-widest text-ouro uppercase">Desafios de História</p>
        <h1 className="mt-1 text-2xl font-extrabold">Quanto você entende de História?</h1>
        <p className="mt-2 text-sm text-marca-100">
          {QUESTOES_POR_PARTIDA} questões por desafio, em formatos variados, sobre contextos e conceitos, não sobre
          decorar nomes e datas. As {QUESTOES_POR_PARTIDA - QUESTOES_FINAIS} primeiras são com consulta e as{" "}
          {QUESTOES_FINAIS} últimas são a <strong className="text-ouro">Rodada final, sem consulta</strong>, valendo o
          dobro.
        </p>
        {jogador ? (
          <p className="mt-3 text-sm font-semibold">Olá, {jogador.apelido}! Escolha um desafio.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <BotaoLink href="/jogar/entrar" variante="ouro">
              Entrar para jogar
            </BotaoLink>
            <BotaoLink href="/jogar/ranking" variante="secundario">
              Ver o ranking
            </BotaoLink>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {ERAS.map((era) => {
          const minhas = partidas.filter((p) => p.era === era.id);
          const ranking = minhas.find((p) => p.vale_ranking && p.concluida_em);
          const andamento = minhas.find((p) => !p.concluida_em);
          const aberto = banco[era.id] >= QUESTOES_POR_PARTIDA;
          return (
            <section
              key={era.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className={`bg-gradient-to-br ${era.cor} p-4 text-white`}>
                <p className="text-3xl">{era.emoji}</p>
                <h2 className="mt-1 text-lg font-extrabold">{era.nome}</h2>
                <p className="text-xs text-white/85">{era.resumo}</p>
              </div>
              <div className="flex flex-1 flex-col justify-end gap-3 p-4">
                {ranking && (
                  <p className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Sua pontuação</span>
                    <span className="font-bold text-marca-800">
                      {formatarPontos(ranking.pontos)} / {PONTUACAO_MAXIMA}
                    </span>
                  </p>
                )}
                {!aberto ? (
                  <Etiqueta>Em breve</Etiqueta>
                ) : !jogador ? (
                  <BotaoLink href="/jogar/entrar" variante="secundario">
                    Entrar para jogar
                  </BotaoLink>
                ) : andamento ? (
                  <BotaoLink href={`/jogar/partida/${andamento.id}`}>Continuar</BotaoLink>
                ) : ranking ? (
                  <>
                    <BotaoJogar era={era.id} variante="secundario">
                      🏋️ Jogar de novo (treino)
                    </BotaoJogar>
                    <Link
                      href={`/jogar/ranking?era=${era.id}`}
                      className="text-center text-xs font-semibold text-marca-700 underline"
                    >
                      Ver ranking desta era
                    </Link>
                  </>
                ) : (
                  <BotaoJogar era={era.id}>Jogar · vale ranking</BotaoJogar>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500">
        Só a primeira partida de cada desafio conta para o ranking. Depois dá para jogar de novo como treino, com outras
        questões sorteadas.
      </p>
      {partidas.some((p) => p.concluida_em) && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Suas partidas</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm">
            {partidas
              .filter((p) => p.concluida_em)
              .slice(0, 15)
              .map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/jogar/partida/${p.id}/resultado`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                  >
                    <span>
                      {ERAS.find((e) => e.id === p.era)?.emoji} {ERAS.find((e) => e.id === p.era)?.nome}{" "}
                      {p.vale_ranking ? <Etiqueta cor="azul">ranking</Etiqueta> : <Etiqueta>treino</Etiqueta>}
                    </span>
                    <span className="font-semibold tabular-nums">{formatarPontos(p.pontos)} pts</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

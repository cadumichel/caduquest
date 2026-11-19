import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Numero } from "@/components/Abas";
import { Avatar } from "@/components/Avatar";
import { IconeEra } from "@/components/IconeEra";
import { Cartao, Etiqueta, Subtitulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import { formatarNumeroAcertos, formatarPontos } from "@/lib/pontos";
import { diaBrasilia, partidasDoJogador } from "@/lib/publico/relatorio";
import { dadosJogadorPublico } from "@/lib/publico/relatorio-dados";
import { eraPorId, PONTUACAO_MAXIMA, QUESTOES_POR_PARTIDA } from "@/lib/publico/regras";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Jogador do desafio aberto" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function JogadorPublico({ params }: PageProps<"/professor/publico/jogador/[id]">) {
  await exigirProfessor();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const dados = await dadosJogadorPublico(criarClienteAdmin(), id);
  if (!dados) notFound();
  const { jogador, dias } = dados;
  const partidas = partidasDoJogador(dados.partidas, dados.respostas);
  const ranking = partidas.filter((p) => p.valeRanking && p.situacao === "concluida");
  const respondidas = partidas.reduce((s, p) => s + p.respondidas, 0);
  const acertos = partidas.reduce((s, p) => s + p.acertos, 0);
  const ultimoDia = dias[dias.length - 1];
  const ultimo =
    jogador.ultimo_acesso && (!ultimoDia || diaBrasilia(jogador.ultimo_acesso) >= ultimoDia)
      ? formatarDataHora(jogador.ultimo_acesso)
      : ultimoDia
        ? formatarData(ultimoDia)
        : "—";

  return (
    <div className="space-y-6">
      <Link href="/professor/publico" className="text-sm text-marca-700 hover:underline">
        ← Desafio aberto
      </Link>
      <div className="flex items-center gap-4">
        <Avatar avatar={jogador.avatar} cor={jogador.cor} tamanho={64} />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-marca-900">{jogador.apelido}</h1>
          <p className="text-sm text-slate-500">
            Cadastro em {formatarData(diaBrasilia(jogador.criado_em))} · último acesso {ultimo}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero valor={String(dias.length)} rotulo="Dias com acesso" />
        <Numero valor={String(partidas.length)} rotulo="Partidas" />
        <Numero valor={String(ranking.length)} rotulo="Eras no ranking" />
        <Numero
          valor={formatarPontos(ranking.reduce((s, p) => s + p.pontos, 0))}
          rotulo="Pontos no ranking geral"
          destaque
        />
        <Numero valor={respondidas ? `${Math.round((acertos / respondidas) * 100)}%` : "—"} rotulo="Acerto médio" />
      </div>

      <Cartao>
        <Subtitulo>Partidas</Subtitulo>
        {partidas.length === 0 ? (
          <Vazio>Ainda não jogou nenhum desafio.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {partidas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="min-w-48 flex-1 font-medium">
                  <IconeEra era={p.era} /> {eraPorId(p.era)?.nome ?? p.era}
                </span>
                <span className="text-xs text-slate-500">{formatarDataHora(p.iniciadaEm)}</span>
                {p.valeRanking ? <Etiqueta cor="azul">Ranking</Etiqueta> : <Etiqueta>Treino</Etiqueta>}
                {p.situacao === "andamento" && <Etiqueta cor="ambar">Em andamento</Etiqueta>}
                {p.situacao === "abandonada" && <Etiqueta cor="vermelho">Abandonada</Etiqueta>}
                <span className="w-24 text-right text-sm tabular-nums">
                  {formatarNumeroAcertos(p.acertos)}/{QUESTOES_POR_PARTIDA} acertos
                </span>
                <span className="w-24 text-right font-bold text-marca-900 tabular-nums">
                  {formatarPontos(p.pontos)}
                  <span className="text-xs font-normal text-slate-500">/{PONTUACAO_MAXIMA}</span>
                </span>
                {p.zeradasFinal > 0 && (
                  <span className="text-xs text-red-700">
                    {p.zeradasFinal} zerada{p.zeradasFinal > 1 ? "s" : ""} na final
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}

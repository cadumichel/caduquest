import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Numero } from "@/components/Abas";
import { Avatar } from "@/components/Avatar";
import { IconeEra } from "@/components/IconeEra";
import { Aviso, Botao, Cartao, Entrada, Selecao, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import { formatarPontos } from "@/lib/pontos";
import {
  diaBrasilia,
  MIN_RESPOSTAS_QUESTAO,
  HORAS_ABANDONO,
  montarRelatorio,
  partidasDoPeriodo,
  PERIODOS,
  resolverPeriodo,
} from "@/lib/publico/relatorio";
import { dadosRelatorioPublico, respostasDasPartidas } from "@/lib/publico/relatorio-dados";
import { ERAS, ehEra, eraPorId, PONTUACAO_MAXIMA } from "@/lib/publico/regras";
import { NOME_TIPO, type TipoQuestao } from "@/lib/questoes/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { GraficoDias } from "./GraficoDias";

export const metadata: Metadata = { title: "Desafio aberto" };
export const dynamic = "force-dynamic";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const nomeEra = (id: string) => eraPorId(id)?.nome ?? id;

export default async function RelatorioPublico({ searchParams }: PageProps<"/professor/publico">) {
  const { supabase } = await exigirProfessor();
  const sp = await searchParams;
  const db = criarClienteAdmin();
  const dados = await dadosRelatorioPublico(db);

  const hoje = hojeEmBrasilia();
  const inicio = dados.jogadores.reduce((m, j) => (diaBrasilia(j.criado_em) < m ? diaBrasilia(j.criado_em) : m), hoje);
  const periodo = resolverPeriodo(sp, hoje, inicio);
  const era = ehEra(sp.era) || sp.era === "brasil" ? (sp.era as string) : undefined;

  const respostas = await respostasDasPartidas(
    db,
    partidasDoPeriodo(dados.partidas, periodo, era).map((p) => p.id),
  );
  const rel = montarRelatorio({ ...dados, respostas }, periodo, { era });

  const { data: questoes } = rel.maisErradas.length
    ? await supabase
        .from("questoes")
        .select("id, tipo, enunciado, era_publica")
        .in(
          "id",
          rel.maisErradas.map((q) => q.questaoId),
        )
    : { data: [] };
  const questaoPorId = new Map(
    (questoes ?? []).map((q) => [q.id as string, q as { tipo: TipoQuestao; enunciado: string; era_publica: string }]),
  );
  const apelidoDe = new Map(dados.jogadores.map((j) => [j.id, j]));

  const link = (mudar: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base = { periodo: periodo.id, de: periodo.de, ate: periodo.ate, era, ...mudar };
    for (const [k, v] of Object.entries(base)) {
      if (v && !((k === "de" || k === "ate") && base.periodo !== "datas")) q.set(k, v);
    }
    return `/professor/publico?${q}`;
  };
  const r = rel.resumo;

  return (
    <div className="space-y-6">
      <Titulo>Desafio aberto</Titulo>
      <p className="-mt-3 text-sm text-slate-600">
        Acessos e desempenho de quem joga em <strong>/jogar</strong>. Tudo é atualizado sozinho.
      </p>

      {dados.semTabelaAcessos && (
        <Aviso>
          Os acessos por dia ainda não aparecem: falta rodar o SQL 20261119120000_acessos_publicos.sql no Supabase.
        </Aviso>
      )}

      {/* Filtros */}
      <Cartao className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Link
              key={p.id}
              href={link({ periodo: p.id })}
              aria-current={p.id === periodo.id ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                p.id === periodo.id
                  ? "border-marca-600 bg-marca-600 text-white"
                  : "border-slate-300 text-slate-700 hover:border-marca-400"
              }`}
            >
              {p.rotulo}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-3" action="/professor/publico">
          <input type="hidden" name="periodo" value="datas" />
          <label className="text-sm">
            <span className="block text-xs text-slate-500">De</span>
            <Entrada type="date" name="de" defaultValue={periodo.de} max={hoje} className="w-40" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-slate-500">Até</span>
            <Entrada type="date" name="ate" defaultValue={periodo.ate} max={hoje} className="w-40" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-slate-500">Era</span>
            <Selecao name="era" defaultValue={era ?? ""} className="w-56">
              <option value="">Todas as eras</option>
              {ERAS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Selecao>
          </label>
          <Botao variante="secundario">Aplicar</Botao>
        </form>
        <p className="text-xs text-slate-500">
          Período: {formatarData(periodo.de)}
          {periodo.de !== periodo.ate && ` a ${formatarData(periodo.ate)}`}
          {era && ` · ${nomeEra(era)} (o filtro de era vale para partidas, questões e ranking)`}
        </p>
      </Cartao>

      {/* 1. Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Numero valor={String(r.inscritosNovos)} rotulo="Inscritos novos" />
        <Numero valor={String(r.jogadoresAtivos)} rotulo="Jogadores que acessaram" />
        <Numero valor={String(r.acessos)} rotulo="Acessos (1 por jogador por dia)" />
        <Numero valor={String(r.partidasIniciadas)} rotulo="Partidas iniciadas" />
        <Numero valor={String(r.partidasConcluidas)} rotulo="Partidas concluídas" />
        <Numero valor={pct(r.taxaConclusao)} rotulo="Taxa de conclusão" />
        <Numero valor={pct(r.acertoMedio)} rotulo="Acerto médio" destaque />
      </div>

      {/* 2. Por dia */}
      <Cartao>
        <Subtitulo>Por dia</Subtitulo>
        <GraficoDias dias={rel.porDia} />
      </Cartao>

      {/* 3. Por era */}
      <Cartao>
        <Subtitulo>Por era</Subtitulo>
        {rel.porEra.length === 0 ? (
          <Vazio>Nenhuma partida no período.</Vazio>
        ) : (
          <Tabela
            cabecalho={[
              "Era",
              "Partidas",
              "Ranking / treino",
              "Concluídas",
              "Abandonadas",
              "Acerto",
              "Com consulta",
              "Rodada final",
              "Média de pontos",
              "Zeradas na final",
            ]}
          >
            {rel.porEra.map((e) => (
              <tr key={e.era} className="border-t border-slate-100">
                <td className="py-2 pr-3 font-medium whitespace-nowrap">
                  <IconeEra era={e.era} /> {nomeEra(e.era)}
                </td>
                <Num>{e.partidas}</Num>
                <Num>
                  {e.ranking} / {e.treino}
                </Num>
                <Num>{e.concluidas}</Num>
                <Num>{e.abandonadas}</Num>
                <Num forte>{pct(e.acertoMedio)}</Num>
                <Num>{pct(e.acertoConsulta)}</Num>
                <Num>{pct(e.acertoFinal)}</Num>
                <Num>{e.mediaPontos === null ? "—" : `${formatarPontos(e.mediaPontos)} / ${PONTUACAO_MAXIMA}`}</Num>
                <Num>{e.zeradasFinal}</Num>
              </tr>
            ))}
          </Tabela>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Abandonada: começou há mais de {HORAS_ABANDONO} h e não terminou. Zeradas na final: questões da rodada final
          zeradas por sair da tela, clicar fora ou usar o teclado.
        </p>
      </Cartao>

      {/* 4. Questões mais erradas */}
      <Cartao>
        <Subtitulo>Questões mais erradas</Subtitulo>
        {rel.maisErradas.length === 0 ? (
          <Vazio>Ainda nenhuma questão com {MIN_RESPOSTAS_QUESTAO} respostas ou mais no período.</Vazio>
        ) : (
          <ol className="space-y-2">
            {rel.maisErradas.map((q, i) => {
              const info = questaoPorId.get(q.questaoId);
              return (
                <li key={q.questaoId} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="w-6 shrink-0 text-right font-bold text-slate-400 tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/professor/questoes/${q.questaoId}`}
                      className="line-clamp-2 text-sm font-medium text-marca-800 hover:underline"
                    >
                      {info?.enunciado ?? "Questão"}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {info ? `${NOME_TIPO[info.tipo] ?? info.tipo} · ${nomeEra(info.era_publica ?? "")}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-marca-900 tabular-nums">{pct(q.acerto)}</p>
                    <p className="text-xs text-slate-500">
                      de acerto · {q.respostas} {q.respostas === 1 ? "resposta" : "respostas"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Cartao>

      {/* 5. Jogadores */}
      <Cartao>
        <Subtitulo>Jogadores ({rel.jogadores.length})</Subtitulo>
        {rel.jogadores.length === 0 ? (
          <Vazio>Ninguém acessou no período.</Vazio>
        ) : (
          <Tabela
            cabecalho={[
              "Apelido",
              "Cadastro",
              "Último acesso",
              "Dias com acesso",
              "Eras",
              "Partidas",
              "Pontos (ranking)",
              "Acerto",
              "Zeradas na final",
            ]}
          >
            {rel.jogadores.map((j) => (
              <tr key={j.id} className="border-t border-slate-100">
                <td className="py-2 pr-3">
                  <Link
                    href={`/professor/publico/jogador/${j.id}`}
                    className="flex items-center gap-2 font-medium text-marca-800 hover:underline"
                  >
                    <Avatar avatar={j.avatar} cor={j.cor} tamanho={28} />
                    {j.apelido}
                  </Link>
                </td>
                <Num>{formatarData(diaBrasilia(j.criadoEm))}</Num>
                <Num>
                  {!j.ultimoAcesso
                    ? "—"
                    : j.ultimoAcesso.length === 10
                      ? formatarData(j.ultimoAcesso)
                      : formatarDataHora(j.ultimoAcesso)}
                </Num>
                <Num>{j.diasAtivos}</Num>
                <Num>{j.eras}</Num>
                <Num>{j.partidas}</Num>
                <Num forte>{formatarPontos(j.pontosRanking)}</Num>
                <Num>{pct(j.acertoMedio)}</Num>
                <Num>{j.zeradasFinal}</Num>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>

      {/* 6. Ranking */}
      <Cartao>
        <Subtitulo>Ranking do período{era ? ` · ${nomeEra(era)}` : ""}</Subtitulo>
        {rel.ranking.length === 0 ? (
          <Vazio>Nenhuma partida de ranking concluída no período.</Vazio>
        ) : (
          <ol className="divide-y divide-slate-100">
            {rel.ranking.slice(0, 20).map((l) => {
              const j = apelidoDe.get(l.jogadorId);
              return (
                <li key={l.jogadorId} className="flex items-center gap-3 py-2">
                  <span className="w-8 text-right font-bold text-slate-500 tabular-nums">{l.posicao}º</span>
                  <Avatar avatar={j?.avatar ?? 0} cor={j?.cor ?? 0} tamanho={30} />
                  <Link
                    href={`/professor/publico/jogador/${l.jogadorId}`}
                    className="flex-1 font-medium text-marca-800 hover:underline"
                  >
                    {j?.apelido ?? "?"}
                  </Link>
                  {!era && (
                    <span className="text-xs text-slate-500">
                      {l.eras} {l.eras === 1 ? "era" : "eras"}
                    </span>
                  )}
                  <span className="w-20 text-right font-bold text-marca-900 tabular-nums">
                    {formatarPontos(l.pontos)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Soma das partidas de ranking (a 1ª de cada era) concluídas no período. O ranking completo, sem filtro de data,
          é o que os jogadores veem em /jogar/ranking.
        </p>
      </Cartao>
    </div>
  );
}

function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            {cabecalho.map((c, i) => (
              <th key={c} className={`py-1 pr-3 font-medium ${i ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Num({ children, forte }: { children: ReactNode; forte?: boolean }) {
  return (
    <td className={`py-2 pr-3 text-right whitespace-nowrap tabular-nums ${forte ? "font-bold text-marca-900" : ""}`}>
      {children}
    </td>
  );
}

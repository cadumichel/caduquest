import type { Metadata } from "next";
import Link from "next/link";
import { corAcerto } from "@/components/PerfilAluno";
import { BotaoLink, Etiqueta, Vazio } from "@/components/ui";
import { exigirAluno } from "@/lib/aluno-sessao";
import { formatarData, formatarDataHora } from "@/lib/datas";
import type { ItemHistorico, ResumoHistorico, SituacaoGabarito } from "@/lib/historico";
import { historicoDoAluno } from "@/lib/historico-dados";
import { formatarNumeroAcertos, formatarPontos } from "@/lib/pontos";

export const metadata: Metadata = { title: "Meu histórico" };

const TEXTO_GABARITO: Record<SituacaoGabarito, { texto: string; cor: "verde" | "cinza" }> = {
  liberado: { texto: "Gabarito disponível", cor: "verde" },
  aguarda: { texto: "Gabarito quando o desafio fechar", cor: "cinza" },
  encerramento: { texto: "Gabarito no encerramento da temporada", cor: "cinza" },
  professor: { texto: "Gabarito quando o professor liberar", cor: "cinza" },
  nunca: { texto: "Sem gabarito", cor: "cinza" },
};

const pct = (r: { acertos: number; questoes: number }) => (r.questoes ? Math.round((r.acertos / r.questoes) * 100) : 0);

function Resumo({ resumo }: { resumo: ResumoHistorico }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
      {[
        { valor: String(resumo.feitos), rotulo: resumo.feitos === 1 ? "desafio feito" : "desafios feitos" },
        { valor: formatarPontos(resumo.pontos), rotulo: "pontos nos desafios" },
        {
          valor: formatarNumeroAcertos(resumo.acertos),
          rotulo: `acertos em ${resumo.questoes} ${resumo.questoes === 1 ? "questão" : "questões"}`,
        },
        { valor: resumo.questoes ? `${pct(resumo)}%` : "–", rotulo: "de acerto" },
      ].map((n) => (
        <div key={n.rotulo} className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
          <p className="text-xl font-extrabold tabular-nums">{n.valor}</p>
          <p className="text-[11px] leading-tight text-marca-100">{n.rotulo}</p>
        </div>
      ))}
    </div>
  );
}

function Linha({ item }: { item: ItemHistorico }) {
  const { desafio: d } = item;
  const acerto = item.total ? item.acertos / item.total : 0;
  const href = item.estado === "andamento" ? `/aluno/desafio/${d.id}` : `/aluno/desafio/${d.id}/resultado`;
  return (
    <li>
      <Link href={href} className="block rounded-2xl px-3 py-3 transition hover:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-marca-950">
              {d.tipo === "relampago" ? "⚡ " : d.especial ? "★ " : ""}
              {d.titulo}
            </p>
            <p className="text-xs text-slate-500">
              {formatarDataHora(d.abre_em)}
              {d.tipo === "relampago" ? " · em sala" : ""}
            </p>
          </div>
          {item.estado === "fez" ? (
            <div className="shrink-0 text-right">
              <p className="font-extrabold text-marca-700 tabular-nums">{formatarPontos(item.pontos)} pts</p>
              <p className="text-xs text-slate-600 tabular-nums">
                {formatarNumeroAcertos(item.acertos)} de {item.total} acertos
              </p>
            </div>
          ) : item.estado === "andamento" ? (
            <span className="shrink-0 whitespace-nowrap">
              <Etiqueta cor="azul">Em andamento</Etiqueta>
            </span>
          ) : (
            <span className="shrink-0 whitespace-nowrap">
              <Etiqueta cor="ambar">Não fez</Etiqueta>
            </span>
          )}
        </div>
        {item.estado === "fez" && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${corAcerto(acerto)}`}
              style={{ width: `${Math.max(3, Math.round(acerto * 100))}%` }}
            />
          </div>
        )}
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {item.estado === "andamento" ? (
            <span className="text-slate-500">Os pontos aparecem quando você terminar.</span>
          ) : (
            <>
              <Etiqueta cor={TEXTO_GABARITO[item.gabarito].cor}>{TEXTO_GABARITO[item.gabarito].texto}</Etiqueta>
              <span className="font-semibold text-marca-700">Ver detalhes ›</span>
            </>
          )}
        </p>
      </Link>
    </li>
  );
}

export default async function MeuHistorico() {
  const aluno = await exigirAluno();
  const { porTemporada, resumo } = await historicoDoAluno(aluno.id, aluno.turmaId);

  return (
    <div className="space-y-5">
      <Link href="/aluno/perfil" className="text-sm font-semibold text-marca-700 hover:underline">
        ‹ Voltar ao perfil
      </Link>
      <section className="rounded-3xl bg-gradient-to-br from-marca-800 via-marca-900 to-marca-950 p-6 text-white shadow-lg">
        <p className="text-xs font-bold tracking-widest text-ouro uppercase">Meu histórico</p>
        <h1 className="mt-1 text-2xl font-extrabold">Tudo o que você já jogou</h1>
        <p className="mt-1 mb-4 text-sm text-marca-100">
          Desafios, pontos e acertos de todas as temporadas da turma {aluno.turmaNome}.
        </p>
        <Resumo resumo={resumo} />
        {resumo.perdidos > 0 && (
          <p className="mt-3 text-xs text-marca-100">
            {resumo.perdidos} {resumo.perdidos === 1 ? "desafio fechou" : "desafios fecharam"} sem você fazer.
          </p>
        )}
      </section>

      {porTemporada.length === 0 && <Vazio>Você ainda não fez nenhum desafio. Quando fizer, ele aparece aqui.</Vazio>}

      {porTemporada.map(({ temporada, itens, resumo: r, ranking }) => (
        <section key={temporada.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 px-1">
            <div>
              <h2 className="font-extrabold text-marca-900">{temporada.nome}</h2>
              <p className="text-xs text-slate-500">
                {formatarData(temporada.inicio)} a {formatarData(temporada.data_prova)}
              </p>
            </div>
            {ranking.eu && (
              <div className="text-right">
                <p className="font-extrabold text-marca-700">
                  {ranking.eu.posicao}º <span className="text-xs font-semibold text-slate-500">de {ranking.total}</span>
                </p>
                <p className="text-xs text-slate-500">{formatarPontos(ranking.eu.pontos)} pts no ranking</p>
              </div>
            )}
          </div>
          <p className="mt-2 px-1 text-xs text-slate-600">
            {r.feitos} {r.feitos === 1 ? "desafio feito" : "desafios feitos"}
            {r.questoes ? ` · ${pct(r)}% de acerto` : ""}
            {ranking.eu && ranking.eu.bonus + ranking.eu.bonusTurma > 0
              ? ` · ranking inclui +${formatarPontos(ranking.eu.bonus + ranking.eu.bonusTurma)} de bônus`
              : ""}
          </p>
          <ul className="mt-2 divide-y divide-slate-100">
            {itens.map((item) => (
              <Linha key={item.desafio.id} item={item} />
            ))}
          </ul>
        </section>
      ))}

      <BotaoLink href="/aluno/perfil" variante="secundario">
        Voltar ao perfil
      </BotaoLink>
    </div>
  );
}

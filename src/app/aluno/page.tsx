import type { Metadata } from "next";
import Link from "next/link";
import { MuralRanking } from "@/components/MuralRanking";
import { BotaoLink, Cartao, Etiqueta, Vazio } from "@/components/ui";
import { exigirAluno } from "@/lib/aluno-sessao";
import { diasAte, formatarData, formatarDataHora } from "@/lib/datas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { rankingParaAluno } from "@/lib/ranking";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import { situacaoDesafio, type Desafio, type Tentativa } from "@/lib/tipos-banco";

export const metadata: Metadata = { title: "Mapa da temporada" };

export default async function MapaTemporada() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const temporada = await temporadaAtual(db, aluno.turmaId);

  if (!temporada) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Olá, {aluno.apelido}!</h1>
        <Vazio>Ainda não há uma temporada para a turma {aluno.turmaNome}. Aguarde o professor.</Vazio>
      </div>
    );
  }

  const [{ data: desafiosBrutos }, ranking, medalhas] = await Promise.all([
    db
      .from("desafios")
      .select("id, temporada_id, tipo, titulo, abre_em, fecha_em, pontos_por_acerto, desafio_questoes(count)")
      .eq("temporada_id", temporada.id)
      .order("abre_em"),
    rankingDaTemporada(db, temporada),
    medalhasDaTurma(db, aluno.turmaId),
  ]);
  const desafios = (desafiosBrutos ?? []) as (Desafio & { desafio_questoes: { count: number }[] })[];
  const { data: tentativasBrutas } = desafios.length
    ? await db
        .from("tentativas")
        .select("*")
        .eq("aluno_id", aluno.id)
        .in(
          "desafio_id",
          desafios.map((d) => d.id),
        )
    : { data: [] };
  const tentativas = new Map(((tentativasBrutas ?? []) as Tentativa[]).map((t) => [t.desafio_id, t]));
  const { top, eu, total } = rankingParaAluno(ranking, aluno.id);
  const faltam = diasAte(temporada.data_prova);

  // CaduRush aberto vem primeiro: é feito na hora, em sala.
  const abertos = desafios
    .filter((d) => situacaoDesafio(d) === "aberto")
    .sort((a, b) => Number(b.tipo === "relampago") - Number(a.tipo === "relampago"));
  const outros = desafios.filter((d) => situacaoDesafio(d) !== "aberto").reverse();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-marca-600 to-marca-900 p-6 text-white shadow-lg">
        <p className="text-sm text-marca-100">
          {aluno.turmaNome} · {aluno.escolaNome}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">{temporada.nome}</h1>
        {temporada.narrativa && <p className="mt-2 text-sm text-marca-100">{temporada.narrativa}</p>}
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-2xl font-bold">{eu?.pontos ?? 0}</p>
            <p className="text-xs text-marca-100">pontos</p>
          </div>
          <Link href="/aluno/ranking" className="rounded-2xl bg-white/10 p-3">
            <p className="text-2xl font-bold">{eu ? `${eu.posicao}º` : "–"}</p>
            <p className="text-xs text-marca-100">de {total}</p>
          </Link>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-2xl font-bold">{faltam >= 0 ? faltam : "✓"}</p>
            <p className="text-xs text-marca-100">{faltam >= 0 ? "dias até a prova" : "temporada encerrada"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
          <span className={`text-3xl ${eu?.sequencia ? "" : "opacity-40 grayscale"}`}>🔥</span>
          <div className="text-sm">
            <p className="font-bold">
              {eu?.sequencia
                ? `Ofensiva de ${eu.sequencia} ${eu.sequencia === 1 ? "semana" : "semanas seguidas"}`
                : "Comece sua ofensiva!"}
              {eu && eu.bonus > 0 && <span className="font-normal text-marca-100"> · +{eu.bonus} pts de bônus</span>}
            </p>
            <p className="text-xs text-marca-100">
              Termine todos os desafios da semana: +20 pts, e +25 a partir da 2ª semana seguida.
            </p>
          </div>
        </div>
      </section>

      <MuralRanking top={top} eu={eu} total={total} medalhas={medalhas} alunoId={aluno.id} />

      {temporada.capitulos.length > 0 && (
        <Cartao>
          <h2 className="mb-4 font-semibold">Trilha da temporada</h2>
          <ol className="relative ml-3 space-y-4 border-l-2 border-dashed border-marca-200 pl-6">
            {temporada.capitulos.map((cap, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full bg-marca-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                {cap}
              </li>
            ))}
            <li className="relative font-semibold text-marca-700">
              <span className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full bg-ouro text-xs">
                🏁
              </span>
              Prova · {formatarData(temporada.data_prova)}
            </li>
          </ol>
        </Cartao>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Desafios abertos</h2>
        {abertos.length === 0 && <Vazio>Nenhum desafio aberto agora.</Vazio>}
        {abertos.map((d) => {
          const t = tentativas.get(d.id);
          const concluido = Boolean(t && (t.concluida_em || t.indice_atual >= t.ordem.length));
          if (d.tipo === "relampago") {
            return (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-5 text-white shadow-lg"
              >
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase">⚡ CaduRush · em sala</p>
                  <p className="text-lg font-extrabold">{d.titulo}</p>
                  <p className="text-sm text-white/90">
                    Peso 3 · {d.pontos_por_acerto} pts por acerto · fecha {formatarDataHora(d.fecha_em)}
                  </p>
                </div>
                {concluido ? (
                  <BotaoLink href={`/aluno/desafio/${d.id}/resultado`} variante="secundario">
                    ✓ {Number(t!.pontos)} pts
                  </BotaoLink>
                ) : (
                  <Link
                    href={`/aluno/desafio/${d.id}`}
                    className="rounded-xl bg-white px-5 py-2.5 font-bold text-orange-700 shadow hover:bg-orange-50"
                  >
                    {t ? "Continuar" : "Entrar com o código"}
                  </Link>
                )}
              </div>
            );
          }
          return (
            <Cartao key={d.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{d.titulo}</p>
                <p className="text-sm text-slate-500">
                  {d.desafio_questoes[0]?.count ?? 0} questões · fecha {formatarDataHora(d.fecha_em)}
                </p>
              </div>
              {concluido ? (
                <BotaoLink href={`/aluno/desafio/${d.id}/resultado`} variante="secundario">
                  ✓ {Number(t!.pontos)} pts
                </BotaoLink>
              ) : (
                <BotaoLink href={`/aluno/desafio/${d.id}`}>{t ? "Continuar" : "Jogar"}</BotaoLink>
              )}
            </Cartao>
          );
        })}
      </section>

      {outros.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Outros desafios</h2>
          {outros.map((d) => {
            const situacao = situacaoDesafio(d);
            const t = tentativas.get(d.id);
            return (
              <Cartao key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">
                    {d.tipo === "relampago" && "⚡ "}
                    {d.titulo}
                  </p>
                  <p className="text-sm text-slate-500">
                    {situacao === "agendado"
                      ? `Abre ${formatarDataHora(d.abre_em)}`
                      : `Fechou ${formatarDataHora(d.fecha_em)}`}
                  </p>
                </div>
                {situacao === "agendado" ? (
                  <Etiqueta cor="azul">Em breve</Etiqueta>
                ) : t ? (
                  <BotaoLink href={`/aluno/desafio/${d.id}/resultado`} variante="secundario">
                    {Number(t.pontos)} pts · ver gabarito
                  </BotaoLink>
                ) : (
                  <Etiqueta>Não feito</Etiqueta>
                )}
              </Cartao>
            );
          })}
        </section>
      )}
    </div>
  );
}

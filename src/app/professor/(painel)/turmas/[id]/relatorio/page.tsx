import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { Vazio } from "@/components/ui";
import { alunosDeTeste } from "@/lib/aluno-teste";
import { consultaPorAluno, resumoConsulta, somarConsultas } from "@/lib/consulta";
import { formatarData, hojeEmBrasilia } from "@/lib/datas";
import { emPedacos, lerTudo } from "@/lib/paginar";
import { agruparPorTopico, SEM_CAPITULO, type RespostaPlano, type TopicoPlano } from "@/lib/plano-estudo";
import { formatarPontos } from "@/lib/pontos";
import { exigirProfessor } from "@/lib/professor";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import { situacaoDesafio, ultimoDiaComPontos, type Temporada } from "@/lib/tipos-banco";

export const metadata: Metadata = { title: "Relatório da turma" };

const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);
/** Com menos questões que isso, o percentual de um tema não diz muito. */
const QUESTOES_MINIMAS_DO_TEMA = 3;

/**
 * Relatório da turma para o conselho de classe: participação, acerto, temas
 * mais fracos e uma linha por aluno. Feito para imprimir ou salvar em PDF.
 */
export default async function RelatorioDaTurma({
  params,
  searchParams,
}: PageProps<"/professor/turmas/[id]/relatorio">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await exigirProfessor();
  const { data: turma } = await supabase
    .from("turmas")
    .select("id, nome, serie, escolas(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!turma) notFound();
  const escola = turma.escolas as unknown as { nome: string };

  const pedida =
    typeof sp.temporada === "string"
      ? ((await supabase.from("temporadas").select("*").eq("id", sp.temporada).eq("turma_id", id).maybeSingle())
          .data as Temporada | null)
      : null;
  const temporada = pedida ?? (await temporadaAtual(supabase, id));
  const voltar = `/professor/turmas/${id}?aba=temporada${pedida ? `&temporada=${pedida.id}` : ""}`;
  if (!temporada) {
    return (
      <div className="space-y-4">
        <Link href={voltar} className="text-sm text-marca-700">
          ← Turma {turma.nome}
        </Link>
        <Vazio>Esta turma ainda não tem temporada.</Vazio>
      </div>
    );
  }

  const [ranking, consultas, deTeste, { data: alunos }, { data: desafiosBrutos }] = await Promise.all([
    rankingDaTemporada(supabase, temporada),
    consultaPorAluno(supabase, { temporadaId: temporada.id }),
    alunosDeTeste(supabase, id),
    supabase.from("alunos").select("id, nome_real").eq("turma_id", id),
    supabase
      .from("desafios")
      .select(
        "id, abre_em, fecha_em, tentativas(id, aluno_id, concluida_em), desafio_questoes(questoes(id, capitulo, habilidades))",
      )
      .eq("temporada_id", temporada.id),
  ]);
  for (const alunoId of deTeste.keys()) consultas.delete(alunoId);
  const nomes = new Map((alunos ?? []).map((a) => [a.id as string, a.nome_real as string | null]));
  const desafios = (
    (desafiosBrutos ?? []) as unknown as {
      id: string;
      abre_em: string;
      fecha_em: string;
      tentativas: { id: string; aluno_id: string; concluida_em: string | null }[];
      desafio_questoes: { questoes: { id: string; capitulo: string | null; habilidades: string[] | null } | null }[];
    }[]
  ).filter((d) => situacaoDesafio(d) !== "agendado");

  // Por aluno: desafios terminados e começados.
  const terminados = new Map<string, number>();
  const comecados = new Map<string, number>();
  const tentativas: string[] = [];
  for (const d of desafios) {
    for (const t of d.tentativas) {
      if (deTeste.has(t.aluno_id)) continue;
      tentativas.push(t.id);
      comecados.set(t.aluno_id, (comecados.get(t.aluno_id) ?? 0) + 1);
      if (t.concluida_em) terminados.set(t.aluno_id, (terminados.get(t.aluno_id) ?? 0) + 1);
    }
  }
  const totalTerminados = [...terminados.values()].reduce((s, n) => s + n, 0);
  const participacao = ranking.length && desafios.length ? totalTerminados / (ranking.length * desafios.length) : null;
  const responderam = ranking.filter((l) => l.questoes > 0);
  const acertoMedio = responderam.length ? responderam.reduce((s, l) => s + l.acerto, 0) / responderam.length : null;
  const consultaTurma = resumoConsulta(somarConsultas(consultas.values()));

  // Acerto da turma por capítulo e por habilidade.
  const questoes = new Map(
    desafios.flatMap((d) =>
      d.desafio_questoes.flatMap((dq) => (dq.questoes ? [[dq.questoes.id, dq.questoes]] : [])),
    ) as [string, { id: string; capitulo: string | null; habilidades: string[] | null }][],
  );
  const respostas = (
    await Promise.all(
      emPedacos(tentativas).map((ids) =>
        lerTudo<{ questao_id: string; fracao: number }>((de, ate) =>
          supabase
            .from("respostas")
            .select("questao_id, fracao")
            .in("tentativa_id", ids)
            .not("fracao", "is", null)
            .order("id")
            .range(de, ate),
        ),
      ),
    )
  )
    .flat()
    .flatMap((r): RespostaPlano[] => {
      const q = questoes.get(r.questao_id);
      return q
        ? [
            {
              questaoId: r.questao_id,
              capitulo: q.capitulo,
              habilidades: q.habilidades ?? [],
              enunciado: "",
              fracao: Number(r.fracao),
            },
          ]
        : [];
    });
  const capitulos = agruparPorTopico(respostas, (r) => [r.capitulo?.trim() || SEM_CAPITULO]);
  const habilidades = agruparPorTopico(respostas, (r) => r.habilidades.map((h) => h.trim()).filter(Boolean)).filter(
    (h) => h.questoes >= QUESTOES_MINIMAS_DO_TEMA,
  );

  const linhas = [...ranking].sort((a, b) =>
    (nomes.get(a.alunoId) ?? a.apelido).localeCompare(nomes.get(b.alunoId) ?? b.apelido, "pt-BR"),
  );
  const observacao = (alunoId: string, questoesRespondidas: number) => {
    const obs: string[] = [];
    const feitos = terminados.get(alunoId) ?? 0;
    if (desafios.length && !comecados.get(alunoId)) obs.push("não fez nenhum desafio");
    else if (desafios.length && feitos < desafios.length / 2) obs.push("fez menos da metade dos desafios");
    const c = consultas.get(alunoId);
    if (c && resumoConsulta(c).faltaFixar) obs.push("acerta bem mais com consulta do que sem");
    if (questoesRespondidas === 0 && comecados.get(alunoId)) obs.push("começou e não respondeu");
    return obs.join("; ");
  };

  return (
    <div className="space-y-6 print:space-y-4 print:text-[11pt]">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={voltar} className="text-sm text-marca-700">
          ← Turma {turma.nome}
        </Link>
        <BotaoImprimir />
      </div>

      <header className="border-b border-slate-300 pb-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Relatório da turma {turma.nome} · História</h1>
        <p className="text-sm text-slate-600">
          {escola.nome}
          {turma.serie ? ` · ${turma.serie}` : ""} · {temporada.nome} ({formatarData(temporada.inicio)} a{" "}
          {formatarData(ultimoDiaComPontos(temporada))}) · emitido em {formatarData(hojeEmBrasilia())}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          CaduQuest: desafios semanais de revisão de História, feitos em sala e em casa. Os números abaixo vêm das
          respostas dos alunos nos {desafios.length} {desafios.length === 1 ? "desafio aplicado" : "desafios aplicados"}{" "}
          no período.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Alunos" valor={String(ranking.length)} />
        <Numero rotulo="Participação" valor={pct(participacao)} dica="desafios terminados sobre o total possível" />
        <Numero rotulo="Acerto médio" valor={pct(acertoMedio)} dica="média entre quem respondeu" />
        <Numero
          rotulo="Com × sem consulta"
          valor={
            consultaTurma.com !== null && consultaTurma.sem !== null
              ? `${consultaTurma.com}% × ${consultaTurma.sem}%`
              : "–"
          }
          dica="acerto podendo pesquisar × sem pesquisar"
        />
      </section>

      {(capitulos.length > 0 || habilidades.length > 0) && (
        <section className="grid gap-5 sm:grid-cols-2 print:grid-cols-2">
          <Temas titulo="Acerto por capítulo" temas={capitulos} />
          {habilidades.length > 0 && <Temas titulo="Acerto por habilidade" temas={habilidades} />}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900">Por aluno</h2>
        {!linhas.length ? (
          <Vazio>Sem alunos nesta turma.</Vazio>
        ) : (
          <table className="w-full border-collapse text-sm print:text-[10pt]">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-slate-600">
                <th className="py-1.5 pr-2">Aluno</th>
                <th className="py-1.5 pr-2 text-right">Desafios</th>
                <th className="py-1.5 pr-2 text-right">Acerto</th>
                <th className="py-1.5 pr-2 text-right">Pontos</th>
                <th className="py-1.5 pr-2 text-right">Posição</th>
                <th className="py-1.5">Observação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.alunoId} className="break-inside-avoid border-b border-slate-200 align-top">
                  <td className="py-1.5 pr-2">
                    <span className="font-medium text-slate-900">{nomes.get(l.alunoId) ?? l.apelido}</span>
                    {nomes.get(l.alunoId) && <span className="text-slate-500"> ({l.apelido})</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    {terminados.get(l.alunoId) ?? 0} de {desafios.length}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{l.questoes > 0 ? pct(l.acerto) : "–"}</td>
                  <td className="py-1.5 pr-2 text-right">{formatarPontos(l.pontos)}</td>
                  <td className="py-1.5 pr-2 text-right">{l.posicao}º</td>
                  <td className="py-1.5 text-slate-700">{observacao(l.alunoId, l.questoes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Numero({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="text-2xl font-extrabold text-slate-900">{valor}</p>
      {dica && <p className="text-[11px] leading-tight text-slate-500">{dica}</p>}
    </div>
  );
}

function Temas({ titulo, temas }: { titulo: string; temas: TopicoPlano[] }) {
  return (
    <div className="break-inside-avoid">
      <h2 className="mb-2 text-lg font-bold text-slate-900">{titulo}</h2>
      <ul className="space-y-1.5 text-sm">
        {temas.map((t) => (
          <li key={t.nome} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{t.nome}</span>
            <span className="h-2 w-24 rounded-full bg-slate-200 print:border print:border-slate-400">
              <span
                className={`block h-2 rounded-full ${t.situacao === "reforcar" ? "bg-red-500" : t.situacao === "rever" ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.max(Math.round(t.acerto * 100), 3)}%` }}
              />
            </span>
            <span className="w-10 text-right font-semibold">{pct(t.acerto)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-slate-500">Do mais fraco para o mais forte.</p>
    </div>
  );
}

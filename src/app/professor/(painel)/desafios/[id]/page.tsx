import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EscolhaPesquisa } from "@/components/EscolhaPesquisa";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormAcao } from "@/components/FormAcao";
import { Gabarito } from "@/components/Gabarito";
import { BotaoLink, Campo, Cartao, Entrada, Etiqueta, Subtitulo, Titulo } from "@/components/ui";
import { isoParaDataHoraLocal } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import type { Conteudo } from "@/lib/questoes/tipos";
import { NOME_TIPO } from "@/lib/questoes/tipos";
import { resultadosDoDesafio } from "@/lib/resultados-desafio";
import { marcaResultado, rotuloResultado, type Marca } from "@/lib/relatorio";
import { gabaritoLiberado, gabaritoLiberadoEm, situacaoDesafio, type Desafio, type Questao } from "@/lib/tipos-banco";
import { atualizarJanelaDesafio, excluirDesafio } from "../../actions";
import { ControlesDesafio } from "./ControlesDesafio";
import { PainelRelampago } from "./PainelRelampago";
import { formatarPontos } from "@/lib/pontos";

export const metadata: Metadata = { title: "Desafio" };

const COR_SITUACAO = { concluiu: "verde", "em andamento": "ambar", "não fez": "cinza" } as const;

const MARCA: Record<Marca, { simbolo: string; classe: string }> = {
  certa: { simbolo: "✓", classe: "bg-emerald-100 text-emerald-800" },
  errada: { simbolo: "✗", classe: "bg-red-100 text-red-700" },
  parcial: { simbolo: "½", classe: "bg-amber-100 text-amber-800" },
  vazia: { simbolo: "", classe: "" },
};

export default async function PaginaDesafioProfessor({ params }: PageProps<"/professor/desafios/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("desafios")
    .select("*, temporadas(id, nome, turma_id, turmas(nome)), desafio_questoes(posicao, questoes(*))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const desafio = data as Desafio & {
    temporadas: { id: string; nome: string; turma_id: string; turmas: { nome: string } };
    desafio_questoes: { posicao: number; questoes: Questao }[];
  };
  const questoes = [...desafio.desafio_questoes].sort((a, b) => a.posicao - b.posicao).map((dq) => dq.questoes);
  const { linhas, acertoPorQuestao } = await resultadosDoDesafio(supabase, id, desafio.temporadas.turma_id);
  const situacao = situacaoDesafio(desafio);
  const concluiram = linhas.filter((l) => l.situacao === "concluiu").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/professor/temporadas/${desafio.temporadas.id}`} className="text-sm text-marca-700">
          ← {desafio.temporadas.nome} · {desafio.temporadas.turmas.nome}
        </Link>
        <Titulo
          acao={
            <BotaoLink href={`/professor/desafios/${id}/csv`} variante="secundario" prefetch={false}>
              Exportar planilha (CSV)
            </BotaoLink>
          }
        >
          {desafio.tipo === "relampago" && "⚡ "}
          {desafio.titulo}{" "}
          <Etiqueta cor={situacao === "aberto" ? "verde" : situacao === "agendado" ? "azul" : "cinza"}>
            {situacao}
          </Etiqueta>
        </Titulo>
      </div>

      {desafio.tipo === "relampago" && desafio.codigo_dia && (
        <PainelRelampago
          id={id}
          codigo={desafio.codigo_dia}
          situacao={situacao}
          abreEm={desafio.abre_em}
          fechaEm={desafio.fecha_em}
          concluiram={concluiram}
          total={linhas.length}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Cartao className="overflow-x-auto">
          <Subtitulo>
            Alunos · {concluiram}/{linhas.length} concluíram
          </Subtitulo>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Aluno</th>
                <th className="py-2">Situação</th>
                <th className="py-2 text-right">Pontos</th>
                <th className="py-2 text-right">Acertos</th>
                <th className="py-2 text-right" title="Questões com tempo esgotado">
                  ⏱️
                </th>
                <th className="py-2 text-right" title="Vezes que saiu da tela durante o desafio">
                  Saídas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((l) => (
                <tr key={l.alunoId}>
                  <td className="py-1.5">
                    {l.apelido}
                    {l.nomeReal && <span className="text-slate-500"> · {l.nomeReal}</span>}
                  </td>
                  <td className="py-1.5">
                    <Etiqueta cor={COR_SITUACAO[l.situacao]}>{l.situacao}</Etiqueta>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatarPontos(l.pontos)}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {l.acertos}/{questoes.length}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{l.esgotadas || ""}</td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${desafio.saida_zera_questao && l.saidasTela > 3 ? "font-semibold text-amber-700" : ""}`}
                  >
                    {l.saidasTela || ""}
                    {l.zeradasPorSaida > 0 && (
                      <span className="block text-xs font-normal text-red-700">
                        {l.zeradasPorSaida} zerada{l.zeradasPorSaida > 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            {desafio.saida_zera_questao
              ? "Neste desafio, sair da tela zera a questão em que o aluno estava."
              : "Pesquisa liberada: as saídas da tela são só registradas e não tiram pontos."}
          </p>
        </Cartao>

        <div className="space-y-6">
          <Cartao>
            <ControlesDesafio
              id={id}
              relampago={desafio.tipo === "relampago"}
              situacao={situacao}
              fechaEm={desafio.fecha_em}
              manual={!!desafio.gabarito_manual}
              liberadoEm={desafio.gabarito_liberado_em ?? null}
              visivelEm={gabaritoLiberadoEm(desafio).toISOString()}
              visivel={gabaritoLiberado(desafio)}
            />
          </Cartao>
          <Cartao>
            <Subtitulo>Janela do desafio</Subtitulo>
            <p className="mb-3 text-sm text-slate-600">
              ⏱️{" "}
              {desafio.tempo_por_questao_s
                ? `${desafio.tempo_por_questao_s} s em todas as questões`
                : "Tempo de cada questão"}
              {" · "}
              {desafio.saida_zera_questao ? "🚫 pesquisa bloqueada" : "🔎 pesquisa liberada"}
            </p>
            <FormAcao acao={atualizarJanelaDesafio}>
              <input type="hidden" name="id" value={id} />
              <Campo rotulo="Título">
                <Entrada name="titulo" defaultValue={desafio.titulo} />
              </Campo>
              <Campo rotulo="Abre em">
                <Entrada type="datetime-local" name="abre_em" defaultValue={isoParaDataHoraLocal(desafio.abre_em)} />
              </Campo>
              <Campo rotulo="Fecha em">
                <Entrada type="datetime-local" name="fecha_em" defaultValue={isoParaDataHoraLocal(desafio.fecha_em)} />
              </Campo>
              <EscolhaPesquisa name="pesquisa" bloqueada={desafio.saida_zera_questao} />
              <BotaoEnviar>Salvar</BotaoEnviar>
            </FormAcao>
            <div className="mt-6 border-t border-slate-100 pt-4">
              <BotaoConfirmar
                acao={excluirDesafio.bind(null, id)}
                pergunta="Apagar este desafio? As tentativas e os pontos dos alunos nele também serão apagados."
              >
                Apagar desafio
              </BotaoConfirmar>
            </div>
          </Cartao>
        </div>
      </div>

      <Cartao className="overflow-x-auto">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Subtitulo>Desempenho por questão</Subtitulo>
          <span className="text-xs text-slate-500">
            ✓ acertou · ✗ errou · ½ acertou em parte · em branco: não chegou na questão
          </span>
        </div>
        {linhas.every((l) => l.situacao === "não fez") ? (
          <p className="text-sm text-slate-500">Ninguém fez o desafio ainda.</p>
        ) : (
          <table className="text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="sticky left-0 bg-white py-2 pr-3 text-left">Aluno</th>
                {questoes.map((q, i) => (
                  <th key={q.id} className="px-0.5 py-2 text-center font-medium" title={q.enunciado}>
                    {i + 1}
                  </th>
                ))}
                <th className="py-2 pl-3 text-right">Acertos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas
                .filter((l) => l.situacao !== "não fez")
                .map((l) => (
                  <tr key={l.alunoId}>
                    <td className="sticky left-0 bg-white py-1 pr-3 whitespace-nowrap">
                      {l.apelido}
                      {l.nomeReal && <span className="text-slate-500"> · {l.nomeReal}</span>}
                    </td>
                    {questoes.map((q, i) => {
                      const r = l.questoes.get(q.id);
                      const m = MARCA[marcaResultado(r)];
                      return (
                        <td key={q.id} className="px-0.5 py-1 text-center">
                          <span
                            className={`inline-flex size-7 items-center justify-center rounded-md font-semibold ${m.classe}`}
                            title={`Questão ${i + 1}: ${rotuloResultado(r)}`}
                          >
                            {m.simbolo}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-1 pl-3 text-right tabular-nums">
                      {l.acertos}/{questoes.length}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-slate-500">
          A numeração segue a lista de questões abaixo (cada aluno vê em ordem embaralhada). A planilha CSV traz o mesmo
          relatório; o da temporada inteira fica na página da temporada.
        </p>
      </Cartao>

      <section className="space-y-3">
        <Subtitulo>Questões ({questoes.length})</Subtitulo>
        {questoes.map((q, i) => {
          const acerto = acertoPorQuestao.get(q.id);
          return (
            <Cartao key={q.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/professor/questoes/${q.id}`} className="font-medium hover:text-marca-700">
                  {i + 1}. {q.enunciado}
                </Link>
                <div className="flex shrink-0 gap-1">
                  <Etiqueta cor="azul">{NOME_TIPO[q.tipo]}</Etiqueta>
                  {acerto !== undefined && acerto !== null && (
                    <Etiqueta cor={acerto >= 0.7 ? "verde" : acerto >= 0.4 ? "ambar" : "vermelho"}>
                      {Math.round(acerto * 100)}% de acerto
                    </Etiqueta>
                  )}
                </div>
              </div>
              <Gabarito conteudo={{ tipo: q.tipo, conteudo: q.conteudo } as Conteudo} />
            </Cartao>
          );
        })}
      </section>
    </div>
  );
}

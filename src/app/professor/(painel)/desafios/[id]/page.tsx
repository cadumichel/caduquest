import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { situacaoDesafio, type Desafio, type Questao } from "@/lib/tipos-banco";
import { atualizarJanelaDesafio, excluirDesafio } from "../../actions";

export const metadata: Metadata = { title: "Desafio" };

const COR_SITUACAO = { concluiu: "verde", "em andamento": "ambar", "não fez": "cinza" } as const;

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
          {desafio.titulo}{" "}
          <Etiqueta cor={situacao === "aberto" ? "verde" : situacao === "agendado" ? "azul" : "cinza"}>
            {situacao}
          </Etiqueta>
        </Titulo>
      </div>

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
                  <td className="py-1.5 text-right tabular-nums">{l.pontos}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {l.acertos}/{questoes.length}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{l.esgotadas || ""}</td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${l.saidasTela > 3 ? "font-semibold text-amber-700" : ""}`}
                  >
                    {l.saidasTela || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            Mais de 3 saídas da tela aparecem em destaque. É só um alerta: o app não tira pontos sozinho.
          </p>
        </Cartao>

        <Cartao>
          <Subtitulo>Janela do desafio</Subtitulo>
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

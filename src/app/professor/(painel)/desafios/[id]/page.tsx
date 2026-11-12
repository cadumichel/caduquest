import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Abas, abaAtual, Numero } from "@/components/Abas";
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
import { EspecialDesafio } from "./EspecialDesafio";
import { descreverEspecial, percentualEmVigor, pontosBase } from "@/lib/especial";
import { padroesDoProfessor } from "@/lib/padroes";
import { PainelRelampago } from "./PainelRelampago";
import { TemposDesafio, type QuestaoComTempo } from "./TemposDesafio";
import { RegrasDesafio } from "./RegrasDesafio";
import { descreverRegraCliques, descreverRegraSaidas } from "@/lib/tela-protegida";
import { verificacoesAutomaticas } from "@/lib/questoes/verificacao";
import { regrasDoDesafio } from "@/lib/questoes/regras-desafio";
import { tempoVerificacao } from "@/lib/questoes/tempos";
import { formatarPontos } from "@/lib/pontos";

export const metadata: Metadata = { title: "Desafio" };

const COR_SITUACAO = { concluiu: "verde", "em andamento": "ambar", "não fez": "cinza" } as const;

const MARCA: Record<Marca, { simbolo: string; classe: string }> = {
  certa: { simbolo: "✓", classe: "bg-emerald-100 text-emerald-800" },
  errada: { simbolo: "✗", classe: "bg-red-100 text-red-700" },
  parcial: { simbolo: "½", classe: "bg-amber-100 text-amber-800" },
  vazia: { simbolo: "", classe: "" },
};

const ABAS = ["resultado", "questoes", "ajustes"] as const;

export default async function PaginaDesafioProfessor({ params, searchParams }: PageProps<"/professor/desafios/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const aba = abaAtual(sp.aba, ABAS);
  // Questão escolhida na tabela (?q=3): a lista abaixo abre o gabarito dela.
  const questaoAberta = typeof sp.q === "string" ? Number(sp.q) : null;
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("desafios")
    // "*" em desafio_questoes traz o tempo de cada questão, quando o SQL dos tempos já rodou.
    .select("*, temporadas(id, nome, turma_id, turmas(nome)), desafio_questoes(*, questoes(*))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const desafio = data as Desafio & {
    temporadas: { id: string; nome: string; turma_id: string; turmas: { nome: string } };
    desafio_questoes: { posicao: number; tempo_limite_s?: number | null; questoes: Questao }[];
  };
  const ordenadas = [...desafio.desafio_questoes].sort((a, b) => a.posicao - b.posicao);
  const questoes = ordenadas.map((dq) => dq.questoes);
  const comTempo: QuestaoComTempo[] = ordenadas.map((dq) => ({
    id: dq.questoes.id,
    enunciado: dq.questoes.enunciado,
    relampago: Boolean(dq.questoes.relampago),
    tempoQuestao: dq.questoes.tempo_limite_s,
    tempoNoDesafio: dq.tempo_limite_s ?? null,
  }));
  const temposPersonalizados = comTempo.filter((q) => q.tempoNoDesafio !== null).length;
  const { linhas, acertoPorQuestao } = await resultadosDoDesafio(supabase, id, desafio.temporadas.turma_id);
  const situacao = situacaoDesafio(desafio);
  const concluiram = linhas.filter((l) => l.situacao === "concluiu").length;
  const comecaram = linhas.filter((l) => l.situacao !== "não fez").length;
  const padroes = await padroesDoProfessor(supabase);
  const verificacoes = desafio.verificacoes ?? null;
  const textoVerificacoes =
    verificacoes === 0
      ? "sem questões teste"
      : `${verificacoes ?? verificacoesAutomaticas(questoes.length)} ${verificacoes === 1 ? "questão teste" : "questões teste"}${verificacoes === null ? " (automático)" : ""}`;

  const feitas = linhas.filter((l) => l.situacao !== "não fez");
  const mediaAcerto =
    feitas.length && questoes.length
      ? Math.round((feitas.reduce((s, l) => s + l.acertos, 0) / (feitas.length * questoes.length)) * 100)
      : null;
  const alertasDe = (l: (typeof linhas)[number]) => l.zeradasPorSaida + l.verificacoesErradas;
  const comAlerta = linhas.filter((l) => alertasDe(l) > 0).length;
  // Aba Questões: em ordem numérica (a da montagem), igual à tabela.
  const listaQuestoes = questoes.map((q, i) => ({ q, numero: i + 1, acerto: acertoPorQuestao.get(q.id) ?? null }));
  const url = (a: (typeof ABAS)[number]) => `/professor/desafios/${id}?aba=${a}`;
  const linkQuestao = (numero: number) => `${url("questoes")}&q=${numero}#questao-${numero}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/professor/turmas/${desafio.temporadas.turma_id}?temporada=${desafio.temporadas.id}`}
          className="text-sm text-marca-700"
        >
          ← {desafio.temporadas.nome} · {desafio.temporadas.turmas.nome}
        </Link>
        <Titulo>
          {desafio.especial && <span className="text-ouro-escuro">★ </span>}
          {desafio.titulo}{" "}
          <Etiqueta cor={situacao === "aberto" ? "verde" : situacao === "agendado" ? "azul" : "cinza"}>
            {situacao}
          </Etiqueta>
        </Titulo>
        {desafio.especial && (
          <p className="-mt-3 text-sm font-semibold text-amber-800">
            Desafio especial · {descreverEspecial(desafio)}
            {desafio.tipo === "relampago" && " · só em sala, com código do dia"}
          </p>
        )}
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

      <Abas
        atual={aba}
        abas={[
          { id: "resultado", rotulo: "Resultado", href: url("resultado") },
          { id: "questoes", rotulo: `Questões (${questoes.length})`, href: url("questoes") },
          { id: "ajustes", rotulo: "Ajustes", href: url("ajustes") },
        ]}
      />

      {aba === "resultado" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Numero valor={`${concluiram}/${linhas.length}`} rotulo="concluíram" />
            <Numero valor={mediaAcerto === null ? "–" : `${mediaAcerto}%`} rotulo="acerto médio de quem fez" />
            <Numero valor={String(comAlerta)} rotulo="alunos com alerta" destaque={comAlerta > 0} />
          </div>
          <Cartao className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">Aluno</th>
                  <th className="py-2">Situação</th>
                  <th className="py-2 text-right">Pontos</th>
                  <th className="py-2 text-right">Acertos</th>
                  <th
                    className="py-2 text-right"
                    title="Questões zeradas pelas regras do desafio e questões teste erradas"
                  >
                    Alertas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.map((l) => {
                  const alertas = alertasDe(l);
                  const temDetalhe = alertas > 0 || l.saidasTela > 0 || l.esgotadas > 0 || l.verificacoes > 0;
                  return (
                    <tr key={l.alunoId} className="align-top">
                      <td className="py-1.5">
                        <Link href={`/professor/alunos/${l.alunoId}`} className="hover:text-marca-700">
                          {l.apelido}
                          {l.nomeReal && <span className="text-slate-500"> · {l.nomeReal}</span>}
                        </Link>
                        {l.situacao !== "não fez" && (
                          <Link
                            href={`/professor/desafios/${id}/alunos/${l.alunoId}`}
                            className="ml-2 text-xs whitespace-nowrap text-marca-700"
                          >
                            ver respostas
                          </Link>
                        )}
                      </td>
                      <td className="py-1.5">
                        <Etiqueta cor={COR_SITUACAO[l.situacao]}>{l.situacao}</Etiqueta>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{formatarPontos(l.pontos)}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {l.acertos}/{questoes.length}
                      </td>
                      <td className="py-1.5 text-right">
                        {temDetalhe && (
                          <details className="inline-block text-left">
                            <summary
                              className={`cursor-pointer list-none rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${
                                alertas ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {alertas || "0"}
                            </summary>
                            <ul className="mt-1 space-y-0.5 text-xs whitespace-nowrap text-slate-600">
                              {l.zeradasTeclado > 0 && (
                                <li className="text-red-700">{l.zeradasTeclado} zerada(s) por tecla</li>
                              )}
                              {l.zeradasClique > 0 && (
                                <li className="text-red-700">{l.zeradasClique} zerada(s) por clique fora</li>
                              )}
                              {l.zeradasSemMouse > 0 && (
                                <li className="text-red-700">{l.zeradasSemMouse} zerada(s) sem mexer o mouse</li>
                              )}
                              {l.zeradasTela > 0 && (
                                <li className="text-red-700">{l.zeradasTela} zerada(s) por extensão</li>
                              )}
                              {l.zeradasPorSaida -
                                l.zeradasTeclado -
                                l.zeradasClique -
                                l.zeradasSemMouse -
                                l.zeradasTela >
                                0 && (
                                <li className="text-red-700">
                                  {l.zeradasPorSaida -
                                    l.zeradasTeclado -
                                    l.zeradasClique -
                                    l.zeradasSemMouse -
                                    l.zeradasTela}{" "}
                                  zerada(s) por sair da tela
                                </li>
                              )}
                              {l.verificacoes > 0 && (
                                <li className={l.verificacoesErradas ? "text-red-700" : ""}>
                                  {l.verificacoesErradas} de {l.verificacoes} questões teste erradas
                                </li>
                              )}
                              {l.saidasTela > 0 && <li>saiu da tela {l.saidasTela}×</li>}
                              {l.esgotadas > 0 && <li>{l.esgotadas} com tempo esgotado</li>}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">
              {desafio.saida_zera_questao
                ? "Pesquisa bloqueada: extensão que mexe na tela zera a questão em que o aluno estava."
                : "Pesquisa liberada: as saídas da tela são só registradas e não tiram pontos."}{" "}
              {desafio.saida_zera_questao &&
                `Regras do sem consulta: ${descreverRegraSaidas(desafio)}; ${descreverRegraCliques(desafio)}${desafio.teclado_bloqueado === false ? "; teclado liberado" : ""}. `}
              {verificacoes === 0
                ? "📖 Sem questões teste neste desafio."
                : `📖 ${textoVerificacoes}: depois de responder, o aluno marca o tema da questão; errar zera a questão.`}
            </p>
          </Cartao>
        </div>
      )}

      {aba === "questoes" && (
        <div className="space-y-5">
          <Cartao className="overflow-x-auto">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Subtitulo>Desempenho por questão</Subtitulo>
              <span className="text-xs text-slate-500">
                ✓ acertou · ✗ errou · ½ acertou em parte · em branco: não chegou na questão. Clique no número para ver a
                questão e no aluno para ver as respostas dele.
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
                      <th key={q.id} className="px-0.5 py-2 text-center font-medium">
                        <Link
                          href={linkQuestao(i + 1)}
                          title={`${i + 1}. ${q.enunciado}`}
                          className={`inline-flex size-7 items-center justify-center rounded-md underline decoration-dotted underline-offset-4 hover:bg-marca-50 hover:text-marca-700 ${
                            questaoAberta === i + 1 ? "bg-marca-100 text-marca-800" : "text-marca-700"
                          }`}
                        >
                          {i + 1}
                        </Link>
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
                          <Link href={`/professor/desafios/${id}/alunos/${l.alunoId}`} className="hover:text-marca-700">
                            {l.apelido}
                            {l.nomeReal && <span className="text-slate-500"> · {l.nomeReal}</span>}
                          </Link>
                        </td>
                        {questoes.map((q, i) => {
                          const r = l.questoes.get(q.id);
                          const m = MARCA[marcaResultado(r)];
                          return (
                            <td key={q.id} className="px-0.5 py-1 text-center">
                              <Link
                                href={linkQuestao(i + 1)}
                                className={`inline-flex size-7 items-center justify-center rounded-md font-semibold hover:ring-2 hover:ring-marca-300 ${m.classe}`}
                                title={`Questão ${i + 1}: ${rotuloResultado(r)}. Clique para ver a questão.`}
                              >
                                {m.simbolo}
                              </Link>
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
              A numeração é a da montagem do desafio (cada aluno vê em ordem embaralhada). Abaixo, as questões na mesma
              ordem, com o gabarito.
            </p>
          </Cartao>

          <section className="space-y-3">
            {listaQuestoes.map(({ q, numero, acerto }) => (
              <Cartao
                key={q.id}
                id={`questao-${numero}`}
                className={`scroll-mt-4 space-y-2 ${questaoAberta === numero ? "ring-2 ring-marca-400" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/professor/questoes/${q.id}`} className="font-medium hover:text-marca-700">
                    {numero}. {q.enunciado}
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <Etiqueta cor="azul">{NOME_TIPO[q.tipo]}</Etiqueta>
                    {acerto !== null && (
                      <Etiqueta cor={acerto >= 0.7 ? "verde" : acerto >= 0.4 ? "ambar" : "vermelho"}>
                        {Math.round(acerto * 100)}% de acerto
                      </Etiqueta>
                    )}
                  </div>
                </div>
                <details open={questaoAberta === numero}>
                  <summary className="cursor-pointer text-sm text-marca-700">Ver gabarito</summary>
                  <div className="mt-2">
                    <Gabarito conteudo={{ tipo: q.tipo, conteudo: q.conteudo } as Conteudo} />
                  </div>
                </details>
              </Cartao>
            ))}
          </section>
        </div>
      )}

      {aba === "ajustes" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Cartao className="border-amber-200 lg:col-span-2">
            <EspecialDesafio
              id={id}
              especial={Boolean(desafio.especial)}
              multiplicador={desafio.multiplicador ?? null}
              percentual={desafio.tempo_percentual ?? null}
              pontosBase={pontosBase(desafio)}
              jaComecaram={comecaram}
              padraoMultiplicador={padroes.especial_multiplicador}
              padraoPercentual={padroes.especial_tempo_percentual}
            />
          </Cartao>
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
              {temposPersonalizados > 0 && ` (${temposPersonalizados} com tempo próprio)`}
              {" · "}📖 {textoVerificacoes}
              {verificacoes !== 0 && ` de ${tempoVerificacao(desafio)} s`}
              {" · "}
              {desafio.saida_zera_questao
                ? `🚫 pesquisa bloqueada (${descreverRegraSaidas(desafio)}; ${descreverRegraCliques(desafio)})`
                : "🔎 pesquisa liberada"}
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
          </Cartao>
          <Cartao className="lg:col-span-2">
            <RegrasDesafio
              id={id}
              regras={regrasDoDesafio(desafio)}
              pesquisaBloqueada={desafio.saida_zera_questao}
              totalQuestoes={questoes.length}
              jaComecaram={comecaram}
            />
          </Cartao>
          <Cartao className="lg:col-span-2">
            <TemposDesafio
              id={id}
              percentual={percentualEmVigor(desafio)}
              todas={desafio.tempo_por_questao_s}
              verificacao={desafio.tempo_verificacao_s ?? null}
              questoes={comTempo}
            />
          </Cartao>
          <Cartao className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
            <BotaoLink href={`/professor/desafios/${id}/csv`} variante="secundario" prefetch={false}>
              Exportar planilha (CSV)
            </BotaoLink>
            <BotaoConfirmar
              acao={excluirDesafio.bind(null, id)}
              pergunta="Apagar este desafio? As tentativas e os pontos dos alunos nele também serão apagados."
            >
              Apagar desafio
            </BotaoConfirmar>
          </Cartao>
        </div>
      )}
    </div>
  );
}

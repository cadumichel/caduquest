import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Abas, abaAtual } from "@/components/Abas";
import { Avatar } from "@/components/Avatar";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { ExcluirComConfirmacao } from "@/components/ExcluirComConfirmacao";
import { FormAcao } from "@/components/FormAcao";
import { TabelaRanking } from "@/components/TabelaRanking";
import {
  AreaTexto,
  Botao,
  BotaoLink,
  Campo,
  Cartao,
  Entrada,
  Etiqueta,
  Subtitulo,
  Titulo,
  Vazio,
} from "@/components/ui";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { exigirProfessor } from "@/lib/professor";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import { faseDaTemporada as fase, situacaoDesafio, ultimoDiaComPontos } from "@/lib/tipos-banco";
import type { Aluno, Desafio, Temporada } from "@/lib/tipos-banco";
import { cartasParaAProxima } from "@/lib/carta-coringa";
import {
  apagarCarta,
  aprovarCarta,
  recusarCarta,
  alternarAprovacao,
  alternarTeclado,
  aprovarAluno,
  aprovarTodos,
  atualizarAluno,
  atualizarTemporada,
  criarTemporada,
  encerrarTemporada,
  excluirTurma,
  novoCodigoTurma,
  reabrirTemporada,
  redefinirPin,
  removerAluno,
} from "../../actions";

export const metadata: Metadata = { title: "Turma" };

const ABAS = ["temporada", "alunos", "temporadas", "ajustes"] as const;
const COR_SITUACAO = { agendado: "azul", aberto: "verde", encerrado: "cinza" } as const;

type DesafioLista = Desafio & {
  desafio_questoes: { count: number }[];
  tentativas: { concluida_em: string | null }[];
};

export default async function PaginaTurma({ params, searchParams }: PageProps<"/professor/turmas/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const aba = abaAtual(sp.aba, ABAS);
  const { supabase } = await exigirProfessor();
  const { data: turma, error } = await supabase
    .from("turmas")
    .select("id, nome, serie, codigo, exige_aprovacao, escolas(nome, periodo)")
    .eq("id", id)
    .maybeSingle();
  // Erro de banco (ex.: migração não aplicada) não pode virar "página não encontrada".
  if (error) throw new Error(`Falha ao carregar a turma: ${error.message}`);
  if (!turma) notFound();
  const escola = turma.escolas as unknown as { nome: string; periodo: string };

  const [{ data: alunosBrutos }, { data: temporadasBrutas }, atual, medalhas, cartas] = await Promise.all([
    supabase
      .from("alunos")
      .select(
        "id, turma_id, apelido, nome_real, pin_hash, avatar, cor, aprovado, ultimo_acesso, total_acessos, criado_em, teclado_liberado",
      )
      .eq("turma_id", id)
      .order("apelido"),
    supabase.from("temporadas").select("*").eq("turma_id", id).order("inicio", { ascending: false }),
    temporadaAtual(supabase, id),
    medalhasDaTurma(supabase, id),
    cartasParaAProxima(supabase, id, { todas: true }),
  ]);
  const todos = (alunosBrutos ?? []) as Aluno[];
  const alunos = todos.filter((a) => a.aprovado);
  const pendentes = todos.filter((a) => !a.aprovado);
  const temporadas = (temporadasBrutas ?? []) as Temporada[];
  const hoje = hojeEmBrasilia();
  const nomes = new Map(alunos.map((a) => [a.id, a.nome_real]));
  const cartasPendentes = cartas.filter((c) => c.status === "pendente").length;

  // Temporada mostrada na primeira aba: a pedida na URL, senão a atual.
  const pedida = typeof sp.temporada === "string" ? temporadas.find((t) => t.id === sp.temporada) : undefined;
  const temporada = pedida ?? temporadas.find((t) => t.id === atual?.id) ?? temporadas[0] ?? null;

  const url = (a: (typeof ABAS)[number], extra = "") => `/professor/turmas/${id}?aba=${a}${extra}`;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/professor/turmas" className="text-sm text-marca-700">
          ← Turmas
        </Link>
        <Titulo
          acao={
            <div className="text-right">
              <p className="text-xs text-slate-500">Código de acesso</p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-marca-700">{turma.codigo}</p>
            </div>
          }
        >
          Turma {turma.nome}{" "}
          <span className="text-base font-normal text-slate-500">
            · {turma.serie ?? ""} {escola.nome}
          </span>
        </Titulo>
      </div>

      <Abas
        atual={aba}
        abas={[
          { id: "temporada", rotulo: temporada ? temporada.nome : "Temporada", href: url("temporada") },
          { id: "alunos", rotulo: `Alunos (${alunos.length})`, href: url("alunos"), contagem: pendentes.length },
          { id: "temporadas", rotulo: "Temporadas", href: url("temporadas"), contagem: cartasPendentes },
          { id: "ajustes", rotulo: "Ajustes", href: url("ajustes") },
        ]}
      />

      {aba === "temporada" && (
        <AbaTemporada
          temporada={temporada}
          ehAtual={temporada?.id === atual?.id}
          totalAlunos={alunos.length}
          nomes={nomes}
          medalhas={medalhas}
          linkNova={url("temporadas")}
        />
      )}

      {aba === "alunos" && (
        <div className="space-y-5">
          {pendentes.length > 0 && (
            <Cartao className="border-amber-300 bg-amber-50">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Subtitulo>Aguardando aprovação ({pendentes.length})</Subtitulo>
                {pendentes.length > 1 && (
                  <form action={aprovarTodos.bind(null, id)}>
                    <Botao>Aprovar todos</Botao>
                  </form>
                )}
              </div>
              <ul className="divide-y divide-amber-200">
                {pendentes.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Avatar avatar={a.avatar} cor={a.cor} tamanho={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {a.nome_real ?? "Sem nome informado"}{" "}
                        <span className="font-normal text-slate-600">· {a.apelido}</span>
                      </p>
                      <p className="text-xs text-slate-500">Cadastro em {formatarDataHora(a.criado_em)}</p>
                    </div>
                    <form action={aprovarAluno.bind(null, a.id)}>
                      <Botao>Aprovar</Botao>
                    </form>
                    <BotaoConfirmar
                      acao={removerAluno.bind(null, a.id)}
                      pergunta={`Recusar o cadastro de ${a.apelido}? O cadastro será apagado.`}
                    >
                      Recusar
                    </BotaoConfirmar>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}

          <Cartao>
            {!alunos.length && <Vazio>Nenhum aluno entrou ainda. Passe o código {turma.codigo} para a turma.</Vazio>}
            <ul className="divide-y divide-slate-100">
              {alunos.map((a) => (
                <li key={a.id} className="relative py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar avatar={a.avatar} cor={a.cor} medalhas={medalhas.get(a.id) ?? 0} tamanho={32} />
                    <Link href={`/professor/alunos/${a.id}`} className="min-w-0 flex-1 hover:text-marca-700">
                      <span className="font-semibold">{a.apelido}</span>
                      {a.nome_real && <span className="text-slate-500"> · {a.nome_real}</span>}
                    </Link>
                    {a.pin_hash === null && <Etiqueta cor="ambar">PIN redefinido</Etiqueta>}
                    {a.teclado_liberado && <Etiqueta cor="azul">teclado liberado</Etiqueta>}
                    <details className="group">
                      <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-sm font-medium text-marca-700 hover:bg-marca-50">
                        Gerenciar
                      </summary>
                      <div className="absolute right-4 left-4 z-10 mt-2 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:left-auto sm:w-[28rem]">
                        <form action={atualizarAluno} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={a.id} />
                          <Campo rotulo="Apelido">
                            <Entrada name="apelido" defaultValue={a.apelido} className="w-36" maxLength={20} />
                          </Campo>
                          <Campo rotulo="Nome real (só você vê)">
                            <Entrada name="nome_real" defaultValue={a.nome_real ?? ""} className="w-48" />
                          </Campo>
                          <Botao variante="secundario">Salvar</Botao>
                        </form>
                        <p className="text-xs text-slate-500">
                          {a.ultimo_acesso
                            ? `Último acesso ${formatarDataHora(a.ultimo_acesso)}`
                            : "Sem acesso registrado"}{" "}
                          · {a.total_acessos} {a.total_acessos === 1 ? "acesso" : "acessos"}
                        </p>
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          <form action={alternarTeclado.bind(null, a.id, !a.teclado_liberado)}>
                            <Botao
                              variante="fantasma"
                              title="Acessibilidade: com o teclado liberado, apertar uma tecla não zera a questão nos desafios sem consulta"
                            >
                              {a.teclado_liberado ? "Bloquear teclado" : "Liberar teclado"}
                            </Botao>
                          </form>
                          <BotaoConfirmar
                            acao={redefinirPin.bind(null, a.id)}
                            pergunta={`Redefinir o PIN de ${a.apelido}? No próximo acesso, o PIN digitado passa a valer.`}
                            variante="fantasma"
                          >
                            Redefinir PIN
                          </BotaoConfirmar>
                          <BotaoConfirmar
                            acao={removerAluno.bind(null, a.id)}
                            pergunta={`Remover ${a.apelido} da turma? Pontos e respostas serão apagados.`}
                          >
                            Remover
                          </BotaoConfirmar>
                        </div>
                      </div>
                    </details>
                  </div>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      )}

      {aba === "temporadas" && (
        <div className="space-y-5">
          {cartas.length > 0 && (
            <Cartao className="border-amber-300 bg-amber-50">
              <Subtitulo>Cartas coringa para a próxima prova</Subtitulo>
              <p className="mb-3 text-sm text-slate-600">
                Temas escolhidos pelos campeões da última temporada. Aprovado, o tema aparece para os alunos e vira uma
                questão da próxima prova.
              </p>
              <ul className="space-y-3">
                {cartas.map((c) => (
                  <li key={c.id} className="space-y-2 rounded-xl bg-white p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar avatar={c.avatar} cor={c.cor} tamanho={36} />
                      <p className="min-w-0 flex-1 text-xs text-slate-500">
                        {c.apelido} · {c.turmaNome} · campeão de {c.temporadaNome}
                      </p>
                      {c.status === "aprovada" ? (
                        <Etiqueta cor="verde">Aprovada · visível para os alunos</Etiqueta>
                      ) : c.status === "recusada" ? (
                        <Etiqueta cor="vermelho">Recusada</Etiqueta>
                      ) : (
                        <Etiqueta cor="ambar">Aguardando sua aprovação</Etiqueta>
                      )}
                    </div>
                    <form action={aprovarCarta.bind(null, c.id, id)} className="flex flex-wrap gap-2">
                      <Entrada name="tema" defaultValue={c.tema} maxLength={160} required className="min-w-0 flex-1" />
                      <Botao variante={c.status === "aprovada" ? "secundario" : "sucesso"}>
                        {c.status === "aprovada" ? "Salvar edição" : "Aprovar"}
                      </Botao>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {c.status !== "recusada" && (
                        <BotaoConfirmar
                          acao={recusarCarta.bind(null, c.id, id)}
                          pergunta={`Recusar o tema de ${c.apelido}? Ele some da tela dos alunos e o campeão pode escrever outro enquanto o prazo estiver aberto.`}
                        >
                          Recusar
                        </BotaoConfirmar>
                      )}
                      <BotaoConfirmar
                        acao={apagarCarta.bind(null, c.id, id)}
                        pergunta={`Apagar o tema escolhido por ${c.apelido}? O aluno poderá escolher outro enquanto o prazo estiver aberto.`}
                        variante="fantasma"
                      >
                        Apagar
                      </BotaoConfirmar>
                    </div>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}

          <Cartao>
            <Subtitulo>Temporadas</Subtitulo>
            {!temporadas.length && <Vazio>Nenhuma temporada ainda. Crie a primeira abaixo.</Vazio>}
            <ul className="mb-4 divide-y divide-slate-100">
              {temporadas.map((t) => (
                <li key={t.id}>
                  <Link
                    href={url("temporada", `&temporada=${t.id}`)}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-marca-700"
                  >
                    <span className="font-medium">{t.nome}</span>
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      {formatarData(t.inicio)} – {formatarData(t.data_prova)}
                      {fase(t) === "estudo" ? (
                        <Etiqueta cor="ambar">período de estudo</Etiqueta>
                      ) : fase(t) === "encerrada" ? (
                        <Etiqueta>encerrada</Etiqueta>
                      ) : (
                        t.id === atual?.id && <Etiqueta cor="verde">atual</Etiqueta>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <details className="rounded-lg bg-slate-50 p-3" open={!temporadas.length}>
              <summary className="cursor-pointer text-sm font-medium text-marca-700">
                + Nova temporada ({escola.periodo})
              </summary>
              <FormAcao acao={criarTemporada} className="mt-3 space-y-3">
                <input type="hidden" name="turma_id" value={id} />
                <Campo rotulo="Nome">
                  <Entrada name="nome" placeholder="Expedição à Revolução Francesa" required />
                </Campo>
                <Campo rotulo="Narrativa (opcional)">
                  <AreaTexto name="narrativa" rows={2} />
                </Campo>
                <CamposDatasTemporada inicio={hoje} />
                <Campo rotulo="Capítulos cobertos" dica="Um por linha, na ordem da apostila.">
                  <AreaTexto name="capitulos" rows={3} />
                </Campo>
                <BotaoEnviar>Criar temporada</BotaoEnviar>
              </FormAcao>
            </details>
          </Cartao>
        </div>
      )}

      {aba === "ajustes" && (
        <div className="space-y-5">
          <Cartao className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Subtitulo>Código de acesso</Subtitulo>
              <p className="font-mono text-3xl font-bold tracking-[0.3em] text-marca-700">{turma.codigo}</p>
              <p className="text-xs text-slate-500">
                Os alunos entram em /entrar com este código, um apelido, o nome completo (só você vê) e um PIN de 4
                números.
              </p>
            </div>
            <BotaoConfirmar
              acao={novoCodigoTurma.bind(null, id)}
              pergunta="Gerar um novo código? O antigo deixa de funcionar para novos acessos."
              variante="secundario"
            >
              Gerar novo código
            </BotaoConfirmar>
          </Cartao>
          <Cartao className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Subtitulo>Novos cadastros</Subtitulo>
              <p className="text-sm text-slate-600">
                {turma.exige_aprovacao ? "Precisam da sua aprovação antes de jogar." : "Entram direto, sem aprovação."}
              </p>
            </div>
            <form action={alternarAprovacao.bind(null, id, !turma.exige_aprovacao)}>
              <Botao variante="secundario">
                {turma.exige_aprovacao ? "Liberar entrada direta" : "Exigir aprovação"}
              </Botao>
            </form>
          </Cartao>
          <ExcluirComConfirmacao acao={excluirTurma.bind(null, id)} nome={turma.nome} rotulo="Excluir turma">
            <p>
              Apaga a turma {turma.nome}, {todos.length} aluno(s) e {temporadas.length} temporada(s), com desafios,
              respostas, pontos e conquistas. As questões do banco continuam.
            </p>
          </ExcluirComConfirmacao>
        </div>
      )}
    </div>
  );
}

/** Primeira aba: a temporada atual (ou a escolhida), com desafios, ranking e ajustes recolhidos. */
async function AbaTemporada({
  temporada,
  ehAtual,
  totalAlunos,
  nomes,
  medalhas,
  linkNova,
}: {
  temporada: Temporada | null;
  ehAtual: boolean;
  totalAlunos: number;
  nomes: Map<string, string | null>;
  medalhas: Map<string, number>;
  linkNova: string;
}) {
  if (!temporada) {
    return (
      <Vazio>
        Nenhuma temporada ainda.{" "}
        <Link href={linkNova} className="font-semibold text-marca-700">
          Criar a primeira temporada
        </Link>
      </Vazio>
    );
  }
  const { supabase } = await exigirProfessor();
  const [{ data: desafiosBrutos }, ranking] = await Promise.all([
    supabase
      .from("desafios")
      .select("*, desafio_questoes(count), tentativas(concluida_em)")
      .eq("temporada_id", temporada.id)
      .order("abre_em", { ascending: false }),
    rankingDaTemporada(supabase, temporada),
  ]);
  const desafios = (desafiosBrutos ?? []) as DesafioLista[];
  const encerrada = !!temporada.encerrada_em;
  const faseAtual = fase(temporada);
  const temEncerramento = ultimoDiaComPontos(temporada) !== temporada.data_prova;
  const abertos = desafios.filter((d) => situacaoDesafio(d) === "aberto").length;
  const agendados = desafios.filter((d) => situacaoDesafio(d) === "agendado").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {formatarData(temporada.inicio)} a {formatarData(ultimoDiaComPontos(temporada))}
          {temEncerramento || encerrada ? " (pontos)" : " (prova)"}
          {(temEncerramento || encerrada) && <> · prova {formatarData(temporada.data_prova)}</>}{" "}
          {faseAtual === "estudo" ? (
            <Etiqueta cor="ambar">período de estudo</Etiqueta>
          ) : faseAtual === "encerrada" ? (
            <Etiqueta cor="cinza">encerrada</Etiqueta>
          ) : (
            ehAtual && (
              <>
                {" "}
                <Etiqueta cor="verde">atual</Etiqueta>
              </>
            )
          )}
        </p>
        {faseAtual === "pontos" && (
          <div className="flex flex-wrap gap-2">
            <BotaoLink href={`/professor/desafios/novo?temporada=${temporada.id}`}>+ Novo desafio</BotaoLink>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Cartao>
          <Subtitulo>Desafios</Subtitulo>
          {!desafios.length && <Vazio>Nenhum desafio ainda. Monte o primeiro com questões publicadas do banco.</Vazio>}
          <ul className="divide-y divide-slate-100">
            {desafios.map((d) => {
              const situacao = situacaoDesafio(d);
              const feitos = d.tentativas.filter((t) => t.concluida_em).length;
              return (
                <li key={d.id}>
                  <Link
                    href={`/professor/desafios/${d.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-marca-700"
                  >
                    <span>
                      <span className="font-medium">
                        {d.especial && <span className="text-ouro-escuro">★ </span>}
                        {d.titulo}
                      </span>
                      <span className="block text-sm text-slate-500">
                        {d.desafio_questoes[0]?.count ?? 0} questões · {formatarDataHora(d.abre_em)} →{" "}
                        {formatarDataHora(d.fecha_em)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">
                        {feitos}/{totalAlunos} concluíram
                      </span>
                      <Etiqueta cor={COR_SITUACAO[situacao]}>{situacao}</Etiqueta>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Cartao>

        <Cartao>
          <Subtitulo>Ranking</Subtitulo>
          <TabelaRanking ranking={ranking} nomes={nomes} medalhas={medalhas} />
        </Cartao>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-marca-700">
          Dados da temporada, relatório e encerramento
        </summary>
        <div className="mt-4 space-y-5">
          <BotaoLink href={`/professor/temporadas/${temporada.id}/csv`} variante="secundario" prefetch={false}>
            Relatório de desempenho (CSV)
          </BotaoLink>
          <FormAcao acao={atualizarTemporada}>
            <input type="hidden" name="id" value={temporada.id} />
            <Campo rotulo="Nome">
              <Entrada name="nome" defaultValue={temporada.nome} required />
            </Campo>
            <Campo rotulo="Narrativa">
              <AreaTexto name="narrativa" rows={2} defaultValue={temporada.narrativa ?? ""} />
            </Campo>
            <CamposDatasTemporada
              inicio={temporada.inicio}
              dataProva={temporada.data_prova}
              encerramento={temporada.encerramento ?? ""}
              gabaritoNoEncerramento={temporada.gabarito_no_encerramento !== false}
            />
            <Campo rotulo="Capítulos cobertos" dica="Um por linha. Aparecem como a trilha do mapa do aluno.">
              <AreaTexto name="capitulos" rows={4} defaultValue={temporada.capitulos.join("\n")} />
            </Campo>
            <BotaoEnviar>Salvar</BotaoEnviar>
          </FormAcao>
          <div className="border-t border-slate-100 pt-4">
            {faseAtual !== "pontos" && !encerrada ? (
              <p className="text-sm text-slate-600">
                A pontuação desta temporada terminou em {formatarData(ultimoDiaComPontos(temporada))}. Para reabrir,
                mude a data de encerramento acima.
              </p>
            ) : encerrada ? (
              <BotaoConfirmar
                acao={reabrirTemporada.bind(null, temporada.id)}
                pergunta="Reabrir a temporada? Os desafios encerrados continuam fechados; mude as datas dos que quiser reabrir."
                variante="secundario"
              >
                Reabrir temporada
              </BotaoConfirmar>
            ) : (
              <>
                <BotaoConfirmar
                  acao={encerrarTemporada.bind(null, temporada.id)}
                  pergunta={`Encerrar a temporada agora?${abertos ? ` ${abertos} desafio(s) aberto(s) fecham agora (quem estiver numa questão termina só ela).` : ""}${agendados ? ` ${agendados} desafio(s) que ainda não abriram serão apagados; as questões continuam no banco.` : ""} O ranking fica congelado.`}
                >
                  Encerrar temporada
                </BotaoConfirmar>
                <p className="mt-2 text-xs text-slate-500">
                  Fecha os desafios abertos agora e congela o ranking, sem esperar o encerramento. Até a prova os alunos
                  seguem estudando com o treino e a revisão de erros.
                </p>
              </>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

/**
 * Datas da temporada: início, encerramento (último dia que vale pontos) e prova.
 * Entre o encerramento e a prova os alunos estudam com treino e revisão de erros.
 */
function CamposDatasTemporada({
  inicio,
  dataProva = "",
  encerramento = "",
  gabaritoNoEncerramento = true,
}: {
  inicio: string;
  dataProva?: string;
  encerramento?: string;
  gabaritoNoEncerramento?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Início">
          <Entrada type="date" name="inicio" defaultValue={inicio} required />
        </Campo>
        <Campo rotulo="Encerramento" dica="Último dia que vale pontos. Vazio = dia da prova.">
          <Entrada type="date" name="encerramento" defaultValue={encerramento} />
        </Campo>
        <Campo rotulo="Data da prova">
          <Entrada type="date" name="data_prova" defaultValue={dataProva} required />
        </Campo>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="gabarito_no_encerramento"
          defaultChecked={gabaritoNoEncerramento}
          className="mt-1"
        />
        <span>
          Liberar o gabarito no encerramento
          <span className="block text-xs text-slate-500">
            Os desafios em que você guardou o gabarito para liberar depois mostram as respostas no encerramento, para os
            alunos estudarem até a prova com o treino e a revisão de erros. Os marcados &quot;nunca mostrar&quot;
            continuam escondidos.
          </span>
        </span>
      </label>
    </div>
  );
}

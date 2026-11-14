import { consultaPorAluno, DIFERENCA_RELEVANTE, resumoConsulta, somarConsultas } from "@/lib/consulta";
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
import { CodigoNoQuadro } from "@/components/CodigoNoQuadro";
import {
  AreaTexto,
  Botao,
  BotaoLink,
  Campo,
  Cartao,
  Entrada,
  Etiqueta,
  Selecao,
  Subtitulo,
  Titulo,
  Vazio,
} from "@/components/ui";
import { alunosDeTeste } from "@/lib/aluno-teste";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { exigirProfessor } from "@/lib/professor";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import { faseDaTemporada as fase, situacaoDesafio, ultimoDiaComPontos } from "@/lib/tipos-banco";
import { PedidosEntrada } from "../../PedidosEntrada";
import type { Aluno, Desafio, Temporada } from "@/lib/tipos-banco";
import { cartasParaAProxima } from "@/lib/carta-coringa";
import {
  apagarCarta,
  aprovarCarta,
  recusarCarta,
  alternarAprovacao,
  alternarTeclado,
  marcarDeTeste,
  verComoAluno,
  atualizarAluno,
  atualizarTemporada,
  criarTemporada,
  encerrarTemporada,
  excluirTurma,
  juntarTurmas,
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
  tentativas: { aluno_id: string; concluida_em: string | null }[];
};

type OutraTurma = { id: string; nome: string; serie: string | null; escolas: { nome: string } };

const RANKING_VISIVEL = 10;

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

  const [{ data: alunosBrutos }, { data: temporadasBrutas }, atual, medalhas, cartas, deTeste] = await Promise.all([
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
    alunosDeTeste(supabase, id),
  ]);
  // Para "Juntar com outra": as demais turmas, as de mesmo nome primeiro.
  const { data: outrasBrutas } =
    aba === "ajustes"
      ? await supabase.from("turmas").select("id, nome, serie, escolas(nome)").neq("id", id).order("nome")
      : { data: [] };
  const outrasTurmas = ((outrasBrutas ?? []) as unknown as OutraTurma[])
    .map((o) => ({ id: o.id, nome: o.nome, serie: o.serie, escola: o.escolas.nome }))
    .sort((a, b) => Number(b.nome === turma.nome) - Number(a.nome === turma.nome));
  const todos = ((alunosBrutos ?? []) as Aluno[]).map((a) => ({ ...a, de_teste: deTeste.has(a.id) }));
  const alunos = todos.filter((a) => a.aprovado);
  const pendentes = todos.filter((a) => !a.aprovado);
  const temporadas = (temporadasBrutas ?? []) as Temporada[];
  const hoje = hojeEmBrasilia();
  const nomes = new Map(alunos.map((a) => [a.id, a.nome_real]));
  // O aluno de teste aparece na lista, mas não entra nas contas.
  const alunosReais = alunos.filter((a) => !a.de_teste);
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
            <div className="flex flex-wrap items-stretch gap-2">
              <form action={verComoAluno.bind(null, id)}>
                <button
                  className="h-full rounded-xl border border-marca-200 bg-white px-3 py-2 text-left hover:border-marca-400 hover:bg-marca-50"
                  title="Abre o app como um aluno de teste desta turma. Ele não entra no ranking nem nas contas."
                >
                  <span className="block text-xs text-slate-500">Conferir o que a turma vê</span>
                  <span className="font-semibold text-marca-700">👀 Ver como aluno</span>
                </button>
              </form>
              <CodigoNoQuadro codigo={turma.codigo} turma={turma.nome} />
            </div>
          }
        >
          Turma {turma.nome}{" "}
          <span className="text-base font-normal text-slate-500">
            · {turma.serie ?? ""} {escola.nome}
          </span>
        </Titulo>
      </div>

      <PedidosEntrada pedidos={pendentes} mostrarTurma={false} />

      <Abas
        atual={aba}
        abas={[
          { id: "temporada", rotulo: temporada ? temporada.nome : "Temporada", href: url("temporada") },
          { id: "alunos", rotulo: `Alunos (${alunosReais.length})`, href: url("alunos"), contagem: pendentes.length },
          { id: "temporadas", rotulo: "Temporadas", href: url("temporadas"), contagem: cartasPendentes },
          { id: "ajustes", rotulo: "Ajustes", href: url("ajustes") },
        ]}
      />

      {aba === "temporada" && (
        <AbaTemporada
          temporada={temporada}
          ehAtual={temporada?.id === atual?.id}
          totalAlunos={alunosReais.length}
          deTeste={deTeste}
          nomes={nomes}
          medalhas={medalhas}
          linkNova={url("temporadas")}
        />
      )}

      {aba === "alunos" && (
        <div className="space-y-5">
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
                    {a.de_teste && <Etiqueta cor="cinza">teste · fora das contas</Etiqueta>}
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
                          <form action={marcarDeTeste.bind(null, a.id, !a.de_teste)}>
                            <Botao
                              variante="fantasma"
                              title="Aluno de teste não entra no ranking, na meta da turma nem nas contas do painel"
                            >
                              {a.de_teste ? "Voltar a contar como aluno" : "Marcar como aluno de teste"}
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
          {outrasTurmas.length > 0 && (
            <Cartao className="space-y-3">
              <div>
                <Subtitulo>Turma repetida? Juntar com outra</Subtitulo>
                <p className="text-sm text-slate-600">
                  Os {todos.length} aluno(s) e as {temporadas.length} temporada(s) daqui, com desafios, pontos e
                  respostas, passam para a turma escolhida, e a turma {turma.nome} deixa de existir. Nada é apagado:
                  apelido repetido ganha um número no fim. Os alunos daqui entram de novo com o código da outra turma.
                </p>
              </div>
              <FormAcao acao={juntarTurmas} className="space-y-3">
                <input type="hidden" name="origem" value={id} />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Campo rotulo="Turma que fica">
                    <Selecao name="destino" defaultValue="">
                      <option value="">Escolha a turma</option>
                      {outrasTurmas.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nome}
                          {o.serie ? ` · ${o.serie}` : ""} · {o.escola}
                        </option>
                      ))}
                    </Selecao>
                  </Campo>
                  <BotaoEnviar variante="secundario">Juntar turmas</BotaoEnviar>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="ciente" /> Entendi que a turma {turma.nome} deixa de existir e que isso
                  não dá para desfazer.
                </label>
              </FormAcao>
            </Cartao>
          )}
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
  deTeste,
  nomes,
  medalhas,
  linkNova,
}: {
  temporada: Temporada | null;
  ehAtual: boolean;
  totalAlunos: number;
  deTeste: Map<string, string>;
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
  const [{ data: desafiosBrutos }, ranking, consultas] = await Promise.all([
    supabase
      .from("desafios")
      .select("*, desafio_questoes(count), tentativas(aluno_id, concluida_em)")
      .eq("temporada_id", temporada.id)
      .order("abre_em", { ascending: false }),
    rankingDaTemporada(supabase, temporada),
    consultaPorAluno(supabase, { temporadaId: temporada.id }),
  ]);
  for (const alunoId of deTeste.keys()) consultas.delete(alunoId);
  const consultaTurma = resumoConsulta(somarConsultas(consultas.values()));
  const faltaFixar = ranking.filter((l) => {
    const c = consultas.get(l.alunoId);
    return c && resumoConsulta(c).faltaFixar;
  });
  const desafios = ((desafiosBrutos ?? []) as DesafioLista[]).map((d) => ({
    ...d,
    tentativas: d.tentativas.filter((t) => !deTeste.has(t.aluno_id)),
  }));
  const encerrada = !!temporada.encerrada_em;
  const faseAtual = fase(temporada);
  const temEncerramento = ultimoDiaComPontos(temporada) !== temporada.data_prova;
  const abertos = desafios.filter((d) => situacaoDesafio(d) === "aberto").length;
  const agendados = desafios.filter((d) => situacaoDesafio(d) === "agendado").length;
  // Resumo: participação nos desafios que já abriram, acerto médio, quem não fez nenhum e dias até a prova.
  const jaAbriram = desafios.filter((d) => situacaoDesafio(d) !== "agendado");
  const concluidas = jaAbriram.reduce((s, d) => s + d.tentativas.filter((t) => t.concluida_em).length, 0);
  const participacao =
    totalAlunos && jaAbriram.length ? Math.round((concluidas / (totalAlunos * jaAbriram.length)) * 100) : null;
  const responderam = ranking.filter((l) => l.questoes > 0);
  const acertoMedio = responderam.length
    ? Math.round((responderam.reduce((s, l) => s + l.acerto, 0) / responderam.length) * 100)
    : null;
  // Quem nem abriu um desafio e quem parou no meio de um que ainda está aberto pedem recados diferentes.
  const comTentativa = new Set(jaAbriram.flatMap((d) => d.tentativas.map((t) => t.aluno_id)));
  const pelaMetade = new Set(
    jaAbriram
      .filter((d) => situacaoDesafio(d) === "aberto")
      .flatMap((d) => d.tentativas.filter((t) => !t.concluida_em).map((t) => t.aluno_id)),
  );
  const naoComecaram = jaAbriram.length ? ranking.filter((l) => !comTentativa.has(l.alunoId)) : [];
  const pararam = ranking.filter((l) => pelaMetade.has(l.alunoId));
  const diasProva = Math.round(
    (new Date(`${temporada.data_prova}T12:00:00Z`).getTime() - new Date(`${hojeEmBrasilia()}T12:00:00Z`).getTime()) /
      86_400_000,
  );

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
        <div className="flex flex-wrap gap-2">
          {jaAbriram.length > 0 && (
            <Link
              href={`/professor/turmas/${temporada.turma_id}/revisao?temporada=${temporada.id}`}
              className="rounded-xl border border-marca-200 bg-white px-4 py-2 text-sm font-medium text-marca-700 hover:border-marca-400 hover:bg-marca-50"
              title="As questões em que a turma mais errou, em letras grandes para projetar"
            >
              📺 Revisão no quadro
            </Link>
          )}
          {faseAtual === "pontos" && (
            <BotaoLink href={`/professor/desafios/novo?temporada=${temporada.id}`}>+ Novo desafio</BotaoLink>
          )}
        </div>
      </div>

      {faseAtual !== "encerrada" && (jaAbriram.length > 0 || diasProva >= 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {participacao !== null && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              <strong className="tabular-nums">{participacao}%</strong> dos desafios feitos
            </span>
          )}
          {acertoMedio !== null && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              <strong className="tabular-nums">{acertoMedio}%</strong> de acerto médio
            </span>
          )}
          {consultaTurma.com !== null && consultaTurma.sem !== null && (
            <span
              className="rounded-full border border-slate-200 bg-white px-3 py-1"
              title="Acerto médio da turma nos desafios com pesquisa liberada e nos de pesquisa bloqueada"
            >
              com consulta <strong className="tabular-nums">{consultaTurma.com}%</strong> · sem consulta{" "}
              <strong className="tabular-nums">{consultaTurma.sem}%</strong>
            </span>
          )}
          <AvisoAlunos
            alunos={naoComecaram.map((l) => nomes.get(l.alunoId) ?? l.apelido)}
            um="aluno não começou nenhum desafio"
            varios="alunos não começaram nenhum desafio"
          />
          <AvisoAlunos
            alunos={pararam.map((l) => nomes.get(l.alunoId) ?? l.apelido)}
            um="aluno parou no meio de um desafio aberto"
            varios="alunos pararam no meio de um desafio aberto"
          />
          <AvisoAlunos
            alunos={faltaFixar.map((l) => nomes.get(l.alunoId) ?? l.apelido)}
            um={`aluno acerta bem mais com consulta do que sem (${DIFERENCA_RELEVANTE} pontos ou mais)`}
            varios={`alunos acertam bem mais com consulta do que sem (${DIFERENCA_RELEVANTE} pontos ou mais)`}
          />
          {diasProva >= 0 && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Prova{" "}
              {diasProva === 0 ? (
                <strong>hoje</strong>
              ) : diasProva === 1 ? (
                <strong>amanhã</strong>
              ) : (
                <>
                  em <strong className="tabular-nums">{diasProva} dias</strong>
                </>
              )}
            </span>
          )}
        </div>
      )}

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
                    className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-3 hover:bg-marca-50/60 hover:text-marca-700"
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
                      <span className="text-marca-700" aria-hidden>
                        ›
                      </span>
                    </span>
                    {situacao !== "agendado" && totalAlunos > 0 && (
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-marca-500"
                          style={{ width: `${Math.round((feitos / totalAlunos) * 100)}%` }}
                        />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Cartao>

        <Cartao>
          <Subtitulo>Ranking</Subtitulo>
          <TabelaRanking ranking={ranking.slice(0, RANKING_VISIVEL)} nomes={nomes} medalhas={medalhas} />
          {ranking.length > RANKING_VISIVEL && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-marca-700">
                Ver todos ({ranking.length})
              </summary>
              <TabelaRanking ranking={ranking.slice(RANKING_VISIVEL)} nomes={nomes} medalhas={medalhas} semCabecalho />
            </details>
          )}
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
              gabaritoSoNoEncerramento={!!temporada.gabarito_so_no_encerramento}
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
  gabaritoSoNoEncerramento = false,
}: {
  inicio: string;
  dataProva?: string;
  encerramento?: string;
  gabaritoNoEncerramento?: boolean;
  gabaritoSoNoEncerramento?: boolean;
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
      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 font-medium text-slate-700">Quando o aluno vê o gabarito</legend>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name="quando_gabarito"
            value="desafio"
            defaultChecked={!gabaritoSoNoEncerramento}
            className="mt-1"
          />
          <span>
            Quando cada desafio fecha
            <span className="block text-xs text-slate-500">
              O aluno confere os erros a cada semana e já pode treinar e revisar.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            name="quando_gabarito"
            value="encerramento"
            defaultChecked={gabaritoSoNoEncerramento}
            className="mt-1"
          />
          <span>
            Só no encerramento da temporada
            <span className="block text-xs text-slate-500">
              Nenhum gabarito aparece antes; no encerramento todos saem juntos, com treino e revisão de erros até a
              prova.
            </span>
          </span>
        </label>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="gabarito_no_encerramento"
          defaultChecked={gabaritoNoEncerramento}
          className="mt-1"
        />
        <span>
          No encerramento, liberar também o gabarito que guardei
          <span className="block text-xs text-slate-500">
            Vale para os desafios em que você escolheu liberar o gabarito na mão. Os marcados &quot;nunca mostrar&quot;
            continuam escondidos.
          </span>
        </span>
      </label>
    </div>
  );
}

/** Etiqueta amarela com a contagem e os primeiros nomes; o resto aparece ao passar o cursor. */
function AvisoAlunos({ alunos, um, varios }: { alunos: string[]; um: string; varios: string }) {
  if (!alunos.length) return null;
  return (
    <span
      className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900"
      title={alunos.join(", ")}
    >
      <strong className="tabular-nums">{alunos.length}</strong> {alunos.length === 1 ? um : varios}:{" "}
      {alunos.slice(0, 4).join(", ")}
      {alunos.length > 4 && "…"}
    </span>
  );
}

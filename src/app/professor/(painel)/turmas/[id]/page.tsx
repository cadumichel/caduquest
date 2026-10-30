import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { ExcluirComConfirmacao } from "@/components/ExcluirComConfirmacao";
import { FormAcao } from "@/components/FormAcao";
import { TabelaRanking } from "@/components/TabelaRanking";
import { AreaTexto, Botao, Campo, Cartao, Entrada, Etiqueta, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { exigirProfessor } from "@/lib/professor";
import { rankingsDaTurma } from "@/lib/rankings-turma";
import { temporadaAtual } from "@/lib/temporada-dados";
import { situacaoDesafio } from "@/lib/tipos-banco";
import type { Aluno, Temporada } from "@/lib/tipos-banco";
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
  criarTemporada,
  excluirTurma,
  novoCodigoTurma,
  redefinirPin,
  removerAluno,
} from "../../actions";

export const metadata: Metadata = { title: "Turma" };

export default async function PaginaTurma({ params }: PageProps<"/professor/turmas/[id]">) {
  const { id } = await params;
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

  const [{ data: alunosBrutos }, { data: temporadasBrutas }, atual, medalhas] = await Promise.all([
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
  ]);
  const todos = (alunosBrutos ?? []) as Aluno[];
  const alunos = todos.filter((a) => a.aprovado);
  const pendentes = todos.filter((a) => !a.aprovado);
  const temporadas = (temporadasBrutas ?? []) as Temporada[];
  const [rankings, cartas] = await Promise.all([
    rankingsDaTurma(supabase, temporadas, alunos),
    cartasParaAProxima(supabase, id, { todas: true }),
  ]);
  const hoje = hojeEmBrasilia();
  const nomes = new Map(alunos.map((a) => [a.id, a.nome_real]));

  return (
    <div className="space-y-6">
      <Titulo>
        Turma {turma.nome}{" "}
        <span className="text-base font-normal text-slate-500">
          · {turma.serie ?? ""} {escola.nome}
        </span>
      </Titulo>

      <Cartao className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Código de acesso dos alunos</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-marca-700">{turma.codigo}</p>
          <p className="text-xs text-slate-500">
            Os alunos entram em /entrar com este código, um apelido, o nome completo (só você vê) e um PIN de 4 números.
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

      {cartas.length > 0 && (
        <Cartao className="border-amber-300 bg-amber-50">
          <Subtitulo>🃏 Cartas coringa para a próxima prova</Subtitulo>
          <p className="mb-3 text-sm text-slate-600">
            Temas escolhidos pelos campeões da última temporada (desta turma e das turmas da mesma série). Revise o
            texto e aprove: só então o tema aparece para os alunos, com o personagem do campeão. Cada tema aprovado vira
            uma questão da próxima prova; o Claude também vê os aprovados pelo conector.
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

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Cartao>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Subtitulo>Alunos ({alunos.length})</Subtitulo>
            <form action={alternarAprovacao.bind(null, id, !turma.exige_aprovacao)} className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Novos cadastros: {turma.exige_aprovacao ? "precisam da sua aprovação" : "entram direto"}
              </span>
              <Botao variante="fantasma" className="px-2 py-1 text-xs">
                {turma.exige_aprovacao ? "Liberar entrada direta" : "Exigir aprovação"}
              </Botao>
            </form>
          </div>
          {!alunos.length && <Vazio>Nenhum aluno entrou ainda.</Vazio>}
          <ul className="divide-y divide-slate-100">
            {alunos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-end gap-2 py-3">
                <div className="flex w-full items-center gap-2 text-xs text-slate-500">
                  <Avatar avatar={a.avatar} cor={a.cor} medalhas={medalhas.get(a.id) ?? 0} tamanho={28} />
                  <span>
                    {a.ultimo_acesso ? `Último acesso ${formatarDataHora(a.ultimo_acesso)}` : "Sem acesso registrado"} ·{" "}
                    {a.total_acessos} {a.total_acessos === 1 ? "acesso" : "acessos"}
                  </span>
                  <Link href={`/professor/alunos/${a.id}`} className="ml-auto font-medium text-marca-700">
                    Ver perfil →
                  </Link>
                </div>
                <form action={atualizarAluno} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <Campo rotulo="Apelido">
                    <Entrada name="apelido" defaultValue={a.apelido} className="w-36" maxLength={20} />
                  </Campo>
                  <Campo rotulo="Nome real (só você vê)">
                    <Entrada name="nome_real" defaultValue={a.nome_real ?? ""} className="w-52" />
                  </Campo>
                  <Botao variante="secundario">Salvar</Botao>
                </form>
                <div className="flex items-center gap-2">
                  {a.pin_hash === null && <Etiqueta cor="ambar">PIN redefinido</Etiqueta>}
                  <form action={alternarTeclado.bind(null, a.id, !a.teclado_liberado)}>
                    <Botao
                      variante="fantasma"
                      title="Acessibilidade: com o teclado liberado, apertar uma tecla não zera a questão nos desafios com pesquisa bloqueada"
                    >
                      {a.teclado_liberado ? "⌨️ Teclado liberado · bloquear" : "⌨️ Liberar teclado"}
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
              </li>
            ))}
          </ul>
        </Cartao>

        <div className="space-y-6">
          <Cartao>
            <Subtitulo>Rankings</Subtitulo>
            {!rankings.length && <Vazio>Crie uma temporada para ver o ranking.</Vazio>}
            <div className="space-y-2">
              {rankings.map(({ temporada, ranking, desafios }) => (
                <details
                  key={temporada.id}
                  open={temporada.id === atual?.id}
                  className="group rounded-xl border border-slate-200 p-3"
                >
                  <summary className="cursor-pointer font-semibold text-marca-800">
                    🏆 {temporada.nome}{" "}
                    {temporada.encerrada_em ? (
                      <Etiqueta cor="cinza">encerrada</Etiqueta>
                    ) : (
                      temporada.id === atual?.id && <Etiqueta cor="verde">atual</Etiqueta>
                    )}
                  </summary>
                  <div className="mt-2">
                    <TabelaRanking ranking={ranking} nomes={nomes} medalhas={medalhas} />
                  </div>
                  {desafios.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Por desafio</p>
                      {desafios.map(({ desafio, ranking: rd, naoFizeram }) => (
                        <details key={desafio.id} className="rounded-lg bg-slate-50 px-3 py-2">
                          <summary className="cursor-pointer text-sm">
                            <span className="font-medium">
                              {desafio.tipo === "relampago" && "⚡ "}
                              {desafio.titulo}
                            </span>{" "}
                            <span className="text-slate-500">
                              · {rd.length} fizeram
                              {situacaoDesafio(desafio) === "aberto" && " · aberto"}
                            </span>
                          </summary>
                          <div className="mt-2">
                            {rd.length ? (
                              <TabelaRanking ranking={rd} nomes={nomes} medalhas={medalhas} />
                            ) : (
                              <p className="text-sm text-slate-500">Ninguém fez ainda.</p>
                            )}
                            {naoFizeram > 0 && rd.length > 0 && (
                              <p className="mt-1 text-xs text-slate-500">{naoFizeram} aluno(s) não fizeram.</p>
                            )}
                            <Link
                              href={`/professor/desafios/${desafio.id}`}
                              className="mt-1 inline-block text-xs text-marca-700"
                            >
                              Ver desempenho por questão →
                            </Link>
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </details>
              ))}
            </div>
          </Cartao>

          <Cartao>
            <Subtitulo>Temporadas</Subtitulo>
            <ul className="mb-4 space-y-1">
              {temporadas.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/professor/temporadas/${t.id}`}
                    className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    <span className="font-medium">{t.nome}</span>
                    <span className="text-sm text-slate-500">
                      {formatarData(t.inicio)} – {formatarData(t.data_prova)}
                      {t.inicio <= hoje && hoje <= t.data_prova && " · em curso"}
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
                <div className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Início">
                    <Entrada type="date" name="inicio" defaultValue={hoje} required />
                  </Campo>
                  <Campo rotulo="Data da prova">
                    <Entrada type="date" name="data_prova" required />
                  </Campo>
                </div>
                <Campo rotulo="Capítulos cobertos" dica="Um por linha, na ordem da apostila.">
                  <AreaTexto name="capitulos" rows={3} />
                </Campo>
                <BotaoEnviar>Criar temporada</BotaoEnviar>
              </FormAcao>
            </details>
          </Cartao>
        </div>
      </div>

      <ExcluirComConfirmacao acao={excluirTurma.bind(null, id)} nome={turma.nome} rotulo="Excluir turma">
        <p>
          Apaga a turma {turma.nome}, {todos.length} aluno(s) e {temporadas.length} temporada(s), com desafios,
          respostas, pontos e conquistas. As questões do banco continuam.
        </p>
      </ExcluirComConfirmacao>
    </div>
  );
}

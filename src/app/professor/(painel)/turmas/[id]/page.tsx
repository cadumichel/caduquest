import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormAcao } from "@/components/FormAcao";
import { TabelaRanking } from "@/components/TabelaRanking";
import { AreaTexto, Botao, Campo, Cartao, Entrada, Etiqueta, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { exigirProfessor } from "@/lib/professor";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import type { Aluno, Temporada } from "@/lib/tipos-banco";
import {
  alternarAprovacao,
  aprovarAluno,
  aprovarTodos,
  atualizarAluno,
  criarTemporada,
  novoCodigoTurma,
  redefinirPin,
  removerAluno,
} from "../../actions";

export const metadata: Metadata = { title: "Turma" };

export default async function PaginaTurma({ params }: PageProps<"/professor/turmas/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data: turma } = await supabase
    .from("turmas")
    .select("id, nome, serie, codigo, exige_aprovacao, escolas(nome, periodo)")
    .eq("id", id)
    .maybeSingle();
  if (!turma) notFound();
  const escola = turma.escolas as unknown as { nome: string; periodo: string };

  const [{ data: alunosBrutos }, { data: temporadasBrutas }, atual, medalhas] = await Promise.all([
    supabase
      .from("alunos")
      .select(
        "id, turma_id, apelido, nome_real, pin_hash, avatar, cor, aprovado, ultimo_acesso, total_acessos, criado_em",
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
  const ranking = atual ? await rankingDaTemporada(supabase, atual) : [];
  const hoje = hojeEmBrasilia();

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
            <Subtitulo>Ranking {atual ? `· ${atual.nome}` : ""}</Subtitulo>
            <TabelaRanking
              ranking={ranking}
              nomes={new Map(alunos.map((a) => [a.id, a.nome_real]))}
              medalhas={medalhas}
            />
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
    </div>
  );
}

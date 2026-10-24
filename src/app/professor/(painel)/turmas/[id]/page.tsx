import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormAcao } from "@/components/FormAcao";
import { TabelaRanking } from "@/components/TabelaRanking";
import { AreaTexto, Botao, Campo, Cartao, Entrada, Etiqueta, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarData, hojeEmBrasilia } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import type { Aluno, Temporada } from "@/lib/tipos-banco";
import { atualizarAluno, criarTemporada, novoCodigoTurma, redefinirPin, removerAluno } from "../../actions";

export const metadata: Metadata = { title: "Turma" };

export default async function PaginaTurma({ params }: PageProps<"/professor/turmas/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data: turma } = await supabase
    .from("turmas")
    .select("id, nome, serie, codigo, escolas(nome, periodo)")
    .eq("id", id)
    .maybeSingle();
  if (!turma) notFound();
  const escola = turma.escolas as unknown as { nome: string; periodo: string };

  const [{ data: alunosBrutos }, { data: temporadasBrutas }, atual] = await Promise.all([
    supabase
      .from("alunos")
      .select("id, turma_id, apelido, nome_real, pin_hash, criado_em")
      .eq("turma_id", id)
      .order("apelido"),
    supabase.from("temporadas").select("*").eq("turma_id", id).order("inicio", { ascending: false }),
    temporadaAtual(supabase, id),
  ]);
  const alunos = (alunosBrutos ?? []) as Aluno[];
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
            Os alunos entram em /entrar com este código, um apelido e um PIN de 4 números.
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

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Cartao>
          <Subtitulo>Alunos ({alunos.length})</Subtitulo>
          {!alunos.length && <Vazio>Nenhum aluno entrou ainda.</Vazio>}
          <ul className="divide-y divide-slate-100">
            {alunos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-end gap-2 py-3">
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
            <TabelaRanking ranking={ranking} nomes={new Map(alunos.map((a) => [a.id, a.nome_real]))} />
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

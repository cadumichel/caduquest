import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { ExcluirComConfirmacao } from "@/components/ExcluirComConfirmacao";
import { FormAcao } from "@/components/FormAcao";
import { Campo, Cartao, Entrada, Etiqueta, Selecao, Titulo, Vazio } from "@/components/ui";
import { exigirProfessor } from "@/lib/professor";
import { situacaoDesafio, type Escola, type Turma } from "@/lib/tipos-banco";
import { criarEscola, criarTurma, excluirEscola } from "../actions";

export const metadata: Metadata = { title: "Turmas" };

type TurmaLista = Turma & {
  alunos: { count: number }[];
  temporadas: { desafios: { abre_em: string; fecha_em: string }[] }[];
};

export default async function ListaTurmas() {
  const { supabase } = await exigirProfessor();
  const [{ data: escolas }, { data: turmas }] = await Promise.all([
    supabase.from("escolas").select("id, nome, periodo").order("nome"),
    supabase
      .from("turmas")
      .select("id, escola_id, nome, serie, codigo, alunos(count), temporadas(desafios(abre_em, fecha_em))")
      .order("nome"),
  ]);

  const porEscola = new Map<string, TurmaLista[]>();
  for (const t of (turmas ?? []) as unknown as TurmaLista[]) {
    porEscola.set(t.escola_id, [...(porEscola.get(t.escola_id) ?? []), t]);
  }

  return (
    <div className="space-y-6">
      <Titulo>Turmas</Titulo>
      {!escolas?.length && <Vazio>Comece criando uma escola (por exemplo, Cônsul ou Uniavan) no fim da página.</Vazio>}

      {((escolas ?? []) as Escola[]).map((e) => {
        const lista = porEscola.get(e.id) ?? [];
        return (
          <section key={e.id} className="space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">{e.nome}</h2>
            {!lista.length && <p className="text-sm text-slate-500">Nenhuma turma nesta escola.</p>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((t) => {
                const desafios = t.temporadas.flatMap((tp) => tp.desafios);
                const abertos = desafios.filter((d) => situacaoDesafio(d) === "aberto").length;
                return (
                  <Link
                    key={t.id}
                    href={`/professor/turmas/${t.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca-300"
                  >
                    <p className="text-lg font-bold text-marca-900">
                      {t.nome} {t.serie && <span className="text-sm font-normal text-slate-500">· {t.serie}</span>}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      {t.alunos[0]?.count ?? 0} alunos
                      {abertos > 0 ? (
                        <Etiqueta cor="verde">
                          {abertos} desafio{abertos > 1 ? "s" : ""} aberto{abertos > 1 ? "s" : ""}
                        </Etiqueta>
                      ) : (
                        <Etiqueta>sem desafio aberto</Etiqueta>
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-marca-700">
          Criar ou excluir escolas e turmas
        </summary>
        <div className="mt-4 space-y-4">
          {((escolas ?? []) as Escola[]).map((e) => {
            const lista = porEscola.get(e.id) ?? [];
            return (
              <Cartao key={e.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{e.nome}</h3>
                  <Etiqueta>{e.periodo}</Etiqueta>
                </div>
                <FormAcao
                  acao={criarTurma}
                  limparAoSalvar
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="escola_id" value={e.id} />
                  <Campo rotulo="Nova turma">
                    <Entrada name="nome" placeholder="81" required />
                  </Campo>
                  <Campo rotulo="Série">
                    <Entrada name="serie" placeholder="8º ano" />
                  </Campo>
                  <BotaoEnviar>Criar turma</BotaoEnviar>
                </FormAcao>
                <ExcluirComConfirmacao acao={excluirEscola.bind(null, e.id)} nome={e.nome} rotulo="Excluir escola">
                  <p>
                    Apaga a escola, {lista.length} turma(s) e {lista.reduce((s, t) => s + (t.alunos[0]?.count ?? 0), 0)}{" "}
                    aluno(s), com temporadas, desafios, respostas, pontos e conquistas. As questões do banco continuam.
                  </p>
                </ExcluirComConfirmacao>
              </Cartao>
            );
          })}
          <Cartao>
            <h3 className="mb-3 font-semibold">Nova escola</h3>
            <FormAcao acao={criarEscola} limparAoSalvar className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <Campo rotulo="Nome">
                <Entrada name="nome" placeholder="Colégio Cônsul Carlos Renaux" required />
              </Campo>
              <Campo rotulo="Período">
                <Selecao name="periodo" defaultValue="trimestre">
                  <option value="trimestre">Trimestre</option>
                  <option value="bimestre">Bimestre</option>
                </Selecao>
              </Campo>
              <BotaoEnviar>Criar escola</BotaoEnviar>
            </FormAcao>
          </Cartao>
        </div>
      </details>
    </div>
  );
}

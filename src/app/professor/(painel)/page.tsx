import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormAcao } from "@/components/FormAcao";
import { Campo, Cartao, Entrada, Etiqueta, Selecao, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import type { Escola, Turma } from "@/lib/tipos-banco";
import { criarEscola, criarTurma } from "./actions";

export const metadata: Metadata = { title: "Início" };

export default async function InicioProfessor() {
  const { supabase } = await exigirProfessor();
  const agora = new Date().toISOString();
  const hoje = hojeEmBrasilia();

  const [{ data: escolas }, { data: turmas }, { data: temporadas }, { data: desafios }, { count: rascunhos }] =
    await Promise.all([
      supabase.from("escolas").select("id, nome, periodo").order("nome"),
      supabase.from("turmas").select("id, escola_id, nome, serie, codigo, alunos(count)").order("nome"),
      supabase
        .from("temporadas")
        .select("id, nome, data_prova, turmas(nome, escolas(nome))")
        .lte("inicio", hoje)
        .gte("data_prova", hoje)
        .order("data_prova"),
      supabase
        .from("desafios")
        .select("id, titulo, fecha_em, temporadas(turma_id, turmas(nome, alunos(count))), tentativas(concluida_em)")
        .lte("abre_em", agora)
        .gte("fecha_em", agora)
        .order("fecha_em"),
      supabase.from("questoes").select("*", { count: "exact", head: true }).eq("status", "rascunho"),
    ]);
  // Sem a tabela da carta coringa (SQL não rodado), a consulta falha e nada aparece.
  const { data: cartasPendentes } = await supabase
    .from("cartas_coringa")
    .select("id, alunos(apelido, turma_id, turmas(nome))")
    .eq("status", "pendente");

  const turmasPorEscola = new Map<string, (Turma & { alunos: { count: number }[] })[]>();
  for (const t of (turmas ?? []) as (Turma & { alunos: { count: number }[] })[]) {
    turmasPorEscola.set(t.escola_id, [...(turmasPorEscola.get(t.escola_id) ?? []), t]);
  }

  return (
    <div className="space-y-8">
      <Titulo>Início</Titulo>

      {Boolean(rascunhos) && (
        <Link
          href="/professor/questoes?status=rascunho"
          className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Há {rascunhos} questões em rascunho esperando revisão →
        </Link>
      )}

      {(cartasPendentes ?? []).map((c) => {
        const a = c.alunos as unknown as { apelido: string; turma_id: string; turmas: { nome: string } };
        return (
          <Link
            key={c.id}
            href={`/professor/turmas/${a.turma_id}`}
            className="block rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            🃏 {a.apelido} ({a.turmas.nome}) escolheu o tema da carta coringa. Revise e aprove →
          </Link>
        );
      })}

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <Subtitulo>Desafios abertos</Subtitulo>
          {!desafios?.length && <Vazio>Nenhum desafio aberto agora.</Vazio>}
          <ul className="divide-y divide-slate-100">
            {(desafios ?? []).map((d) => {
              const temporada = d.temporadas as unknown as { turmas: { nome: string; alunos: { count: number }[] } };
              const feitos = (d.tentativas as { concluida_em: string | null }[]).filter((t) => t.concluida_em).length;
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/professor/desafios/${d.id}`} className="font-medium hover:text-marca-700">
                    {d.titulo} <span className="text-slate-500">· {temporada.turmas.nome}</span>
                  </Link>
                  <span className="shrink-0 text-sm text-slate-500">
                    {feitos}/{temporada.turmas.alunos[0]?.count ?? 0} · fecha {formatarDataHora(d.fecha_em)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Cartao>

        <Cartao>
          <Subtitulo>Temporadas em curso</Subtitulo>
          {!temporadas?.length && <Vazio>Nenhuma temporada em curso.</Vazio>}
          <ul className="divide-y divide-slate-100">
            {(temporadas ?? []).map((t) => {
              const turma = t.turmas as unknown as { nome: string; escolas: { nome: string } };
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/professor/temporadas/${t.id}`} className="font-medium hover:text-marca-700">
                    {t.nome}
                  </Link>
                  <span className="text-sm text-slate-500">
                    {turma.nome} · {turma.escolas.nome} · prova {formatarData(t.data_prova)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Cartao>
      </div>

      <section className="space-y-4">
        <Subtitulo>Escolas e turmas</Subtitulo>
        {!escolas?.length && <Vazio>Comece criando uma escola (por exemplo, Cônsul ou Uniavan).</Vazio>}
        <div className="grid gap-4 md:grid-cols-2">
          {((escolas ?? []) as Escola[]).map((e) => (
            <Cartao key={e.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{e.nome}</h3>
                <Etiqueta>{e.periodo}</Etiqueta>
              </div>
              <ul className="space-y-1">
                {(turmasPorEscola.get(e.id) ?? []).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/professor/turmas/${t.id}`}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <span className="font-medium">
                        {t.nome} {t.serie && <span className="text-slate-500">· {t.serie}</span>}
                      </span>
                      <span className="text-sm text-slate-500">
                        {t.alunos[0]?.count ?? 0} alunos · <span className="font-mono">{t.codigo}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <details className="rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-marca-700">+ Nova turma</summary>
                <FormAcao
                  acao={criarTurma}
                  limparAoSalvar
                  className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="escola_id" value={e.id} />
                  <Campo rotulo="Turma">
                    <Entrada name="nome" placeholder="81" required />
                  </Campo>
                  <Campo rotulo="Série">
                    <Entrada name="serie" placeholder="8º ano" />
                  </Campo>
                  <BotaoEnviar>Criar</BotaoEnviar>
                </FormAcao>
              </details>
            </Cartao>
          ))}
        </div>
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
      </section>
    </div>
  );
}

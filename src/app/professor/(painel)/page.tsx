import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BotaoLink, Cartao, Etiqueta, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import {
  faseDaTemporada,
  gabaritoAguardaProfessor,
  situacaoDesafio,
  ultimoDiaComPontos,
  type Desafio,
  type TemporadaEncerramento,
} from "@/lib/tipos-banco";
import { COLUNAS_PEDIDO, PedidosEntrada, type PedidoEntrada } from "./PedidosEntrada";

export const metadata: Metadata = { title: "Início" };

type TurmaInicio = {
  id: string;
  escola_id: string;
  nome: string;
  serie: string | null;
  alunos: { count: number }[];
};

type DesafioInicio = {
  id: string;
  titulo: string;
  especial?: boolean;
  abre_em: string;
  fecha_em: string;
  temporadas: { turma_id: string };
  tentativas: { concluida_em: string | null }[];
};

type TemporadaInicio = {
  id: string;
  nome: string;
  turma_id: string;
  data_prova: string;
  encerramento?: string | null;
  encerrada_em?: string | null;
};

/** Linha de "Também precisa de você": texto à esquerda, ação à direita. */
function Pendencia({ children, acao }: { children: ReactNode; acao: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <span className="min-w-0 flex-1 text-sm">{children}</span>
      <span className="flex shrink-0 gap-2">{acao}</span>
    </li>
  );
}

/**
 * Tela inicial do professor: pedidos de entrada no topo e, abaixo, um box por escola
 * com as turmas dentro. Cada turma leva direto à página dela.
 */
export default async function Inicio() {
  const { supabase } = await exigirProfessor();
  const agora = new Date().toISOString();
  const hoje = hojeEmBrasilia();

  const [
    { data: escolas },
    { data: turmasBrutas },
    { count: rascunhos },
    { data: pedidosBrutos },
    { data: desafiosBrutos },
    { data: temporadasBrutas },
  ] = await Promise.all([
    supabase.from("escolas").select("id, nome").order("nome"),
    supabase.from("turmas").select("id, escola_id, nome, serie, alunos(count)").order("nome"),
    supabase.from("questoes").select("*", { count: "exact", head: true }).eq("status", "rascunho"),
    supabase.from("alunos").select(COLUNAS_PEDIDO).eq("aprovado", false).order("criado_em"),
    supabase
      .from("desafios")
      .select("id, titulo, especial, abre_em, fecha_em, temporadas(turma_id), tentativas(concluida_em)")
      .gte("fecha_em", agora)
      .order("fecha_em"),
    supabase
      .from("temporadas")
      // "*" traz também o encerramento, quando o SQL dele já rodou. Temporada encerrada
      // antes da prova continua aqui: os alunos estudam até a prova.
      .select("*")
      .lte("inicio", hoje)
      .gte("data_prova", hoje)
      .order("data_prova"),
  ]);
  // Sem o SQL da carta coringa ou dos controles do gabarito, estas consultas falham e nada aparece.
  const [{ data: cartasPendentes }, { data: gabaritosBrutos }] = await Promise.all([
    supabase.from("cartas_coringa").select("id, alunos(apelido, turma_id, turmas(nome))").eq("status", "pendente"),
    supabase
      .from("desafios")
      .select("*, temporadas(*, turmas(nome))")
      .eq("gabarito_manual", true)
      .is("gabarito_liberado_em", null)
      .lt("fecha_em", agora)
      .order("fecha_em", { ascending: false })
      .limit(10),
  ]);

  // O que a temporada já liberou sozinha no encerramento não é mais pendência.
  const gabaritosGuardados = (
    (gabaritosBrutos ?? []) as unknown as (Desafio & {
      temporadas: TemporadaEncerramento & { turmas: { nome: string } };
    })[]
  ).filter((d) => gabaritoAguardaProfessor(d));

  if (!escolas?.length) {
    return (
      <div className="space-y-6">
        <Titulo>Início</Titulo>
        <Vazio>
          Para começar, crie uma escola e uma turma em{" "}
          <Link href="/professor/turmas" className="font-semibold text-marca-700">
            Turmas
          </Link>
          .
        </Vazio>
      </div>
    );
  }

  const pedidos = (pedidosBrutos ?? []) as unknown as PedidoEntrada[];
  const pedidosPorTurma = new Map<string, number>();
  for (const p of pedidos) pedidosPorTurma.set(p.turma_id, (pedidosPorTurma.get(p.turma_id) ?? 0) + 1);

  const desafiosPorTurma = new Map<string, DesafioInicio[]>();
  for (const d of (desafiosBrutos ?? []) as unknown as DesafioInicio[]) {
    const t = d.temporadas.turma_id;
    desafiosPorTurma.set(t, [...(desafiosPorTurma.get(t) ?? []), d]);
  }
  const temporadaPorTurma = new Map<string, TemporadaInicio>();
  for (const t of (temporadasBrutas ?? []) as TemporadaInicio[]) {
    if (!temporadaPorTurma.has(t.turma_id)) temporadaPorTurma.set(t.turma_id, t);
  }
  const turmasPorEscola = new Map<string, TurmaInicio[]>();
  for (const t of (turmasBrutas ?? []) as unknown as TurmaInicio[]) {
    turmasPorEscola.set(t.escola_id, [...(turmasPorEscola.get(t.escola_id) ?? []), t]);
  }

  const outras = (rascunhos ? 1 : 0) + (cartasPendentes ?? []).length + (gabaritosGuardados ?? []).length;

  return (
    <div className="space-y-6">
      <Titulo>Início</Titulo>

      <PedidosEntrada pedidos={pedidos} />

      {outras > 0 && (
        <Cartao className="py-3">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Também precisa de você</p>
          <ul className="divide-y divide-slate-100">
            {Boolean(rascunhos) && (
              <Pendencia
                acao={
                  <BotaoLink href="/professor/questoes?status=rascunho" variante="secundario">
                    Revisar
                  </BotaoLink>
                }
              >
                <strong>{rascunhos}</strong> {rascunhos === 1 ? "questão em rascunho" : "questões em rascunho"}{" "}
                esperando revisão
              </Pendencia>
            )}
            {(cartasPendentes ?? []).map((c) => {
              const a = c.alunos as unknown as { apelido: string; turma_id: string; turmas: { nome: string } };
              return (
                <Pendencia
                  key={c.id}
                  acao={
                    <BotaoLink href={`/professor/turmas/${a.turma_id}?aba=temporadas`} variante="secundario">
                      Revisar tema
                    </BotaoLink>
                  }
                >
                  {a.apelido} ({a.turmas.nome}) escolheu o tema da carta coringa
                </Pendencia>
              );
            })}
            {(gabaritosGuardados ?? []).map((d) => (
              <Pendencia
                key={d.id}
                acao={
                  <BotaoLink href={`/professor/desafios/${d.id}?aba=ajustes`} variante="secundario">
                    Liberar gabarito
                  </BotaoLink>
                }
              >
                Gabarito guardado: <strong>{d.titulo}</strong> (
                {(d.temporadas as unknown as { turmas: { nome: string } }).turmas.nome}) já encerrou
              </Pendencia>
            ))}
          </ul>
        </Cartao>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {escolas.map((e) => {
          const turmas = turmasPorEscola.get(e.id) ?? [];
          return (
            <Cartao key={e.id} className="space-y-3">
              <h2 className="text-lg font-bold text-marca-900">{e.nome}</h2>
              {!turmas.length && (
                <p className="text-sm text-slate-500">
                  Nenhuma turma.{" "}
                  <Link href="/professor/turmas" className="font-semibold text-marca-700">
                    Criar turma
                  </Link>
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {turmas.map((t) => (
                  <BoxTurma
                    key={t.id}
                    turma={t}
                    pedidos={pedidosPorTurma.get(t.id) ?? 0}
                    desafios={desafiosPorTurma.get(t.id) ?? []}
                    temporada={temporadaPorTurma.get(t.id) ?? null}
                  />
                ))}
              </div>
            </Cartao>
          );
        })}
      </div>
    </div>
  );
}

/** Uma turma dentro do box da escola: clica e vai direto para ela. */
function BoxTurma({
  turma,
  pedidos,
  desafios,
  temporada,
}: {
  turma: TurmaInicio;
  pedidos: number;
  desafios: DesafioInicio[];
  temporada: TemporadaInicio | null;
}) {
  // A contagem inclui quem ainda espera aprovação.
  const total = Math.max(0, (turma.alunos[0]?.count ?? 0) - pedidos);
  const abertos = desafios.filter((d) => situacaoDesafio(d) === "aberto");
  const proximo = desafios
    .filter((d) => situacaoDesafio(d) === "agendado")
    .sort((a, b) => a.abre_em.localeCompare(b.abre_em))[0];

  return (
    <Link
      href={`/professor/turmas/${turma.id}`}
      className={`flex flex-col gap-2 rounded-xl border bg-white p-3.5 transition hover:border-marca-400 hover:shadow-md ${
        pedidos ? "border-amber-300" : "border-slate-200"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xl font-extrabold text-marca-900">
          {turma.nome}
          {turma.serie && <span className="ml-1.5 text-sm font-normal text-slate-500">{turma.serie}</span>}
        </p>
        <span className="text-xs text-slate-500">{total} alunos</span>
      </div>

      {pedidos > 0 && (
        <Etiqueta cor="ambar">
          {pedidos} {pedidos === 1 ? "pedido de entrada" : "pedidos de entrada"}
        </Etiqueta>
      )}

      {abertos.map((d) => {
        const feitos = d.tentativas.filter((x) => x.concluida_em).length;
        const pct = total ? Math.min(100, Math.round((feitos / total) * 100)) : 0;
        return (
          <div key={d.id} className="text-xs">
            <p className="truncate font-semibold text-slate-700">
              {d.especial && "★ "}
              {d.titulo}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-marca-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-0.5 flex justify-between text-slate-500">
              <span>
                {feitos}/{total} fizeram
              </span>
              <span>fecha {formatarDataHora(d.fecha_em)}</span>
            </p>
          </div>
        );
      })}

      {!abertos.length &&
        (proximo ? (
          <p className="text-xs text-slate-500">
            Próximo: <span className="font-medium text-slate-700">{proximo.titulo}</span> abre{" "}
            {formatarDataHora(proximo.abre_em)}
          </p>
        ) : temporada && faseDaTemporada(temporada) === "estudo" ? (
          <Etiqueta cor="ambar">período de estudo</Etiqueta>
        ) : temporada ? (
          <Etiqueta cor="vermelho">sem desafio aberto ou agendado</Etiqueta>
        ) : (
          <p className="text-xs text-slate-500">Sem temporada em andamento</p>
        ))}

      {temporada && (
        <p className="mt-auto text-xs text-slate-500">
          {faseDaTemporada(temporada) === "pontos" && ultimoDiaComPontos(temporada) !== temporada.data_prova
            ? `Encerramento em ${formatarData(ultimoDiaComPontos(temporada))} · `
            : ""}
          Prova em {formatarData(temporada.data_prova)}
        </p>
      )}
    </Link>
  );
}

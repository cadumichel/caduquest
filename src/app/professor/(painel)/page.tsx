import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Botao, BotaoLink, Cartao, Etiqueta, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora, hojeEmBrasilia } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import {
  gabaritoAguardaProfessor,
  pontuacaoEncerrada,
  situacaoDesafio,
  type Desafio,
  type TemporadaEncerramento,
} from "@/lib/tipos-banco";
import { aprovarTodos } from "./actions";

export const metadata: Metadata = { title: "Hoje" };

type DesafioHoje = {
  id: string;
  titulo: string;
  tipo?: string;
  especial?: boolean;
  abre_em: string;
  fecha_em: string;
  temporadas: { turma_id: string; turmas: { nome: string; alunos: { count: number }[] } };
  tentativas: { concluida_em: string | null }[];
};

type TemporadaHoje = {
  id: string;
  nome: string;
  turma_id: string;
  data_prova: string;
  encerramento?: string | null;
  encerrada_em?: string | null;
  turmas: { nome: string; escolas: { nome: string } };
  desafios: { abre_em: string; fecha_em: string }[];
};

/** Uma linha da lista "Precisa de você": texto à esquerda, ação à direita. */
function Pendencia({ children, acao }: { children: ReactNode; acao: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="min-w-0 flex-1 text-sm">{children}</span>
      <span className="flex shrink-0 gap-2">{acao}</span>
    </li>
  );
}

export default async function Hoje() {
  const { supabase } = await exigirProfessor();
  const agora = new Date().toISOString();
  const hoje = hojeEmBrasilia();

  const [
    { count: escolas },
    { count: rascunhos },
    { data: pendentesBrutos },
    { data: desafiosBrutos },
    { data: temporadasBrutas },
  ] = await Promise.all([
    supabase.from("escolas").select("*", { count: "exact", head: true }),
    supabase.from("questoes").select("*", { count: "exact", head: true }).eq("status", "rascunho"),
    supabase.from("alunos").select("id, turma_id, turmas(nome)").eq("aprovado", false),
    supabase
      .from("desafios")
      .select("*, temporadas(turma_id, turmas(nome, alunos(count))), tentativas(concluida_em)")
      .gte("fecha_em", agora)
      .order("fecha_em"),
    supabase
      .from("temporadas")
      // "*" traz também o encerramento, quando o SQL dele já rodou.
      .select("*, turmas(nome, escolas(nome)), desafios(abre_em, fecha_em)")
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

  const pendentesPorTurma = new Map<string, { nome: string; n: number }>();
  for (const a of pendentesBrutos ?? []) {
    const nome = (a.turmas as unknown as { nome: string }).nome;
    const atual = pendentesPorTurma.get(a.turma_id) ?? { nome, n: 0 };
    pendentesPorTurma.set(a.turma_id, { nome, n: atual.n + 1 });
  }
  const desafios = (desafiosBrutos ?? []) as unknown as DesafioHoje[];
  const abertos = desafios.filter((d) => situacaoDesafio(d) === "aberto");
  const agendados = desafios
    .filter((d) => situacaoDesafio(d) === "agendado")
    .sort((a, b) => a.abre_em.localeCompare(b.abre_em));
  const temporadas = (temporadasBrutas ?? []) as unknown as TemporadaHoje[];
  // No período de estudo (pontuação encerrada, prova por vir) não há mais desafios a criar.
  const semDesafio = temporadas.filter(
    (t) => !pontuacaoEncerrada(t) && !t.desafios.some((d) => situacaoDesafio(d) !== "encerrado"),
  );

  const totalPendencias =
    (rascunhos ? 1 : 0) +
    pendentesPorTurma.size +
    (cartasPendentes ?? []).length +
    (gabaritosGuardados ?? []).length +
    semDesafio.length;

  if (!escolas) {
    return (
      <div className="space-y-6">
        <Titulo>Hoje</Titulo>
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

  return (
    <div className="space-y-6">
      <Titulo>Hoje</Titulo>

      <Cartao className={totalPendencias ? "border-amber-300" : ""}>
        <Subtitulo>Precisa de você</Subtitulo>
        {!totalPendencias && <p className="text-sm text-slate-500">Nada pendente. Tudo em dia.</p>}
        <ul className="divide-y divide-slate-100">
          {Boolean(rascunhos) && (
            <Pendencia
              acao={
                <BotaoLink href="/professor/questoes?status=rascunho" variante="secundario">
                  Revisar
                </BotaoLink>
              }
            >
              <strong>{rascunhos}</strong> {rascunhos === 1 ? "questão em rascunho" : "questões em rascunho"} esperando
              revisão
            </Pendencia>
          )}
          {[...pendentesPorTurma].map(([turmaId, { nome, n }]) => (
            <Pendencia
              key={turmaId}
              acao={
                <>
                  <BotaoLink href={`/professor/turmas/${turmaId}`} variante="fantasma">
                    Ver
                  </BotaoLink>
                  <form action={aprovarTodos.bind(null, turmaId)}>
                    <Botao variante="sucesso">Aprovar {n > 1 ? "todos" : ""}</Botao>
                  </form>
                </>
              }
            >
              <strong>{n}</strong> {n === 1 ? "aluno aguardando" : "alunos aguardando"} aprovação na turma {nome}
            </Pendencia>
          ))}
          {(cartasPendentes ?? []).map((c) => {
            const a = c.alunos as unknown as { apelido: string; turma_id: string; turmas: { nome: string } };
            return (
              <Pendencia
                key={c.id}
                acao={
                  <BotaoLink href={`/professor/turmas/${a.turma_id}`} variante="secundario">
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
          {semDesafio.map((t) => (
            <Pendencia
              key={t.id}
              acao={
                <BotaoLink href={`/professor/desafios/novo?temporada=${t.id}`} variante="secundario">
                  Novo desafio
                </BotaoLink>
              }
            >
              Turma {t.turmas.nome} está sem desafio aberto ou agendado ({t.nome})
            </Pendencia>
          ))}
        </ul>
      </Cartao>

      <section className="space-y-3">
        <Subtitulo>Em andamento</Subtitulo>
        {!abertos.length && <Vazio>Nenhum desafio aberto agora.</Vazio>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {abertos.map((d) => {
            const total = d.temporadas.turmas.alunos[0]?.count ?? 0;
            const feitos = d.tentativas.filter((t) => t.concluida_em).length;
            const pct = total ? Math.round((feitos / total) * 100) : 0;
            return (
              <Link
                key={d.id}
                href={`/professor/desafios/${d.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-marca-300"
              >
                <p className="text-xs font-semibold text-slate-500">Turma {d.temporadas.turmas.nome}</p>
                <p className="font-bold text-marca-900">
                  {d.especial && "★ "}
                  {d.titulo}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-marca-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 flex justify-between text-xs text-slate-500">
                  <span>
                    {feitos} de {total} concluíram
                  </span>
                  <span>fecha {formatarDataHora(d.fecha_em)}</span>
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <Cartao>
        <Subtitulo>Próximos</Subtitulo>
        {!agendados.length && !temporadas.length && <p className="text-sm text-slate-500">Nada agendado.</p>}
        <ul className="divide-y divide-slate-100 text-sm">
          {agendados.map((d) => (
            <li key={d.id} className="flex flex-wrap justify-between gap-2 py-2">
              <Link href={`/professor/desafios/${d.id}`} className="font-medium hover:text-marca-700">
                {d.especial && "★ "}
                {d.titulo} <span className="text-slate-500">· {d.temporadas.turmas.nome}</span>
              </Link>
              <Etiqueta cor="azul">abre {formatarDataHora(d.abre_em)}</Etiqueta>
            </li>
          ))}
          {temporadas.map((t) => (
            <Fragment key={t.id}>
              {t.encerramento && t.encerramento < t.data_prova && !pontuacaoEncerrada(t) && (
                <li className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/professor/turmas/${t.turma_id}`} className="font-medium hover:text-marca-700">
                    Encerramento da temporada {t.turmas.nome}{" "}
                    <span className="text-slate-500">· {t.turmas.escolas.nome}</span>
                  </Link>
                  <Etiqueta cor="ambar">{formatarData(t.encerramento)}</Etiqueta>
                </li>
              )}
              <li className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/professor/turmas/${t.turma_id}`} className="font-medium hover:text-marca-700">
                  Prova da turma {t.turmas.nome} <span className="text-slate-500">· {t.turmas.escolas.nome}</span>
                </Link>
                <Etiqueta>{formatarData(t.data_prova)}</Etiqueta>
              </li>
            </Fragment>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}

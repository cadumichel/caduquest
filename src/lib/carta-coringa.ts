import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { diasAte, hojeEmBrasilia } from "@/lib/datas";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import type { Temporada } from "@/lib/tipos-banco";

/**
 * Carta coringa: quem termina a temporada em 1º lugar escolhe o tema (uma página
 * ou um subtítulo da apostila) de uma questão da próxima prova. Empate no 1º
 * lugar: todos os empatados escolhem. Vale até PRAZO_DIAS antes da próxima prova,
 * para o professor ter tempo de montar a questão. O tema fica pendente até o
 * professor aprovar (podendo editar) e só então aparece para os alunos. Sem a
 * tabela (SQL não rodado), tudo aqui devolve vazio.
 */
export const PRAZO_DIAS = 7;

export type StatusCarta = "pendente" | "aprovada" | "recusada";

export type CartaCoringa = {
  id: string;
  tema: string;
  status: StatusCarta;
  alunoId: string;
  apelido: string;
  avatar: number;
  cor: number;
  turmaNome: string;
  temporadaNome: string;
};

/** Última temporada da turma que já terminou (a prova já passou). */
export async function ultimaTemporadaEncerrada(db: SupabaseClient, turmaId: string): Promise<Temporada | null> {
  const { data } = await db
    .from("temporadas")
    .select("id, turma_id, nome, narrativa, inicio, data_prova, capitulos")
    .eq("turma_id", turmaId)
    .lt("data_prova", hojeEmBrasilia())
    .order("data_prova", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as Temporada | undefined) ?? null;
}

/** Ids dos campeões (1º lugar com pontos) de uma temporada. */
export async function campeoesDaTemporada(db: SupabaseClient, temporada: Temporada): Promise<string[]> {
  const ranking = await rankingDaTemporada(db, temporada);
  return ranking.filter((l) => l.posicao === 1 && l.pontos > 0).map((l) => l.alunoId);
}

/** A janela de escolha ainda está aberta? Fecha PRAZO_DIAS antes da próxima prova. */
export function escolhaAberta(proximaProva: string | null): boolean {
  return proximaProva === null || diasAte(proximaProva) > PRAZO_DIAS;
}

/** Situação do aluno: se pode escolher (ou mudar) o tema da carta coringa. */
export async function cartaDoAluno(db: SupabaseClient, alunoId: string, turmaId: string) {
  const vencida = await ultimaTemporadaEncerrada(db, turmaId);
  if (!vencida || !(await campeoesDaTemporada(db, vencida)).includes(alunoId)) return null;
  const atual = await temporadaAtual(db, turmaId);
  const proximaProva = atual && atual.data_prova >= hojeEmBrasilia() ? atual.data_prova : null;
  const { data } = await db
    .from("cartas_coringa")
    .select("tema, status")
    .eq("temporada_id", vencida.id)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  return {
    temporada: vencida,
    tema: (data?.tema as string | undefined) ?? null,
    status: (data?.status as StatusCarta | undefined) ?? null,
    proximaProva,
    aberta: escolhaAberta(proximaProva),
  };
}

/**
 * Turmas que fazem a mesma prova: mesma escola e mesma série. Sem série
 * cadastrada, só a própria turma.
 */
export async function turmasIrmas(db: SupabaseClient, turmaId: string): Promise<string[]> {
  const { data: turma } = await db.from("turmas").select("escola_id, serie").eq("id", turmaId).maybeSingle();
  if (!turma?.serie?.trim()) return [turmaId];
  const { data } = await db.from("turmas").select("id, serie").eq("escola_id", turma.escola_id);
  const serie = turma.serie.trim().toLowerCase();
  const irmas = (data ?? []).filter((t) => (t.serie ?? "").trim().toLowerCase() === serie).map((t) => t.id as string);
  return irmas.length ? irmas : [turmaId];
}

/**
 * Cartas aprovadas dos campeões mais recentes da turma e das turmas da mesma
 * série. Com `todas`, inclui as pendentes e recusadas (painel do professor).
 */
export async function cartasParaAProxima(
  db: SupabaseClient,
  turmaId: string,
  { todas = false }: { todas?: boolean } = {},
): Promise<CartaCoringa[]> {
  return cartasDasTurmas(db, await turmasIrmas(db, turmaId), todas);
}

/** Só as cartas aprovadas da própria turma (para o conector, que lista turma por turma). */
export const cartasDaTurma = (db: SupabaseClient, turmaId: string) => cartasDasTurmas(db, [turmaId], false);

async function cartasDasTurmas(db: SupabaseClient, turmas: string[], todas: boolean): Promise<CartaCoringa[]> {
  const vencidas = (await Promise.all(turmas.map((t) => ultimaTemporadaEncerrada(db, t)))).filter(
    (t): t is Temporada => t !== null,
  );
  if (!vencidas.length) return [];
  let consulta = db
    .from("cartas_coringa")
    .select("id, tema, status, aluno_id, temporada_id, alunos(apelido, avatar, cor, turmas(nome))")
    .in(
      "temporada_id",
      vencidas.map((t) => t.id),
    )
    .order("criado_em");
  if (!todas) consulta = consulta.eq("status", "aprovada");
  const { data, error } = await consulta;
  if (error) return [];
  const nomeTemporada = new Map(vencidas.map((t) => [t.id, t.nome]));
  return (data ?? []).map((c) => {
    const a = c.alunos as unknown as { apelido: string; avatar: number; cor: number; turmas: { nome: string } };
    return {
      id: c.id as string,
      tema: c.tema as string,
      status: c.status as StatusCarta,
      alunoId: c.aluno_id as string,
      apelido: a.apelido,
      avatar: a.avatar,
      cor: a.cor,
      turmaNome: a.turmas.nome,
      temporadaNome: nomeTemporada.get(c.temporada_id as string) ?? "",
    };
  });
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { alunosDeTeste } from "@/lib/aluno-teste";
import { hojeEmBrasilia } from "@/lib/datas";
import { agruparPorSemana, calcularConstancia, segundaDaSemana } from "@/lib/constancia";
import { calcularMetaTurma, montarLigas } from "@/lib/ligas";
import { emPedacos, lerPorIds, lerTudo, respostasCorrigidas } from "@/lib/paginar";
import { arredondarPontos } from "@/lib/pontos";
import { montarRanking } from "@/lib/ranking";
import { bonusDeRevisoes, inicioDoDiaEmBrasilia } from "@/lib/revisao-bonus";
import { situacaoDesafio, ultimoDiaComPontos, type Temporada } from "@/lib/tipos-banco";

/** Temporada em curso da turma; se não houver, a próxima; senão, a última. */
export async function temporadaAtual(db: SupabaseClient, turmaId: string): Promise<Temporada | null> {
  const { data } = await db
    .from("temporadas")
    // "*" traz também o encerramento, quando o SQL dele já rodou.
    .select("*")
    .eq("turma_id", turmaId)
    .order("inicio", { ascending: true });
  const temporadas = (data ?? []) as Temporada[];
  const hoje = hojeEmBrasilia();
  return (
    temporadas.find((t) => t.inicio <= hoje && hoje <= t.data_prova) ??
    temporadas.find((t) => t.inicio > hoje) ??
    temporadas.at(-1) ??
    null
  );
}

type TentativaRanking = {
  id: string;
  aluno_id: string;
  desafio_id: string;
  pontos: number;
  concluida_em: string | null;
  indice_atual: number;
  ordem: string[];
};

type AlunoRanking = { id: string; apelido: string; avatar: number; cor: number };
type DesafioRanking = { id: string; tipo: string; abre_em: string; fecha_em: string };

/**
 * O que o ranking lê do banco. Em cache durante a requisição: o Início pede a
 * mesma temporada mais de uma vez (ranking, disputa entre turmas, carta coringa).
 * Tentativas e respostas são lidas página a página (o banco devolve no máximo
 * 1000 linhas por consulta, e uma temporada passa disso).
 */
const dadosDaTemporada = cache(async (db: SupabaseClient, temporadaId: string, turmaId: string) => {
  const [{ data: todosAlunos }, { data: desafios }, deTeste, { data: temporada }] = await Promise.all([
    db.from("alunos").select("id, apelido, avatar, cor").eq("turma_id", turmaId).eq("aprovado", true),
    db.from("desafios").select("id, tipo, abre_em, fecha_em").eq("temporada_id", temporadaId),
    alunosDeTeste(db, turmaId),
    // "*" traz também o encerramento, quando o SQL dele já rodou.
    db.from("temporadas").select("*").eq("id", temporadaId).maybeSingle(),
  ]);
  const tentativas = await lerPorIds<TentativaRanking>(
    db,
    "tentativas",
    "id, aluno_id, desafio_id, pontos, concluida_em, indice_atual, ordem",
    "desafio_id",
    (desafios ?? []).map((d) => d.id as string),
  );
  const respostas = await respostasCorrigidas<{ tentativa_id: string; fracao: number }>(
    db,
    "tentativa_id, fracao",
    tentativas.map((t) => t.id),
  );
  const revisoes = temporada
    ? await revisoesDaTemporada(
        db,
        ((todosAlunos ?? []) as AlunoRanking[]).map((a) => a.id),
        temporada as Temporada,
      )
    : [];
  return {
    todosAlunos: (todosAlunos ?? []) as AlunoRanking[],
    desafios: (desafios ?? []) as DesafioRanking[],
    deTeste,
    tentativas,
    respostas,
    temporada: temporada as Temporada | null,
    revisoes,
  };
});

/** Questões acertadas na revisão de erros pelos alunos da turma no período da temporada. */
async function revisoesDaTemporada(db: SupabaseClient, alunos: string[], temporada: Temporada) {
  if (!alunos.length) return [];
  const fim = ultimoDiaComPontos(temporada);
  // O dia seguinte ao último com pontos, à meia-noite de Brasília.
  const depois = new Date(new Date(`${fim}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
  const partes = await Promise.all(
    emPedacos(alunos).map((pedaco) =>
      lerTudo<{ aluno_id: string; acertou_em: string }>((de, ate) =>
        db
          .from("revisoes")
          .select("aluno_id, acertou_em")
          .in("aluno_id", pedaco)
          .gte("acertou_em", inicioDoDiaEmBrasilia(temporada.inicio))
          .lt("acertou_em", inicioDoDiaEmBrasilia(depois))
          .order("aluno_id")
          .order("questao_id")
          .range(de, ate),
      ).catch(() => []),
    ),
  );
  return partes.flat();
}

/**
 * Ranking completo de uma temporada. O cliente precisa poder ler alunos,
 * desafios, tentativas e respostas da turma (RLS do professor ou cliente admin).
 */
export async function rankingDaTemporada(
  db: SupabaseClient,
  temporada: Pick<Temporada, "id" | "turma_id">,
  verComo?: string,
) {
  return (await situacaoDaTemporada(db, temporada, verComo)).ranking;
}

/** Ranking, liga da semana e meta coletiva da turma, com as mesmas consultas. */
/**
 * Alunos de teste ficam de fora. `verComo` é o aluno que está olhando: se ele
 * for de teste, entra na própria visão (só ele se vê no ranking).
 */
export async function situacaoDaTemporada(
  db: SupabaseClient,
  temporada: Pick<Temporada, "id" | "turma_id">,
  verComo?: string,
) {
  const {
    todosAlunos,
    desafios,
    deTeste,
    tentativas: todasTentativas,
    respostas,
    temporada: dadosTemporada,
    revisoes,
  } = await dadosDaTemporada(db, temporada.id, temporada.turma_id);
  const alunos = todosAlunos.filter((a) => !deTeste.has(a.id) || a.id === verComo);
  // Na visão do aluno, o desafio que alguém ainda está respondendo só entra nos
  // pontos quando termina (ou quando o desafio fecha). Senão, bastaria olhar o
  // ranking depois de cada questão para saber se a resposta estava certa.
  // As respostas dessas tentativas também ficam de fora: só contam as das tentativas mantidas.
  const abertos = new Set(desafios.filter((d) => situacaoDesafio(d) === "aberto").map((d) => d.id));
  const tentativas = todasTentativas.filter(
    (t) => !verComo || !abertos.has(t.desafio_id) || Boolean(t.concluida_em) || t.indice_atual >= t.ordem.length,
  );

  const porAluno = new Map(
    alunos.map((a) => [
      a.id,
      { alunoId: a.id, apelido: a.apelido, avatar: a.avatar, cor: a.cor, pontos: 0, somaFracoes: 0, questoes: 0 },
    ]),
  );
  const alunoDaTentativa = new Map<string, string>();
  const semanaAtual = segundaDaSemana(new Date().toISOString());
  const semanaDoDesafio = new Map(desafios.map((d) => [d.id as string, segundaDaSemana(d.abre_em)]));
  const liga = new Map(
    alunos.map((a) => [a.id as string, { alunoId: a.id as string, pontosAntes: 0, pontosSemana: 0 }]),
  );
  for (const t of tentativas ?? []) {
    alunoDaTentativa.set(t.id, t.aluno_id);
    const e = porAluno.get(t.aluno_id);
    if (e) e.pontos += Number(t.pontos);
    const l = liga.get(t.aluno_id);
    const semana = semanaDoDesafio.get(t.desafio_id) ?? "";
    if (l && semana < semanaAtual) l.pontosAntes += Number(t.pontos);
    if (l && semana === semanaAtual) l.pontosSemana += Number(t.pontos);
  }
  for (const r of respostas ?? []) {
    const e = porAluno.get(alunoDaTentativa.get(r.tentativa_id) ?? "");
    if (e) {
      e.somaFracoes += Number(r.fracao);
      e.questoes += 1;
    }
  }

  // Ofensiva e meta da turma: só os desafios semanais contam.
  const semanais = desafios.filter((d) => d.tipo !== "relampago");
  const semanas = agruparPorSemana(semanais);
  const concluidosPorAluno = new Map<string, Set<string>>();
  for (const t of tentativas) {
    if (!(t.concluida_em || t.indice_atual >= t.ordem.length)) continue;
    const set = concluidosPorAluno.get(t.aluno_id) ?? new Set<string>();
    set.add(t.desafio_id);
    concluidosPorAluno.set(t.aluno_id, set);
  }
  const meta = calcularMetaTurma(semanas, concluidosPorAluno, [...porAluno.keys()]);
  // Erros corrigidos na revisão: pontos só no ranking geral (a liga da semana fica de fora).
  const acertosRevisao = new Map<string, string[]>();
  for (const r of revisoes) acertosRevisao.set(r.aluno_id, [...(acertosRevisao.get(r.aluno_id) ?? []), r.acertou_em]);
  for (const e of porAluno.values()) {
    const revisao = dadosTemporada
      ? bonusDeRevisoes(
          // Temporada encerrada pelo professor: o ranking congela na hora do encerramento.
          (acertosRevisao.get(e.alunoId) ?? []).filter(
            (a) => !dadosTemporada.encerrada_em || new Date(a) < new Date(dadosTemporada.encerrada_em),
          ),
          dadosTemporada.inicio,
          ultimoDiaComPontos(dadosTemporada),
        )
      : { bonus: 0, corrigidos: 0 };
    Object.assign(e, calcularConstancia(semanais, concluidosPorAluno.get(e.alunoId) ?? new Set()), {
      bonusTurma: meta.bonus,
      bonusRevisao: revisao.bonus,
      errosCorrigidos: revisao.corrigidos,
    });
  }
  return {
    ranking: montarRanking([...porAluno.values()]),
    meta,
    ligas: montarLigas(
      [...liga.values()].map((l) => ({
        ...l,
        pontosAntes: arredondarPontos(l.pontosAntes),
        pontosSemana: arredondarPontos(l.pontosSemana),
      })),
    ),
  };
}

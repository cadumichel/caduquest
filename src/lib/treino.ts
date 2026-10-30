import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlunoSessao } from "@/lib/aluno-sessao";
import { desafioDoAluno } from "@/lib/jogo";
import { montarVista } from "@/lib/questoes/apresentacao";
import { calcularPontos, corrigir } from "@/lib/questoes/correcao";
import { embaralhar, permutacaoAleatoria, permutacaoValida } from "@/lib/questoes/embaralhar";
import { schemaResposta, tamanhoPermutacao, type Conteudo, type Vista } from "@/lib/questoes/tipos";
import { situacaoDesafio, urlImagem, type Desafio } from "@/lib/tipos-banco";

/**
 * Refazer um desafio como treino: nada é gravado, então ranking, XP e medalhas
 * continuam contando só a primeira tentativa. Com o desafio aberto, só quem já
 * terminou pode treinar, e o treino mostra apenas a nota final (o gabarito só
 * sai quando o desafio fecha, para ninguém passar as respostas).
 */

export type QuestaoTreino = {
  id: string;
  enunciado: string;
  imagemUrl: string | null;
  vista: Vista;
  permutacao: number[];
};

export type ItemTreino = { questaoId: string; permutacao: number[]; resposta: unknown };

export type CorrecaoTreino = {
  questaoId: string;
  fracao: number;
  conteudo: Conteudo;
  explicacao: string | null;
};

async function desafioParaTreino(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
): Promise<{ desafio: Desafio; encerrado: boolean } | { erro: string }> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio) return { erro: "Desafio não encontrado." };
  const situacao = situacaoDesafio(desafio);
  if (situacao === "agendado") return { erro: "Este desafio ainda não abriu." };
  if (situacao === "aberto") {
    const { data: t } = await db
      .from("tentativas")
      .select("concluida_em, indice_atual, ordem")
      .eq("desafio_id", desafio.id)
      .eq("aluno_id", aluno.id)
      .maybeSingle();
    if (!t || !(t.concluida_em || t.indice_atual >= t.ordem.length)) {
      return { erro: "Termine o desafio valendo antes de treinar com ele." };
    }
  }
  return { desafio, encerrado: situacao === "encerrado" };
}

export async function iniciarTreino(db: SupabaseClient, aluno: AlunoSessao, desafioId: string) {
  const ok = await desafioParaTreino(db, aluno, desafioId);
  if ("erro" in ok) return ok;
  const { data } = await db
    .from("desafio_questoes")
    .select("questoes(id, tipo, enunciado, imagem_path, conteudo)")
    .eq("desafio_id", desafioId);
  const questoes = embaralhar(
    (
      (data ?? []) as unknown as {
        questoes: {
          id: string;
          tipo: Conteudo["tipo"];
          enunciado: string;
          imagem_path: string | null;
          conteudo: unknown;
        };
      }[]
    ).map((l) => l.questoes),
  ).map((q): QuestaoTreino => {
    const conteudo = { tipo: q.tipo, conteudo: q.conteudo } as Conteudo;
    const permutacao = permutacaoAleatoria(tamanhoPermutacao(conteudo));
    return {
      id: q.id,
      enunciado: q.enunciado,
      imagemUrl: urlImagem(q.imagem_path),
      vista: montarVista(conteudo, permutacao),
      permutacao,
    };
  });
  return { questoes, encerrado: ok.encerrado, pontosPorAcerto: ok.desafio.pontos_por_acerto };
}

/**
 * Corrige respostas do treino. Desafio encerrado: devolve o gabarito de cada uma.
 * Desafio aberto: devolve só o total, sem dizer quais acertou.
 */
export async function corrigirTreino(db: SupabaseClient, aluno: AlunoSessao, desafioId: string, itens: ItemTreino[]) {
  const ok = await desafioParaTreino(db, aluno, desafioId);
  if ("erro" in ok) return ok;
  const ids = [...new Set(itens.map((i) => i.questaoId))].slice(0, 50);
  const { data } = await db
    .from("desafio_questoes")
    .select("questoes(id, tipo, conteudo, explicacao)")
    .eq("desafio_id", desafioId)
    .in("questao_id", ids);
  const questoes = new Map(
    (
      (data ?? []) as unknown as {
        questoes: { id: string; tipo: Conteudo["tipo"]; conteudo: unknown; explicacao: string | null };
      }[]
    ).map((l) => [l.questoes.id, l.questoes]),
  );

  const correcoes: CorrecaoTreino[] = [];
  for (const item of itens.slice(0, 50)) {
    const q = questoes.get(item.questaoId);
    if (!q) continue;
    const conteudo = { tipo: q.tipo, conteudo: q.conteudo } as Conteudo;
    const r = item.resposta === null ? null : schemaResposta.safeParse(item.resposta);
    const fracao = permutacaoValida(item.permutacao, tamanhoPermutacao(conteudo))
      ? corrigir(conteudo, item.permutacao, r && r.success ? r.data : null)
      : 0;
    correcoes.push({ questaoId: q.id, fracao, conteudo, explicacao: q.explicacao });
  }
  const acertos = correcoes.reduce((s, c) => s + c.fracao, 0);
  return {
    acertos,
    pontos: calcularPontos(acertos, ok.desafio.pontos_por_acerto),
    // Com o desafio aberto, a nota sai sem dizer quais questões acertou.
    correcoes: ok.encerrado ? correcoes : [],
  };
}

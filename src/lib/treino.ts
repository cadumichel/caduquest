import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlunoSessao } from "@/lib/aluno-sessao";
import { desafioDoAluno } from "@/lib/jogo";
import { montarVista } from "@/lib/questoes/apresentacao";
import { calcularPontos, corrigir } from "@/lib/questoes/correcao";
import { embaralhar, permutacaoAleatoria, permutacaoValida } from "@/lib/questoes/embaralhar";
import { schemaResposta, tamanhoPermutacao, type Conteudo, type Vista } from "@/lib/questoes/tipos";
import { gabaritoLiberado, urlImagem, type Desafio } from "@/lib/tipos-banco";

/**
 * Refazer um desafio como treino: nada é gravado, então ranking, XP e medalhas
 * continuam contando só a primeira tentativa. Só depois que o desafio fecha:
 * antes disso, corrigir o treino questão a questão revelaria o gabarito.
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
): Promise<{ desafio: Desafio } | { erro: string }> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio) return { erro: "Desafio não encontrado." };
  // Mesmo prazo do gabarito: alguns minutos depois de fechar, quando ninguém mais responde.
  if (!gabaritoLiberado(desafio)) return { erro: "O treino abre alguns minutos depois que o desafio fecha." };
  return { desafio };
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
  return { questoes, pontosPorAcerto: ok.desafio.pontos_por_acerto };
}

/** Corrige respostas do treino e devolve o gabarito de cada uma. */
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
    correcoes,
  };
}

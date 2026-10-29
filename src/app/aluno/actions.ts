"use server";
import { revalidatePath } from "next/cache";
import { CORES_AVATAR, TOTAL_AVATARES } from "@/components/Avatar";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurma } from "@/lib/medalhas";
import { medalhasNecessarias } from "@/lib/personagens";
import { estadoAtual, responderQuestao, type EstadoJogo } from "@/lib/jogo";
import { montarVista } from "@/lib/questoes/apresentacao";
import { corrigir } from "@/lib/questoes/correcao";
import { permutacaoAleatoria } from "@/lib/questoes/embaralhar";
import { schemaResposta, tamanhoPermutacao, type Conteudo, type Vista } from "@/lib/questoes/tipos";
import { errosParaRevisar, QUESTOES_POR_RODADA, registrarRevisao } from "@/lib/revisao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlImagem } from "@/lib/tipos-banco";

export async function carregarJogo(desafioId: string, codigo?: string): Promise<EstadoJogo> {
  const aluno = await exigirAluno();
  return estadoAtual(
    criarClienteAdmin(),
    aluno,
    desafioId,
    typeof codigo === "string" ? codigo.slice(0, 10) : undefined,
  );
}

export async function enviarResposta(
  desafioId: string,
  questaoId: string,
  resposta: unknown,
  saidasTela: number,
): Promise<EstadoJogo> {
  const aluno = await exigirAluno();
  const r = resposta === null ? null : schemaResposta.safeParse(resposta);
  return responderQuestao(
    criarClienteAdmin(),
    aluno,
    desafioId,
    questaoId,
    r && r.success ? r.data : null,
    Number.isFinite(saidasTela) ? saidasTela : 0,
  );
}

export async function salvarPerfil(avatar: number, cor: number): Promise<{ erro?: string }> {
  const aluno = await exigirAluno();
  if (!Number.isInteger(avatar) || avatar < 0 || avatar >= TOTAL_AVATARES) return { erro: "Avatar inválido." };
  if (!Number.isInteger(cor) || cor < 0 || cor >= CORES_AVATAR.length) return { erro: "Cor inválida." };
  const db = criarClienteAdmin();
  const precisa = medalhasNecessarias(avatar);
  if (precisa > 0 && ((await medalhasDaTurma(db, aluno.turmaId)).get(aluno.id) ?? 0) < precisa) {
    return { erro: "Esse personagem ainda está bloqueado. Vença mais desafios para liberar!" };
  }
  const { error } = await db.from("alunos").update({ avatar, cor }).eq("id", aluno.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/aluno", "layout");
  return {};
}

export type QuestaoRevisao = {
  id: string;
  enunciado: string;
  imagemUrl: string | null;
  vista: Vista;
  permutacao: number[];
};

export type CorrecaoRevisao = {
  fracao: number;
  conteudo: Conteudo;
  explicacao: string | null;
};

/**
 * Próxima questão da revisão de erros, sem repetir as já feitas nesta rodada.
 * Sem tempo limite: o gabarito destas questões já é público.
 */
export async function proximaRevisao(
  feitas: string[],
): Promise<{ questao: QuestaoRevisao; posicao: number; total: number } | null> {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const jaFeitas = new Set(Array.isArray(feitas) ? feitas.slice(0, QUESTOES_POR_RODADA) : []);
  if (jaFeitas.size >= QUESTOES_POR_RODADA) return null;
  const erros = await errosParaRevisar(db, aluno.id, aluno.turmaId);
  const total = Math.min(QUESTOES_POR_RODADA, jaFeitas.size + erros.filter((id) => !jaFeitas.has(id)).length);
  const id = erros.find((e) => !jaFeitas.has(e));
  if (!id) return null;
  const { data: q } = await db
    .from("questoes")
    .select("id, tipo, enunciado, imagem_path, conteudo")
    .eq("id", id)
    .single();
  if (!q) return null;
  const conteudo = { tipo: q.tipo, conteudo: q.conteudo } as Conteudo;
  const permutacao = permutacaoAleatoria(tamanhoPermutacao(conteudo));
  return {
    questao: {
      id: q.id,
      enunciado: q.enunciado,
      imagemUrl: urlImagem(q.imagem_path),
      vista: montarVista(conteudo, permutacao),
      permutacao,
    },
    posicao: jaFeitas.size + 1,
    total,
  };
}

export async function responderRevisao(
  questaoId: string,
  permutacao: number[],
  resposta: unknown,
): Promise<CorrecaoRevisao | { erro: string }> {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  // Só vale para uma questão que o aluno errou num desafio encerrado da turma dele.
  if (!(await errosParaRevisar(db, aluno.id, aluno.turmaId)).includes(questaoId)) {
    return { erro: "Esta questão não está na sua revisão." };
  }
  const { data: q } = await db.from("questoes").select("tipo, conteudo, explicacao").eq("id", questaoId).single();
  if (!q) return { erro: "Questão não encontrada." };
  const conteudo = { tipo: q.tipo, conteudo: q.conteudo } as Conteudo;
  const n = tamanhoPermutacao(conteudo);
  const permValida =
    Array.isArray(permutacao) &&
    permutacao.length === n &&
    new Set(permutacao).size === n &&
    permutacao.every((i) => Number.isInteger(i) && i >= 0 && i < n);
  if (!permValida) return { erro: "Resposta inválida." };
  const r = resposta === null ? null : schemaResposta.safeParse(resposta);
  const fracao = corrigir(conteudo, permutacao, r && r.success ? r.data : null);
  await registrarRevisao(db, aluno.id, questaoId, fracao === 1);
  revalidatePath("/aluno");
  return { fracao, conteudo, explicacao: q.explicacao };
}

"use server";
import { revalidatePath } from "next/cache";
import { CORES_AVATAR, TOTAL_AVATARES } from "@/components/Avatar";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurma } from "@/lib/medalhas";
import { apelidoImproprio } from "@/lib/apelido";
import { cartaDoAluno } from "@/lib/carta-coringa";
import { personagemLiberado } from "@/lib/personagens";
import { calcularConquistas } from "@/lib/progresso";
import { progressoDoAluno } from "@/lib/progresso-dados";
import { rankingParaAluno } from "@/lib/ranking";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import { fundoLiberado, FUNDOS } from "@/lib/visual-perfil";
import {
  abrirDica,
  eliminarAlternativa,
  estadoAtual,
  responderQuestao,
  type EstadoJogo,
  type ResultadoAjuda,
} from "@/lib/jogo";
import { corrigirTreino, iniciarTreino, type ItemTreino } from "@/lib/treino";
import { montarVista } from "@/lib/questoes/apresentacao";
import { corrigir } from "@/lib/questoes/correcao";
import { permutacaoAleatoria, permutacaoValida } from "@/lib/questoes/embaralhar";
import { schemaResposta, tamanhoPermutacao, type Conteudo, type Vista } from "@/lib/questoes/tipos";
import { errosParaRevisar, QUESTOES_POR_RODADA, registrarRevisao } from "@/lib/revisao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ehMotivoZerada } from "@/lib/tela-protegida";
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
  motivo: unknown = null,
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
    ehMotivoZerada(motivo) ? motivo : null,
  );
}

/** Ajuda da temporada: elimina uma alternativa errada da questão atual. */
export async function eliminar(desafioId: string, questaoId: string): Promise<ResultadoAjuda> {
  const aluno = await exigirAluno();
  return eliminarAlternativa(criarClienteAdmin(), aluno, String(desafioId), String(questaoId));
}

/** Ajuda da temporada: mostra a dica da questão atual. */
export async function pedirDica(desafioId: string, questaoId: string): Promise<ResultadoAjuda> {
  const aluno = await exigirAluno();
  return abrirDica(criarClienteAdmin(), aluno, String(desafioId), String(questaoId));
}

/** Refazer como treino: questões novamente embaralhadas, sem gravar nada. */
export async function comecarTreino(desafioId: string) {
  const aluno = await exigirAluno();
  return iniciarTreino(criarClienteAdmin(), aluno, String(desafioId));
}

export async function corrigirRespostasTreino(desafioId: string, itens: ItemTreino[]) {
  const aluno = await exigirAluno();
  return corrigirTreino(criarClienteAdmin(), aluno, String(desafioId), Array.isArray(itens) ? itens : []);
}

export async function salvarPerfil(avatar: number, cor: number): Promise<{ erro?: string }> {
  const aluno = await exigirAluno();
  if (!Number.isInteger(avatar) || avatar < 0 || avatar >= TOTAL_AVATARES) return { erro: "Avatar inválido." };
  if (!Number.isInteger(cor) || cor < 0 || cor >= CORES_AVATAR.length) return { erro: "Cor inválida." };
  const db = criarClienteAdmin();
  // O personagem atual sempre pode ficar (quem escolheu antes das regras de desbloqueio).
  if (avatar !== aluno.avatar) {
    const [medalhas, { nivel }] = await Promise.all([
      medalhasDaTurma(db, aluno.turmaId),
      progressoDoAluno(aluno.id, aluno.turmaId),
    ]);
    if (!personagemLiberado(avatar, { nivel, medalhas: medalhas.get(aluno.id) ?? 0 })) {
      return { erro: "Esse personagem ainda está bloqueado. Suba de nível ou vença desafios para liberar!" };
    }
  }
  const { error } = await db.from("alunos").update({ avatar, cor }).eq("id", aluno.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/aluno", "layout");
  return {};
}

/** Fundo do cartão e título do perfil. título null = nome do nível. */
export async function salvarVisual(fundo: number, titulo: string | null): Promise<{ erro?: string }> {
  const aluno = await exigirAluno();
  if (!Number.isInteger(fundo) || fundo < 0 || fundo >= FUNDOS.length) return { erro: "Fundo inválido." };
  const db = criarClienteAdmin();
  const [medalhasTurma, progresso, temporada] = await Promise.all([
    medalhasDaTurma(db, aluno.turmaId),
    progressoDoAluno(aluno.id, aluno.turmaId),
    temporadaAtual(db, aluno.turmaId),
  ]);
  const medalhas = medalhasTurma.get(aluno.id) ?? 0;
  if (!fundoLiberado(fundo, { nivel: progresso.nivel, medalhas })) return { erro: "Esse fundo ainda está bloqueado." };
  if (titulo !== null) {
    const { eu } = rankingParaAluno(temporada ? await rankingDaTemporada(db, temporada) : [], aluno.id);
    const conquistas = calcularConquistas(progresso, {
      posicao: eu?.posicao ?? null,
      pontos: eu?.pontos ?? 0,
      medalhas,
      maiorSequencia: eu?.maiorSequencia ?? 0,
    });
    if (!conquistas.some((c) => c.id === titulo && c.conquistada)) return { erro: "Título ainda não conquistado." };
  }
  const { error } = await db.from("alunos").update({ fundo, titulo }).eq("id", aluno.id);
  if (error) return { erro: "Não foi possível salvar. Peça ao professor para atualizar o app." };
  revalidatePath("/aluno/perfil");
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
  if (!permutacaoValida(permutacao, tamanhoPermutacao(conteudo))) return { erro: "Resposta inválida." };
  const r = resposta === null ? null : schemaResposta.safeParse(resposta);
  const fracao = corrigir(conteudo, permutacao, r && r.success ? r.data : null);
  await registrarRevisao(db, aluno.id, questaoId, fracao === 1);
  revalidatePath("/aluno");
  return { fracao, conteudo, explicacao: q.explicacao };
}

/** Carta coringa: o campeão registra (ou muda) o tema da questão da próxima prova. */
export async function salvarCarta(temaBruto: string): Promise<{ erro?: string; ok?: string }> {
  const aluno = await exigirAluno();
  const tema = String(temaBruto ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (tema.length < 3 || tema.length > 160) return { erro: "Escreva o tema em 3 a 160 caracteres." };
  if (apelidoImproprio(tema)) return { erro: "Esse texto não pode ser usado. Escreva só o tema da apostila." };
  const db = criarClienteAdmin();
  const carta = await cartaDoAluno(db, aluno.id, aluno.turmaId);
  if (!carta) return { erro: "Só o campeão da última temporada pode usar a carta coringa." };
  if (!carta.aberta) return { erro: "O prazo para escolher o tema já terminou." };
  const { error } = await db.from("cartas_coringa").upsert(
    // Todo tema novo (ou mudado) volta para a aprovação do professor.
    {
      temporada_id: carta.temporada.id,
      aluno_id: aluno.id,
      tema,
      status: "pendente",
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "temporada_id,aluno_id" },
  );
  if (error) return { erro: "Não foi possível salvar. Peça ao professor para atualizar o app." };
  revalidatePath("/aluno");
  return {
    ok: "Tema enviado! Ele aparece para todos assim que o professor aprovar, e vira uma questão da próxima prova.",
  };
}

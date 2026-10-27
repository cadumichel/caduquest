import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlunoSessao } from "@/lib/aluno-sessao";
import { montarVista } from "@/lib/questoes/apresentacao";
import { calcularPontos, corrigir, FOLGA_SEGUNDOS, tempoEsgotado } from "@/lib/questoes/correcao";
import { codigoConfere } from "@/lib/cadurush";
import { embaralhar, permutacaoAleatoria } from "@/lib/questoes/embaralhar";
import { tamanhoPermutacao, type Conteudo, type Resposta, type Vista } from "@/lib/questoes/tipos";
import type { Desafio, RespostaBanco, Tentativa } from "@/lib/tipos-banco";
import { situacaoDesafio, urlImagem } from "@/lib/tipos-banco";

export type QuestaoServida = {
  id: string;
  enunciado: string;
  imagemUrl: string | null;
  vista: Vista;
  tempoLimite: number;
  restanteMs: number;
  /** Sair da tela zera a questão (opção do desafio). */
  saidaZera: boolean;
};

export type EstadoJogo =
  | { fase: "questao"; questao: QuestaoServida; posicao: number; total: number; aviso?: string }
  | { fase: "fim"; aviso?: string }
  /** CaduRush: falta o código do dia (ou o digitado não confere). */
  | { fase: "codigo"; mensagem?: string; aviso?: string }
  | { fase: "erro"; mensagem: string };

type QuestaoBanco = {
  id: string;
  tipo: Conteudo["tipo"];
  enunciado: string;
  imagem_path: string | null;
  tempo_limite_s: number;
  conteudo: Conteudo["conteudo"];
};

/** Desafio só se for da turma do aluno. */
export async function desafioDoAluno(db: SupabaseClient, aluno: AlunoSessao, desafioId: string) {
  const { data } = await db
    .from("desafios")
    .select(
      "id, temporada_id, tipo, codigo_dia, titulo, abre_em, fecha_em, pontos_por_acerto, tempo_por_questao_s, saida_zera_questao, temporadas!inner(turma_id)",
    )
    .eq("id", desafioId)
    .eq("temporadas.turma_id", aluno.turmaId)
    .maybeSingle();
  return (data as (Desafio & { temporadas: unknown }) | null) ?? null;
}

async function carregarQuestao(db: SupabaseClient, id: string): Promise<QuestaoBanco> {
  const { data, error } = await db
    .from("questoes")
    .select("id, tipo, enunciado, imagem_path, tempo_limite_s, conteudo")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Questão não encontrada");
  return data as QuestaoBanco;
}

const comoConteudo = (q: QuestaoBanco) => ({ tipo: q.tipo, conteudo: q.conteudo }) as Conteudo;

/** O desafio pode fixar um tempo único para todas as questões. */
const tempoDaQuestao = (desafio: Desafio, q: QuestaoBanco) => desafio.tempo_por_questao_s ?? q.tempo_limite_s;

async function recalcularTentativa(db: SupabaseClient, tentativa: Tentativa, novoIndice: number) {
  const { data: respostas } = await db.from("respostas").select("pontos").eq("tentativa_id", tentativa.id);
  const pontos = (respostas ?? []).reduce((s, r) => s + Number(r.pontos ?? 0), 0);
  await db
    .from("tentativas")
    .update({
      indice_atual: novoIndice,
      pontos,
      concluida_em: novoIndice >= tentativa.ordem.length ? new Date().toISOString() : null,
    })
    .eq("id", tentativa.id)
    .eq("indice_atual", tentativa.indice_atual);
}

/**
 * Registra a resposta (ou o tempo esgotado) de uma questão servida.
 * Só a primeira gravação vale: um segundo envio da mesma questão é ignorado.
 * Devolve true se a questão foi zerada porque o aluno saiu da tela.
 */
async function registrar(
  db: SupabaseClient,
  desafio: Desafio,
  tentativa: Tentativa,
  linha: RespostaBanco,
  questao: QuestaoBanco,
  resposta: Resposta | null,
  saidasTela: number,
) {
  const agora = new Date();
  const esgotado = tempoEsgotado(new Date(linha.servida_em), agora, tempoDaQuestao(desafio, questao));
  const zerada = !esgotado && desafio.saida_zera_questao && saidasTela > 0;
  const fracao = esgotado || zerada ? 0 : corrigir(comoConteudo(questao), linha.permutacao, resposta);
  const { data: gravada } = await db
    .from("respostas")
    .update({
      respondida_em: agora.toISOString(),
      resposta,
      fracao,
      pontos: calcularPontos(fracao, desafio.pontos_por_acerto),
      tempo_esgotado: esgotado,
      zerada_por_saida: zerada,
      saidas_tela: Math.max(0, Math.min(saidasTela, 999)),
    })
    .eq("id", linha.id)
    .is("respondida_em", null)
    .select("id");
  if (gravada?.length) await recalcularTentativa(db, tentativa, tentativa.indice_atual + 1);
  return Boolean(gravada?.length) && zerada;
}

async function obterOuCriarTentativa(db: SupabaseClient, desafioId: string, alunoId: string): Promise<Tentativa> {
  const { data: existente } = await db
    .from("tentativas")
    .select("*")
    .eq("desafio_id", desafioId)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  if (existente) return existente as Tentativa;

  const { data: questoes } = await db.from("desafio_questoes").select("questao_id").eq("desafio_id", desafioId);
  const ordem = embaralhar((questoes ?? []).map((q) => q.questao_id as string));
  const { data: nova, error } = await db
    .from("tentativas")
    .insert({ desafio_id: desafioId, aluno_id: alunoId, ordem })
    .select("*")
    .single();
  if (error) {
    // Duas abas ao mesmo tempo: a outra criou primeiro.
    const { data } = await db
      .from("tentativas")
      .select("*")
      .eq("desafio_id", desafioId)
      .eq("aluno_id", alunoId)
      .single();
    return data as Tentativa;
  }
  return nova as Tentativa;
}

/**
 * Devolve a questão atual do aluno, servindo uma nova se preciso.
 * Se a questão atual já estourou o tempo (o aluno saiu e voltou), ela vale zero
 * e o jogo avança: o cronômetro corre mesmo fora da tela.
 */
export async function estadoAtual(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
  codigo?: string,
): Promise<EstadoJogo> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio) return { fase: "erro", mensagem: "Desafio não encontrado." };

  // CaduRush: só começa com o código do dia mostrado pelo professor.
  if (
    desafio.tipo === "relampago" &&
    situacaoDesafio(desafio) === "aberto" &&
    !codigoConfere(codigo, desafio.codigo_dia)
  ) {
    const { count } = await db
      .from("tentativas")
      .select("id", { count: "exact", head: true })
      .eq("desafio_id", desafio.id)
      .eq("aluno_id", aluno.id);
    if (!count) {
      return { fase: "codigo", mensagem: codigo ? "Código errado. Confira o código no quadro." : undefined };
    }
  }

  for (let guarda = 0; guarda < 50; guarda++) {
    const situacao = situacaoDesafio(desafio);
    if (situacao === "agendado") return { fase: "erro", mensagem: "Este desafio ainda não abriu." };
    if (situacao === "encerrado") return { fase: "fim" };
    const tentativa = await obterOuCriarTentativa(db, desafio.id, aluno.id);
    if (tentativa.indice_atual >= tentativa.ordem.length || tentativa.concluida_em) return { fase: "fim" };

    const questaoId = tentativa.ordem[tentativa.indice_atual];
    const questao = await carregarQuestao(db, questaoId);
    const { data: linhaExistente } = await db
      .from("respostas")
      .select("*")
      .eq("tentativa_id", tentativa.id)
      .eq("questao_id", questaoId)
      .maybeSingle();

    let linha = linhaExistente as RespostaBanco | null;
    if (linha?.respondida_em) {
      // Resposta gravada mas índice não avançou (falha no meio): corrige e segue.
      await recalcularTentativa(db, tentativa, tentativa.indice_atual + 1);
      continue;
    }
    if (!linha) {
      const { data: nova } = await db
        .from("respostas")
        .upsert(
          {
            tentativa_id: tentativa.id,
            questao_id: questaoId,
            posicao: tentativa.indice_atual,
            permutacao: permutacaoAleatoria(tamanhoPermutacao(comoConteudo(questao))),
          },
          { onConflict: "tentativa_id,questao_id", ignoreDuplicates: true },
        )
        .select("*");
      linha = (nova?.[0] as RespostaBanco | undefined) ?? null;
      if (!linha) continue; // outra aba criou: relê
    }

    const agora = new Date();
    const tempoLimite = tempoDaQuestao(desafio, questao);
    if (tempoEsgotado(new Date(linha.servida_em), agora, tempoLimite)) {
      await registrar(db, desafio, tentativa, linha, questao, null, 0);
      continue;
    }

    const decorrido = agora.getTime() - new Date(linha.servida_em).getTime();
    return {
      fase: "questao",
      posicao: tentativa.indice_atual + 1,
      total: tentativa.ordem.length,
      questao: {
        id: questao.id,
        enunciado: questao.enunciado,
        imagemUrl: urlImagem(questao.imagem_path),
        vista: montarVista(comoConteudo(questao), linha.permutacao),
        tempoLimite,
        restanteMs: Math.max(0, tempoLimite * 1000 - decorrido),
        saidaZera: desafio.saida_zera_questao,
      },
    };
  }
  return { fase: "erro", mensagem: "Não foi possível carregar a questão. Tente de novo." };
}

export async function responderQuestao(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
  questaoId: string,
  resposta: Resposta | null,
  saidasTela: number,
): Promise<EstadoJogo> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio) return { fase: "erro", mensagem: "Desafio não encontrado." };
  // Depois do fechamento, aceita só quem já estava respondendo (até o tempo da questão).
  if (new Date() > new Date(new Date(desafio.fecha_em).getTime() + (180 + FOLGA_SEGUNDOS) * 1000)) {
    return { fase: "fim" };
  }

  const { data: tentativa } = await db
    .from("tentativas")
    .select("*")
    .eq("desafio_id", desafio.id)
    .eq("aluno_id", aluno.id)
    .maybeSingle();
  if (!tentativa) return estadoAtual(db, aluno, desafioId);
  const t = tentativa as Tentativa;

  let zerada = false;
  if (t.ordem[t.indice_atual] === questaoId) {
    const { data: linha } = await db
      .from("respostas")
      .select("*")
      .eq("tentativa_id", t.id)
      .eq("questao_id", questaoId)
      .maybeSingle();
    if (linha && !linha.respondida_em) {
      const questao = await carregarQuestao(db, questaoId);
      zerada = await registrar(db, desafio, t, linha as RespostaBanco, questao, resposta, saidasTela);
    }
  }
  const estado = await estadoAtual(db, aluno, desafioId);
  if (zerada && estado.fase !== "erro") {
    estado.aviso = "Você saiu da tela durante a questão anterior, então ela valeu zero.";
  }
  return estado;
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlunoSessao } from "@/lib/aluno-sessao";
import { montarVista } from "@/lib/questoes/apresentacao";
import { calcularPontos, corrigir, JANELA_APOS_FECHAR_S, tempoEsgotado } from "@/lib/questoes/correcao";
import { codigoConfere, LIMITE_TENTATIVAS_CODIGO } from "@/lib/cadurush";
import {
  candidatasEliminacao,
  DICAS_POR_TEMPORADA,
  ELIMINACOES_POR_TEMPORADA,
  eliminadasNaVista,
} from "@/lib/questoes/ajudas";
import { embaralhar, permutacaoAleatoria } from "@/lib/questoes/embaralhar";
import { tamanhoPermutacao, type Conteudo, type Resposta, type Vista } from "@/lib/questoes/tipos";
import type { Desafio, RespostaBanco, Tentativa } from "@/lib/tipos-banco";
import { situacaoDesafio, urlImagem } from "@/lib/tipos-banco";
import { arredondarPontos } from "./pontos";
import { AVISO_ZERADA, type MotivoZerada } from "./tela-protegida";

export type QuestaoServida = {
  id: string;
  enunciado: string;
  imagemUrl: string | null;
  vista: Vista;
  tempoLimite: number;
  restanteMs: number;
  /** Sair da tela zera a questão (opção do desafio). */
  saidaZera: boolean;
  /** Posições (na tela) das alternativas já eliminadas. */
  eliminadas: number[];
  /** Ainda dá para eliminar uma alternativa errada nesta questão. */
  podeEliminar: boolean;
  temDica: boolean;
  /** Texto da dica, se o aluno já abriu nesta questão. */
  dica: string | null;
};

/** Ajudas que ainda restam ao aluno na temporada. null = indisponível (banco sem as colunas). */
export type Ajudas = { eliminacoes: number; dicas: number } | null;

export type ResultadoAjuda = {
  erro?: string;
  eliminadas?: number[];
  podeEliminar?: boolean;
  dica?: string;
  ajudas?: Ajudas;
};

export type EstadoJogo =
  | { fase: "questao"; questao: QuestaoServida; posicao: number; total: number; ajudas: Ajudas; aviso?: string }
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
    // "*" traz também as colunas do gabarito manual, quando o SQL delas já rodou.
    .select("*, temporadas!inner(turma_id)")
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

/** Lida à parte: se o SQL das ajudas ainda não rodou, a questão carrega sem dica. */
async function dicaDaQuestao(db: SupabaseClient, id: string): Promise<string | null> {
  const { data } = await db.from("questoes").select("dica").eq("id", id).maybeSingle();
  const dica = (data as { dica?: string | null } | null)?.dica?.trim();
  return dica || null;
}

/** Cota da temporada menos o que o aluno já usou nos desafios dela. */
export async function ajudasRestantes(db: SupabaseClient, alunoId: string, temporadaId: string): Promise<Ajudas> {
  const { data, error } = await db
    .from("tentativas")
    .select("id, desafios!inner(temporada_id), respostas(eliminadas, dica_usada)")
    .eq("aluno_id", alunoId)
    .eq("desafios.temporada_id", temporadaId);
  if (error) return null;
  let eliminacoes = 0;
  let dicas = 0;
  for (const t of (data ?? []) as { respostas: { eliminadas: number[] | null; dica_usada: boolean }[] }[]) {
    for (const r of t.respostas ?? []) {
      eliminacoes += r.eliminadas?.length ?? 0;
      if (r.dica_usada) dicas++;
    }
  }
  return {
    eliminacoes: Math.max(0, ELIMINACOES_POR_TEMPORADA - eliminacoes),
    dicas: Math.max(0, DICAS_POR_TEMPORADA - dicas),
  };
}

const comoConteudo = (q: QuestaoBanco) => ({ tipo: q.tipo, conteudo: q.conteudo }) as Conteudo;

/** O desafio pode fixar um tempo único para todas as questões. */
const tempoDaQuestao = (desafio: Desafio, q: QuestaoBanco) => desafio.tempo_por_questao_s ?? q.tempo_limite_s;

async function recalcularTentativa(db: SupabaseClient, tentativa: Tentativa, novoIndice: number) {
  const { data: respostas } = await db.from("respostas").select("pontos").eq("tentativa_id", tentativa.id);
  const pontos = arredondarPontos((respostas ?? []).reduce((s, r) => s + Number(r.pontos ?? 0), 0));
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
 * Devolve o motivo se a questão foi zerada (saída da tela, tecla ou tela alterada).
 */
async function registrar(
  db: SupabaseClient,
  desafio: Desafio,
  tentativa: Tentativa,
  linha: RespostaBanco,
  questao: QuestaoBanco,
  resposta: Resposta | null,
  saidasTela: number,
  motivo: MotivoZerada | null,
): Promise<MotivoZerada | null> {
  const agora = new Date();
  const esgotado = tempoEsgotado(new Date(linha.servida_em), agora, tempoDaQuestao(desafio, questao));
  const causa = esgotado || !desafio.saida_zera_questao ? null : (motivo ?? (saidasTela > 0 ? "saida" : null));
  const zerada = causa !== null;
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
      motivo_zerada: causa,
      saidas_tela: Math.max(0, Math.min(saidasTela, 999)),
    })
    .eq("id", linha.id)
    .is("respondida_em", null)
    .select("id");
  if (gravada?.length) await recalcularTentativa(db, tentativa, tentativa.indice_atual + 1);
  return gravada?.length ? causa : null;
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
  if (desafio.tipo === "relampago" && desafio.codigo_dia && situacaoDesafio(desafio) === "aberto") {
    const { count } = await db
      .from("tentativas")
      .select("id", { count: "exact", head: true })
      .eq("desafio_id", desafio.id)
      .eq("aluno_id", aluno.id);
    if (!count) {
      if (!codigo) return { fase: "codigo" };
      // Conta a tentativa antes de conferir, para ninguém testar todas as combinações
      // (nem com vários pedidos ao mesmo tempo). Sem o SQL do limite, só confere.
      const { data: usadas, error } = await db.rpc("contar_tentativa_codigo", {
        p_desafio: desafio.id,
        p_aluno: aluno.id,
        p_codigo: desafio.codigo_dia,
      });
      if (!error && Number(usadas) > LIMITE_TENTATIVAS_CODIGO) {
        return { fase: "codigo", mensagem: "Muitas tentativas erradas. Peça ajuda ao professor." };
      }
      if (!codigoConfere(codigo, desafio.codigo_dia)) {
        return { fase: "codigo", mensagem: "Código errado. Confira o código no quadro." };
      }
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
      await registrar(db, desafio, tentativa, linha, questao, null, 0, null);
      continue;
    }

    const decorrido = agora.getTime() - new Date(linha.servida_em).getTime();
    const conteudo = comoConteudo(questao);
    const eliminadas = linha.eliminadas ?? [];
    const [dica, ajudas] = await Promise.all([
      dicaDaQuestao(db, questao.id),
      ajudasRestantes(db, aluno.id, desafio.temporada_id),
    ]);
    return {
      fase: "questao",
      posicao: tentativa.indice_atual + 1,
      total: tentativa.ordem.length,
      ajudas,
      questao: {
        id: questao.id,
        enunciado: questao.enunciado,
        imagemUrl: urlImagem(questao.imagem_path),
        vista: montarVista(conteudo, linha.permutacao),
        tempoLimite,
        restanteMs: Math.max(0, tempoLimite * 1000 - decorrido),
        saidaZera: desafio.saida_zera_questao,
        eliminadas: eliminadasNaVista(linha.permutacao, eliminadas),
        podeEliminar: candidatasEliminacao(conteudo, eliminadas).length > 0,
        temDica: Boolean(dica),
        dica: linha.dica_usada ? dica : null,
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
  motivo: MotivoZerada | null = null,
): Promise<EstadoJogo> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio) return { fase: "erro", mensagem: "Desafio não encontrado." };
  // Depois do fechamento, aceita só quem já estava respondendo (até o tempo da questão).
  if (new Date() > new Date(new Date(desafio.fecha_em).getTime() + JANELA_APOS_FECHAR_S * 1000)) {
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

  let zerada: MotivoZerada | null = null;
  if (t.ordem[t.indice_atual] === questaoId) {
    const { data: linha } = await db
      .from("respostas")
      .select("*")
      .eq("tentativa_id", t.id)
      .eq("questao_id", questaoId)
      .maybeSingle();
    if (linha && !linha.respondida_em) {
      const questao = await carregarQuestao(db, questaoId);
      // Teclado liberado pelo professor (acessibilidade): tecla não zera.
      if (motivo === "teclado") {
        const { data: a } = await db.from("alunos").select("teclado_liberado").eq("id", aluno.id).single();
        if (a?.teclado_liberado) motivo = null;
      }
      zerada = await registrar(db, desafio, t, linha as RespostaBanco, questao, resposta, saidasTela, motivo);
    }
  }
  const estado = await estadoAtual(db, aluno, desafioId);
  if (zerada && estado.fase !== "erro") {
    estado.aviso = AVISO_ZERADA[zerada];
  }
  return estado;
}

/** Questão que o aluno está respondendo agora, dentro do tempo; senão, o motivo. */
async function questaoEmAndamento(db: SupabaseClient, aluno: AlunoSessao, desafioId: string, questaoId: string) {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio || situacaoDesafio(desafio) !== "aberto") return { erro: "Este desafio não está aberto." } as const;
  const { data: tentativa } = await db
    .from("tentativas")
    .select("*")
    .eq("desafio_id", desafio.id)
    .eq("aluno_id", aluno.id)
    .maybeSingle();
  const t = tentativa as Tentativa | null;
  if (!t || t.ordem[t.indice_atual] !== questaoId) return { erro: "Esta questão já passou." } as const;
  const { data: linha } = await db
    .from("respostas")
    .select("*")
    .eq("tentativa_id", t.id)
    .eq("questao_id", questaoId)
    .maybeSingle();
  const l = linha as RespostaBanco | null;
  if (!l || l.respondida_em) return { erro: "Esta questão já passou." } as const;
  const questao = await carregarQuestao(db, questaoId);
  if (tempoEsgotado(new Date(l.servida_em), new Date(), tempoDaQuestao(desafio, questao))) {
    return { erro: "O tempo desta questão acabou." } as const;
  }
  return { desafio, linha: l, questao };
}

/** Elimina uma alternativa errada, sorteada, da questão atual. Gasta 1 da cota da temporada. */
export async function eliminarAlternativa(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
  questaoId: string,
): Promise<ResultadoAjuda> {
  const atual = await questaoEmAndamento(db, aluno, desafioId, questaoId);
  if ("erro" in atual) return { erro: atual.erro };
  const { desafio, linha, questao } = atual;
  const ajudas = await ajudasRestantes(db, aluno.id, desafio.temporada_id);
  if (!ajudas) return { erro: "Ajudas indisponíveis. Peça ao professor para atualizar o app." };
  if (ajudas.eliminacoes <= 0) return { erro: "Você já usou todas as eliminações desta temporada.", ajudas };
  const conteudo = comoConteudo(questao);
  const antes = linha.eliminadas ?? [];
  const candidatas = candidatasEliminacao(conteudo, antes);
  if (!candidatas.length) return { erro: "Não dá para eliminar mais alternativas nesta questão.", ajudas };
  const eliminadas = [...antes, candidatas[Math.floor(Math.random() * candidatas.length)]];
  const { data: gravada } = await db
    .from("respostas")
    .update({ eliminadas })
    .eq("id", linha.id)
    .is("respondida_em", null)
    // Trava otimista: toques simultâneos leem o mesmo estado e só um grava.
    .eq("eliminadas", `{${antes.join(",")}}`)
    .select("id");
  if (!gravada?.length) return { erro: "Não foi possível eliminar agora. Tente de novo." };
  return {
    eliminadas: eliminadasNaVista(linha.permutacao, eliminadas),
    podeEliminar: candidatasEliminacao(conteudo, eliminadas).length > 0,
    ajudas: { ...ajudas, eliminacoes: ajudas.eliminacoes - 1 },
  };
}

/** Mostra a dica da questão atual. Gasta 1 da cota só na primeira vez em cada questão. */
export async function abrirDica(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
  questaoId: string,
): Promise<ResultadoAjuda> {
  const atual = await questaoEmAndamento(db, aluno, desafioId, questaoId);
  if ("erro" in atual) return { erro: atual.erro };
  const { desafio, linha } = atual;
  const dica = await dicaDaQuestao(db, questaoId);
  if (!dica) return { erro: "Esta questão não tem dica." };
  const ajudas = await ajudasRestantes(db, aluno.id, desafio.temporada_id);
  if (!ajudas) return { erro: "Ajudas indisponíveis. Peça ao professor para atualizar o app." };
  if (linha.dica_usada) return { dica, ajudas };
  if (ajudas.dicas <= 0) return { erro: "Você já usou todas as dicas desta temporada.", ajudas };
  const { data: gravada } = await db
    .from("respostas")
    .update({ dica_usada: true })
    .eq("id", linha.id)
    .is("respondida_em", null)
    .select("id");
  if (!gravada?.length) return { erro: "Esta questão já passou." };
  return { dica, ajudas: { ...ajudas, dicas: ajudas.dicas - 1 } };
}

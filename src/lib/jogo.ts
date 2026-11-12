import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlunoSessao } from "@/lib/aluno-sessao";
import { montarVista } from "@/lib/questoes/apresentacao";
import {
  calcularPontos,
  corrigir,
  JANELA_APOS_FECHAR_S,
  pontosComRapidez,
  tempoEsgotado,
} from "@/lib/questoes/correcao";
import { codigoConfere, LIMITE_TENTATIVAS_CODIGO } from "@/lib/cadurush";
import {
  ajudaNaVista,
  candidatasEliminacao,
  DICAS_POR_TEMPORADA,
  ELIMINACOES_POR_TEMPORADA,
  respostaComAjuda,
  type AjudaVista,
} from "@/lib/questoes/ajudas";
import { embaralhar, permutacaoAleatoria } from "@/lib/questoes/embaralhar";
import { tamanhoPermutacao, type Conteudo, type Resposta, type Vista } from "@/lib/questoes/tipos";
import type { Desafio, RespostaBanco, Temporada, Tentativa } from "@/lib/tipos-banco";
import { situacaoDesafio, urlImagem } from "@/lib/tipos-banco";
import { arredondarPontos } from "./pontos";
import {
  AVISO_ZERADA,
  cliquesRestantes,
  regraCliques,
  regraSaidas,
  saidasRestantes,
  type MotivoZerada,
} from "./tela-protegida";
import {
  AVISO_VERIFICACAO,
  montarOpcoesVerificacao,
  PERGUNTA_VERIFICACAO,
  sortearVerificacoes,
} from "./questoes/verificacao";
import { tempoEfetivo, tempoVerificacao } from "./questoes/tempos";
import { percentualEmVigor } from "./especial";

export type QuestaoServida = {
  id: string;
  enunciado: string;
  imagemUrl: string | null;
  vista: Vista;
  tempoLimite: number;
  /** Questão relâmpago: destaque especial na tela. */
  relampago: boolean;
  restanteMs: number;
  /** Sair da tela zera a questão (opção do desafio). */
  saidaZera: boolean;
  /** Cliques fora que ainda passam só com aviso (0 = o próximo zera; null = liberados). */
  cliquesRestantes: number | null;
  /** Saídas da tela que ainda passam só com aviso (0 = a próxima zera). */
  saidasRestantes: number;
  /** O que as eliminações já usadas mudam na tela. */
  ajuda: AjudaVista;
  /** Ainda dá para usar uma eliminação nesta questão. */
  podeEliminar: boolean;
  temDica: boolean;
  /** Texto da dica, se o aluno já abriu nesta questão. */
  dica: string | null;
};

/** Ajudas que ainda restam ao aluno na temporada. null = indisponível (banco sem as colunas). */
export type Ajudas = { eliminacoes: number; dicas: number } | null;

export type ResultadoAjuda = {
  erro?: string;
  ajuda?: AjudaVista;
  podeEliminar?: boolean;
  dica?: string;
  ajudas?: Ajudas;
};

/** Verificação de leitura da questão que o aluno acabou de responder. Sem a correta. */
export type VerificacaoServida = {
  questaoId: string;
  pergunta: string;
  opcoes: string[];
  tempoLimite: number;
  restanteMs: number;
  saidaZera: boolean;
  cliquesRestantes: number | null;
  saidasRestantes: number;
};

export type EstadoJogo =
  | { fase: "questao"; questao: QuestaoServida; posicao: number; total: number; ajudas: Ajudas; aviso?: string }
  | { fase: "verificacao"; verificacao: VerificacaoServida; posicao: number; total: number; aviso?: string }
  | { fase: "fim"; aviso?: string }
  /** CaduRush: falta o código do dia (ou o digitado não confere). */
  | { fase: "codigo"; mensagem?: string; aviso?: string }
  | { fase: "erro"; mensagem: string };

type QuestaoBanco = {
  id: string;
  professor_id: string;
  capitulo: string | null;
  /** Ausente se o SQL da verificação de leitura ainda não rodou. */
  tema?: string | null;
  tipo: Conteudo["tipo"];
  enunciado: string;
  imagem_path: string | null;
  tempo_limite_s: number;
  /** Ausente se o SQL do relâmpago ainda não rodou. */
  relampago?: boolean;
  conteudo: Conteudo["conteudo"];
  /** Tempo escrito para esta questão no desafio (null = automático). */
  tempo_no_desafio?: number | null;
};

/** Desafio só se for da turma do aluno. */
export async function desafioDoAluno(db: SupabaseClient, aluno: AlunoSessao, desafioId: string) {
  const { data } = await db
    .from("desafios")
    // "*" traz também as colunas do gabarito manual e do encerramento, quando o SQL delas já rodou.
    .select("*, temporadas!inner(*)")
    .eq("id", desafioId)
    .eq("temporadas.turma_id", aluno.turmaId)
    .maybeSingle();
  return (data as (Desafio & { temporadas: Temporada }) | null) ?? null;
}

async function carregarQuestao(db: SupabaseClient, id: string, desafioId: string): Promise<QuestaoBanco> {
  const [{ data, error }, { data: noDesafio }] = await Promise.all([
    db
      .from("questoes")
      // "*" traz também relampago, quando o SQL dele já rodou.
      .select("*")
      .eq("id", id)
      .single(),
    // "*" traz o tempo escrito no desafio, quando o SQL dos tempos já rodou.
    db.from("desafio_questoes").select("*").eq("desafio_id", desafioId).eq("questao_id", id).maybeSingle(),
  ]);
  if (error || !data) throw new Error("Questão não encontrada");
  const tempo = (noDesafio as { tempo_limite_s?: number | null } | null)?.tempo_limite_s ?? null;
  return { ...(data as QuestaoBanco), tempo_no_desafio: tempo };
}

/** Lida à parte: se o SQL das ajudas ainda não rodou, a questão carrega sem dica. */
async function dicaDaQuestao(db: SupabaseClient, id: string): Promise<string | null> {
  const { data } = await db.from("questoes").select("dica").eq("id", id).maybeSingle();
  const dica = (data as { dica?: string | null } | null)?.dica?.trim();
  return dica || null;
}

/**
 * Cota da temporada menos o que o aluno já usou nos desafios dela. Se o
 * professor pôs um teto no desafio, também não passa do que sobra dele.
 */
export async function ajudasRestantes(db: SupabaseClient, alunoId: string, desafio: Desafio): Promise<Ajudas> {
  const { data, error } = await db
    .from("tentativas")
    .select("id, desafio_id, desafios!inner(temporada_id), respostas(eliminadas, dica_usada)")
    .eq("aluno_id", alunoId)
    .eq("desafios.temporada_id", desafio.temporada_id);
  if (error) return null;
  let eliminacoes = 0;
  let dicas = 0;
  let eliminacoesAqui = 0;
  let dicasAqui = 0;
  type Linha = { desafio_id: string; respostas: { eliminadas: number[] | null; dica_usada: boolean }[] };
  for (const t of (data ?? []) as Linha[]) {
    for (const r of t.respostas ?? []) {
      const e = r.eliminadas?.length ?? 0;
      eliminacoes += e;
      if (r.dica_usada) dicas++;
      if (t.desafio_id === desafio.id) {
        eliminacoesAqui += e;
        if (r.dica_usada) dicasAqui++;
      }
    }
  }
  const teto = (max: number | null | undefined, usadas: number) => (max == null ? Infinity : Math.max(0, max - usadas));
  return {
    eliminacoes: Math.min(
      Math.max(0, ELIMINACOES_POR_TEMPORADA - eliminacoes),
      teto(desafio.eliminacoes_max, eliminacoesAqui),
    ),
    dicas: Math.min(Math.max(0, DICAS_POR_TEMPORADA - dicas), teto(desafio.dicas_max, dicasAqui)),
  };
}

/**
 * Tipos em que a permutação só muda a posição das opções (e não é o próprio
 * desafio, como em ordenar ou ligar pares): o professor pode deixar na ordem
 * em que foram escritas.
 */
const TIPOS_SO_OPCOES = new Set<Conteudo["tipo"]>([
  "multipla_escolha",
  "interpretacao",
  "fonte_primaria",
  "vf_bloco",
  "intruso",
]);

function permutacaoDaQuestao(desafio: Desafio, conteudo: Conteudo) {
  const n = tamanhoPermutacao(conteudo);
  if (desafio.embaralhar_alternativas === false && TIPOS_SO_OPCOES.has(conteudo.tipo))
    return Array.from({ length: n }, (_, i) => i);
  return permutacaoAleatoria(n);
}

const comoConteudo = (q: QuestaoBanco) => ({ tipo: q.tipo, conteudo: q.conteudo }) as Conteudo;

/**
 * O professor pode escrever o tempo de cada questão no desafio, ou um tempo
 * único para todas (a relâmpago nunca ganha mais que o seu próprio tempo).
 */
const tempoDaQuestao = (desafio: Desafio, q: QuestaoBanco) =>
  tempoEfetivo({
    daQuestao: q.tempo_limite_s,
    relampago: q.relampago,
    noDesafio: q.tempo_no_desafio,
    fixoDoDesafio: desafio.tempo_por_questao_s,
    percentual: percentualEmVigor(desafio),
  });

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
  // Os itens travados pelas eliminações valem como estão na tela.
  resposta = respostaComAjuda(comoConteudo(questao), linha.permutacao, linha.eliminadas, resposta);
  const agora = new Date();
  const esgotado = tempoEsgotado(new Date(linha.servida_em), agora, tempoDaQuestao(desafio, questao));
  // Com tolerância de saídas, quem decide que a saída zerou é o aviso esgotado (motivo "saida").
  const saidaZeraSozinha = regraSaidas(desafio).regra === "proibido" && saidasTela > 0;
  const causa = esgotado || !desafio.saida_zera_questao ? null : (motivo ?? (saidaZeraSozinha ? "saida" : null));
  const zerada = causa !== null;
  const fracao = esgotado || zerada ? 0 : corrigir(comoConteudo(questao), linha.permutacao, resposta);
  // Sorteada para a verificação de leitura: vale zero até o aluno acertar o tema.
  // Respondeu de verdade (sem tempo esgotado nem zerada), mesmo errando: senão
  // aparecer ou não a verificação entregaria se a resposta estava certa.
  const verificar = !esgotado && !zerada && precisaVerificar(tentativa, questao);
  const { data: gravada } = await db
    .from("respostas")
    .update({
      respondida_em: agora.toISOString(),
      resposta,
      fracao: verificar ? 0 : fracao,
      pontos: verificar ? 0 : pontosDaResposta(desafio, fracao, new Date(linha.servida_em), agora, questao),
      ...(verificar && { verificacao_fracao: fracao }),
      tempo_esgotado: esgotado,
      zerada_por_saida: zerada,
      motivo_zerada: causa,
      saidas_tela: Math.max(0, Math.min(saidasTela, 999)),
    })
    .eq("id", linha.id)
    .is("respondida_em", null)
    .select("id");
  // Com verificação pendente, o índice só avança depois dela.
  if (gravada?.length && !verificar) await recalcularTentativa(db, tentativa, tentativa.indice_atual + 1);
  return gravada?.length ? causa : null;
}

/** Pontos da resposta, com o bônus por rapidez se o desafio tiver. */
function pontosDaResposta(desafio: Desafio, fracao: number, servida: Date, respondida: Date, questao: QuestaoBanco) {
  if (!desafio.bonus_rapidez) return calcularPontos(fracao, desafio.pontos_por_acerto);
  return pontosComRapidez(
    fracao,
    desafio.pontos_por_acerto,
    respondida.getTime() - servida.getTime(),
    tempoDaQuestao(desafio, questao),
  );
}

const precisaVerificar = (tentativa: Tentativa, questao: QuestaoBanco) =>
  Boolean(tentativa.verificar?.includes(questao.id) && !questao.relampago && questao.tema?.trim());

const verificacaoPendente = (linha: RespostaBanco) =>
  linha.verificacao_fracao !== null && linha.verificacao_fracao !== undefined && !linha.verificacao_respondida_em;

/**
 * Fecha a verificação: acertou devolve a nota real da questão; errou (ou o
 * tempo acabou, ou zerou pela pesquisa bloqueada) deixa a questão em zero.
 * Só a primeira gravação vale. Depois, o jogo avança para a próxima questão.
 */
async function resolverVerificacao(
  db: SupabaseClient,
  desafio: Desafio,
  tentativa: Tentativa,
  linha: RespostaBanco,
  questao: QuestaoBanco,
  acertou: boolean | null,
  motivo: MotivoZerada | null = null,
) {
  const fracao = Number(linha.verificacao_fracao ?? 0);
  const { data: gravada } = await db
    .from("respostas")
    .update({
      verificacao_respondida_em: new Date().toISOString(),
      verificacao_acertou: acertou,
      ...(acertou === false
        ? { zerada_por_saida: motivo !== null, motivo_zerada: motivo ?? "verificacao" }
        : {
            fracao,
            pontos: pontosDaResposta(
              desafio,
              fracao,
              new Date(linha.servida_em),
              new Date(linha.respondida_em ?? Date.now()),
              questao,
            ),
          }),
    })
    .eq("id", linha.id)
    .is("verificacao_respondida_em", null)
    .select("id");
  if (gravada?.length) await recalcularTentativa(db, tentativa, tentativa.indice_atual + 1);
  return Boolean(gravada?.length);
}

/** Temas para as alternativas erradas: primeiro as outras questões do desafio, depois o banco do professor. */
async function temasParaDistratores(db: SupabaseClient, tentativa: Tentativa, questao: QuestaoBanco) {
  const { data: doDesafio } = await db.from("questoes").select("id, tema").in("id", tentativa.ordem);
  const desafio = (doDesafio ?? []).filter((q) => q.id !== questao.id).map((q) => q.tema as string | null);
  const fontes: (string | null)[][] = [desafio];
  if (desafio.filter((t) => t?.trim()).length < 6) {
    const banco = (capitulo: string | null) => {
      let c = db
        .from("questoes")
        .select("tema")
        .eq("professor_id", questao.professor_id)
        .eq("status", "publicada")
        .not("tema", "is", null)
        .limit(60);
      if (capitulo) c = c.eq("capitulo", capitulo);
      return c;
    };
    const [{ data: capitulo }, { data: geral }] = await Promise.all([
      questao.capitulo ? banco(questao.capitulo) : Promise.resolve({ data: [] }),
      banco(null),
    ]);
    fontes.push(
      (capitulo ?? []).map((q) => q.tema as string),
      (geral ?? []).map((q) => q.tema as string),
    );
  }
  return fontes;
}

/**
 * Serve a verificação pendente (sorteando as alternativas na primeira vez).
 * null = já se resolveu (tempo acabou ou faltaram temas) e o jogo segue.
 */
async function servirVerificacao(
  db: SupabaseClient,
  desafio: Desafio,
  tentativa: Tentativa,
  linha: RespostaBanco,
  questao: QuestaoBanco,
): Promise<VerificacaoServida | null> {
  let atual = linha;
  if (!atual.verificacao_opcoes?.length) {
    const montada = montarOpcoesVerificacao(questao.tema ?? "", await temasParaDistratores(db, tentativa, questao));
    // Sem temas diferentes suficientes não dá para verificar: a questão vale o que o aluno acertou.
    if (!montada) {
      await resolverVerificacao(db, desafio, tentativa, atual, questao, null);
      return null;
    }
    const { data: gravada } = await db
      .from("respostas")
      .update({
        verificacao_opcoes: montada.opcoes,
        verificacao_correta: montada.correta,
        verificacao_servida_em: new Date().toISOString(),
      })
      .eq("id", atual.id)
      .is("verificacao_opcoes", null)
      .select("*");
    const relida = gravada?.[0] ?? (await db.from("respostas").select("*").eq("id", atual.id).single()).data;
    if (!relida) return null;
    atual = relida as RespostaBanco;
    if (!verificacaoPendente(atual)) return null;
  }
  const servida = new Date(atual.verificacao_servida_em ?? atual.respondida_em ?? Date.now());
  const agora = new Date();
  const limite = tempoVerificacao(desafio);
  if (tempoEsgotado(servida, agora, limite)) {
    await resolverVerificacao(db, desafio, tentativa, atual, questao, false);
    return null;
  }
  return {
    questaoId: questao.id,
    pergunta: PERGUNTA_VERIFICACAO,
    opcoes: atual.verificacao_opcoes ?? [],
    tempoLimite: limite,
    restanteMs: Math.max(0, limite * 1000 - (agora.getTime() - servida.getTime())),
    saidaZera: desafio.saida_zera_questao,
    cliquesRestantes: cliquesRestantes(desafio, tentativa.cliques_fora ?? 0),
    saidasRestantes: saidasRestantes(desafio, tentativa.saidas_toleradas ?? 0),
  };
}

async function obterOuCriarTentativa(db: SupabaseClient, desafio: Desafio, alunoId: string): Promise<Tentativa> {
  const desafioId = desafio.id;
  const { data: existente } = await db
    .from("tentativas")
    .select("*")
    .eq("desafio_id", desafioId)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  if (existente) return existente as Tentativa;

  const { data: questoes } = await db
    .from("desafio_questoes")
    .select("questao_id, posicao")
    .eq("desafio_id", desafioId)
    .order("posicao");
  const ids = (questoes ?? []).map((q) => q.questao_id as string);
  // Ordem fixa (opção do desafio): todos na ordem montada pelo professor.
  const ordem = desafio.ordem_fixa ? ids : embaralhar(ids);
  const verificar = await sortearVerificacoesDaTentativa(db, ordem, desafio.verificacoes ?? null);
  const inserir = (extra: object) =>
    db
      .from("tentativas")
      .insert({ desafio_id: desafioId, aluno_id: alunoId, ordem, ...extra })
      .select("*")
      .single();
  let { data: nova, error } = await inserir(verificar ? { verificar } : {});
  // Sem o SQL da verificação de leitura a coluna não existe: cria sem ela.
  if (error && verificar && error.code !== "23505") ({ data: nova, error } = await inserir({}));
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
 * Questões da tentativa com verificação de leitura. null = banco sem o SQL dela.
 * `quantas` = número escolhido pelo professor (null = automático, 2 a cada 10).
 */
async function sortearVerificacoesDaTentativa(
  db: SupabaseClient,
  ordem: string[],
  quantas: number | null,
): Promise<string[] | null> {
  if (!ordem.length) return [];
  const { data, error } = await db.from("questoes").select("id, tema, relampago").in("id", ordem);
  if (error) return null;
  const porId = new Map((data ?? []).map((q) => [q.id as string, q]));
  const elegiveis = ordem.map((id) => {
    const q = porId.get(id);
    return Boolean(q && !q.relampago && (q.tema as string | null)?.trim());
  });
  return sortearVerificacoes(elegiveis, Math.random, quantas).map((i) => ordem[i]);
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
    const tentativa = await obterOuCriarTentativa(db, desafio, aluno.id);
    if (tentativa.indice_atual >= tentativa.ordem.length || tentativa.concluida_em) return { fase: "fim" };

    const questaoId = tentativa.ordem[tentativa.indice_atual];
    const questao = await carregarQuestao(db, questaoId, desafio.id);
    const { data: linhaExistente } = await db
      .from("respostas")
      .select("*")
      .eq("tentativa_id", tentativa.id)
      .eq("questao_id", questaoId)
      .maybeSingle();

    let linha = linhaExistente as RespostaBanco | null;
    if (linha?.respondida_em && verificacaoPendente(linha)) {
      const verificacao = await servirVerificacao(db, desafio, tentativa, linha, questao);
      if (!verificacao) continue;
      return {
        fase: "verificacao",
        posicao: tentativa.indice_atual + 1,
        total: tentativa.ordem.length,
        verificacao,
      };
    }
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
            permutacao: permutacaoDaQuestao(desafio, comoConteudo(questao)),
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
    const [dica, ajudas] = await Promise.all([dicaDaQuestao(db, questao.id), ajudasRestantes(db, aluno.id, desafio)]);
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
        relampago: Boolean(questao.relampago),
        restanteMs: Math.max(0, tempoLimite * 1000 - decorrido),
        saidaZera: desafio.saida_zera_questao,
        cliquesRestantes: cliquesRestantes(desafio, tentativa.cliques_fora ?? 0),
        saidasRestantes: saidasRestantes(desafio, tentativa.saidas_toleradas ?? 0),
        ajuda: ajudaNaVista(conteudo, linha.permutacao, eliminadas),
        podeEliminar: desafio.eliminacoes_max !== 0 && candidatasEliminacao(conteudo, eliminadas).length > 0,
        temDica: Boolean(dica) && desafio.dicas_max !== 0,
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
      const questao = await carregarQuestao(db, questaoId, desafio.id);
      // Cliques fora liberados pelo professor neste desafio: não zera.
      if (motivo === "clique_fora" && regraCliques(desafio).regra === "permitido") motivo = null;
      if (motivo === "teclado" && desafio.teclado_bloqueado === false) motivo = null;
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
  const questao = await carregarQuestao(db, questaoId, desafio.id);
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
  const ajudas = await ajudasRestantes(db, aluno.id, desafio);
  if (!ajudas) return { erro: "Ajudas indisponíveis. Peça ao professor para atualizar o app." };
  if (desafio.eliminacoes_max === 0) return { erro: "Este desafio não tem eliminações.", ajudas };
  if (ajudas.eliminacoes <= 0)
    return {
      erro:
        desafio.eliminacoes_max != null
          ? "Você já usou as eliminações permitidas neste desafio (ou na temporada)."
          : "Você já usou todas as eliminações desta temporada.",
      ajudas,
    };
  const conteudo = comoConteudo(questao);
  const antes = linha.eliminadas ?? [];
  const candidatas = candidatasEliminacao(conteudo, antes);
  if (!candidatas.length) return { erro: "Não dá para usar mais eliminações nesta questão.", ajudas };
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
    ajuda: ajudaNaVista(conteudo, linha.permutacao, eliminadas),
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
  const ajudas = await ajudasRestantes(db, aluno.id, desafio);
  if (!ajudas) return { erro: "Ajudas indisponíveis. Peça ao professor para atualizar o app." };
  if (linha.dica_usada) return { dica, ajudas };
  if (desafio.dicas_max === 0) return { erro: "Este desafio não tem dicas." };
  if (ajudas.dicas <= 0)
    return {
      erro:
        desafio.dicas_max != null
          ? "Você já usou as dicas permitidas neste desafio (ou na temporada)."
          : "Você já usou todas as dicas desta temporada.",
      ajudas,
    };
  const { data: gravada } = await db
    .from("respostas")
    .update({ dica_usada: true })
    .eq("id", linha.id)
    .is("respondida_em", null)
    .select("id");
  if (!gravada?.length) return { erro: "Esta questão já passou." };
  return { dica, ajudas: { ...ajudas, dicas: ajudas.dicas - 1 } };
}

/**
 * Resposta da verificação de leitura. Errar, deixar o tempo acabar ou zerar
 * pela pesquisa bloqueada faz a questão anterior valer zero.
 */
export async function responderVerificacao(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
  questaoId: string,
  escolha: number | null,
  motivo: MotivoZerada | null = null,
): Promise<EstadoJogo> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio) return { fase: "erro", mensagem: "Desafio não encontrado." };
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

  let aviso: string | null = null;
  if (t.ordem[t.indice_atual] === questaoId) {
    const { data } = await db
      .from("respostas")
      .select("*")
      .eq("tentativa_id", t.id)
      .eq("questao_id", questaoId)
      .maybeSingle();
    const linha = data as RespostaBanco | null;
    if (linha && verificacaoPendente(linha) && linha.verificacao_opcoes?.length && linha.verificacao_servida_em) {
      if (motivo === "clique_fora" && regraCliques(desafio).regra === "permitido") motivo = null;
      if (motivo === "teclado" && desafio.teclado_bloqueado === false) motivo = null;
      if (motivo === "teclado") {
        const { data: a } = await db.from("alunos").select("teclado_liberado").eq("id", aluno.id).single();
        if (a?.teclado_liberado) motivo = null;
      }
      const causa = desafio.saida_zera_questao ? motivo : null;
      const esgotado = tempoEsgotado(new Date(linha.verificacao_servida_em), new Date(), tempoVerificacao(desafio));
      const acertou =
        !causa &&
        !esgotado &&
        escolha !== null &&
        Number.isInteger(escolha) &&
        escolha === Number(linha.verificacao_correta);
      const questao = await carregarQuestao(db, questaoId, desafio.id);
      const gravou = await resolverVerificacao(db, desafio, t, linha, questao, acertou, causa);
      if (gravou && !acertou) {
        aviso = causa
          ? AVISO_ZERADA[causa]
          : esgotado
            ? "O tempo da verificação de leitura acabou, então a questão anterior valeu zero."
            : AVISO_VERIFICACAO;
      }
    }
  }
  const estado = await estadoAtual(db, aluno, desafioId);
  if (aviso && estado.fase !== "erro") estado.aviso = aviso;
  return estado;
}

/**
 * Clique fora das alternativas e dos botões (ou saída da tela), num desafio
 * sem consulta com tolerância: gasta um aviso. `zerar` = não restava aviso (ou a regra é
 * proibido) e a questão deve valer zero. A contagem fica na tentativa, então
 * recarregar a página não devolve os avisos.
 */
export async function registrarAvisoTolerado(
  db: SupabaseClient,
  aluno: AlunoSessao,
  desafioId: string,
  tipo: "clique" | "saida",
): Promise<{ zerar: boolean; restantes: number | null }> {
  const desafio = await desafioDoAluno(db, aluno, desafioId);
  if (!desafio?.saida_zera_questao) return { zerar: false, restantes: null };
  const { regra, tolerancia }: { regra: string; tolerancia: number } =
    tipo === "clique" ? regraCliques(desafio) : regraSaidas(desafio);
  if (regra === "permitido") return { zerar: false, restantes: null };
  if (regra === "proibido") return { zerar: true, restantes: 0 };
  const coluna = tipo === "clique" ? "cliques_fora" : "saidas_toleradas";
  for (let guarda = 0; guarda < 5; guarda++) {
    const { data } = await db
      .from("tentativas")
      .select(`id, ${coluna}`)
      .eq("desafio_id", desafio.id)
      .eq("aluno_id", aluno.id)
      .maybeSingle();
    const t = data as unknown as Record<string, unknown> | null;
    if (!t || typeof t[coluna] !== "number") return { zerar: true, restantes: 0 };
    const usados = t[coluna] as number;
    if (usados >= tolerancia) return { zerar: true, restantes: 0 };
    // Trava otimista: dois avisos ao mesmo tempo não gastam um só.
    const { data: gravada } = await db
      .from("tentativas")
      .update({ [coluna]: usados + 1 })
      .eq("id", t.id as string)
      .eq(coluna, usados)
      .select("id");
    if (gravada?.length) return { zerar: false, restantes: tolerancia - usados - 1 };
  }
  return { zerar: true, restantes: 0 };
}

"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { gerarCodigoDia, janelaLiberadaAgora } from "@/lib/cadurush";
import { gerarCodigoTurma } from "@/lib/codigo";
import { dataHoraLocalParaIso } from "@/lib/datas";
import { ehMultiplicador, ehPercentual, pontosBase, pontosDoEspecial } from "@/lib/especial";
import { conferirPadroes } from "@/lib/padroes";
import { exigirProfessor } from "@/lib/professor";
import { iniciarSessaoAluno } from "@/lib/aluno-sessao";
import { APELIDO_DE_TESTE } from "@/lib/aluno-teste";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  ajustarDesafiosAoEncerramento,
  colunasEncerramento,
  conferirDatasTemporada,
  conferirJanelaNaTemporada,
  encerramentoOuNulo,
  ERRO_SQL_ENCERRAMENTO,
} from "@/lib/temporada-encerramento";
import { ehEra } from "@/lib/publico/regras";
import { problemasRelampago } from "@/lib/questoes/relampago";
import { TEMPO_MAX_S, TEMPO_MIN_S, TIPOS, validarConteudo, type Conteudo } from "@/lib/questoes/tipos";
import { ultimoDiaComPontos, type Temporada } from "@/lib/tipos-banco";
import { conferirRegras, ERRO_SQL_REGRAS, regrasParaGravar } from "@/lib/questoes/regras-desafio";
import {
  problemaTempoQuestao,
  problemaTempoVerificacao,
  VERIFICACAO_MAX_S,
  VERIFICACAO_MIN_S,
} from "@/lib/questoes/tempos";

export type EstadoForm = { erro?: string; ok?: string };

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

// Escolas e turmas ----------------------------------------------------------

export async function criarEscola(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const nome = texto(form, "nome");
  const periodo = texto(form, "periodo") === "bimestre" ? "bimestre" : "trimestre";
  if (!nome) return { erro: "Informe o nome da escola." };
  const { error } = await supabase.from("escolas").insert({ nome, periodo });
  if (error) return { erro: "Não foi possível criar a escola." };
  revalidatePath("/professor");
  return { ok: "Escola criada." };
}

export async function criarTurma(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const nome = texto(form, "nome");
  if (!nome) return { erro: "Informe o nome da turma." };
  for (let i = 0; i < 5; i++) {
    const { error } = await supabase.from("turmas").insert({
      escola_id: texto(form, "escola_id"),
      nome,
      serie: texto(form, "serie") || null,
      codigo: gerarCodigoTurma(),
    });
    if (!error) {
      revalidatePath("/professor");
      return { ok: "Turma criada." };
    }
    if (error.code !== "23505") return { erro: "Não foi possível criar a turma." };
  }
  return { erro: "Não foi possível gerar um código único. Tente de novo." };
}

/** Apaga a turma e, em cascata, alunos, temporadas, desafios, tentativas e respostas dela. */
export async function excluirTurma(turmaId: string, nomeDigitado: string) {
  const { supabase } = await exigirProfessor();
  const { data: turma } = await supabase.from("turmas").select("nome").eq("id", turmaId).maybeSingle();
  if (!turma) return { erro: "Turma não encontrada." };
  if (turma.nome.trim() !== nomeDigitado.trim()) return { erro: "O nome digitado não confere." };
  const { error } = await supabase.from("turmas").delete().eq("id", turmaId);
  if (error) return { erro: "Não foi possível excluir a turma." };
  revalidatePath("/professor");
  redirect("/professor");
}

/** Apaga a escola e, em cascata, todas as turmas dela com tudo o que estiver ligado a elas. */
export async function excluirEscola(escolaId: string, nomeDigitado: string) {
  const { supabase } = await exigirProfessor();
  const { data: escola } = await supabase.from("escolas").select("nome").eq("id", escolaId).maybeSingle();
  if (!escola) return { erro: "Escola não encontrada." };
  if (escola.nome.trim() !== nomeDigitado.trim()) return { erro: "O nome digitado não confere." };
  const { error } = await supabase.from("escolas").delete().eq("id", escolaId);
  if (error) return { erro: "Não foi possível excluir a escola." };
  revalidatePath("/professor");
}

/**
 * Junta uma turma duplicada em outra: alunos e temporadas (com desafios, pontos
 * e respostas) passam para a turma de destino e a de origem deixa de existir.
 * Apelido repetido no destino ganha um número no fim, para ninguém perder o perfil.
 */
export async function juntarTurmas(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const origemId = texto(form, "origem");
  const destinoId = texto(form, "destino");
  if (!destinoId) return { erro: "Escolha a turma que vai ficar." };
  if (origemId === destinoId) return { erro: "Escolha uma turma diferente desta." };
  if (form.get("ciente") !== "on") return { erro: "Marque a caixa para confirmar." };
  const { data: turmas } = await supabase.from("turmas").select("id, nome").in("id", [origemId, destinoId]);
  const destino = turmas?.find((t) => t.id === destinoId);
  if (!destino || turmas?.length !== 2) return { erro: "Turma não encontrada." };

  const { data: alunos } = await supabase
    .from("alunos")
    .select("id, turma_id, apelido")
    .in("turma_id", [origemId, destinoId]);
  const usados = new Set((alunos ?? []).filter((a) => a.turma_id === destinoId).map((a) => a.apelido.toLowerCase()));
  for (const a of (alunos ?? []).filter((a) => a.turma_id === origemId)) {
    let apelido: string = a.apelido;
    for (let n = 2; usados.has(apelido.toLowerCase()); n++) apelido = `${a.apelido.slice(0, 20 - ` ${n}`.length)} ${n}`;
    usados.add(apelido.toLowerCase());
    const { error } = await supabase.from("alunos").update({ turma_id: destinoId, apelido }).eq("id", a.id);
    if (error) return { erro: `Não foi possível mover ${a.apelido}. Nada foi apagado; tente de novo.` };
  }
  const { error: erroTemporadas } = await supabase
    .from("temporadas")
    .update({ turma_id: destinoId })
    .eq("turma_id", origemId);
  if (erroTemporadas) return { erro: "Não foi possível mover as temporadas. Nada foi apagado; tente de novo." };

  // Só apaga a turma de origem depois de conferir que ela ficou vazia.
  const [{ count: restamAlunos }, { count: restamTemporadas }] = await Promise.all([
    supabase.from("alunos").select("*", { count: "exact", head: true }).eq("turma_id", origemId),
    supabase.from("temporadas").select("*", { count: "exact", head: true }).eq("turma_id", origemId),
  ]);
  if (restamAlunos || restamTemporadas) return { erro: "Sobrou algo na turma antiga; ela não foi apagada." };
  await supabase.from("turmas").delete().eq("id", origemId);
  revalidatePath("/professor", "layout");
  redirect(`/professor/turmas/${destinoId}?aba=alunos`);
}

/** Junta uma escola duplicada em outra: as turmas passam para a escola de destino. */
export async function juntarEscolas(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const origemId = texto(form, "origem");
  const destinoId = texto(form, "destino");
  if (!destinoId) return { erro: "Escolha a escola que vai ficar." };
  if (origemId === destinoId) return { erro: "Escolha uma escola diferente desta." };
  const { data: escolas } = await supabase.from("escolas").select("id, nome").in("id", [origemId, destinoId]);
  const destino = escolas?.find((e) => e.id === destinoId);
  if (!destino || escolas?.length !== 2) return { erro: "Escola não encontrada." };
  const { error } = await supabase.from("turmas").update({ escola_id: destinoId }).eq("escola_id", origemId);
  if (error) return { erro: "Não foi possível mover as turmas. Nada foi apagado." };
  const { count } = await supabase.from("turmas").select("*", { count: "exact", head: true }).eq("escola_id", origemId);
  if (count) return { erro: "Sobrou turma na escola antiga; ela não foi apagada." };
  await supabase.from("escolas").delete().eq("id", origemId);
  revalidatePath("/professor", "layout");
  return { ok: `Turmas movidas para ${destino.nome}.` };
}

export async function novoCodigoTurma(turmaId: string) {
  const { supabase } = await exigirProfessor();
  await supabase.from("turmas").update({ codigo: gerarCodigoTurma() }).eq("id", turmaId);
  revalidatePath(`/professor/turmas/${turmaId}`);
}

// Alunos ---------------------------------------------------------------------

export async function atualizarAluno(form: FormData) {
  const { supabase } = await exigirProfessor();
  const id = texto(form, "id");
  const apelido = texto(form, "apelido");
  const dados: Record<string, string | null> = { nome_real: texto(form, "nome_real") || null };
  if (apelido.length >= 2 && apelido.length <= 20) dados.apelido = apelido;
  const { data } = await supabase.from("alunos").update(dados).eq("id", id).select("turma_id").single();
  if (data) revalidatePath(`/professor/turmas/${data.turma_id}`);
}

/** Apaga o PIN: no próximo acesso, o PIN que o aluno digitar passa a valer. Encerra sessões abertas. */
export async function redefinirPin(alunoId: string) {
  const { supabase } = await exigirProfessor();
  const { data: aluno } = await supabase.from("alunos").select("turma_id, versao_sessao").eq("id", alunoId).single();
  if (!aluno) return;
  await supabase
    .from("alunos")
    .update({ pin_hash: null, tentativas_falhas: 0, bloqueado_ate: null, versao_sessao: aluno.versao_sessao + 1 })
    .eq("id", alunoId);
  revalidatePath(`/professor/turmas/${aluno.turma_id}`);
}

/** Acessibilidade: aluno que navega pelo teclado não perde a questão ao apertar uma tecla. */
export async function alternarTeclado(alunoId: string, liberado: boolean) {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("alunos")
    .update({ teclado_liberado: liberado })
    .eq("id", alunoId)
    .select("turma_id")
    .single();
  if (data) revalidatePath(`/professor/turmas/${data.turma_id}`);
}

/** Aluno de teste: fica fora do ranking, da meta da turma e das contas do painel. */
export async function marcarDeTeste(alunoId: string, deTeste: boolean) {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("alunos")
    .update({ de_teste: deTeste })
    .eq("id", alunoId)
    .select("turma_id")
    .single();
  if (data) revalidatePath(`/professor/turmas/${data.turma_id}`);
  revalidatePath("/professor", "layout");
}

/**
 * Abre o app do aluno como o aluno de teste da turma (cria na primeira vez).
 * O professor continua logado no painel: são sessões separadas.
 */
export async function verComoAluno(turmaId: string) {
  const { supabase } = await exigirProfessor();
  // A leitura com a sessão do professor garante que a turma é dele.
  const { data: turma } = await supabase.from("turmas").select("id").eq("id", turmaId).maybeSingle();
  if (!turma) return;
  const { data: existentes, error: erroLeitura } = await supabase
    .from("alunos")
    .select("id, versao_sessao")
    .eq("turma_id", turmaId)
    .eq("de_teste", true)
    .order("criado_em")
    .limit(1);
  if (erroLeitura) throw new Error("Falta rodar o SQL do aluno de teste (20261114120000_aluno_de_teste.sql).");

  const admin = criarClienteAdmin();
  let aluno = existentes?.[0];
  if (!aluno) {
    // Apelido livre na turma: "Aluno teste", "Aluno teste 2"...
    const { data: usados } = await supabase.from("alunos").select("apelido").eq("turma_id", turmaId);
    const nomes = new Set((usados ?? []).map((a) => String(a.apelido).toLowerCase()));
    let apelido = APELIDO_DE_TESTE;
    for (let n = 2; nomes.has(apelido.toLowerCase()); n++) apelido = `${APELIDO_DE_TESTE} ${n}`;
    const { data: novo, error } = await admin
      .from("alunos")
      .insert({
        turma_id: turmaId,
        apelido,
        nome_real: "Perfil de teste do professor",
        aprovado: true,
        de_teste: true,
        // PIN que ninguém conhece: só se entra neste perfil pelo botão do painel.
        pin_hash: await bcrypt.hash(crypto.randomUUID(), 10),
      })
      .select("id, versao_sessao")
      .single();
    if (error || !novo) throw new Error(`Não foi possível criar o aluno de teste: ${error?.message ?? ""}`);
    aluno = novo;
  }
  const versao = aluno.versao_sessao + 1;
  await admin
    .from("alunos")
    .update({ versao_sessao: versao, ultimo_acesso: new Date().toISOString() })
    .eq("id", aluno.id);
  await iniciarSessaoAluno(aluno.id, turmaId, versao);
  revalidatePath(`/professor/turmas/${turmaId}`);
  redirect("/aluno");
}

export async function removerAluno(alunoId: string) {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("alunos").delete().eq("id", alunoId).select("turma_id").single();
  if (data) revalidatePath(`/professor/turmas/${data.turma_id}`);
  // Pedidos de entrada aparecem também no Início, em Turmas e no menu.
  revalidatePath("/professor", "layout");
}

/** Carta coringa: o professor pode apagar um tema impróprio ou fora do conteúdo. */
export async function apagarCarta(cartaId: string, turmaId: string) {
  const { supabase } = await exigirProfessor();
  await supabase.from("cartas_coringa").delete().eq("id", cartaId);
  revalidatePath(`/professor/turmas/${turmaId}`);
}

/** Aprova a carta coringa, com o tema possivelmente editado pelo professor. */
export async function aprovarCarta(cartaId: string, turmaId: string, form: FormData) {
  const { supabase } = await exigirProfessor();
  const tema = texto(form, "tema").replace(/\s+/g, " ");
  if (tema.length < 3 || tema.length > 160) return;
  await supabase
    .from("cartas_coringa")
    .update({ tema, status: "aprovada", atualizado_em: new Date().toISOString() })
    .eq("id", cartaId);
  revalidatePath(`/professor/turmas/${turmaId}`);
  revalidatePath("/professor");
}

/** Recusa a carta: o aluno vê o aviso e pode escrever outro tema enquanto o prazo estiver aberto. */
export async function recusarCarta(cartaId: string, turmaId: string) {
  const { supabase } = await exigirProfessor();
  await supabase.from("cartas_coringa").update({ status: "recusada" }).eq("id", cartaId);
  revalidatePath(`/professor/turmas/${turmaId}`);
  revalidatePath("/professor");
}

export async function aprovarAluno(alunoId: string) {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("alunos")
    .update({ aprovado: true })
    .eq("id", alunoId)
    .select("turma_id")
    .single();
  if (data) revalidatePath(`/professor/turmas/${data.turma_id}`);
  revalidatePath("/professor", "layout");
}

export async function aprovarTodos(turmaId: string) {
  const { supabase } = await exigirProfessor();
  await supabase.from("alunos").update({ aprovado: true }).eq("turma_id", turmaId).eq("aprovado", false);
  revalidatePath(`/professor/turmas/${turmaId}`);
  revalidatePath("/professor", "layout");
}

export async function alternarAprovacao(turmaId: string, exige: boolean) {
  const { supabase } = await exigirProfessor();
  await supabase.from("turmas").update({ exige_aprovacao: exige }).eq("id", turmaId);
  revalidatePath(`/professor/turmas/${turmaId}`);
}

// Temporadas -----------------------------------------------------------------

const schemaTemporada = z.object({
  nome: z.string().trim().min(1, "Informe o nome da temporada."),
  narrativa: z.string().trim(),
  inicio: z.iso.date("Informe a data de início."),
  data_prova: z.iso.date("Informe a data da prova."),
  // Vazio = encerra no dia da prova.
  encerramento: z.union([z.literal(""), z.iso.date("Data de encerramento inválida.")]).default(""),
  capitulos: z.string(),
});

function lerTemporada(form: FormData) {
  const r = schemaTemporada.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: r.error.issues[0].message } as const;
  const encerramento = encerramentoOuNulo(r.data.encerramento, r.data.data_prova);
  const erroDatas = conferirDatasTemporada({ ...r.data, encerramento });
  if (erroDatas) return { erro: erroDatas } as const;
  return {
    dados: {
      nome: r.data.nome,
      narrativa: r.data.narrativa || null,
      inicio: r.data.inicio,
      data_prova: r.data.data_prova,
      capitulos: r.data.capitulos
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
    },
    encerramento,
    // Caixa marcada por padrão: no encerramento sai o gabarito guardado.
    gabaritoNoEncerramento: form.get("gabarito_no_encerramento") === "on",
    // "desafio" (padrão): cada gabarito sai quando o desafio fecha; "encerramento": tudo de uma vez.
    gabaritoSoNoEncerramento: form.get("quando_gabarito") === "encerramento",
  } as const;
}

export async function criarTemporada(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const lido = lerTemporada(form);
  if ("erro" in lido) return { erro: lido.erro };
  const extras = colunasEncerramento(lido);
  const { data, error } = await supabase
    .from("temporadas")
    .insert({ ...lido.dados, ...extras, turma_id: texto(form, "turma_id") })
    .select("id")
    .single();
  if (error || !data)
    return { erro: Object.keys(extras).length ? ERRO_SQL_ENCERRAMENTO : "Não foi possível criar a temporada." };
  redirect(`/professor/temporadas/${data.id}`);
}

export async function atualizarTemporada(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const lido = lerTemporada(form);
  if ("erro" in lido) return { erro: lido.erro };
  const id = texto(form, "id");
  const { data: atual } = await supabase.from("temporadas").select("*").eq("id", id).maybeSingle();
  if (!atual) return { erro: "Temporada não encontrada." };
  const extras = colunasEncerramento(lido, atual);
  const novas = { data_prova: lido.dados.data_prova, encerramento: lido.encerramento };
  // Só confere os desafios quando o fim da pontuação muda.
  const mudouFim = ultimoDiaComPontos(novas) !== ultimoDiaComPontos(atual as Temporada);
  if (mudouFim) {
    const conferido = await ajustarDesafiosAoEncerramento(supabase, id, novas, false);
    if ("erro" in conferido) return { erro: conferido.erro };
  }
  const { error } = await supabase
    .from("temporadas")
    .update({ ...lido.dados, ...extras })
    .eq("id", id);
  if (error) return { erro: Object.keys(extras).length ? ERRO_SQL_ENCERRAMENTO : "Não foi possível salvar." };
  const ajustado = mudouFim ? await ajustarDesafiosAoEncerramento(supabase, id, novas, true) : { encurtados: 0 };
  if ("erro" in ajustado) return { erro: ajustado.erro };
  revalidatePath(`/professor/temporadas/${id}`);
  return {
    ok: ajustado.encurtados
      ? `Temporada salva. ${ajustado.encurtados} desafio(s) passaram a fechar no encerramento.`
      : "Temporada salva.",
  };
}

// Questões -------------------------------------------------------------------

const schemaQuestao = z.object({
  id: z.uuid().optional(),
  tipo: z.enum(TIPOS),
  capitulo: z.string().trim().max(200),
  habilidades: z.array(z.string()).max(8),
  dificuldade: z.number().int().min(1).max(3),
  fonte: z.string().trim().max(500),
  enunciado: z.string().trim().min(1, "Escreva o enunciado.").max(3000),
  imagem_path: z.string().nullable(),
  tempo_limite_s: z
    .number()
    .int()
    .min(TEMPO_MIN_S, `Tempo mínimo: ${TEMPO_MIN_S} s.`)
    .max(TEMPO_MAX_S, `Tempo máximo: ${TEMPO_MAX_S} s.`),
  relampago: z.boolean().default(false),
  conteudo: z.unknown(),
  explicacao: z.string().trim().max(2000),
  dica: z.string().trim().max(300).default(""),
  tema: z
    .string()
    .trim()
    .max(80, "Tema: até 80 caracteres.")
    .refine((v) => v === "" || v.length >= 3, "Tema: ao menos 3 caracteres.")
    .default(""),
  era_publica: z
    .string()
    .refine((v) => v === "" || ehEra(v), "Era inválida.")
    .default(""),
  status: z.enum(["rascunho", "publicada"]),
});
export type DadosQuestao = z.input<typeof schemaQuestao>;

export async function salvarQuestao(dados: DadosQuestao): Promise<EstadoForm & { id?: string }> {
  const { supabase, professorId } = await exigirProfessor();
  const r = schemaQuestao.safeParse(dados);
  if (!r.success) return { erro: r.error.issues[0].message };
  const conteudo = validarConteudo(r.data.tipo, r.data.conteudo);
  if (!conteudo.success) return { erro: conteudo.error.issues[0].message };
  if (r.data.imagem_path && !r.data.imagem_path.startsWith(`${professorId}/`)) return { erro: "Imagem inválida." };
  if (conteudo.data && "imagem" in conteudo.data && !conteudo.data.imagem.startsWith(`${professorId}/`)) {
    return { erro: "Imagem do mapa inválida." };
  }
  if (r.data.relampago) {
    const comoConteudo = { tipo: r.data.tipo, conteudo: conteudo.data } as Conteudo;
    const [problema] = problemasRelampago(r.data.enunciado, comoConteudo, r.data.tempo_limite_s);
    if (problema) return { erro: problema };
  }

  const linha = {
    tipo: r.data.tipo,
    capitulo: r.data.capitulo || null,
    habilidades: r.data.habilidades,
    dificuldade: r.data.dificuldade,
    fonte: r.data.fonte || null,
    enunciado: r.data.enunciado,
    imagem_path: r.data.imagem_path,
    tempo_limite_s: r.data.tempo_limite_s,
    relampago: r.data.relampago,
    conteudo: conteudo.data,
    explicacao: r.data.explicacao || null,
    dica: r.data.dica || null,
    tema: r.data.tema || null,
    era_publica: r.data.era_publica || null,
    status: r.data.status,
  };
  // Sem o SQL da verificação de leitura a coluna tema não existe: salva sem ela.
  const { tema, ...semTema } = linha;

  if (r.data.id) {
    // Questão já usada num desafio: o gabarito vira histórico e não pode mudar.
    const [{ count }, { count: publicas }] = await Promise.all([
      supabase.from("respostas").select("*", { count: "exact", head: true }).eq("questao_id", r.data.id),
      supabase.from("respostas_publicas").select("*", { count: "exact", head: true }).eq("questao_id", r.data.id),
    ]);
    if (count || publicas) {
      const { data: atual } = await supabase.from("questoes").select("tipo, conteudo").eq("id", r.data.id).single();
      if (atual && (atual.tipo !== linha.tipo || JSON.stringify(atual.conteudo) !== JSON.stringify(linha.conteudo))) {
        return {
          erro: "Alunos já responderam esta questão: o tipo e as alternativas não podem mudar. Duplique-a para criar uma versão nova.",
        };
      }
    }
    let { error } = await supabase.from("questoes").update(linha).eq("id", r.data.id);
    if (error && !tema) ({ error } = await supabase.from("questoes").update(semTema).eq("id", r.data.id));
    if (error) return { erro: "Não foi possível salvar." };
    revalidatePath("/professor/questoes");
    return { ok: "Questão salva.", id: r.data.id };
  }
  let { data, error } = await supabase.from("questoes").insert(linha).select("id").single();
  if (error && !tema) ({ data, error } = await supabase.from("questoes").insert(semTema).select("id").single());
  if (error || !data) return { erro: "Não foi possível salvar." };
  revalidatePath("/professor/questoes");
  return { ok: "Questão criada.", id: data.id };
}

export async function duplicarQuestao(id: string) {
  const { supabase } = await exigirProfessor();
  const { data: q } = await supabase.from("questoes").select("*").eq("id", id).single();
  if (!q) return;
  const { data } = await supabase
    .from("questoes")
    .insert({
      tipo: q.tipo,
      capitulo: q.capitulo,
      habilidades: q.habilidades,
      dificuldade: q.dificuldade,
      fonte: q.fonte,
      enunciado: q.enunciado,
      imagem_path: q.imagem_path,
      tempo_limite_s: q.tempo_limite_s,
      ...(q.relampago && { relampago: true }),
      ...(q.era_publica && { era_publica: q.era_publica }),
      conteudo: q.conteudo,
      explicacao: q.explicacao,
      dica: q.dica ?? null,
      ...(q.tema && { tema: q.tema }),
      status: "rascunho",
      origem: "manual",
    })
    .select("id")
    .single();
  if (data) redirect(`/professor/questoes/${data.id}`);
}

export async function mudarStatusQuestoes(ids: string[], status: "rascunho" | "publicada") {
  const { supabase } = await exigirProfessor();
  if (!ids.length) return;
  await supabase.from("questoes").update({ status }).in("id", ids);
  revalidatePath("/professor/questoes");
}

export async function excluirQuestao(id: string) {
  const { supabase } = await exigirProfessor();
  const { count } = await supabase
    .from("desafio_questoes")
    .select("*", { count: "exact", head: true })
    .eq("questao_id", id);
  if (count) return { erro: "Esta questão está em um desafio e não pode ser apagada." };
  const { count: publicas } = await supabase
    .from("respostas_publicas")
    .select("*", { count: "exact", head: true })
    .eq("questao_id", id);
  if (publicas) {
    return {
      erro: "Esta questão já foi jogada no desafio público e não pode ser apagada. Para tirá-la do sorteio, volte-a para rascunho.",
    };
  }
  const { data } = await supabase.from("questoes").delete().eq("id", id).select("imagem_path").single();
  if (data?.imagem_path) {
    // Duplicatas compartilham a imagem: só apaga o arquivo se ninguém mais usa.
    const { count: outras } = await supabase
      .from("questoes")
      .select("*", { count: "exact", head: true })
      .eq("imagem_path", data.imagem_path);
    if (!outras) await supabase.storage.from("questoes").remove([data.imagem_path]);
  }
  revalidatePath("/professor/questoes");
  return {};
}

// Desafios -------------------------------------------------------------------

const schemaDesafio = z.object({
  temporada_id: z.uuid(),
  tipo: z.enum(["semanal", "relampago"]).default("semanal"),
  titulo: z.string().trim().min(1, "Dê um título ao desafio."),
  abre_em: z.string().min(1, "Informe quando abre."),
  fecha_em: z.string().min(1, "Informe quando fecha."),
  pontos_por_acerto: z.number().int().min(1).max(100),
  tempo_por_questao_s: z
    .number()
    .int()
    .min(TEMPO_MIN_S, `Tempo mínimo: ${TEMPO_MIN_S} s.`)
    .max(TEMPO_MAX_S, `Tempo máximo: ${TEMPO_MAX_S} s.`)
    .nullable(),
  tempo_verificacao_s: z
    .number()
    .int()
    .min(VERIFICACAO_MIN_S, `Verificação de leitura: mínimo ${VERIFICACAO_MIN_S} s.`)
    .max(VERIFICACAO_MAX_S, `Verificação de leitura: máximo ${VERIFICACAO_MAX_S} s.`)
    .nullable()
    .default(null),
  saida_zera_questao: z.boolean(),
  // Regras do desafio: conferidas à parte em conferirRegras.
  regra_cliques: z.string().default("proibido"),
  tolerancia_cliques: z.number().nullable().default(null),
  verificacoes: z.number().nullable().default(null),
  regra_saidas: z.string().default("proibido"),
  tolerancia_saidas: z.number().nullable().default(null),
  eliminacoes_max: z.number().nullable().default(null),
  dicas_max: z.number().nullable().default(null),
  ordem_fixa: z.boolean().default(false),
  embaralhar_alternativas: z.boolean().default(true),
  teclado_bloqueado: z.boolean().default(true),
  gabarito_nunca: z.boolean().default(false),
  treino_liberado: z.boolean().default(true),
  bonus_rapidez: z.boolean().default(false),
  // Desafio especial: pontos de base × multiplicador; tempo_percentual 100 = normal.
  especial: z.boolean().default(false),
  multiplicador: z.number().nullable().default(null),
  tempo_percentual: z.number().nullable().default(null),
  questoes: z.array(z.uuid()).min(5, "Escolha de 5 a 15 questões.").max(15, "Escolha de 5 a 15 questões."),
  // Outras turmas que recebem uma cópia (a temporada atual de cada uma).
  outras_temporadas: z.array(z.uuid()).max(20).default([]),
});

export async function criarDesafio(dados: z.input<typeof schemaDesafio>): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const r = schemaDesafio.safeParse(dados);
  if (!r.success) return { erro: r.error.issues[0].message };
  const abre = dataHoraLocalParaIso(r.data.abre_em);
  const fecha = dataHoraLocalParaIso(r.data.fecha_em);
  if (fecha <= abre) return { erro: "O fechamento deve ser depois da abertura." };
  const conferidas = conferirRegras(r.data);
  if ("erro" in conferidas) return { erro: conferidas.erro };
  const { regras } = conferidas;
  const { especial, multiplicador, tempo_percentual } = r.data;
  if (especial && (!ehMultiplicador(multiplicador) || !ehPercentual(tempo_percentual)))
    return { erro: "Escolha o multiplicador e o tempo do desafio especial." };
  const { data: publicadas } = await supabase
    .from("questoes")
    .select("id")
    .in("id", r.data.questoes)
    .eq("status", "publicada");
  if ((publicadas ?? []).length !== r.data.questoes.length) return { erro: "Use só questões publicadas." };

  /** Cria o desafio numa temporada; devolve o id ou a mensagem de erro. */
  const criarEm = async (temporadaId: string): Promise<{ id: string } | { erro: string }> => {
    const { data: temporada } = await supabase.from("temporadas").select("*").eq("id", temporadaId).maybeSingle();
    if (!temporada) return { erro: "Temporada não encontrada." };
    if ((temporada as { encerrada_em?: string | null }).encerrada_em) {
      return { erro: "Esta temporada foi encerrada. Reabra a temporada para criar desafios nela." };
    }
    // O desafio precisa fechar até o encerramento da temporada (de cada turma).
    const erroJanela = conferirJanelaNaTemporada(fecha, temporada as Temporada, true);
    if (erroJanela) return { erro: erroJanela };
    const { data: desafio, error } = await supabase
      .from("desafios")
      .insert({
        temporada_id: temporadaId,
        tipo: r.data.tipo,
        codigo_dia: r.data.tipo === "relampago" ? gerarCodigoDia() : null,
        titulo: r.data.titulo,
        abre_em: abre,
        fecha_em: fecha,
        pontos_por_acerto: especial
          ? pontosDoEspecial(r.data.pontos_por_acerto, multiplicador!)
          : r.data.pontos_por_acerto,
        tempo_por_questao_s: r.data.tempo_por_questao_s,
        // Só envia se escrito: sem o SQL dos tempos a coluna não existe.
        ...(r.data.tempo_verificacao_s !== null && { tempo_verificacao_s: r.data.tempo_verificacao_s }),
        saida_zera_questao: r.data.saida_zera_questao,
        ...regrasParaGravar(regras),
        // Só envia no especial: sem o SQL do especial as colunas não existem.
        ...(especial && { especial: true, multiplicador, tempo_percentual }),
      })
      .select("id")
      .single();
    if (error || !desafio)
      return {
        erro: especial
          ? ERRO_SQL_ESPECIAL
          : Object.keys(regrasParaGravar(regras)).length
            ? ERRO_SQL_REGRAS
            : "Não foi possível criar o desafio.",
      };
    const { error: erroQuestoes } = await supabase
      .from("desafio_questoes")
      .insert(r.data.questoes.map((questao_id, posicao) => ({ desafio_id: desafio.id, questao_id, posicao })));
    if (erroQuestoes) {
      await supabase.from("desafios").delete().eq("id", desafio.id);
      return { erro: "Não foi possível salvar as questões do desafio." };
    }
    return { id: desafio.id };
  };

  const principal = await criarEm(r.data.temporada_id);
  if ("erro" in principal) return principal;
  const outras = [...new Set(r.data.outras_temporadas)].filter((t) => t !== r.data.temporada_id);
  let copias = 0;
  for (const t of outras) if ("id" in (await criarEm(t))) copias += 1;
  const falhas = outras.length - copias;
  redirect(
    `/professor/desafios/${principal.id}${outras.length ? `?copias=${copias}${falhas ? `&falhas=${falhas}` : ""}` : ""}`,
  );
}

export async function atualizarJanelaDesafio(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const id = texto(form, "id");
  const abre = dataHoraLocalParaIso(texto(form, "abre_em"));
  const fecha = dataHoraLocalParaIso(texto(form, "fecha_em"));
  if (fecha <= abre) return { erro: "O fechamento deve ser depois da abertura." };
  const { data: doDesafio } = await supabase.from("desafios").select("temporadas(*)").eq("id", id).maybeSingle();
  const erroJanela = conferirJanelaNaTemporada(
    fecha,
    (doDesafio?.temporadas as unknown as Temporada | null) ?? null,
    false,
  );
  if (erroJanela) return { erro: erroJanela };
  const { error } = await supabase
    .from("desafios")
    .update({
      abre_em: abre,
      fecha_em: fecha,
      titulo: texto(form, "titulo") || undefined,
      ...(form.has("pesquisa") && { saida_zera_questao: form.get("pesquisa") === "bloqueada" }),
    })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "Desafio atualizado." };
}

const ERRO_SQL_TEMPOS = "Rode antes o SQL 20261106120000_tempos_editaveis.sql no Supabase.";

export type DadosTempos = {
  /** Tempo único para todas as questões (null = o de cada questão). */
  todas: number | null;
  /** Tempo de cada questão neste desafio (null = automático). */
  questoes: { questao_id: string; tempo: number | null }[];
  /** Tempo da verificação de leitura (null = 15 s). */
  verificacao: number | null;
};

/**
 * Tempos de resposta do desafio. Valem na hora, inclusive para quem já está
 * jogando: o servidor confere o tempo de cada questão ao receber a resposta.
 */
export async function salvarTemposDesafio(id: string, dados: DadosTempos): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const { data: linhas } = await supabase
    .from("desafio_questoes")
    .select("questao_id, questoes(relampago, enunciado)")
    .eq("desafio_id", id);
  if (!linhas?.length) return { erro: "Desafio não encontrado." };
  const doDesafio = new Map(
    (linhas as unknown as { questao_id: string; questoes: { relampago?: boolean; enunciado: string } }[]).map((l) => [
      l.questao_id,
      l.questoes,
    ]),
  );

  if (dados.todas !== null) {
    const problema = problemaTempoQuestao(dados.todas, false);
    if (problema) return { erro: `Tempo para todas as questões: ${problema}` };
  }
  if (dados.verificacao !== null) {
    const problema = problemaTempoVerificacao(dados.verificacao);
    if (problema) return { erro: problema };
  }
  for (const [i, q] of dados.questoes.entries()) {
    const questao = doDesafio.get(q.questao_id);
    if (!questao) return { erro: "Questão fora deste desafio." };
    if (q.tempo === null) continue;
    const problema = problemaTempoQuestao(q.tempo, Boolean(questao.relampago));
    if (problema) return { erro: `Questão ${i + 1}: ${problema}` };
  }

  const { error } = await supabase
    .from("desafios")
    .update({ tempo_por_questao_s: dados.todas, tempo_verificacao_s: dados.verificacao })
    .eq("id", id);
  if (error) return { erro: ERRO_SQL_TEMPOS };
  const resultados = await Promise.all(
    dados.questoes.map((q) =>
      supabase
        .from("desafio_questoes")
        .update({ tempo_limite_s: q.tempo })
        .eq("desafio_id", id)
        .eq("questao_id", q.questao_id),
    ),
  );
  if (resultados.some((r) => r.error)) return { erro: ERRO_SQL_TEMPOS };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "Tempos salvos. Já valem para quem está jogando." };
}

/**
 * Regras do desafio: cliques fora (sem consulta) e número de questões teste.
 * Os cliques valem na hora; as questões teste são sorteadas quando o aluno
 * começa, então só valem para quem ainda não começou.
 */
export async function salvarRegrasDesafio(id: string, dados: Record<string, unknown>): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const conferidas = conferirRegras(dados);
  if ("erro" in conferidas) return { erro: conferidas.erro };
  const { error } = await supabase.from("desafios").update(conferidas.regras).eq("id", id);
  if (error) return { erro: ERRO_SQL_REGRAS };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "Regras salvas." };
}

const ERRO_SQL_ESPECIAL = "Rode antes no Supabase o SQL 20261111120000_especial_configuracoes.sql.";

/**
 * Liga ou desliga o desafio especial. Os pontos já ganhos ficam como estão,
 * por isso só vale enquanto ninguém começou.
 */
export async function salvarEspecial(
  id: string,
  dados: { especial: boolean; multiplicador: number; tempo_percentual: number },
): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  if (dados.especial && (!ehMultiplicador(dados.multiplicador) || !ehPercentual(dados.tempo_percentual)))
    return { erro: "Escolha o multiplicador e o tempo." };
  const [{ data: d }, { count: comecaram }] = await Promise.all([
    supabase.from("desafios").select("*").eq("id", id).maybeSingle(),
    supabase.from("tentativas").select("*", { count: "exact", head: true }).eq("desafio_id", id),
  ]);
  if (!d) return { erro: "Desafio não encontrado." };
  if (comecaram) return { erro: "Alguém já começou este desafio: os pontos não podem mais mudar." };
  const base = pontosBase(d);
  const { error } = await supabase
    .from("desafios")
    .update(
      dados.especial
        ? {
            especial: true,
            multiplicador: dados.multiplicador,
            tempo_percentual: dados.tempo_percentual,
            pontos_por_acerto: pontosDoEspecial(base, dados.multiplicador),
          }
        : { especial: false, multiplicador: null, tempo_percentual: null, pontos_por_acerto: base },
    )
    .eq("id", id);
  if (error) return { erro: ERRO_SQL_ESPECIAL };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: dados.especial ? "Desafio especial salvo." : "Agora é um desafio comum." };
}

/** Padrões de todo desafio novo (tela Configurações). */
export async function salvarConfiguracoes(dados: Record<string, unknown>): Promise<EstadoForm> {
  const { supabase, professorId } = await exigirProfessor();
  const r = conferirPadroes(dados);
  if ("erro" in r) return { erro: r.erro };
  const { error } = await supabase
    .from("configuracoes_professor")
    .upsert({ professor_id: professorId, padroes: r.padroes, atualizado_em: new Date().toISOString() });
  if (error) return { erro: ERRO_SQL_ESPECIAL };
  revalidatePath("/professor/configuracoes");
  return { ok: "Padrões salvos. Valem para os próximos desafios." };
}

/** Fecha o desafio agora (quem está respondendo termina a questão atual). */
export async function encerrarDesafioAgora(id: string): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const { data: d } = await supabase.from("desafios").select("abre_em, fecha_em").eq("id", id).maybeSingle();
  if (!d) return { erro: "Desafio não encontrado." };
  const agora = new Date();
  if (agora <= new Date(d.abre_em)) return { erro: "O desafio ainda não abriu." };
  if (agora > new Date(d.fecha_em)) return { erro: "O desafio já está encerrado." };
  const { error } = await supabase.from("desafios").update({ fecha_em: agora.toISOString() }).eq("id", id);
  if (error) return { erro: "Não foi possível encerrar." };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "Desafio encerrado." };
}

const ERRO_SQL_CONTROLES = "Rode antes o SQL 20261030180000_controles_professor.sql no Supabase.";

/** manual = o gabarito só aparece quando o professor liberar. */
export async function definirGabaritoManual(id: string, manual: boolean): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const { error } = await supabase
    .from("desafios")
    .update({ gabarito_manual: manual, gabarito_liberado_em: null })
    .eq("id", id);
  if (error) return { erro: ERRO_SQL_CONTROLES };
  revalidatePath(`/professor/desafios/${id}`);
  return {
    ok: manual ? "O gabarito só aparece quando você liberar." : "O gabarito aparece sozinho quando o prazo acabar.",
  };
}

export async function liberarGabarito(id: string): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const { data: d } = await supabase.from("desafios").select("fecha_em").eq("id", id).maybeSingle();
  if (!d) return { erro: "Desafio não encontrado." };
  // Com o desafio aberto, o gabarito viraria cola para quem ainda não fez.
  if (new Date() <= new Date(d.fecha_em)) return { erro: "Encerre o desafio antes de liberar o gabarito." };
  const { error } = await supabase
    .from("desafios")
    .update({ gabarito_liberado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { erro: ERRO_SQL_CONTROLES };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "Gabarito liberado para os alunos." };
}

/**
 * Encerra a temporada antes da prova: fecha agora os desafios abertos e apaga os
 * que ainda não abriram (ninguém jogou; as questões continuam no banco). Fechar
 * esses em vez de apagar quebraria a ofensiva e a meta da semana da turma.
 */
export async function encerrarTemporada(id: string): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const agora = new Date().toISOString();
  const { error } = await supabase.from("temporadas").update({ encerrada_em: agora }).eq("id", id);
  if (error) return { erro: ERRO_SQL_CONTROLES };
  const [abertos, agendados] = await Promise.all([
    supabase
      .from("desafios")
      .update({ fecha_em: agora })
      .eq("temporada_id", id)
      .lte("abre_em", agora)
      .gt("fecha_em", agora),
    supabase.from("desafios").delete().eq("temporada_id", id).gt("abre_em", agora),
  ]);
  if (abertos.error || agendados.error)
    return { erro: "A temporada foi marcada como encerrada, mas nem todos os desafios fecharam. Tente de novo." };
  revalidatePath(`/professor/temporadas/${id}`);
  return { ok: "Temporada encerrada." };
}

export async function reabrirTemporada(id: string): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const { error } = await supabase.from("temporadas").update({ encerrada_em: null }).eq("id", id);
  if (error) return { erro: ERRO_SQL_CONTROLES };
  revalidatePath(`/professor/temporadas/${id}`);
  return { ok: "Temporada reaberta. Ajuste as datas dos desafios que quiser reabrir." };
}

// CaduRush ------------------------------------------------------------------

async function desafioRelampago(supabase: Awaited<ReturnType<typeof exigirProfessor>>["supabase"], id: string) {
  const { data } = await supabase
    .from("desafios")
    .select("id, abre_em, fecha_em")
    .eq("id", id)
    .eq("tipo", "relampago")
    .maybeSingle();
  return data;
}

/** Abre o CaduRush agora, mantendo a duração planejada da aula. */
export async function liberarRelampagoAgora(id: string): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const d = await desafioRelampago(supabase, id);
  if (!d) return { erro: "Desafio relâmpago não encontrado." };
  const { error } = await supabase.from("desafios").update(janelaLiberadaAgora(d.abre_em, d.fecha_em)).eq("id", id);
  if (error) return { erro: "Não foi possível liberar." };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "CaduRush liberado! Mostre o código para a turma." };
}

/** Fecha o CaduRush antes do horário (quem está respondendo termina a questão atual). */
export async function encerrarRelampagoAgora(id: string): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const d = await desafioRelampago(supabase, id);
  if (!d) return { erro: "Desafio relâmpago não encontrado." };
  const agora = new Date();
  if (agora <= new Date(d.abre_em)) return { erro: "O desafio ainda não abriu." };
  const { error } = await supabase.from("desafios").update({ fecha_em: agora.toISOString() }).eq("id", id);
  if (error) return { erro: "Não foi possível encerrar." };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "CaduRush encerrado." };
}

export async function novoCodigoRelampago(id: string): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const { error } = await supabase
    .from("desafios")
    .update({ codigo_dia: gerarCodigoDia() })
    .eq("id", id)
    .eq("tipo", "relampago");
  if (error) return { erro: "Não foi possível trocar o código." };
  revalidatePath(`/professor/desafios/${id}`);
  return { ok: "Código trocado." };
}

export async function excluirDesafio(id: string) {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("desafios").delete().eq("id", id).select("temporada_id").single();
  redirect(data ? `/professor/temporadas/${data.temporada_id}` : "/professor");
}

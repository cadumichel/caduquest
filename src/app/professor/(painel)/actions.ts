"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { gerarCodigoDia, janelaLiberadaAgora } from "@/lib/cadurush";
import { gerarCodigoTurma } from "@/lib/codigo";
import { dataHoraLocalParaIso } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import { TEMPO_MAX_S, TEMPO_MIN_S, TIPOS, validarConteudo } from "@/lib/questoes/tipos";

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

export async function removerAluno(alunoId: string) {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("alunos").delete().eq("id", alunoId).select("turma_id").single();
  if (data) revalidatePath(`/professor/turmas/${data.turma_id}`);
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
}

export async function aprovarTodos(turmaId: string) {
  const { supabase } = await exigirProfessor();
  await supabase.from("alunos").update({ aprovado: true }).eq("turma_id", turmaId).eq("aprovado", false);
  revalidatePath(`/professor/turmas/${turmaId}`);
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
  capitulos: z.string(),
});

function lerTemporada(form: FormData) {
  const r = schemaTemporada.safeParse(Object.fromEntries(form));
  if (!r.success) return { erro: r.error.issues[0].message } as const;
  if (r.data.data_prova < r.data.inicio) return { erro: "A prova deve ser depois do início." } as const;
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
  } as const;
}

export async function criarTemporada(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const lido = lerTemporada(form);
  if ("erro" in lido) return { erro: lido.erro };
  const { data, error } = await supabase
    .from("temporadas")
    .insert({ ...lido.dados, turma_id: texto(form, "turma_id") })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível criar a temporada." };
  redirect(`/professor/temporadas/${data.id}`);
}

export async function atualizarTemporada(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const lido = lerTemporada(form);
  if ("erro" in lido) return { erro: lido.erro };
  const id = texto(form, "id");
  const { error } = await supabase.from("temporadas").update(lido.dados).eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath(`/professor/temporadas/${id}`);
  return { ok: "Temporada salva." };
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
  conteudo: z.unknown(),
  explicacao: z.string().trim().max(2000),
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

  const linha = {
    tipo: r.data.tipo,
    capitulo: r.data.capitulo || null,
    habilidades: r.data.habilidades,
    dificuldade: r.data.dificuldade,
    fonte: r.data.fonte || null,
    enunciado: r.data.enunciado,
    imagem_path: r.data.imagem_path,
    tempo_limite_s: r.data.tempo_limite_s,
    conteudo: conteudo.data,
    explicacao: r.data.explicacao || null,
    status: r.data.status,
  };

  if (r.data.id) {
    // Questão já usada num desafio: o gabarito vira histórico e não pode mudar.
    const { count } = await supabase
      .from("respostas")
      .select("*", { count: "exact", head: true })
      .eq("questao_id", r.data.id);
    if (count) {
      const { data: atual } = await supabase.from("questoes").select("tipo, conteudo").eq("id", r.data.id).single();
      if (atual && (atual.tipo !== linha.tipo || JSON.stringify(atual.conteudo) !== JSON.stringify(linha.conteudo))) {
        return {
          erro: "Alunos já responderam esta questão: o tipo e as alternativas não podem mudar. Duplique-a para criar uma versão nova.",
        };
      }
    }
    const { error } = await supabase.from("questoes").update(linha).eq("id", r.data.id);
    if (error) return { erro: "Não foi possível salvar." };
    revalidatePath("/professor/questoes");
    return { ok: "Questão salva.", id: r.data.id };
  }
  const { data, error } = await supabase.from("questoes").insert(linha).select("id").single();
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
      conteudo: q.conteudo,
      explicacao: q.explicacao,
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
  saida_zera_questao: z.boolean(),
  questoes: z.array(z.uuid()).min(5, "Escolha de 5 a 15 questões.").max(15, "Escolha de 5 a 15 questões."),
});

export async function criarDesafio(dados: z.input<typeof schemaDesafio>): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const r = schemaDesafio.safeParse(dados);
  if (!r.success) return { erro: r.error.issues[0].message };
  const abre = dataHoraLocalParaIso(r.data.abre_em);
  const fecha = dataHoraLocalParaIso(r.data.fecha_em);
  if (fecha <= abre) return { erro: "O fechamento deve ser depois da abertura." };

  const { data: publicadas } = await supabase
    .from("questoes")
    .select("id")
    .in("id", r.data.questoes)
    .eq("status", "publicada");
  if ((publicadas ?? []).length !== r.data.questoes.length) return { erro: "Use só questões publicadas." };

  const { data: desafio, error } = await supabase
    .from("desafios")
    .insert({
      temporada_id: r.data.temporada_id,
      tipo: r.data.tipo,
      codigo_dia: r.data.tipo === "relampago" ? gerarCodigoDia() : null,
      titulo: r.data.titulo,
      abre_em: abre,
      fecha_em: fecha,
      pontos_por_acerto: r.data.pontos_por_acerto,
      tempo_por_questao_s: r.data.tempo_por_questao_s,
      saida_zera_questao: r.data.saida_zera_questao,
    })
    .select("id")
    .single();
  if (error || !desafio) return { erro: "Não foi possível criar o desafio." };
  const { error: erroQuestoes } = await supabase
    .from("desafio_questoes")
    .insert(r.data.questoes.map((questao_id, posicao) => ({ desafio_id: desafio.id, questao_id, posicao })));
  if (erroQuestoes) {
    await supabase.from("desafios").delete().eq("id", desafio.id);
    return { erro: "Não foi possível salvar as questões do desafio." };
  }
  redirect(`/professor/desafios/${desafio.id}`);
}

export async function atualizarJanelaDesafio(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirProfessor();
  const id = texto(form, "id");
  const abre = dataHoraLocalParaIso(texto(form, "abre_em"));
  const fecha = dataHoraLocalParaIso(texto(form, "fecha_em"));
  if (fecha <= abre) return { erro: "O fechamento deve ser depois da abertura." };
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

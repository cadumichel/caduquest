"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { encerrarSessaoAluno, esquecerAluno, iniciarSessaoAluno, lembrarAluno } from "@/lib/aluno-sessao";
import { apelidoImproprio } from "@/lib/apelido";
import { CORES_AVATAR } from "@/components/Avatar";
import { INICIAIS } from "@/lib/personagens";
import { criarClienteAdmin } from "@/lib/supabase/admin";

import { BLOQUEIO_MINUTOS, ERRO_SIMULTANEO, reservarTentativa } from "@/lib/pin";

const schema = z.object({
  modo: z.enum(["entrar", "cadastrar"]),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "O código da turma tem 6 letras ou números."),
  apelido: z
    .string()
    .trim()
    .min(2, "O apelido precisa ter de 2 a 20 caracteres.")
    .max(20, "O apelido precisa ter de 2 a 20 caracteres.")
    .regex(/^[\p{L}\p{N} _.-]+$/u, "Use só letras, números, espaço, ponto, hífen ou _."),
  pin: z.string().regex(/^\d{4}$/, "O PIN tem 4 números."),
  nome_real: z.string().trim().max(80, "Nome muito longo.").optional(),
  avatar: z.coerce.number().int().optional(),
  cor: z.coerce.number().int().optional(),
});

const sorteio = <T>(lista: readonly T[]) => lista[Math.floor(Math.random() * lista.length)];

/** oferecerCadastro: apelido não existe na turma; a tela troca para "Primeira vez aqui". */
export type EstadoEntrar = { erro?: string; oferecerCadastro?: boolean };

export async function entrar(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const dados = schema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { modo, codigo, apelido, pin, nome_real } = dados.data;
  // No cadastro o aluno escolhe entre os personagens básicos; especial só com medalha.
  const avatarEscolhido = INICIAIS.includes(dados.data.avatar ?? -1) ? dados.data.avatar! : sorteio(INICIAIS);
  const corEscolhida =
    dados.data.cor !== undefined && dados.data.cor >= 0 && dados.data.cor < CORES_AVATAR.length
      ? dados.data.cor
      : Math.floor(Math.random() * CORES_AVATAR.length);

  const db = criarClienteAdmin();
  const { data: turma } = await db.from("turmas").select("id, exige_aprovacao").eq("codigo", codigo).maybeSingle();
  if (!turma) return { erro: "Não achamos uma turma com esse código. Confira com o professor." };

  const { data: aluno } = await db
    .from("alunos")
    .select("id, apelido, avatar, cor, pin_hash, tentativas_falhas, bloqueado_ate, versao_sessao, total_acessos")
    .eq("turma_id", turma.id)
    .ilike(
      "apelido",
      apelido.replace(/[\\%_]/g, (c) => `\\${c}`),
    )
    .maybeSingle();

  let alunoId: string;
  let versao: number;
  let lembrar = { codigo, apelido, avatar: avatarEscolhido, cor: corEscolhida };

  if (!aluno) {
    if (modo === "entrar") {
      // Não revela nada além do que a mensagem antiga já dizia (o apelido não
      // existe nesta turma); PINs continuam protegidos pelo limite de tentativas.
      return { oferecerCadastro: true };
    }
    if (apelidoImproprio(apelido)) return { erro: "Esse apelido não é permitido. Escolha outro." };
    if (form.get("anotei") !== "sim") {
      return { erro: "Anote seu apelido e seu PIN e marque a caixa confirmando que anotou." };
    }
    if (!nome_real || nome_real.split(/\s+/).length < 2) {
      return { erro: "Informe seu nome completo (nome e sobrenome). Só o professor vê." };
    }
    const { data: novo, error } = await db
      .from("alunos")
      .insert({
        turma_id: turma.id,
        apelido,
        nome_real,
        pin_hash: await bcrypt.hash(pin, 10),
        versao_sessao: 1,
        aprovado: !turma.exige_aprovacao,
        avatar: avatarEscolhido,
        cor: corEscolhida,
        ultimo_acesso: new Date().toISOString(),
        total_acessos: 1,
      })
      .select("id, versao_sessao")
      .single();
    if (error || !novo) {
      // Só a duplicidade de apelido (unique) vira "apelido em uso"; qualquer outra
      // falha do banco não pode se disfarçar de apelido repetido.
      if (error?.code === "23505") return { erro: "Esse apelido já está em uso na turma. Escolha outro." };
      console.error("cadastro de aluno falhou", error?.code, error?.message);
      return { erro: "Não foi possível criar sua conta agora. Tente de novo ou avise o professor." };
    }
    alunoId = novo.id;
    versao = novo.versao_sessao;
  } else {
    if (aluno.bloqueado_ate && new Date(aluno.bloqueado_ate) > new Date()) {
      return {
        erro: `Muitas tentativas erradas. Tente de novo em ${BLOQUEIO_MINUTOS} minutos ou peça ao professor para redefinir seu PIN.`,
      };
    }
    if (aluno.pin_hash === null) {
      // O professor redefiniu o PIN: o PIN digitado agora passa a valer.
      await db
        .from("alunos")
        .update({ pin_hash: await bcrypt.hash(pin, 10) })
        .eq("id", aluno.id);
    } else {
      if (!(await reservarTentativa(db, "alunos", aluno))) return { erro: ERRO_SIMULTANEO };
      if (!(await bcrypt.compare(pin, aluno.pin_hash))) {
        if (modo === "cadastrar") return { erro: "Esse apelido já está em uso na turma. Escolha outro." };
        return { erro: "PIN incorreto." };
      }
    }
    // Nova sessão invalida a anterior: um aparelho por vez.
    versao = aluno.versao_sessao + 1;
    await db
      .from("alunos")
      .update({
        versao_sessao: versao,
        tentativas_falhas: 0,
        bloqueado_ate: null,
        ultimo_acesso: new Date().toISOString(),
        total_acessos: aluno.total_acessos + 1,
      })
      .eq("id", aluno.id);
    alunoId = aluno.id;
    lembrar = { codigo, apelido: aluno.apelido, avatar: aluno.avatar, cor: aluno.cor };
  }

  await iniciarSessaoAluno(alunoId, turma.id, versao);
  await lembrarAluno(lembrar);
  redirect("/aluno");
}

/** "Não é você?": esquece o aluno lembrado neste aparelho. */
export async function trocarConta() {
  await esquecerAluno();
  redirect("/entrar");
}

export async function sair() {
  await encerrarSessaoAluno();
  redirect("/entrar");
}

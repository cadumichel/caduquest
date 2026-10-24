"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { encerrarSessaoAluno, iniciarSessaoAluno } from "@/lib/aluno-sessao";
import { apelidoImproprio } from "@/lib/apelido";
import { TOTAL_AVATARES, CORES_AVATAR } from "@/components/Avatar";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const LIMITE_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

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
});

export type EstadoEntrar = { erro?: string };

export async function entrar(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const dados = schema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { modo, codigo, apelido, pin, nome_real } = dados.data;

  const db = criarClienteAdmin();
  const { data: turma } = await db.from("turmas").select("id, exige_aprovacao").eq("codigo", codigo).maybeSingle();
  if (!turma) return { erro: "Não achamos uma turma com esse código. Confira com o professor." };

  const { data: aluno } = await db
    .from("alunos")
    .select("id, pin_hash, tentativas_falhas, bloqueado_ate, versao_sessao, total_acessos")
    .eq("turma_id", turma.id)
    .ilike(
      "apelido",
      apelido.replace(/[\\%_]/g, (c) => `\\${c}`),
    )
    .maybeSingle();

  let alunoId: string;
  let versao: number;

  if (!aluno) {
    if (modo === "entrar") {
      return { erro: 'Não achamos esse apelido na turma. Se é seu primeiro acesso, escolha "Primeiro acesso".' };
    }
    if (apelidoImproprio(apelido)) return { erro: "Esse apelido não é permitido. Escolha outro." };
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
        avatar: Math.floor(Math.random() * TOTAL_AVATARES),
        cor: Math.floor(Math.random() * CORES_AVATAR.length),
        ultimo_acesso: new Date().toISOString(),
        total_acessos: 1,
      })
      .select("id, versao_sessao")
      .single();
    if (error || !novo) return { erro: "Esse apelido já está em uso na turma. Escolha outro." };
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
    } else if (!(await bcrypt.compare(pin, aluno.pin_hash))) {
      const falhas = aluno.tentativas_falhas + 1;
      await db
        .from("alunos")
        .update({
          tentativas_falhas: falhas >= LIMITE_TENTATIVAS ? 0 : falhas,
          bloqueado_ate:
            falhas >= LIMITE_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000).toISOString() : null,
        })
        .eq("id", aluno.id);
      if (modo === "cadastrar") return { erro: "Esse apelido já está em uso na turma. Escolha outro." };
      return { erro: "PIN incorreto." };
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
  }

  await iniciarSessaoAluno(alunoId, turma.id, versao);
  redirect("/aluno");
}

export async function sair() {
  await encerrarSessaoAluno();
  redirect("/entrar");
}

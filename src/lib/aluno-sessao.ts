import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { segredoSessaoAluno } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const COOKIE = "cq_aluno";
const DURACAO_DIAS = 30;

type Carga = { sub: string; turma: string; v: number };

export async function iniciarSessaoAluno(alunoId: string, turmaId: string, versao: number) {
  const token = await new SignJWT({ turma: turmaId, v: versao })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(alunoId)
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(segredoSessaoAluno());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_DIAS * 86400,
  });
}

export async function encerrarSessaoAluno() {
  (await cookies()).delete(COOKIE);
}

/**
 * Lembra neste aparelho quem entrou por último, para o próximo acesso pedir só
 * o PIN. Não dá acesso sozinho: o PIN continua sendo conferido.
 */
const COOKIE_LEMBRAR = "cq_lembrar";
export type AlunoLembrado = { codigo: string; apelido: string; avatar: number; cor: number };

export async function lembrarAluno(dados: AlunoLembrado) {
  (await cookies()).set(COOKIE_LEMBRAR, JSON.stringify(dados), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 86400,
  });
}

export async function alunoLembrado(): Promise<AlunoLembrado | null> {
  const valor = (await cookies()).get(COOKIE_LEMBRAR)?.value;
  if (!valor) return null;
  try {
    const d = JSON.parse(valor) as AlunoLembrado;
    return typeof d.codigo === "string" && typeof d.apelido === "string" ? d : null;
  } catch {
    return null;
  }
}

export async function esquecerAluno() {
  (await cookies()).delete(COOKIE_LEMBRAR);
}

export type AlunoSessao = {
  id: string;
  apelido: string;
  avatar: number;
  cor: number;
  aprovado: boolean;
  turmaId: string;
  turmaNome: string;
  escolaNome: string;
};

/**
 * Lê a sessão do aluno. Devolve null se não houver, se o aluno foi removido ou
 * se ele entrou em outro aparelho depois (um aparelho por vez).
 */
export async function obterAluno(): Promise<AlunoSessao | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let carga: Carga;
  try {
    const { payload } = await jwtVerify(token, segredoSessaoAluno(), { algorithms: ["HS256"] });
    carga = payload as unknown as Carga;
  } catch {
    return null;
  }

  const { data } = await criarClienteAdmin()
    .from("alunos")
    .select("id, apelido, avatar, cor, aprovado, turma_id, versao_sessao, turmas(nome, escolas(nome))")
    .eq("id", carga.sub)
    .maybeSingle();
  if (!data || data.turma_id !== carga.turma || data.versao_sessao !== carga.v) return null;

  const turma = data.turmas as unknown as { nome: string; escolas: { nome: string } };
  return {
    id: data.id,
    apelido: data.apelido,
    avatar: data.avatar,
    cor: data.cor,
    aprovado: data.aprovado,
    turmaId: data.turma_id,
    turmaNome: turma.nome,
    escolaNome: turma.escolas.nome,
  };
}

/** Aluno logado e já aprovado pelo professor. */
export async function exigirAluno(): Promise<AlunoSessao> {
  const aluno = await obterAluno();
  if (!aluno) redirect("/entrar?sessao=expirada");
  if (!aluno.aprovado) redirect("/aguardando");
  return aluno;
}

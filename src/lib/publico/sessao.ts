import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { hojeEmBrasilia } from "@/lib/datas";
import { segredoSessaoAluno } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** Sessão dos jogadores públicos: separada da sessão dos alunos das turmas. */
const COOKIE = "cq_jogador";
const DURACAO_DIAS = 90;
const TIPO = "publico";

type Carga = { sub: string; v: number; tipo: string };

export type JogadorSessao = { id: string; apelido: string; avatar: number; cor: number };

export async function iniciarSessaoJogador(jogadorId: string, versao: number) {
  const token = await new SignJWT({ v: versao, tipo: TIPO })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(jogadorId)
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

export async function encerrarSessaoJogador() {
  (await cookies()).delete(COOKIE);
}

/** Jogador logado, ou null. Um aparelho por vez, como os alunos. */
export const obterJogador = cache(async (): Promise<JogadorSessao | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let carga: Carga;
  try {
    const { payload } = await jwtVerify(token, segredoSessaoAluno(), { algorithms: ["HS256"] });
    carga = payload as unknown as Carga;
  } catch {
    return null;
  }
  if (carga.tipo !== TIPO) return null;
  const { data } = await criarClienteAdmin()
    .from("jogadores_publicos")
    .select("id, apelido, avatar, cor, versao_sessao")
    .eq("id", carga.sub)
    .maybeSingle();
  if (!data || data.versao_sessao !== carga.v) return null;
  await registrarAcesso(data.id);
  return { id: data.id, apelido: data.apelido, avatar: data.avatar, cor: data.cor };
});

export async function exigirJogador(): Promise<JogadorSessao> {
  const jogador = await obterJogador();
  if (!jogador) redirect("/jogar/entrar?sessao=expirada");
  return jogador;
}

/** Jogadores cujo acesso de hoje já foi gravado por esta instância do servidor. */
const acessoGravado = new Map<string, string>();

/**
 * Marca que o jogador abriu o modo público hoje (um registro por dia, para o
 * relatório do professor). Falhar aqui nunca impede o jogo.
 */
async function registrarAcesso(jogadorId: string) {
  const dia = hojeEmBrasilia();
  if (acessoGravado.get(jogadorId) === dia) return;
  try {
    const db = criarClienteAdmin();
    const { data, error } = await db
      .from("acessos_publicos")
      .upsert({ jogador_id: jogadorId, dia }, { onConflict: "jogador_id,dia", ignoreDuplicates: true })
      .select("dia");
    if (error) return;
    if (acessoGravado.size > 5000) acessoGravado.clear();
    acessoGravado.set(jogadorId, dia);
    // Primeiro acesso do dia: atualiza também o "último acesso" do jogador.
    if (data?.length) {
      await db.from("jogadores_publicos").update({ ultimo_acesso: new Date().toISOString() }).eq("id", jogadorId);
    }
  } catch {
    // Sem registro de acesso, o jogo segue normal.
  }
}

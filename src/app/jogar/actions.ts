"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CORES_AVATAR } from "@/components/Avatar";
import { apelidoImproprio } from "@/lib/apelido";
import { INICIAIS } from "@/lib/personagens";
import {
  comecarPartida,
  dicaPublica,
  andarTabuleiroPublico,
  eliminarPublica,
  estadoPartida,
  responderPartida,
  type EstadoPartida,
  type ResultadoAjudaPublica,
} from "@/lib/publico/jogo";
import { ehEra } from "@/lib/publico/regras";
import { encerrarSessaoJogador, exigirJogador, iniciarSessaoJogador } from "@/lib/publico/sessao";
import { schemaResposta } from "@/lib/questoes/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ehMotivoZerada } from "@/lib/tela-protegida";

import { BLOQUEIO_MINUTOS, ERRO_SIMULTANEO, reservarTentativa } from "@/lib/pin";

const schema = z.object({
  modo: z.enum(["entrar", "cadastrar"]),
  apelido: z
    .string()
    .trim()
    .min(2, "O apelido precisa ter de 2 a 20 caracteres.")
    .max(20, "O apelido precisa ter de 2 a 20 caracteres.")
    .regex(/^[\p{L}\p{N} _.-]+$/u, "Use só letras, números, espaço, ponto, hífen ou _."),
  pin: z.string().regex(/^\d{4}$/, "O PIN tem 4 números."),
  avatar: z.coerce.number().int().optional(),
  cor: z.coerce.number().int().optional(),
  voltar: z.string().optional(),
});

export type EstadoEntrarPublico = { erro?: string; oferecerCadastro?: boolean };

/** Só volta para páginas do próprio modo público. */
const destinoSeguro = (v?: string) => (v && /^\/jogar(\/[\w-]*)*$/.test(v) ? v : "/jogar");

export async function entrarPublico(_: EstadoEntrarPublico, form: FormData): Promise<EstadoEntrarPublico> {
  const dados = schema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { modo, apelido, pin } = dados.data;
  const db = criarClienteAdmin();
  const { data: jogador } = await db
    .from("jogadores_publicos")
    .select("id, pin_hash, tentativas_falhas, bloqueado_ate, versao_sessao")
    .ilike(
      "apelido",
      apelido.replace(/[\\%_]/g, (c) => `\\${c}`),
    )
    .maybeSingle();

  let jogadorId: string;
  let versao: number;
  if (!jogador) {
    if (modo === "entrar") return { oferecerCadastro: true };
    if (apelidoImproprio(apelido)) return { erro: "Esse apelido não é permitido. Escolha outro." };
    if (form.get("anotei") !== "sim")
      return { erro: "Anote seu apelido e seu PIN e marque a caixa confirmando que anotou." };
    const avatar = INICIAIS.includes(dados.data.avatar ?? -1)
      ? dados.data.avatar!
      : INICIAIS[Math.floor(Math.random() * INICIAIS.length)];
    const cor =
      dados.data.cor !== undefined && dados.data.cor >= 0 && dados.data.cor < CORES_AVATAR.length ? dados.data.cor : 0;
    const { data: novo, error } = await db
      .from("jogadores_publicos")
      .insert({
        apelido,
        pin_hash: await bcrypt.hash(pin, 10),
        avatar,
        cor,
        versao_sessao: 1,
        ultimo_acesso: new Date().toISOString(),
      })
      .select("id, versao_sessao")
      .single();
    if (error || !novo) return { erro: "Esse apelido já está em uso. Escolha outro." };
    jogadorId = novo.id;
    versao = novo.versao_sessao;
  } else {
    if (modo === "cadastrar") return { erro: "Esse apelido já está em uso. Escolha outro." };
    if (jogador.bloqueado_ate && new Date(jogador.bloqueado_ate) > new Date()) {
      return { erro: `Muitas tentativas erradas. Tente de novo em ${BLOQUEIO_MINUTOS} minutos.` };
    }
    if (!(await reservarTentativa(db, "jogadores_publicos", jogador))) return { erro: ERRO_SIMULTANEO };
    if (!(await bcrypt.compare(pin, jogador.pin_hash))) return { erro: "PIN incorreto." };
    versao = jogador.versao_sessao + 1;
    await db
      .from("jogadores_publicos")
      .update({
        versao_sessao: versao,
        tentativas_falhas: 0,
        bloqueado_ate: null,
        ultimo_acesso: new Date().toISOString(),
      })
      .eq("id", jogador.id);
    jogadorId = jogador.id;
  }
  await iniciarSessaoJogador(jogadorId, versao);
  redirect(destinoSeguro(dados.data.voltar));
}

export async function sairPublico() {
  await encerrarSessaoJogador();
  redirect("/jogar");
}

/** Começa (ou retoma) a partida da era e leva para a tela do jogo. */
export async function jogarEra(era: string): Promise<{ erro?: string }> {
  if (!ehEra(era)) return { erro: "Desafio não encontrado." };
  const jogador = await exigirJogador();
  const r = await comecarPartida(criarClienteAdmin(), jogador, era);
  if ("erro" in r) return r;
  redirect(`/jogar/partida/${r.partidaId}`);
}

export async function carregarPartida(partidaId: string, iniciarFinal = false): Promise<EstadoPartida> {
  const jogador = await exigirJogador();
  return estadoPartida(criarClienteAdmin(), jogador, String(partidaId), iniciarFinal === true);
}

export async function responderPublico(
  partidaId: string,
  questaoId: string,
  resposta: unknown,
  saidasTela: number,
  motivo: unknown = null,
): Promise<EstadoPartida> {
  const jogador = await exigirJogador();
  const r = resposta === null ? null : schemaResposta.safeParse(resposta);
  return responderPartida(
    criarClienteAdmin(),
    jogador,
    String(partidaId),
    String(questaoId),
    r && r.success ? r.data : null,
    Number.isFinite(saidasTela) ? saidasTela : 0,
    ehMotivoZerada(motivo) ? motivo : null,
  );
}

/** Ajuda da partida: elimina uma alternativa errada da questão atual. */
export async function eliminarNaPartida(partidaId: string, questaoId: string): Promise<ResultadoAjudaPublica> {
  const jogador = await exigirJogador();
  return eliminarPublica(criarClienteAdmin(), jogador, String(partidaId), String(questaoId));
}

/** Tabuleiro: responde a próxima casa (o servidor confere e devolve a cor e as vidas). */
export async function andarNoTabuleiroPartida(partidaId: string, questaoId: string, escolha: number) {
  const jogador = await exigirJogador();
  return andarTabuleiroPublico(criarClienteAdmin(), jogador, String(partidaId), String(questaoId), Number(escolha));
}

/** Ajuda da partida: mostra a dica da questão atual. */
export async function dicaNaPartida(partidaId: string, questaoId: string): Promise<ResultadoAjudaPublica> {
  const jogador = await exigirJogador();
  return dicaPublica(criarClienteAdmin(), jogador, String(partidaId), String(questaoId));
}

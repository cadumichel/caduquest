"use server";
import { revalidatePath } from "next/cache";
import { CORES_AVATAR, TOTAL_AVATARES } from "@/components/Avatar";
import { exigirAluno } from "@/lib/aluno-sessao";
import { estadoAtual, responderQuestao, type EstadoJogo } from "@/lib/jogo";
import { schemaResposta } from "@/lib/questoes/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function carregarJogo(desafioId: string): Promise<EstadoJogo> {
  const aluno = await exigirAluno();
  return estadoAtual(criarClienteAdmin(), aluno, desafioId);
}

export async function enviarResposta(
  desafioId: string,
  questaoId: string,
  resposta: unknown,
  saidasTela: number,
): Promise<EstadoJogo> {
  const aluno = await exigirAluno();
  const r = resposta === null ? null : schemaResposta.safeParse(resposta);
  return responderQuestao(
    criarClienteAdmin(),
    aluno,
    desafioId,
    questaoId,
    r && r.success ? r.data : null,
    Number.isFinite(saidasTela) ? saidasTela : 0,
  );
}

export async function salvarPerfil(avatar: number, cor: number): Promise<{ erro?: string }> {
  const aluno = await exigirAluno();
  if (!Number.isInteger(avatar) || avatar < 0 || avatar >= TOTAL_AVATARES) return { erro: "Avatar inválido." };
  if (!Number.isInteger(cor) || cor < 0 || cor >= CORES_AVATAR.length) return { erro: "Cor inválida." };
  const { error } = await criarClienteAdmin().from("alunos").update({ avatar, cor }).eq("id", aluno.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/aluno", "layout");
  return {};
}

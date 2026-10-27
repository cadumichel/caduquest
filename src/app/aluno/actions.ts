"use server";
import { revalidatePath } from "next/cache";
import { CORES_AVATAR, TOTAL_AVATARES } from "@/components/Avatar";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurma } from "@/lib/medalhas";
import { medalhasNecessarias } from "@/lib/personagens";
import { estadoAtual, responderQuestao, type EstadoJogo } from "@/lib/jogo";
import { schemaResposta } from "@/lib/questoes/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export async function carregarJogo(desafioId: string, codigo?: string): Promise<EstadoJogo> {
  const aluno = await exigirAluno();
  return estadoAtual(
    criarClienteAdmin(),
    aluno,
    desafioId,
    typeof codigo === "string" ? codigo.slice(0, 10) : undefined,
  );
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
  const db = criarClienteAdmin();
  const precisa = medalhasNecessarias(avatar);
  if (precisa > 0 && ((await medalhasDaTurma(db, aluno.turmaId)).get(aluno.id) ?? 0) < precisa) {
    return { erro: "Esse personagem ainda está bloqueado. Vença mais desafios para liberar!" };
  }
  const { error } = await db.from("alunos").update({ avatar, cor }).eq("id", aluno.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/aluno", "layout");
  return {};
}

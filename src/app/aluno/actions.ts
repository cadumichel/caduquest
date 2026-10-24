"use server";
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

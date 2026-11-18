"use server";
import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { exigirProfessor } from "@/lib/professor";
import { mensagemErroSupabase, validarNovaSenha } from "@/lib/senha-professor";

export type EstadoSenha = { erro?: string; ok?: string };

/**
 * Troca a senha do professor logado. Antes, confere a senha atual com um login
 * à parte (sem mexer nos cookies), para que uma sessão esquecida aberta num
 * computador da escola não baste para trocar a senha.
 */
export async function trocarSenha(_: EstadoSenha, form: FormData): Promise<EstadoSenha> {
  const { supabase, email } = await exigirProfessor();
  const dados = {
    atual: String(form.get("atual") ?? ""),
    nova: String(form.get("nova") ?? ""),
    confirmacao: String(form.get("confirmacao") ?? ""),
  };
  const invalida = validarNovaSenha(dados);
  if (invalida) return { erro: invalida };
  if (!email) return { erro: "Não encontrei o e-mail da sua conta. Saia e entre de novo." };

  // Login de conferência num cliente sem cookies; a sessão criada é descartada logo depois.
  const conferencia = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: erroAtual } = await conferencia.auth.signInWithPassword({ email, password: dados.atual });
  if (erroAtual) {
    if (erroAtual.code === "over_request_rate_limit") return { erro: mensagemErroSupabase(erroAtual.code) };
    return { erro: "A senha atual está incorreta." };
  }
  await conferencia.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: dados.nova });
  if (error) return { erro: mensagemErroSupabase(error.code) };

  // Quem estiver logado com a senha antiga em outro aparelho sai; este continua.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: "Senha trocada. Nos outros aparelhos, entre de novo com a senha nova." };
}

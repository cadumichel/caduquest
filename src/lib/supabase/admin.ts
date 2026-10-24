import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/env";

/**
 * Cliente com a chave secreta: ignora RLS. Use só no servidor, nas rotas de
 * aluno, e sempre filtrando pela turma da sessão do aluno.
 */
export function criarClienteAdmin() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

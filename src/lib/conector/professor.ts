import "server-only";
import { emailsProfessores } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";

let cache: { email: string; id: string } | null = null;

/**
 * O conector age em nome do primeiro e-mail de PROFESSORES_EMAILS. Devolve o
 * id desse professor no Supabase Auth (ele precisa ter entrado ou sido criado).
 */
export async function professorDoConector(): Promise<string> {
  const email = emailsProfessores()[0];
  if (!email) throw new Error("Configure PROFESSORES_EMAILS no servidor.");
  if (cache?.email === email) return cache.id;

  const admin = criarClienteAdmin();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Não foi possível consultar os usuários do Supabase.");
    const usuario = data.users.find((u) => u.email?.toLowerCase() === email);
    if (usuario) {
      cache = { email, id: usuario.id };
      return usuario.id;
    }
    if (data.users.length < 100) break;
  }
  throw new Error(`Nenhum usuário com o e-mail ${email} no Supabase. Crie-o em Authentication > Users.`);
}

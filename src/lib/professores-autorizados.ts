import "server-only";
import { emailsProfessores } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const VALIDADE_MS = 10 * 60_000;
let cache: { emails: string; ids: string[]; em: number } | null = null;

/**
 * Ids (Supabase Auth) dos professores de PROFESSORES_EMAILS. null = lista vazia,
 * sem restrição. Qualquer pessoa consegue criar uma conta no Supabase Auth com
 * a chave publicável e gravar questões "dela" direto no banco; por isso, o que
 * é mostrado a todo mundo (desafios públicos) só pode vir destes professores.
 */
export async function idsProfessoresAutorizados(): Promise<string[] | null> {
  const emails = emailsProfessores();
  if (!emails.length) return null;
  const chave = emails.join(",");
  if (cache?.emails === chave && Date.now() - cache.em < VALIDADE_MS) return cache.ids;

  const admin = criarClienteAdmin();
  const ids: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      // Falha passageira: vale a última lista conhecida; sem ela, nada é público.
      return cache?.emails === chave ? cache.ids : [];
    }
    for (const u of data.users) {
      // E-mail não confirmado não prova nada: qualquer um digita o e-mail de outra pessoa.
      if (u.email && u.email_confirmed_at && emails.includes(u.email.toLowerCase())) ids.push(u.id);
    }
    if (data.users.length < 200) break;
  }
  cache = { emails: chave, ids, em: Date.now() };
  return ids;
}

import "server-only";
import { redirect } from "next/navigation";
import { emailsProfessores } from "@/lib/env";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Garante que há um professor logado e autorizado; devolve o cliente com RLS. */
export async function exigirProfessor() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/professor/login");

  const permitidos = emailsProfessores();
  const email = String(claims.email ?? "").toLowerCase();
  if (permitidos.length > 0 && !permitidos.includes(email)) {
    await supabase.auth.signOut();
    redirect("/professor/login?erro=nao-autorizado");
  }

  return { supabase, professorId: claims.sub as string, email };
}

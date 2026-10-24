"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string };

export async function entrarComEmail(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("senha") ?? ""),
  });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/professor");
}

export async function entrarComGoogle() {
  const supabase = await criarClienteServidor();
  const origem = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origem}/auth/callback` },
  });
  if (error || !data.url) redirect("/professor/login?erro=google");
  redirect(data.url);
}

export async function sairProfessor() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/professor/login");
}

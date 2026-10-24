import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Chamado uma vez por dia pelo Cron da Vercel (vercel.json). Faz uma consulta
 * leve para o projeto gratuito do Supabase não ser pausado por inatividade
 * (pausa após 1 semana sem acesso, por exemplo nas férias).
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }
  const { error } = await criarClienteAdmin().from("escolas").select("id", { head: true, count: "exact" });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}

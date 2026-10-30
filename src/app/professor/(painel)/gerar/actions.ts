"use server";
import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { z } from "zod";
import { gerarLote } from "@/lib/claude/gerar";
import { exigirProfessor } from "@/lib/professor";
import { TIPOS_GERADOR } from "@/lib/questoes/tipos";

export type EstadoGeracao = { erro?: string };

const schema = z.object({
  capitulo: z.string().trim().min(1, "Informe o capítulo ou tema.").max(200),
  serie: z.string().trim().max(50),
  habilidades: z.array(z.string()),
  tipos: z.array(z.enum(TIPOS_GERADOR)).min(1, "Escolha ao menos um tipo."),
  quantidade: z.coerce.number().int().min(1).max(15, "No máximo 15 questões por lote."),
  dificuldade: z.enum(["facil", "media", "dificil", "misturada"]),
  referencia: z.string().trim().max(30000, "Texto de referência muito longo (máx. 30 mil caracteres)."),
  questaoModelo: z.string().trim().max(5000),
});

export async function gerarQuestoes(_: EstadoGeracao, form: FormData): Promise<EstadoGeracao> {
  const { supabase } = await exigirProfessor();
  if (!process.env.ANTHROPIC_API_KEY) return { erro: "Falta configurar ANTHROPIC_API_KEY no servidor." };

  const r = schema.safeParse({
    capitulo: form.get("capitulo"),
    serie: form.get("serie") ?? "",
    habilidades: form.getAll("habilidades"),
    tipos: form.getAll("tipos"),
    quantidade: form.get("quantidade"),
    dificuldade: form.get("dificuldade"),
    referencia: form.get("referencia") ?? "",
    questaoModelo: form.get("questaoModelo") ?? "",
  });
  if (!r.success) return { erro: r.error.issues[0].message };

  let resultado;
  try {
    resultado = await gerarLote(r.data);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      return { erro: "Limite de uso da API atingido. Tente em alguns minutos." };
    if (e instanceof Anthropic.APIError)
      return { erro: `Erro da API do Claude (${e.status ?? "rede"}). Tente de novo.` };
    return { erro: e instanceof Error ? e.message : "Falha ao gerar." };
  }
  if (!resultado.questoes.length) return { erro: "Nenhuma questão válida veio no lote. Tente de novo." };

  const { error } = await supabase.from("questoes").insert(
    resultado.questoes.map((q) => ({
      ...q,
      capitulo: r.data.capitulo,
      status: "rascunho",
      origem: "claude",
      fonte: "Gerada pelo Claude",
    })),
  );
  if (error) return { erro: "Não foi possível salvar o lote." };
  redirect(
    `/professor/questoes?status=rascunho&capitulo=${encodeURIComponent(r.data.capitulo)}&gerado=${resultado.questoes.length}`,
  );
}

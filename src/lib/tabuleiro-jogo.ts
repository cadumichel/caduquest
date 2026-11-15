import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { andarNoTabuleiro, escolhasGravadas, type ProgressoTabuleiro } from "@/lib/questoes/tabuleiro";
import type { Conteudo } from "@/lib/questoes/tipos";

/**
 * Grava a escolha da próxima casa do tabuleiro e devolve o andamento, já com a
 * cor da casa. Cada casa só pode ser respondida uma vez: a gravação compara o
 * andamento anterior (dois toques simultâneos não respondem a mesma casa duas vezes).
 */
export async function gravarPassoTabuleiro(
  db: SupabaseClient,
  tabela: "respostas" | "respostas_publicas",
  linha: { id: string; permutacao: number[]; eliminadas?: number[] | null; resposta: unknown },
  conteudo: Conteudo,
  escolha: number,
): Promise<{ progresso: ProgressoTabuleiro } | { erro: string }> {
  const antes = escolhasGravadas(linha.resposta);
  const progresso = andarNoTabuleiro(conteudo, linha.permutacao, linha.eliminadas, antes, escolha);
  if (!progresso) return { erro: "Esta questão do tabuleiro já acabou." };
  let consulta = db
    .from(tabela)
    .update({ resposta: { tipo: "tabuleiro", escolhas: progresso.escolhas } })
    .eq("id", linha.id)
    .is("respondida_em", null);
  consulta = antes.length
    ? consulta.eq("resposta", JSON.stringify({ tipo: "tabuleiro", escolhas: antes }))
    : consulta.is("resposta", null);
  const { data } = await consulta.select("id");
  if (data?.length) return { progresso };
  // Nada gravado: ou outro toque respondeu a casa antes, ou o filtro do jsonb não casou.
  // Relê: se o andamento ainda é o mesmo de antes, grava sem a comparação.
  const { data: atual } = await db.from(tabela).select("resposta, respondida_em").eq("id", linha.id).maybeSingle();
  const agora = escolhasGravadas(atual?.resposta);
  if (!atual || atual.respondida_em || agora.join() !== antes.join()) {
    return { erro: "Esta casa já foi respondida." };
  }
  const { data: denovo } = await db
    .from(tabela)
    .update({ resposta: { tipo: "tabuleiro", escolhas: progresso.escolhas } })
    .eq("id", linha.id)
    .is("respondida_em", null)
    .select("id");
  return denovo?.length ? { progresso } : { erro: "Não foi possível avançar agora. Tente de novo." };
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { andarNoTabuleiro, escolhasGravadas, type ProgressoTabuleiro } from "@/lib/questoes/tabuleiro";
import type { Conteudo } from "@/lib/questoes/tipos";
import { pistasGravadas } from "@/lib/questoes/pistas";
import { darPasso, progressoGravado, type ProgressoPasso } from "@/lib/questoes/passos";

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

/**
 * Troca o andamento gravado de uma questão ainda sem resposta (o "passo" dos
 * formatos conferidos no servidor). Só grava se o andamento ainda for `antes`:
 * dois toques ao mesmo tempo não dão o mesmo passo duas vezes.
 */
async function trocarAndamento(
  db: SupabaseClient,
  tabela: "respostas" | "respostas_publicas",
  id: string,
  antes: unknown,
  depois: unknown,
  igual: (gravado: unknown) => boolean,
): Promise<boolean> {
  let consulta = db.from(tabela).update({ resposta: depois }).eq("id", id).is("respondida_em", null);
  consulta = antes == null ? consulta.is("resposta", null) : consulta.eq("resposta", JSON.stringify(antes));
  const { data } = await consulta.select("id");
  if (data?.length) return true;
  // O filtro do jsonb pode não casar (ordem das chaves): relê e confere à mão.
  const { data: atual } = await db.from(tabela).select("resposta, respondida_em").eq("id", id).maybeSingle();
  if (!atual || atual.respondida_em || !igual(atual.resposta)) return false;
  const { data: denovo } = await db
    .from(tabela)
    .update({ resposta: depois })
    .eq("id", id)
    .is("respondida_em", null)
    .select("id");
  return Boolean(denovo?.length);
}

/**
 * Quem sou eu?: abre a próxima pista e devolve as pistas abertas. O número de
 * pistas abertas fica gravado no servidor e é ele que vale na correção.
 */
export async function gravarPista(
  db: SupabaseClient,
  tabela: "respostas" | "respostas_publicas",
  linha: { id: string; resposta: unknown },
  conteudo: Conteudo,
): Promise<{ pistas: string[] } | { erro: string }> {
  if (conteudo.tipo !== "quem_sou_eu") return { erro: "Esta questão não tem pistas." };
  const total = conteudo.conteudo.pistas.length;
  const abertas = pistasGravadas(linha.resposta);
  if (abertas >= total) return { pistas: conteudo.conteudo.pistas };
  const ok = await trocarAndamento(
    db,
    tabela,
    linha.id,
    linha.resposta ?? null,
    { tipo: "quem_sou_eu", pistas: abertas + 1 },
    (gravado) => pistasGravadas(gravado) === abertas,
  );
  if (!ok) return { erro: "Não foi possível abrir a pista agora. Tente de novo." };
  return { pistas: conteudo.conteudo.pistas.slice(0, abertas + 1) };
}

/**
 * Conversa e conceito secreto: grava o próximo passo (a resposta do turno ou a
 * letra) e devolve o andamento. Como no tabuleiro, cada passo só vale uma vez.
 */
export async function gravarPasso(
  db: SupabaseClient,
  tabela: "respostas" | "respostas_publicas",
  linha: { id: string; permutacao: number[]; eliminadas?: number[] | null; resposta: unknown },
  conteudo: Conteudo,
  passo: unknown,
): Promise<{ progresso: ProgressoPasso } | { erro: string }> {
  const r = darPasso(conteudo, linha.permutacao, linha.eliminadas, linha.resposta, passo);
  if ("erro" in r) return r;
  const antes = JSON.stringify(linha.resposta ?? null);
  const ok = await trocarAndamento(db, tabela, linha.id, linha.resposta ?? null, r.gravar, (gravado) => {
    const a = progressoGravado(conteudo, linha.permutacao, linha.eliminadas, gravado);
    const b = progressoGravado(conteudo, linha.permutacao, linha.eliminadas, JSON.parse(antes));
    return JSON.stringify(a) === JSON.stringify(b);
  });
  return ok ? { progresso: r.progresso } : { erro: "Não foi possível conferir agora. Tente de novo." };
}

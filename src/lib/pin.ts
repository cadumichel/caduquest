import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const LIMITE_TENTATIVAS = 5;
export const BLOQUEIO_MINUTOS = 15;
export const ERRO_SIMULTANEO = "Muitas tentativas ao mesmo tempo. Espere um instante e tente de novo.";

type Conta = { id: string; tentativas_falhas: number; bloqueado_ate: string | null };

/**
 * Conta a tentativa de PIN ANTES de conferir, e só se ninguém mexeu na conta
 * desde a leitura. Assim, quem dispara centenas de pedidos ao mesmo tempo (um
 * programa testando todos os PINs) tem um só conferido; os outros voltam false
 * sem conferir nada. Na quinta tentativa a conta já fica bloqueada. Quem acerta
 * o PIN zera a contagem logo depois, ao entrar.
 */
export async function reservarTentativa(
  db: SupabaseClient,
  tabela: "alunos" | "jogadores_publicos",
  conta: Conta,
): Promise<boolean> {
  const falhas = conta.tentativas_falhas + 1;
  const bloquear = falhas >= LIMITE_TENTATIVAS;
  let consulta = db
    .from(tabela)
    .update({
      tentativas_falhas: bloquear ? 0 : falhas,
      bloqueado_ate: bloquear ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000).toISOString() : null,
    })
    .eq("id", conta.id)
    .eq("tentativas_falhas", conta.tentativas_falhas);
  consulta = conta.bloqueado_ate
    ? consulta.eq("bloqueado_ate", conta.bloqueado_ate)
    : consulta.is("bloqueado_ate", null);
  const { data } = await consulta.select("id");
  return Boolean(data?.length);
}

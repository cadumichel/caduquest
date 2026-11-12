import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { fimDaPontuacao, ultimoDiaComPontos, type TemporadaEncerramento } from "@/lib/tipos-banco";

/**
 * Encerramento da temporada: o último dia que vale pontos, que pode vir antes da
 * prova. Entre os dois os alunos estudam (treino e revisão de erros, sem pontos).
 */

export const ERRO_SQL_ENCERRAMENTO =
  "Para usar a data de encerramento, rode no Supabase o SQL 20261112120000_encerramento_temporada.sql.";

/** Confere as datas: início ≤ encerramento ≤ prova. Devolve a mensagem de erro, se houver. */
export function conferirDatasTemporada(t: { inicio: string; data_prova: string; encerramento?: string | null }) {
  if (t.data_prova < t.inicio) return "A prova deve ser depois do início.";
  if (t.encerramento && t.encerramento < t.inicio) return "O encerramento deve ser depois do início.";
  if (t.encerramento && t.encerramento > t.data_prova) return "O encerramento não pode ser depois da prova.";
  return null;
}

/**
 * Colunas do encerramento para gravar. Sem o SQL elas não existem: só vão no
 * insert/update quando fogem do padrão (encerramento = prova, gabarito liberado)
 * ou quando a linha atual já tem as colunas.
 */
export function colunasEncerramento(
  encerramento: string | null,
  gabaritoNoEncerramento: boolean,
  atual?: Record<string, unknown> | null,
) {
  // Encerrar no dia da prova é o mesmo que não ter encerramento separado.
  const colunasExistem = !!atual && "encerramento" in atual;
  if (!colunasExistem && !encerramento && gabaritoNoEncerramento) return {};
  return { encerramento, gabarito_no_encerramento: gabaritoNoEncerramento };
}

/** Normaliza: encerramento igual à prova vira vazio (é o padrão). */
export const encerramentoOuNulo = (encerramento: string | null | undefined, dataProva: string) =>
  encerramento && encerramento !== dataProva ? encerramento : null;

/**
 * Desafios precisam fechar até o fim da pontuação. Antes de salvar novas datas:
 * desafios que ainda abririam depois do encerramento impedem a mudança; os que
 * fechariam depois passam a fechar no encerramento (quem estiver jogando termina
 * a questão em que está, como em "encerrar agora").
 */
export async function ajustarDesafiosAoEncerramento(
  db: SupabaseClient,
  temporadaId: string,
  t: TemporadaEncerramento,
  aplicar: boolean,
): Promise<{ erro: string } | { encurtados: number }> {
  const fim = fimDaPontuacao({ data_prova: t.data_prova, encerramento: t.encerramento });
  const { data } = await db
    .from("desafios")
    .select("id, titulo, abre_em, fecha_em")
    .eq("temporada_id", temporadaId)
    .gt("fecha_em", fim.toISOString());
  const depois = (data ?? []) as { id: string; titulo: string; abre_em: string; fecha_em: string }[];
  const naoAbertos = depois.filter((d) => new Date(d.abre_em) >= fim);
  if (naoAbertos.length) {
    const lista = naoAbertos.map((d) => `${d.titulo} (abre ${formatarDataHora(d.abre_em)})`).join("; ");
    return {
      erro: `Estes desafios abrem depois do encerramento (${formatarData(ultimoDiaComPontos(t))}): ${lista}. Mude a data deles ou apague antes de encerrar mais cedo.`,
    };
  }
  if (aplicar && depois.length) {
    const { error } = await db
      .from("desafios")
      .update({ fecha_em: fim.toISOString() })
      .in(
        "id",
        depois.map((d) => d.id),
      );
    if (error) return { erro: "Não foi possível ajustar o fechamento dos desafios ao encerramento." };
  }
  return { encurtados: depois.length };
}

/**
 * Desafio novo (ou janela alterada) tem de fechar até o fim da pontuação. Num
 * desafio que já existe, só a data de fechamento é conferida.
 */
export function conferirJanelaNaTemporada(
  fechaEmIso: string,
  t: TemporadaEncerramento | null,
  novo: boolean,
): string | null {
  if (!t?.data_prova) return null;
  const fim = fimDaPontuacao(t);
  if (new Date(fechaEmIso) <= fim && (!novo || new Date() <= fim)) return null;
  if (t.encerrada_em) return "Esta temporada foi encerrada. Reabra a temporada para criar ou reabrir desafios nela.";
  if (new Date() > fim)
    return `A pontuação desta temporada já encerrou (${formatarData(ultimoDiaComPontos(t))}). Mude a data de encerramento para criar ou reabrir desafios nela.`;
  return `O desafio precisa fechar até o encerramento da temporada (${formatarDataHora(fim)}).`;
}

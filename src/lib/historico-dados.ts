import "server-only";
import { hojeEmBrasilia } from "@/lib/datas";
import { montarHistorico, resumirHistorico, type DesafioHistorico, type TentativaHistorico } from "@/lib/historico";
import { lerPorIds, respostasCorrigidas } from "@/lib/paginar";
import { rankingParaAluno } from "@/lib/ranking";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { rankingDaTemporada } from "@/lib/temporada-dados";
import type { Desafio, Temporada } from "@/lib/tipos-banco";

/** Histórico do aluno em todas as temporadas da turma, da mais recente à mais antiga. */
export async function historicoDoAluno(alunoId: string, turmaId: string) {
  const db = criarClienteAdmin();
  const hoje = hojeEmBrasilia();
  const { data: temporadasBrutas } = await db
    .from("temporadas")
    // "*" traz também o encerramento e as regras do gabarito, quando o SQL delas já rodou.
    .select("*")
    .eq("turma_id", turmaId)
    .lte("inicio", hoje)
    .order("inicio", { ascending: false });
  const temporadas = (temporadasBrutas ?? []) as Temporada[];
  const daTemporada = new Map(temporadas.map((t) => [t.id, t]));

  const desafiosBrutos = await lerPorIds<Desafio & { desafio_questoes: { count: number }[] }>(
    db,
    "desafios",
    "*, desafio_questoes(count)",
    "temporada_id",
    temporadas.map((t) => t.id),
  );
  const desafios: DesafioHistorico[] = desafiosBrutos.map((d) => ({
    ...d,
    questoes: d.desafio_questoes?.[0]?.count ?? 0,
    temporadas: daTemporada.get(d.temporada_id) ?? null,
  }));

  const tentativas = await lerPorIds<TentativaHistorico>(
    db,
    "tentativas",
    "id, desafio_id, pontos, concluida_em, indice_atual, ordem",
    "desafio_id",
    desafios.map((d) => d.id),
    (c) => c.eq("aluno_id", alunoId),
  );
  const [respostas, rankings] = await Promise.all([
    respostasCorrigidas<{ tentativa_id: string; fracao: number }>(
      db,
      "tentativa_id, fracao",
      tentativas.map((t) => t.id),
    ),
    // Posição e pontos (com bônus) de cada temporada, como o ranking mostra ao aluno.
    Promise.all(temporadas.map((t) => rankingDaTemporada(db, t, alunoId))),
  ]);

  const itens = montarHistorico(desafios, tentativas, respostas);
  const porTemporada = temporadas
    .map((temporada, i) => {
      const daqui = itens.filter((it) => it.desafio.temporada_id === temporada.id);
      return {
        temporada,
        itens: daqui,
        resumo: resumirHistorico(daqui),
        ranking: rankingParaAluno(rankings[i], alunoId),
      };
    })
    .filter((t) => t.itens.length > 0);
  return { porTemporada, resumo: resumirHistorico(itens) };
}

import {
  gabaritoAguardaEncerramento,
  gabaritoAguardaProfessor,
  gabaritoLiberado,
  situacaoDesafio,
  type Desafio,
  type TemporadaEncerramento,
} from "./tipos-banco";

/**
 * Histórico do aluno: os desafios que ele fez (ou perdeu), temporada a temporada.
 * Mostra só o que a tela de resultado já mostra: pontos e acertos do desafio
 * depois que ele termina. A correção questão por questão fica no resultado, que
 * segue as regras do gabarito (ver gabaritoLiberado).
 */

export type DesafioHistorico = Pick<
  Desafio,
  | "id"
  | "temporada_id"
  | "tipo"
  | "titulo"
  | "abre_em"
  | "fecha_em"
  | "especial"
  | "gabarito_manual"
  | "gabarito_liberado_em"
  | "gabarito_nunca"
> & { questoes: number; temporadas?: TemporadaEncerramento | null };

export type TentativaHistorico = {
  id: string;
  desafio_id: string;
  pontos: number;
  concluida_em: string | null;
  indice_atual: number;
  ordem: string[];
};

/** Onde está o gabarito do desafio, na visão do aluno. */
export type SituacaoGabarito = "liberado" | "aguarda" | "encerramento" | "professor" | "nunca";

export type ItemHistorico = {
  desafio: DesafioHistorico;
  /** fez: terminou (ou o desafio fechou); andamento: ainda respondendo; perdeu: fechou sem ele fazer. */
  estado: "fez" | "andamento" | "perdeu";
  pontos: number;
  acertos: number;
  total: number;
  gabarito: SituacaoGabarito;
};

export type ResumoHistorico = { feitos: number; perdidos: number; pontos: number; acertos: number; questoes: number };

export function situacaoGabarito(d: DesafioHistorico, agora = new Date()): SituacaoGabarito {
  if (d.gabarito_nunca) return "nunca";
  if (gabaritoLiberado(d, agora)) return "liberado";
  if (gabaritoAguardaEncerramento(d, agora)) return "encerramento";
  if (gabaritoAguardaProfessor(d, agora)) return "professor";
  return "aguarda";
}

/**
 * Monta os itens de uma lista de desafios, do mais recente ao mais antigo.
 * Fica de fora o que ainda não abriu e o desafio aberto que o aluno nem começou.
 * Tentativa em andamento num desafio aberto não mostra números: os pontos
 * parciais entregariam se cada resposta estava certa.
 */
export function montarHistorico(
  desafios: DesafioHistorico[],
  tentativas: TentativaHistorico[],
  respostas: { tentativa_id: string; fracao: number }[],
  agora = new Date(),
): ItemHistorico[] {
  const tentativaDo = new Map(tentativas.map((t) => [t.desafio_id, t]));
  const acertosDa = new Map<string, number>();
  for (const r of respostas) acertosDa.set(r.tentativa_id, (acertosDa.get(r.tentativa_id) ?? 0) + Number(r.fracao));

  const itens: ItemHistorico[] = [];
  for (const d of desafios) {
    const situacao = situacaoDesafio(d, agora);
    if (situacao === "agendado") continue;
    const t = tentativaDo.get(d.id);
    if (!t) {
      if (situacao === "encerrado") {
        itens.push({
          desafio: d,
          estado: "perdeu",
          pontos: 0,
          acertos: 0,
          total: d.questoes,
          gabarito: situacaoGabarito(d, agora),
        });
      }
      continue;
    }
    const terminou = Boolean(t.concluida_em) || t.indice_atual >= t.ordem.length || situacao === "encerrado";
    itens.push({
      desafio: d,
      estado: terminou ? "fez" : "andamento",
      pontos: terminou ? Number(t.pontos) : 0,
      acertos: terminou ? (acertosDa.get(t.id) ?? 0) : 0,
      total: t.ordem.length,
      gabarito: situacaoGabarito(d, agora),
    });
  }
  return itens.sort((a, b) => b.desafio.abre_em.localeCompare(a.desafio.abre_em));
}

export function resumirHistorico(itens: ItemHistorico[]): ResumoHistorico {
  const feitos = itens.filter((i) => i.estado === "fez");
  return {
    feitos: feitos.length,
    perdidos: itens.filter((i) => i.estado === "perdeu").length,
    pontos: feitos.reduce((s, i) => s + i.pontos, 0),
    acertos: feitos.reduce((s, i) => s + i.acertos, 0),
    questoes: feitos.reduce((s, i) => s + i.total, 0),
  };
}

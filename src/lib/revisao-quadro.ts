import type { Conteudo } from "@/lib/questoes/tipos";

/**
 * Revisão no quadro: as questões em que a turma mais errou na temporada, com
 * quantos alunos marcaram cada alternativa. Tudo sai das respostas já gravadas.
 */

export type RespostaQuadro = {
  questaoId: string;
  fracao: number;
  /** Posição exibida -> índice original, como o aluno viu. */
  permutacao: number[] | null;
  resposta: unknown;
};

export type QuestaoQuadro = {
  questaoId: string;
  /** Acerto médio de 0 a 1. */
  acerto: number;
  respostas: number;
  /** Quantos marcaram cada alternativa (ordem original); null nos formatos sem escolha única. */
  distribuicao: number[] | null;
  /** Deixaram em branco, estouraram o tempo ou tiveram a questão zerada. */
  semEscolha: number;
};

export const QUESTOES_NO_QUADRO = 5;
/** Com menos respostas que isso, o percentual não representa a turma. */
export const RESPOSTAS_MINIMAS = 3;

/** Alternativas (na ordem original) dos formatos de escolha única. */
export function alternativasDe(c: Conteudo): { opcoes: string[]; correta: number } | null {
  switch (c.tipo) {
    case "multipla_escolha":
    case "interpretacao":
      return { opcoes: c.conteudo.alternativas, correta: c.conteudo.correta };
    case "quem_disse":
      return { opcoes: c.conteudo.autores, correta: c.conteudo.correta };
    case "intruso":
      return { opcoes: c.conteudo.itens, correta: c.conteudo.intruso };
    default:
      return null;
  }
}

export function questoesMaisErradas(
  respostas: RespostaQuadro[],
  conteudos: Map<string, Conteudo>,
  { limite = QUESTOES_NO_QUADRO, minimo = RESPOSTAS_MINIMAS }: { limite?: number; minimo?: number } = {},
): QuestaoQuadro[] {
  const porQuestao = new Map<string, QuestaoQuadro & { soma: number }>();
  for (const r of respostas) {
    const conteudo = conteudos.get(r.questaoId);
    if (!conteudo) continue;
    const alternativas = alternativasDe(conteudo);
    const q = porQuestao.get(r.questaoId) ?? {
      questaoId: r.questaoId,
      acerto: 0,
      soma: 0,
      respostas: 0,
      distribuicao: alternativas ? alternativas.opcoes.map(() => 0) : null,
      semEscolha: 0,
    };
    q.soma += r.fracao;
    q.respostas += 1;
    if (q.distribuicao) {
      const exibida = (r.resposta as { escolha?: unknown } | null)?.escolha;
      const original = typeof exibida === "number" && r.permutacao ? r.permutacao[exibida] : undefined;
      if (original !== undefined && original >= 0 && original < q.distribuicao.length) q.distribuicao[original] += 1;
      else q.semEscolha += 1;
    }
    porQuestao.set(r.questaoId, q);
  }
  return [...porQuestao.values()]
    .filter((q) => q.respostas >= minimo)
    .map(({ soma, ...q }) => ({ ...q, acerto: soma / q.respostas }))
    .sort((a, b) => a.acerto - b.acerto || b.respostas - a.respostas || a.questaoId.localeCompare(b.questaoId))
    .slice(0, limite);
}

import { respostaComAjuda } from "./ajudas";
import { pistasGravadas } from "./pistas";
import { ordemDaCasa, type Conteudo, type ConteudoTabuleiro, type Resposta } from "./tipos";

/** Máximo de casas de um tabuleiro. */
export const MAX_CASAS = 10;

/** Vidas do tabuleiro: até 4 casas, 1; 5 ou 6 casas, 2; 7 a 10 casas, 3. */
export function vidasDoTabuleiro(casas: number): number {
  return casas <= 4 ? 1 : casas <= 6 ? 2 : 3;
}

/**
 * Andamento do aluno no tabuleiro, como a tela mostra. Só traz o gabarito das
 * casas já respondidas (o aluno já viu a cor de cada uma).
 */
export type ProgressoTabuleiro = {
  /** Escolha de cada casa já respondida (posições da tela). */
  escolhas: number[];
  /** Posição da opção certa de cada casa já respondida. */
  certas: number[];
  vidas: number;
  erros: number;
  /** Chegou ao fim do caminho ou errou sem vidas: a questão acabou ali. */
  encerrado: boolean;
};

/** Lê o andamento gravado (resposta parcial do tabuleiro). */
export function escolhasGravadas(resposta: unknown): number[] {
  const r = resposta as { tipo?: string; escolhas?: unknown } | null;
  if (r?.tipo !== "tabuleiro" || !Array.isArray(r.escolhas)) return [];
  const escolhas: number[] = [];
  for (const e of r.escolhas) {
    if (e !== 0 && e !== 1) break;
    escolhas.push(e);
  }
  return escolhas;
}

/** Andamento a partir das escolhas já feitas. */
export function progressoTabuleiro(c: ConteudoTabuleiro, permutacao: number[], escolhas: number[]): ProgressoTabuleiro {
  const n = c.casas.length;
  const feitas = escolhas.slice(0, n);
  const certas = feitas.map((_, k) => ordemDaCasa(permutacao, k).indexOf(0));
  const erros = feitas.filter((e, k) => e !== certas[k]).length;
  const vidas = vidasDoTabuleiro(n);
  return { escolhas: feitas, certas, vidas, erros, encerrado: feitas.length >= n || erros > vidas };
}

/**
 * Responde a próxima casa. A casa travada pela eliminação vale a opção certa,
 * seja qual for a escolha. Devolve null se a questão já acabou ou a escolha é inválida.
 */
export function andarNoTabuleiro(
  c: Conteudo,
  permutacao: number[],
  eliminadas: number[] | null | undefined,
  escolhasAntes: number[],
  escolha: number,
): ProgressoTabuleiro | null {
  if (c.tipo !== "tabuleiro" || (escolha !== 0 && escolha !== 1)) return null;
  const antes = progressoTabuleiro(c.conteudo, permutacao, escolhasAntes);
  if (antes.encerrado) return null;
  const k = antes.escolhas.length;
  const valor = eliminadas?.includes(k) ? ordemDaCasa(permutacao, k).indexOf(0) : escolha;
  return progressoTabuleiro(c.conteudo, permutacao, [...antes.escolhas, valor]);
}

/** Resposta final do tabuleiro: as casas respondidas; as que faltaram ficam sem resposta (valem zero). */
export function respostaDoTabuleiro(c: ConteudoTabuleiro, escolhas: number[]) {
  return {
    tipo: "tabuleiro" as const,
    escolhas: c.casas.map((_, k) => (k < escolhas.length ? escolhas[k] : null)),
  };
}

/** Eliminação no tabuleiro: só vale revelar casas que o aluno ainda não respondeu. */
export function candidatasAFrente(c: Conteudo, candidatas: number[], resposta: unknown): number[] {
  if (c.tipo !== "tabuleiro") return candidatas;
  const feitas = escolhasGravadas(resposta).length;
  return candidatas.filter((k) => k >= feitas);
}

/**
 * Resposta que vale na correção. No tabuleiro, vale o andamento gravado no
 * servidor casa a casa (a tela não decide nada); no Quem sou eu?, as pistas
 * abertas gravadas; nos outros tipos, a resposta enviada com os itens travados
 * pelas eliminações.
 */
export function respostaParaCorrigir(
  c: Conteudo,
  permutacao: number[],
  eliminadas: number[] | null | undefined,
  respostaGravada: unknown,
  respostaEnviada: Resposta | null,
): Resposta | null {
  if (c.tipo === "tabuleiro") return respostaDoTabuleiro(c.conteudo, escolhasGravadas(respostaGravada));
  const r = respostaComAjuda(c, permutacao, eliminadas, respostaEnviada);
  // Quem sou eu?: vale o número de pistas que o servidor abriu, não o que a tela diz.
  if (r?.tipo === "quem_sou_eu") return { ...r, pistas: pistasGravadas(respostaGravada) };
  return r;
}

/** Resposta da tela ao voltar para um tabuleiro já começado (andamento gravado no servidor). */
export function respostaComProgresso(r: Resposta, progresso: ProgressoTabuleiro | undefined): Resposta {
  if (r.tipo !== "tabuleiro" || !progresso) return r;
  return {
    tipo: "tabuleiro",
    escolhas: r.escolhas.map((e, k) => (k < progresso.escolhas.length ? progresso.escolhas[k] : e)),
    fim: progresso.encerrado,
  };
}

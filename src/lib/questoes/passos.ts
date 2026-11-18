import {
  ordemDoPasso,
  type Conteudo,
  type ConteudoConceitoSecreto,
  type ConteudoConversa,
  type Resposta,
} from "./tipos";

/**
 * Formatos conferidos passo a passo no servidor, como o tabuleiro:
 * - Conversa com o personagem: em cada turno, 3 respostas; errar gasta vida.
 * - Conceito secreto: o aluno chuta letras num teclado na tela; a palavra nunca vai para a tela.
 * O andamento fica gravado em respostas.resposta enquanto a questão não é respondida.
 */

// ---------- Conversa ----------

export const OPCOES_CONVERSA = 3;

/** Vidas da conversa, como no tabuleiro: até 4 turnos, 1; 5 ou 6, 2; 7 ou 8, 3. */
export const vidasDaConversa = (turnos: number) => (turnos <= 4 ? 1 : turnos <= 6 ? 2 : 3);

/** Posição na tela de cada opção do turno k (índice original 0 = a certa). */
export const ordemDoTurno = (permutacao: number[], k: number) => ordemDoPasso(permutacao, k, OPCOES_CONVERSA);

export type ProgressoConversa = {
  tipo: "conversa";
  /** Escolha (posição na tela) de cada turno já respondido. */
  escolhas: number[];
  /** Posição na tela da resposta certa de cada turno já respondido. */
  certas: number[];
  /** O que o personagem respondeu em cada turno já respondido. */
  reacoes: (string | null)[];
  vidas: number;
  erros: number;
  encerrado: boolean;
};

export function escolhasConversaGravadas(resposta: unknown): number[] {
  const r = resposta as { tipo?: string; escolhas?: unknown } | null;
  if (r?.tipo !== "conversa" || !Array.isArray(r.escolhas)) return [];
  const escolhas: number[] = [];
  for (const e of r.escolhas) {
    if (e !== 0 && e !== 1 && e !== 2) break;
    escolhas.push(e);
  }
  return escolhas;
}

export function progressoConversa(c: ConteudoConversa, permutacao: number[], escolhas: number[]): ProgressoConversa {
  const n = c.turnos.length;
  const feitas = escolhas.slice(0, n);
  const certas = feitas.map((_, k) => ordemDoTurno(permutacao, k).indexOf(0));
  const erros = feitas.filter((e, k) => e !== certas[k]).length;
  const vidas = vidasDaConversa(n);
  return {
    tipo: "conversa",
    escolhas: feitas,
    certas,
    reacoes: feitas.map((_, k) => c.turnos[k].reacao?.trim() || null),
    vidas,
    erros,
    encerrado: feitas.length >= n || erros > vidas,
  };
}

/** Fração de acerto da conversa: cada turno certo vale 1/n; os que faltaram valem zero. */
export function notaConversa(c: ConteudoConversa, permutacao: number[], escolhas: readonly (number | null)[]) {
  const n = c.turnos.length;
  let certos = 0;
  for (let k = 0; k < n; k++) {
    const e = escolhas[k];
    if (e === 0 || e === 1 || e === 2) if (ordemDoTurno(permutacao, k)[e] === 0) certos++;
  }
  return certos / n;
}

// ---------- Conceito secreto ----------

/** Letras erradas que encerram o jogo. */
export const MAX_ERROS_CONCEITO = 6;
/** Cada letra errada tira isto da nota de quem descobre a palavra. */
export const DESCONTO_POR_ERRO = 0.15;
export const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** "á" → "A", "ç" → "C"; o que não é letra devolve "". */
export function letraBase(ch: string): string {
  const b = ch.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return /^[A-Z]$/.test(b) ? b : "";
}

/** "Pacto colonial" → ["_","_","_","_","_"," ","_",...]. */
export function padraoDaPalavra(palavra: string): string[] {
  return [...palavra.trim().toUpperCase()].map((ch) => (letraBase(ch) ? "_" : ch));
}

export const letrasDaPalavra = (palavra: string) => new Set([...palavra].map(letraBase).filter(Boolean));

export type ProgressoConceito = {
  tipo: "conceito_secreto";
  /** Letras tentadas, na ordem. */
  letras: string[];
  /** Letra de cada posição já descoberta (com acento, como na palavra); null = escondida. */
  reveladas: (string | null)[];
  erros: number;
  descoberta: boolean;
  encerrado: boolean;
};

export function letrasGravadas(resposta: unknown): string[] {
  const r = resposta as { tipo?: string; letras?: unknown } | null;
  if (r?.tipo !== "conceito_secreto" || !Array.isArray(r.letras)) return [];
  return [...new Set(r.letras.filter((l): l is string => typeof l === "string" && /^[A-Z]$/.test(l)))];
}

/** Letras reveladas pela eliminação (gravadas como 0 = A ... 25 = Z). */
export const letrasEliminadas = (eliminadas: readonly number[] | null | undefined) =>
  (eliminadas ?? []).filter((i) => i >= 0 && i < 26).map((i) => ALFABETO[i]);

export function progressoConceito(
  c: ConteudoConceitoSecreto,
  letras: readonly string[],
  eliminadas: readonly number[] | null | undefined = [],
): ProgressoConceito {
  const naPalavra = letrasDaPalavra(c.palavra);
  const tentadas = [...new Set(letras)];
  const conhecidas = new Set([...tentadas, ...letrasEliminadas(eliminadas)]);
  const chars = [...c.palavra.trim().toUpperCase()];
  const reveladas = chars.map((ch) => {
    const b = letraBase(ch);
    return !b ? ch : conhecidas.has(b) ? ch : null;
  });
  const erros = tentadas.filter((l) => !naPalavra.has(l)).length;
  const descoberta = reveladas.every((r) => r !== null);
  return {
    tipo: "conceito_secreto",
    letras: tentadas,
    reveladas,
    erros,
    descoberta,
    encerrado: descoberta || erros >= MAX_ERROS_CONCEITO,
  };
}

/** Descobriu: 100% menos 15% por letra errada. Não descobriu: zero. */
export function notaConceito(c: ConteudoConceitoSecreto, letras: readonly string[], eliminadas?: readonly number[]) {
  const p = progressoConceito(c, letras, eliminadas);
  // Letras chutadas depois do fim não contam (o servidor nem aceita).
  if (!p.descoberta || p.erros >= MAX_ERROS_CONCEITO) return 0;
  return Math.max(0, 1 - p.erros * DESCONTO_POR_ERRO);
}

/** Letras que a eliminação pode revelar: da palavra, ainda escondidas, sempre deixando 2 por descobrir. */
export function candidatasConceito(
  c: ConteudoConceitoSecreto,
  eliminadas: readonly number[],
  letras: readonly string[] = [],
) {
  const conhecidas = new Set([...letras, ...letrasEliminadas(eliminadas)]);
  const faltam = [...letrasDaPalavra(c.palavra)].filter((l) => !conhecidas.has(l));
  return faltam.length > 2 ? faltam.map((l) => ALFABETO.indexOf(l)) : [];
}

// ---------- Passo no servidor ----------

export type ProgressoPasso = ProgressoConversa | ProgressoConceito;

/** Andamento gravado de um formato passo a passo (null = não é desse tipo). */
export function progressoGravado(
  c: Conteudo,
  permutacao: number[],
  eliminadas: number[] | null | undefined,
  resposta: unknown,
): ProgressoPasso | undefined {
  if (c.tipo === "conversa") return progressoConversa(c.conteudo, permutacao, escolhasConversaGravadas(resposta));
  if (c.tipo === "conceito_secreto") return progressoConceito(c.conteudo, letrasGravadas(resposta), eliminadas);
  return undefined;
}

/**
 * Dá o próximo passo: na conversa, `passo` é a posição na tela da resposta do
 * turno atual; no conceito secreto, a letra. Devolve o novo andamento e o que
 * gravar, ou o erro.
 */
export function darPasso(
  c: Conteudo,
  permutacao: number[],
  eliminadas: number[] | null | undefined,
  resposta: unknown,
  passo: unknown,
): { progresso: ProgressoPasso; gravar: unknown } | { erro: string } {
  if (c.tipo === "conversa") {
    if (passo !== 0 && passo !== 1 && passo !== 2) return { erro: "Resposta inválida." };
    const antes = progressoConversa(c.conteudo, permutacao, escolhasConversaGravadas(resposta));
    if (antes.encerrado) return { erro: "Esta conversa já acabou." };
    const k = antes.escolhas.length;
    // A opção riscada pela eliminação não pode ser escolhida.
    const riscada = (eliminadas ?? []).some(
      (i) => Math.floor(i / OPCOES_CONVERSA) === k && ordemDoTurno(permutacao, k)[passo] === i % OPCOES_CONVERSA,
    );
    if (riscada) return { erro: "Essa resposta foi eliminada." };
    const escolhas = [...antes.escolhas, passo];
    return { progresso: progressoConversa(c.conteudo, permutacao, escolhas), gravar: { tipo: "conversa", escolhas } };
  }
  if (c.tipo === "conceito_secreto") {
    const letra = typeof passo === "string" ? passo.toUpperCase() : "";
    if (!/^[A-Z]$/.test(letra)) return { erro: "Letra inválida." };
    const letras = letrasGravadas(resposta);
    const antes = progressoConceito(c.conteudo, letras, eliminadas);
    if (antes.encerrado) return { erro: "Este conceito já acabou." };
    if (letras.includes(letra) || letrasEliminadas(eliminadas).includes(letra)) return { erro: "Essa letra já foi." };
    const novas = [...letras, letra];
    return {
      progresso: progressoConceito(c.conteudo, novas, eliminadas),
      gravar: { tipo: "conceito_secreto", letras: novas },
    };
  }
  return { erro: "Esta questão não é passo a passo." };
}

/** Resposta inicial da tela com o andamento já gravado no servidor (volta à questão sem perder turnos ou letras). */
export function respostaComPassos(r: Resposta, progresso: ProgressoPasso | undefined): Resposta {
  if (!progresso) return r;
  if (r.tipo === "conversa" && progresso.tipo === "conversa")
    return {
      tipo: "conversa",
      escolhas: r.escolhas.map((e, k) => (k < progresso.escolhas.length ? progresso.escolhas[k] : e)),
      fim: progresso.encerrado,
    };
  if (r.tipo === "conceito_secreto" && progresso.tipo === "conceito_secreto")
    return {
      tipo: "conceito_secreto",
      letras: [...new Set([...r.letras, ...progresso.letras])],
      fim: progresso.encerrado,
    };
  return r;
}

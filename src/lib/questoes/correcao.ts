import type { Conteudo, Resposta } from "./tipos";

/**
 * Fração de acerto (0 a 1) de uma resposta.
 * Múltipla escolha vale tudo ou nada; os outros tipos dão crédito parcial
 * proporcional aos itens certos, sem mínimo (escopo: "Pontuação e ranking").
 * A permutação traduz índices exibidos para índices originais.
 */
export function corrigir(c: Conteudo, permutacao: number[], r: Resposta | null): number {
  if (!r || r.tipo !== c.tipo) return 0;
  const original = (exibido: number | null) =>
    exibido === null || exibido < 0 || exibido >= permutacao.length ? -1 : permutacao[exibido];

  switch (c.tipo) {
    case "multipla_escolha": {
      const resp = r as Extract<Resposta, { tipo: "multipla_escolha" }>;
      return original(resp.escolha) === c.conteudo.correta ? 1 : 0;
    }
    case "vf_bloco": {
      const resp = r as Extract<Resposta, { tipo: "vf_bloco" }>;
      const n = c.conteudo.afirmativas.length;
      let certos = 0;
      for (let exibido = 0; exibido < n; exibido++) {
        const valor = resp.valores[exibido];
        if (valor !== null && valor !== undefined && valor === c.conteudo.afirmativas[permutacao[exibido]].verdadeira) {
          certos++;
        }
      }
      return certos / n;
    }
    case "linha_do_tempo": {
      const resp = r as Extract<Resposta, { tipo: "linha_do_tempo" }>;
      const n = c.conteudo.eventos.length;
      if (!ehPermutacao(resp.ordem, n)) return 0;
      // Posição k da resposta deve conter o evento original k.
      const certos = resp.ordem.filter((exibido, k) => permutacao[exibido] === k).length;
      return certos / n;
    }
    case "pares": {
      const resp = r as Extract<Resposta, { tipo: "pares" }>;
      const n = c.conteudo.pares.length;
      const usados = new Set<number>();
      let certos = 0;
      for (let esquerda = 0; esquerda < n; esquerda++) {
        const exibido = resp.ligacoes[esquerda] ?? null;
        if (exibido === null || usados.has(exibido)) continue;
        usados.add(exibido);
        if (original(exibido) === esquerda) certos++;
      }
      return certos / n;
    }
  }
}

function ehPermutacao(ordem: number[], n: number): boolean {
  if (ordem.length !== n) return false;
  const vistos = new Set(ordem);
  return vistos.size === n && ordem.every((i) => Number.isInteger(i) && i >= 0 && i < n);
}

export function calcularPontos(fracao: number, pontosPorAcerto: number): number {
  return Math.round(fracao * pontosPorAcerto * 100) / 100;
}

/** Folga de rede, em segundos, além do tempo limite da questão. */
export const FOLGA_SEGUNDOS = 3;

export function tempoEsgotado(servidaEm: Date, agora: Date, limiteSegundos: number): boolean {
  return agora.getTime() - servidaEm.getTime() > (limiteSegundos + FOLGA_SEGUNDOS) * 1000;
}

import type { Conteudo, Resposta, Vista } from "./tipos";

/** Monta a vista do aluno a partir do conteúdo e da permutação sorteada para ele. */
export function montarVista(c: Conteudo, permutacao: number[]): Vista {
  switch (c.tipo) {
    case "multipla_escolha":
      return { tipo: c.tipo, alternativas: permutacao.map((i) => c.conteudo.alternativas[i]) };
    case "vf_bloco":
      return { tipo: c.tipo, afirmativas: permutacao.map((i) => c.conteudo.afirmativas[i].texto) };
    case "linha_do_tempo":
      return { tipo: c.tipo, eventos: permutacao.map((i) => c.conteudo.eventos[i].texto) };
    case "pares":
      return {
        tipo: c.tipo,
        esquerda: c.conteudo.pares.map((p) => p.esquerda),
        direita: permutacao.map((i) => c.conteudo.pares[i].direita),
      };
  }
}

export function respostaInicial(vista: Vista): Resposta {
  switch (vista.tipo) {
    case "multipla_escolha":
      return { tipo: vista.tipo, escolha: null };
    case "vf_bloco":
      return { tipo: vista.tipo, valores: vista.afirmativas.map(() => null) };
    case "linha_do_tempo":
      return { tipo: vista.tipo, ordem: vista.eventos.map((_, i) => i) };
    case "pares":
      return { tipo: vista.tipo, ligacoes: vista.esquerda.map(() => null) };
  }
}

/** Resposta está completa o bastante para enviar sem aviso? */
export function respostaCompleta(r: Resposta): boolean {
  switch (r.tipo) {
    case "multipla_escolha":
      return r.escolha !== null;
    case "vf_bloco":
      return r.valores.every((v) => v !== null);
    case "linha_do_tempo":
      return true;
    case "pares":
      return r.ligacoes.every((v) => v !== null);
  }
}

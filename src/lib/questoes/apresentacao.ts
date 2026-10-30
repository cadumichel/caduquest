import { iniciosPerguntas, MARCA_LACUNA, subPermutacao, type Conteudo, type Resposta, type Vista } from "./tipos";

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
    case "fonte_primaria": {
      const inicios = iniciosPerguntas(c.conteudo);
      return {
        tipo: c.tipo,
        documento: c.conteudo.documento,
        perguntas: c.conteudo.perguntas.map((p, j) => ({
          pergunta: p.pergunta,
          alternativas: subPermutacao(permutacao, inicios[j], p.alternativas.length).map((i) => p.alternativas[i]),
        })),
      };
    }
    case "causa_consequencia": {
      const { relacoes, extras } = c.conteudo;
      const todas = [...relacoes.map((r) => r.consequencia), ...extras];
      return { tipo: c.tipo, causas: relacoes.map((r) => r.causa), consequencias: permutacao.map((i) => todas[i]) };
    }
    case "encontrar_erro":
      return {
        tipo: c.tipo,
        trechos: c.conteudo.trechos.map((t) => t.texto),
        erros: c.conteudo.trechos.filter((t) => t.errado).length,
      };
    case "completar_lacunas": {
      const banco = [...c.conteudo.lacunas, ...c.conteudo.extras];
      // partes[k] vem antes da lacuna k; a última parte fecha o texto.
      return { tipo: c.tipo, partes: c.conteudo.texto.split(MARCA_LACUNA), banco: permutacao.map((i) => banco[i]) };
    }
    case "ordenar_frases":
      return { tipo: c.tipo, frases: permutacao.map((i) => c.conteudo.frases[i]) };
    case "interpretacao":
      return {
        tipo: c.tipo,
        texto: c.conteudo.texto,
        alternativas: permutacao.map((i) => c.conteudo.alternativas[i]),
      };
    case "quem_disse":
      return { tipo: c.tipo, citacao: c.conteudo.citacao, alternativas: permutacao.map((i) => c.conteudo.autores[i]) };
  }
}

export function respostaInicial(vista: Vista): Resposta {
  switch (vista.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
      return { tipo: vista.tipo, escolha: null };
    case "vf_bloco":
      return { tipo: vista.tipo, valores: vista.afirmativas.map(() => null) };
    case "linha_do_tempo":
      return { tipo: vista.tipo, ordem: vista.eventos.map((_, i) => i) };
    case "pares":
      return { tipo: vista.tipo, ligacoes: vista.esquerda.map(() => null) };
    case "fonte_primaria":
      return { tipo: vista.tipo, escolhas: vista.perguntas.map(() => null) };
    case "causa_consequencia":
      return { tipo: vista.tipo, ligacoes: vista.causas.map(() => null) };
    case "encontrar_erro":
      return { tipo: vista.tipo, marcados: [] };
    case "completar_lacunas":
      return { tipo: vista.tipo, preenchidas: vista.partes.slice(1).map(() => null) };
    case "ordenar_frases":
      return { tipo: vista.tipo, ordem: vista.frases.map((_, i) => i) };
  }
}

/** Resposta está completa o bastante para enviar sem aviso? */
export function respostaCompleta(r: Resposta): boolean {
  switch (r.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
      return r.escolha !== null;
    case "vf_bloco":
      return r.valores.every((v) => v !== null);
    case "linha_do_tempo":
    case "ordenar_frases":
      return true;
    case "completar_lacunas":
      return r.preenchidas.every((v) => v !== null);
    case "pares":
    case "causa_consequencia":
      return r.ligacoes.every((v) => v !== null);
    case "fonte_primaria":
      return r.escolhas.every((v) => v !== null);
    case "encontrar_erro":
      return r.marcados.length > 0;
  }
}

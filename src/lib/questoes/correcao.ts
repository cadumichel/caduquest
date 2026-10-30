import { iniciosPerguntas, subPermutacao, type Conteudo, type Resposta } from "./tipos";

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
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse": {
      const resp = r as Extract<Resposta, { tipo: "multipla_escolha" | "interpretacao" | "quem_disse" }>;
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
    case "linha_do_tempo":
    case "ordenar_frases": {
      const resp = r as Extract<Resposta, { tipo: "linha_do_tempo" | "ordenar_frases" }>;
      const n = c.tipo === "linha_do_tempo" ? c.conteudo.eventos.length : c.conteudo.frases.length;
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
    case "fonte_primaria": {
      const resp = r as Extract<Resposta, { tipo: "fonte_primaria" }>;
      const { perguntas } = c.conteudo;
      const inicios = iniciosPerguntas(c.conteudo);
      const certos = perguntas.filter((p, j) => {
        const escolha = resp.escolhas[j];
        if (escolha === null || escolha === undefined) return false;
        return subPermutacao(permutacao, inicios[j], p.alternativas.length)[escolha] === p.correta;
      }).length;
      return certos / perguntas.length;
    }
    case "causa_consequencia": {
      // Índices originais 0..n-1 são as consequências de cada causa; os seguintes, as extras.
      const resp = r as Extract<Resposta, { tipo: "causa_consequencia" }>;
      const n = c.conteudo.relacoes.length;
      const usados = new Set<number>();
      let certos = 0;
      for (let causa = 0; causa < n; causa++) {
        const exibido = resp.ligacoes[causa] ?? null;
        if (exibido === null || usados.has(exibido)) continue;
        usados.add(exibido);
        if (original(exibido) === causa) certos++;
      }
      return certos / n;
    }
    case "encontrar_erro": {
      // O aluno sabe quantos erros há e marca no máximo esse número: vale a fração dos erros achados.
      const resp = r as Extract<Resposta, { tipo: "encontrar_erro" }>;
      const { trechos } = c.conteudo;
      const erros = trechos.filter((t) => t.errado).length;
      const marcados = [...new Set(resp.marcados)].slice(0, erros);
      return marcados.filter((i) => trechos[i]?.errado).length / erros;
    }
    case "completar_lacunas": {
      // Compara pelo texto: duas lacunas com a mesma palavra aceitam qualquer uma das cópias.
      const resp = r as Extract<Resposta, { tipo: "completar_lacunas" }>;
      const { lacunas, extras } = c.conteudo;
      const banco = [...lacunas, ...extras];
      const usados = new Set<number>();
      let certos = 0;
      lacunas.forEach((certa, k) => {
        const exibido = resp.preenchidas[k] ?? null;
        if (exibido === null || usados.has(exibido)) return;
        usados.add(exibido);
        const palavra = banco[original(exibido)];
        if (palavra !== undefined && normalizar(palavra) === normalizar(certa)) certos++;
      });
      return certos / lacunas.length;
    }
  }
}

const normalizar = (t: string) => t.trim().toLocaleLowerCase("pt-BR");

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

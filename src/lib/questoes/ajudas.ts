import { montarVista } from "./apresentacao";
import { iniciosPerguntas, type Conteudo, type Resposta, type Vista } from "./tipos";

/** Cota de cada aluno por temporada. */
export const ELIMINACOES_POR_TEMPORADA = 6;
export const DICAS_POR_TEMPORADA = 3;
/** Eliminar nunca deixa menos que isto de alternativas (ou de itens em aberto) na tela. */
export const MINIMO_ALTERNATIVAS = 2;

/** Tipos de uma resposta só, em que a eliminação tira uma alternativa errada. */
const ESCOLHA = ["multipla_escolha", "interpretacao", "quem_disse", "intruso"] as const;

/**
 * Cada eliminação gravada é um número, no espaço "original" do conteúdo:
 * - escolha única: alternativa errada que saiu;
 * - fonte primária: alternativa errada que saiu (índice na permutação, que junta as perguntas);
 * - causa e consequência, ponto de vista, lacunas: índices a partir de n são opções extras que
 *   saíram; índices menores que n são itens travados no lugar certo (a consequência da causa k,
 *   a perspectiva do relato k, a palavra da lacuna k);
 * - V ou F, pares, classificar, linha do tempo, ordenar, régua, mapa: item travado no lugar certo;
 * - encontrar o erro: trecho certo, marcado como sem erro.
 */
export function candidatasEliminacao(c: Conteudo, eliminadas: number[]): number[] {
  const ja = new Set(eliminadas);
  const faixa = (de: number, ate: number) => Array.from({ length: ate - de }, (_, i) => de + i);
  /** Itens 0..n-1 ainda em aberto, desde que sobrem mais que o mínimo. */
  const travaveis = (n: number) => {
    const abertos = faixa(0, n).filter((i) => !ja.has(i));
    return abertos.length > MINIMO_ALTERNATIVAS ? abertos : [];
  };
  /** Primeiro tira as extras; sem extras, trava um item. */
  const extrasDepoisTravar = (n: number, extras: number) => {
    const sobra = faixa(n, n + extras).filter((i) => !ja.has(i));
    return sobra.length ? sobra : travaveis(n);
  };

  switch (c.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
    case "intruso": {
      const total =
        c.tipo === "quem_disse"
          ? c.conteudo.autores.length
          : c.tipo === "intruso"
            ? c.conteudo.itens.length
            : c.conteudo.alternativas.length;
      const certa = c.tipo === "intruso" ? c.conteudo.intruso : c.conteudo.correta;
      if (total - ja.size <= MINIMO_ALTERNATIVAS) return [];
      return faixa(0, total).filter((i) => i !== certa && !ja.has(i));
    }
    case "fonte_primaria": {
      const inicios = iniciosPerguntas(c.conteudo);
      return c.conteudo.perguntas.flatMap((p, j) => {
        const indices = faixa(inicios[j], inicios[j] + p.alternativas.length);
        if (indices.filter((i) => !ja.has(i)).length <= MINIMO_ALTERNATIVAS) return [];
        return indices.filter((i) => i - inicios[j] !== p.correta && !ja.has(i));
      });
    }
    case "causa_consequencia":
      return extrasDepoisTravar(c.conteudo.relacoes.length, c.conteudo.extras.length);
    case "ponto_de_vista":
      return extrasDepoisTravar(c.conteudo.relatos.length, c.conteudo.extras.length);
    case "completar_lacunas":
      return extrasDepoisTravar(c.conteudo.lacunas.length, c.conteudo.extras.length);
    case "vf_bloco":
      return travaveis(c.conteudo.afirmativas.length);
    case "pares":
      return travaveis(c.conteudo.pares.length);
    case "classificar":
      return travaveis(c.conteudo.itens.length);
    case "linha_do_tempo":
      return travaveis(c.conteudo.eventos.length);
    case "ordenar_frases":
      return travaveis(c.conteudo.frases.length);
    case "linha_do_tempo_datas":
      return travaveis(c.conteudo.eventos.length);
    case "mapa":
      return travaveis(c.conteudo.marcadores.length);
    case "encontrar_erro": {
      // Marca trechos certos; sempre sobra ao menos um certo para confundir com os errados.
      const { trechos } = c.conteudo;
      const certos = faixa(0, trechos.length).filter((i) => !trechos[i].errado && !ja.has(i));
      return certos.length >= MINIMO_ALTERNATIVAS ? certos : [];
    }
  }
}

/** Converte índices originais eliminados para as posições na tela deste aluno. */
export function eliminadasNaVista(permutacao: number[], eliminadas: number[]): number[] {
  const ja = new Set(eliminadas);
  return permutacao.flatMap((original, posicao) => (ja.has(original) ? [posicao] : []));
}

/**
 * O que as eliminações mudam na tela, já em posições da tela do aluno.
 * - removidas: opções riscadas (alternativas, consequências, perspectivas, palavras do banco).
 *   Na fonte primária, a posição soma as alternativas das perguntas anteriores.
 * - fixas: pares [item, valor] travados com a resposta certa. Item e valor seguem a resposta
 *   de cada tipo (ver aplicarAjuda); no V ou F o valor é 1 (V) ou 0 (F); no encontrar o erro, 0 (sem erro).
 */
export type AjudaVista = { removidas: number[]; fixas: [number, number][] };

export const AJUDA_VAZIA: AjudaVista = { removidas: [], fixas: [] };

export function ajudaNaVista(c: Conteudo, permutacao: number[], eliminadas: number[]): AjudaVista {
  if (!eliminadas.length) return AJUDA_VAZIA;
  const ja = new Set(eliminadas);
  const tela = (original: number) => permutacao.indexOf(original);
  const travados = (n: number) => eliminadas.filter((i) => i < n);

  switch (c.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
    case "intruso":
      return { removidas: eliminadasNaVista(permutacao, eliminadas), fixas: [] };
    case "fonte_primaria": {
      const inicios = iniciosPerguntas(c.conteudo);
      const removidas = c.conteudo.perguntas.flatMap((p, j) => {
        const sub = permutacao.filter((i) => i >= inicios[j] && i < inicios[j] + p.alternativas.length);
        return sub.flatMap((original, posicao) => (ja.has(original) ? [inicios[j] + posicao] : []));
      });
      return { removidas, fixas: [] };
    }
    case "causa_consequencia":
    case "ponto_de_vista":
    case "completar_lacunas": {
      const n =
        c.tipo === "causa_consequencia"
          ? c.conteudo.relacoes.length
          : c.tipo === "ponto_de_vista"
            ? c.conteudo.relatos.length
            : c.conteudo.lacunas.length;
      return {
        removidas: eliminadasNaVista(
          permutacao,
          eliminadas.filter((i) => i >= n),
        ),
        fixas: travados(n).map((k) => [k, tela(k)]),
      };
    }
    case "vf_bloco":
      return {
        removidas: [],
        fixas: eliminadas.map((i) => [tela(i), c.conteudo.afirmativas[i].verdadeira ? 1 : 0]),
      };
    case "pares":
      return { removidas: [], fixas: eliminadas.map((i) => [i, tela(i)]) };
    case "classificar":
      return { removidas: [], fixas: eliminadas.map((i) => [tela(i), c.conteudo.itens[i].grupo]) };
    case "linha_do_tempo":
    case "ordenar_frases":
      // [item na tela, posição certa na ordem]
      return { removidas: [], fixas: eliminadas.map((i) => [tela(i), i]) };
    case "linha_do_tempo_datas": {
      const { inicio, passo, eventos } = c.conteudo;
      return {
        removidas: [],
        fixas: eliminadas.map((i) => [tela(i), Math.floor((eventos[i].ano - inicio) / passo)]),
      };
    }
    case "mapa":
      // [nome na tela, pino]
      return { removidas: [], fixas: eliminadas.map((i) => [tela(i), i]) };
    case "encontrar_erro":
      return { removidas: [], fixas: eliminadas.map((i) => [i, 0]) };
  }
}

/** Itens travados de uma ajuda, como mapa item → valor. */
export const mapaFixas = (ajuda: AjudaVista | undefined) => new Map(ajuda?.fixas ?? []);

/**
 * Põe na resposta os itens travados e tira as opções riscadas. Usado na tela, a
 * cada eliminação, e no servidor antes de corrigir, para valer o que a tela mostrou.
 */
export function aplicarAjuda(vista: Vista, r: Resposta, ajuda: AjudaVista): Resposta {
  if (!ajuda.removidas.length && !ajuda.fixas.length) return r;
  const removida = new Set(ajuda.removidas);
  const fixas = ajuda.fixas;
  const valoresFixos = new Set(fixas.map(([, v]) => v));

  /** Ligações item → opção (cada opção serve a um item só). */
  const ligar = (ligacoes: (number | null)[]) => {
    const novas = ligacoes.map((v) => (v === null || removida.has(v) || valoresFixos.has(v) ? null : v));
    for (const [item, valor] of fixas) if (item < novas.length) novas[item] = valor;
    return novas;
  };
  /** Valor por item, sem exclusividade entre os itens. */
  const marcar = <T>(valores: (T | null)[], valor: (v: number) => T) => {
    const novos = [...valores];
    for (const [item, v] of fixas) if (item < novos.length) novos[item] = valor(v);
    return novos;
  };

  switch (r.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
    case "intruso":
      return r.escolha !== null && removida.has(r.escolha) ? { ...r, escolha: null } : r;
    case "fonte_primaria": {
      if (vista.tipo !== "fonte_primaria") return r;
      let inicio = 0;
      const escolhas = r.escolhas.map((e, j) => {
        const base = inicio;
        inicio += vista.perguntas[j]?.alternativas.length ?? 0;
        return e !== null && removida.has(base + e) ? null : e;
      });
      return { ...r, escolhas };
    }
    case "vf_bloco":
      return { ...r, valores: marcar(r.valores, (v) => v === 1) };
    case "pares":
    case "causa_consequencia":
    case "ponto_de_vista":
      return { ...r, ligacoes: ligar(r.ligacoes) };
    case "completar_lacunas":
      return { ...r, preenchidas: ligar(r.preenchidas) };
    case "mapa":
      return { ...r, pinos: ligar(r.pinos) };
    case "classificar":
      return { ...r, grupos: marcar(r.grupos, (v) => v) };
    case "linha_do_tempo_datas":
      return { ...r, faixas: marcar(r.faixas, (v) => v) };
    case "encontrar_erro": {
      const semErro = new Set(fixas.map(([i]) => i));
      return { ...r, marcados: r.marcados.filter((i) => !semErro.has(i)) };
    }
    case "linha_do_tempo":
    case "ordenar_frases":
      return { ...r, ordem: fixarOrdem(r.ordem, fixas) };
  }
}

/** Põe cada item travado na sua posição; os outros mantêm a ordem relativa. */
export function fixarOrdem(ordem: number[], fixas: [number, number][]): number[] {
  const travados = new Set(fixas.map(([item]) => item));
  const livres = ordem.filter((i) => !travados.has(i));
  const nova = [...livres];
  for (const [item, posicao] of [...fixas].sort((a, b) => a[1] - b[1])) nova.splice(posicao, 0, item);
  return nova;
}

/** Rótulo do botão de eliminação conforme o tipo. */
export function rotuloEliminacao(tipo: Conteudo["tipo"]): string {
  if ((ESCOLHA as readonly string[]).includes(tipo) || tipo === "fonte_primaria") return "Eliminar uma errada";
  if (tipo === "encontrar_erro") return "Mostrar um trecho certo";
  if (tipo === "causa_consequencia" || tipo === "ponto_de_vista" || tipo === "completar_lacunas") {
    return "Eliminar ou revelar";
  }
  return "Revelar um item";
}

/** Resposta enviada com os itens travados pelas eliminações, para corrigir. */
export function respostaComAjuda(
  c: Conteudo,
  permutacao: number[],
  eliminadas: number[] | null | undefined,
  r: Resposta | null,
): Resposta | null {
  if (!r || !eliminadas?.length || r.tipo !== c.tipo) return r;
  return aplicarAjuda(montarVista(c, permutacao), r, ajudaNaVista(c, permutacao, eliminadas));
}

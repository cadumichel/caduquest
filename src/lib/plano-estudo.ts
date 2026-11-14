/**
 * Plano de estudo para a prova: o que o aluno precisa rever, tirado das
 * respostas dele nos desafios da temporada cujo gabarito já saiu. Nada é
 * cadastrado: capítulo, habilidade e página vêm das próprias questões.
 */

export type RespostaPlano = {
  questaoId: string;
  capitulo: string | null;
  habilidades: string[];
  enunciado: string;
  /** Acerto de 0 a 1 na questão. */
  fracao: number;
};

export type Situacao = "reforcar" | "rever" | "dominado";

export type TopicoPlano = {
  nome: string;
  /** Acerto médio de 0 a 1. */
  acerto: number;
  questoes: number;
  erradas: number;
  situacao: Situacao;
  /** Páginas da apostila citadas nas questões erradas, em ordem. */
  paginas: number[];
};

export type PlanoDeEstudo = {
  capitulos: TopicoPlano[];
  habilidades: TopicoPlano[];
  /** Páginas citadas em qualquer questão errada. */
  paginas: number[];
  questoes: number;
  erradas: number;
};

/** Abaixo disso o tema pede reforço; acima de DOMINADO, só uma passada. */
export const REFORCAR_ABAIXO_DE = 0.6;
export const DOMINADO_A_PARTIR_DE = 0.8;
export const SEM_CAPITULO = "Outros temas";

export const situacaoDoAcerto = (acerto: number): Situacao =>
  acerto < REFORCAR_ABAIXO_DE ? "reforcar" : acerto < DOMINADO_A_PARTIR_DE ? "rever" : "dominado";

/**
 * Páginas citadas num enunciado: "(p. 42)", "pág. 42", "página 42", "pp. 42-44",
 * "p. 42 e 43". Intervalos entram inteiros (até 10 páginas).
 */
export function paginasCitadas(texto: string): number[] {
  const paginas = new Set<number>();
  const padrao = /\b(?:pp?\.|p[áa]gs?\.?|p[áa]ginas?)\s*(\d{1,3}(?:\s*(?:-|–|a|e|,)\s*\d{1,3})*)/gi;
  for (const achado of texto.matchAll(padrao)) {
    const trecho = achado[1];
    for (const intervalo of trecho.matchAll(/(\d{1,3})\s*(?:-|–|a)\s*(\d{1,3})/g)) {
      const de = Number(intervalo[1]);
      const ate = Number(intervalo[2]);
      if (ate > de && ate - de <= 10) for (let p = de; p <= ate; p++) paginas.add(p);
    }
    for (const n of trecho.matchAll(/\d{1,3}/g)) paginas.add(Number(n[0]));
  }
  return [...paginas].filter((p) => p > 0).sort((a, b) => a - b);
}

/** Acerto por tema (capítulo, habilidade...), do mais fraco para o mais forte. */
export function agruparPorTopico(respostas: RespostaPlano[], chaves: (r: RespostaPlano) => string[]): TopicoPlano[] {
  const grupos = new Map<string, { soma: number; questoes: number; erradas: number; paginas: Set<number> }>();
  for (const r of respostas) {
    for (const nome of chaves(r)) {
      const g = grupos.get(nome) ?? { soma: 0, questoes: 0, erradas: 0, paginas: new Set<number>() };
      g.soma += r.fracao;
      g.questoes += 1;
      if (r.fracao < 1) {
        g.erradas += 1;
        for (const p of paginasCitadas(r.enunciado)) g.paginas.add(p);
      }
      grupos.set(nome, g);
    }
  }
  return [...grupos]
    .map(([nome, g]) => {
      const acerto = g.soma / g.questoes;
      return {
        nome,
        acerto,
        questoes: g.questoes,
        erradas: g.erradas,
        situacao: situacaoDoAcerto(acerto),
        paginas: [...g.paginas].sort((a, b) => a - b),
      };
    })
    .sort((a, b) => a.acerto - b.acerto || b.erradas - a.erradas || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Conta cada questão uma vez (vale a primeira da lista). Temas do mais fraco para o mais forte. */
export function montarPlano(respostas: RespostaPlano[]): PlanoDeEstudo {
  const vistas = new Set<string>();
  const unicas = respostas.filter((r) => !vistas.has(r.questaoId) && vistas.add(r.questaoId));
  const erradas = unicas.filter((r) => r.fracao < 1);
  return {
    capitulos: agruparPorTopico(unicas, (r) => [r.capitulo?.trim() || SEM_CAPITULO]),
    habilidades: agruparPorTopico(unicas, (r) => r.habilidades.map((h) => h.trim()).filter(Boolean)),
    paginas: [...new Set(erradas.flatMap((r) => paginasCitadas(r.enunciado)))].sort((a, b) => a - b),
    questoes: unicas.length,
    erradas: erradas.length,
  };
}

/** "42, 43 e 51" */
export function listarPaginas(paginas: number[]): string {
  if (paginas.length <= 1) return paginas.join("");
  return `${paginas.slice(0, -1).join(", ")} e ${paginas.at(-1)}`;
}

import { z } from "zod";

export const TIPOS = [
  "multipla_escolha",
  "vf_bloco",
  "linha_do_tempo",
  "pares",
  "fonte_primaria",
  "causa_consequencia",
  "encontrar_erro",
  "completar_lacunas",
  "ordenar_frases",
  "interpretacao",
  "quem_disse",
  "classificar",
  "intruso",
  "ponto_de_vista",
  "linha_do_tempo_datas",
  "mapa",
] as const;
export type TipoQuestao = (typeof TIPOS)[number];

/** Tipos que o gerador pela API sabe produzir (o conector aceita todos). */
export const TIPOS_GERADOR = ["multipla_escolha", "vf_bloco", "linha_do_tempo", "pares"] as const;

export const NOME_TIPO: Record<TipoQuestao, string> = {
  multipla_escolha: "Múltipla escolha",
  vf_bloco: "Verdadeiro ou falso em bloco",
  linha_do_tempo: "Linha do tempo",
  pares: "Pares",
  fonte_primaria: "Fonte primária",
  causa_consequencia: "Causa e consequência",
  encontrar_erro: "Encontrar o erro",
  completar_lacunas: "Completar lacunas",
  ordenar_frases: "Ordenar frases",
  interpretacao: "Interpretação correta",
  quem_disse: "Quem disse?",
  classificar: "Classificar em grupos",
  intruso: "Intruso",
  ponto_de_vista: "Ponto de vista",
  linha_do_tempo_datas: "Linha do tempo com datas",
  mapa: "Mapa clicável",
};

/** Tipos de uma resposta só: o aluno precisa escolher antes de confirmar. */
export const ESCOLHA_UNICA: readonly TipoQuestao[] = ["multipla_escolha", "interpretacao", "quem_disse", "intruso"];

/** Tempo limite padrão por tipo, em segundos (escopo: 20 a 60 s). */
/** Limites do tempo por questão, em segundos (o professor escolhe livremente dentro deles). */
export const TEMPO_MIN_S = 5;
export const TEMPO_MAX_S = 600;

export const TEMPO_PADRAO: Record<TipoQuestao, number> = {
  multipla_escolha: 40,
  vf_bloco: 60,
  linha_do_tempo: 60,
  pares: 60,
  fonte_primaria: 120,
  causa_consequencia: 90,
  encontrar_erro: 90,
  completar_lacunas: 90,
  ordenar_frases: 75,
  interpretacao: 90,
  quem_disse: 40,
  classificar: 75,
  intruso: 40,
  ponto_de_vista: 90,
  linha_do_tempo_datas: 90,
  mapa: 75,
};

export const NOME_DIFICULDADE: Record<number, string> = { 1: "Fácil", 2: "Média", 3: "Difícil" };

const texto = z.string().trim().min(1, "Preencha todos os itens.");

export const conteudoMultiplaEscolha = z
  .object({
    alternativas: z.array(texto).min(4, "Use 4 ou 5 alternativas.").max(5, "Use 4 ou 5 alternativas."),
    correta: z.number().int().min(0),
  })
  .refine((c) => c.correta < c.alternativas.length, "Marque a alternativa correta.");

export const conteudoVfBloco = z.object({
  afirmativas: z
    .array(z.object({ texto, verdadeira: z.boolean() }))
    .min(3, "Use de 3 a 6 afirmativas.")
    .max(6, "Use de 3 a 6 afirmativas."),
});

export const conteudoLinhaDoTempo = z.object({
  // Na ordem cronológica correta.
  eventos: z
    .array(z.object({ texto, data: z.string().trim().optional() }))
    .min(4, "Use de 4 a 6 eventos.")
    .max(6, "Use de 4 a 6 eventos."),
});

export const conteudoPares = z.object({
  pares: z
    .array(z.object({ esquerda: texto, direita: texto }))
    .min(3, "Use de 3 a 6 pares.")
    .max(6, "Use de 3 a 6 pares."),
});

export const conteudoFontePrimaria = z.object({
  // Trecho do documento; pode ficar vazio quando a fonte é a imagem da questão.
  documento: z.string().trim().max(2500, "Documento longo demais (máx. 2.500 caracteres).").default(""),
  perguntas: z
    .array(
      z
        .object({
          pergunta: texto,
          alternativas: z
            .array(texto)
            .min(3, "Use 3 ou 4 alternativas por pergunta.")
            .max(4, "Use 3 ou 4 alternativas por pergunta."),
          correta: z.number().int().min(0),
        })
        .refine((p) => p.correta < p.alternativas.length, "Marque a alternativa correta de cada pergunta."),
    )
    .min(2, "Use 2 ou 3 perguntas sobre a fonte.")
    .max(3, "Use 2 ou 3 perguntas sobre a fonte."),
});

export const conteudoCausaConsequencia = z.object({
  relacoes: z
    .array(z.object({ causa: texto, consequencia: texto }))
    .min(3, "Use de 3 a 5 relações.")
    .max(5, "Use de 3 a 5 relações."),
  // Consequências que não pertencem a nenhuma causa: obrigam o aluno a pensar até a última.
  extras: z.array(texto).max(2, "Use no máximo 2 consequências extras.").default([]),
});

export const conteudoEncontrarErro = z
  .object({
    // O texto é a junção dos trechos, na ordem.
    trechos: z
      .array(z.object({ texto, errado: z.boolean(), correcao: z.string().trim().optional() }))
      .min(4, "Divida o texto em 4 a 10 trechos.")
      .max(10, "Divida o texto em 4 a 10 trechos."),
  })
  .refine((c) => {
    const erros = c.trechos.filter((t) => t.errado).length;
    return erros >= 1 && erros <= 3;
  }, "Marque de 1 a 3 trechos com erro.")
  .refine((c) => c.trechos.filter((t) => !t.errado).length >= 3, "Deixe ao menos 3 trechos corretos.");

/** Marca de lacuna no texto: três ou mais sublinhados. */
export const MARCA_LACUNA = /_{3,}/g;

export const conteudoCompletarLacunas = z
  .object({
    texto: texto.max(1500, "Texto longo demais (máx. 1.500 caracteres)."),
    // Na ordem em que aparecem no texto.
    lacunas: z.array(texto).min(1, "Use de 1 a 5 lacunas.").max(5, "Use de 1 a 5 lacunas."),
    extras: z.array(texto).max(3, "Use no máximo 3 palavras extras.").default([]),
  })
  .refine(
    (c) => (c.texto.match(MARCA_LACUNA) ?? []).length === c.lacunas.length,
    "Marque no texto uma lacuna (___) para cada resposta.",
  );

export const conteudoOrdenarFrases = z.object({
  // Na ordem correta.
  frases: z.array(texto).min(3, "Use de 3 a 6 frases.").max(6, "Use de 3 a 6 frases."),
});

export const conteudoInterpretacao = z
  .object({
    texto: texto.max(2500, "Texto longo demais (máx. 2.500 caracteres)."),
    alternativas: z.array(texto).min(4, "Use 4 ou 5 alternativas.").max(5, "Use 4 ou 5 alternativas."),
    correta: z.number().int().min(0),
  })
  .refine((c) => c.correta < c.alternativas.length, "Marque a interpretação correta.");

export const conteudoQuemDisse = z
  .object({
    citacao: texto.max(800, "Citação longa demais (máx. 800 caracteres)."),
    autores: z.array(texto).min(4, "Use 4 ou 5 opções.").max(5, "Use 4 ou 5 opções."),
    correta: z.number().int().min(0),
  })
  .refine((c) => c.correta < c.autores.length, "Marque quem disse.");

export const conteudoClassificar = z
  .object({
    grupos: z.array(texto).min(2, "Use 2 ou 3 grupos.").max(3, "Use 2 ou 3 grupos."),
    itens: z
      .array(z.object({ texto, grupo: z.number().int().min(0) }))
      .min(4, "Use de 4 a 8 itens.")
      .max(8, "Use de 4 a 8 itens."),
  })
  .refine((c) => c.itens.every((i) => i.grupo < c.grupos.length), "Escolha o grupo de cada item.")
  .refine(
    (c) => c.grupos.every((_, g) => c.itens.some((i) => i.grupo === g)),
    "Cada grupo precisa de ao menos um item.",
  );

export const conteudoIntruso = z
  .object({
    itens: z.array(texto).min(4, "Use 4 ou 5 itens.").max(5, "Use 4 ou 5 itens."),
    intruso: z.number().int().min(0),
    // O que os outros itens têm em comum: aparece no gabarito.
    criterio: texto,
  })
  .refine((c) => c.intruso < c.itens.length, "Marque o intruso.");

export const conteudoPontoDeVista = z.object({
  relatos: z
    .array(z.object({ texto: texto.max(800, "Relato longo demais (máx. 800 caracteres)."), perspectiva: texto }))
    .min(2, "Use 2 ou 3 relatos.")
    .max(3, "Use 2 ou 3 relatos."),
  extras: z.array(texto).max(2, "Use no máximo 2 perspectivas extras.").default([]),
});

const ano = z.number({ error: "Informe o ano de cada evento." }).int().min(-5000).max(2100);

export const conteudoLinhaDoTempoDatas = z
  .object({
    inicio: ano,
    fim: ano,
    passo: z.number().int().min(1, "Informe o tamanho de cada faixa."),
    eventos: z.array(z.object({ texto, ano })).min(3, "Use de 3 a 6 eventos.").max(6, "Use de 3 a 6 eventos."),
  })
  .refine((c) => c.fim > c.inicio, "O fim da régua precisa vir depois do início.")
  .refine((c) => {
    const n = Math.ceil((c.fim - c.inicio) / c.passo);
    return n >= 3 && n <= 8;
  }, "A régua precisa ter de 3 a 8 faixas: ajuste início, fim ou tamanho da faixa.")
  .refine(
    (c) => c.eventos.every((e) => e.ano >= c.inicio && e.ano < c.fim),
    "Todos os eventos precisam caber na régua.",
  );

export const conteudoMapa = z
  .object({
    // Caminho no bucket das questões, como imagem_path.
    imagem: z.string().trim().min(1, "Envie a imagem do mapa."),
    marcadores: z
      .array(
        z.object({
          nome: texto,
          // Posição em % da largura e da altura da imagem.
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        }),
      )
      .min(2, "Use de 2 a 6 marcadores.")
      .max(6, "Use de 2 a 6 marcadores."),
    // Marcadores criados pelo conector, ainda fora do lugar.
    posicionar: z.boolean().optional(),
  })
  .refine((c) => !c.posicionar, "Toque no mapa para pôr cada marcador no lugar certo.");

/** Faixas da régua: [início, fim) de cada uma. */
export function faixasDaRegua(c: { inicio: number; fim: number; passo: number }): [number, number][] {
  const faixas: [number, number][] = [];
  for (let a = c.inicio; a < c.fim; a += c.passo) faixas.push([a, Math.min(a + c.passo, c.fim)]);
  return faixas;
}

export function faixaDoAno(c: { inicio: number; passo: number }, a: number): number {
  return Math.floor((a - c.inicio) / c.passo);
}

/** 1500 → "1500"; -27 → "27 a.C." */
export function formatarAno(a: number): string {
  return a < 0 ? `${-a} a.C.` : String(a);
}

export const SCHEMA_CONTEUDO = {
  multipla_escolha: conteudoMultiplaEscolha,
  vf_bloco: conteudoVfBloco,
  linha_do_tempo: conteudoLinhaDoTempo,
  pares: conteudoPares,
  fonte_primaria: conteudoFontePrimaria,
  causa_consequencia: conteudoCausaConsequencia,
  encontrar_erro: conteudoEncontrarErro,
  completar_lacunas: conteudoCompletarLacunas,
  ordenar_frases: conteudoOrdenarFrases,
  interpretacao: conteudoInterpretacao,
  quem_disse: conteudoQuemDisse,
  classificar: conteudoClassificar,
  intruso: conteudoIntruso,
  ponto_de_vista: conteudoPontoDeVista,
  linha_do_tempo_datas: conteudoLinhaDoTempoDatas,
  mapa: conteudoMapa,
} as const;

export type ConteudoMultiplaEscolha = z.infer<typeof conteudoMultiplaEscolha>;
export type ConteudoVfBloco = z.infer<typeof conteudoVfBloco>;
export type ConteudoLinhaDoTempo = z.infer<typeof conteudoLinhaDoTempo>;
export type ConteudoPares = z.infer<typeof conteudoPares>;
export type ConteudoFontePrimaria = z.infer<typeof conteudoFontePrimaria>;
export type ConteudoCausaConsequencia = z.infer<typeof conteudoCausaConsequencia>;
export type ConteudoEncontrarErro = z.infer<typeof conteudoEncontrarErro>;
export type ConteudoCompletarLacunas = z.infer<typeof conteudoCompletarLacunas>;
export type ConteudoOrdenarFrases = z.infer<typeof conteudoOrdenarFrases>;
export type ConteudoInterpretacao = z.infer<typeof conteudoInterpretacao>;
export type ConteudoQuemDisse = z.infer<typeof conteudoQuemDisse>;
export type ConteudoClassificar = z.infer<typeof conteudoClassificar>;
export type ConteudoIntruso = z.infer<typeof conteudoIntruso>;
export type ConteudoPontoDeVista = z.infer<typeof conteudoPontoDeVista>;
export type ConteudoLinhaDoTempoDatas = z.infer<typeof conteudoLinhaDoTempoDatas>;
export type ConteudoMapa = z.infer<typeof conteudoMapa>;

export type Conteudo =
  | { tipo: "multipla_escolha"; conteudo: ConteudoMultiplaEscolha }
  | { tipo: "vf_bloco"; conteudo: ConteudoVfBloco }
  | { tipo: "linha_do_tempo"; conteudo: ConteudoLinhaDoTempo }
  | { tipo: "pares"; conteudo: ConteudoPares }
  | { tipo: "fonte_primaria"; conteudo: ConteudoFontePrimaria }
  | { tipo: "causa_consequencia"; conteudo: ConteudoCausaConsequencia }
  | { tipo: "encontrar_erro"; conteudo: ConteudoEncontrarErro }
  | { tipo: "completar_lacunas"; conteudo: ConteudoCompletarLacunas }
  | { tipo: "ordenar_frases"; conteudo: ConteudoOrdenarFrases }
  | { tipo: "interpretacao"; conteudo: ConteudoInterpretacao }
  | { tipo: "quem_disse"; conteudo: ConteudoQuemDisse }
  | { tipo: "classificar"; conteudo: ConteudoClassificar }
  | { tipo: "intruso"; conteudo: ConteudoIntruso }
  | { tipo: "ponto_de_vista"; conteudo: ConteudoPontoDeVista }
  | { tipo: "linha_do_tempo_datas"; conteudo: ConteudoLinhaDoTempoDatas }
  | { tipo: "mapa"; conteudo: ConteudoMapa };

export function validarConteudo(tipo: TipoQuestao, conteudo: unknown) {
  return SCHEMA_CONTEUDO[tipo].safeParse(conteudo);
}

/**
 * Número de itens que a permutação embaralha em cada tipo. Quando o tipo tem
 * várias listas (as perguntas da fonte primária), a permutação cobre todas
 * juntas e cada lista usa o seu trecho (ver subPermutacao).
 */
export function tamanhoPermutacao(c: Conteudo): number {
  switch (c.tipo) {
    case "multipla_escolha":
      return c.conteudo.alternativas.length;
    case "vf_bloco":
      return c.conteudo.afirmativas.length;
    case "linha_do_tempo":
      return c.conteudo.eventos.length;
    case "pares":
      return c.conteudo.pares.length;
    case "fonte_primaria":
      return c.conteudo.perguntas.reduce((n, p) => n + p.alternativas.length, 0);
    case "causa_consequencia":
      return c.conteudo.relacoes.length + c.conteudo.extras.length;
    case "encontrar_erro":
      return 0;
    case "completar_lacunas":
      return c.conteudo.lacunas.length + c.conteudo.extras.length;
    case "ordenar_frases":
      return c.conteudo.frases.length;
    case "interpretacao":
      return c.conteudo.alternativas.length;
    case "quem_disse":
      return c.conteudo.autores.length;
    case "classificar":
      return c.conteudo.itens.length;
    case "intruso":
      return c.conteudo.itens.length;
    case "ponto_de_vista":
      return c.conteudo.relatos.length + c.conteudo.extras.length;
    case "linha_do_tempo_datas":
      return c.conteudo.eventos.length;
    case "mapa":
      return c.conteudo.marcadores.length;
  }
}

/**
 * Ordem dos índices inicio..inicio+tamanho-1 dentro da permutação, rebaixados
 * para 0..tamanho-1. Como a permutação inteira é aleatória, cada trecho também é.
 */
export function subPermutacao(permutacao: number[], inicio: number, tamanho: number): number[] {
  return permutacao.filter((i) => i >= inicio && i < inicio + tamanho).map((i) => i - inicio);
}

/** Início de cada pergunta da fonte primária dentro da permutação. */
export function iniciosPerguntas(c: ConteudoFontePrimaria): number[] {
  let soma = 0;
  return c.perguntas.map((p) => {
    const inicio = soma;
    soma += p.alternativas.length;
    return inicio;
  });
}

export function conteudoVazio(tipo: TipoQuestao): Conteudo {
  switch (tipo) {
    case "multipla_escolha":
      return { tipo, conteudo: { alternativas: ["", "", "", ""], correta: 0 } };
    case "vf_bloco":
      return {
        tipo,
        conteudo: {
          afirmativas: [0, 1, 2, 3].map(() => ({ texto: "", verdadeira: true })),
        },
      };
    case "linha_do_tempo":
      return { tipo, conteudo: { eventos: [0, 1, 2, 3].map(() => ({ texto: "", data: "" })) } };
    case "pares":
      return { tipo, conteudo: { pares: [0, 1, 2, 3].map(() => ({ esquerda: "", direita: "" })) } };
    case "fonte_primaria":
      return {
        tipo,
        conteudo: {
          documento: "",
          perguntas: ["De quando é esta fonte?", "Quem a produziu?", "Qual era a intenção de quem a produziu?"].map(
            (pergunta) => ({ pergunta, alternativas: ["", "", "", ""], correta: 0 }),
          ),
        },
      };
    case "causa_consequencia":
      return { tipo, conteudo: { relacoes: [0, 1, 2].map(() => ({ causa: "", consequencia: "" })), extras: [""] } };
    case "encontrar_erro":
      return {
        tipo,
        conteudo: { trechos: [0, 1, 2, 3, 4].map((i) => ({ texto: "", errado: i === 2, correcao: "" })) },
      };
    case "completar_lacunas":
      return { tipo, conteudo: { texto: "", lacunas: ["", ""], extras: ["", ""] } };
    case "ordenar_frases":
      return { tipo, conteudo: { frases: ["", "", "", ""] } };
    case "interpretacao":
      return { tipo, conteudo: { texto: "", alternativas: ["", "", "", ""], correta: 0 } };
    case "quem_disse":
      return { tipo, conteudo: { citacao: "", autores: ["", "", "", ""], correta: 0 } };
    case "classificar":
      return {
        tipo,
        conteudo: { grupos: ["", ""], itens: [0, 1, 0, 1].map((grupo) => ({ texto: "", grupo })) },
      };
    case "intruso":
      return { tipo, conteudo: { itens: ["", "", "", ""], intruso: 0, criterio: "" } };
    case "ponto_de_vista":
      return { tipo, conteudo: { relatos: [0, 1].map(() => ({ texto: "", perspectiva: "" })), extras: [""] } };
    case "linha_do_tempo_datas":
      return {
        tipo,
        conteudo: { inicio: 1500, fim: 1900, passo: 100, eventos: [0, 1, 2, 3].map(() => ({ texto: "", ano: 1500 })) },
      };
    case "mapa":
      return { tipo, conteudo: { imagem: "", marcadores: [] } };
  }
}

/** O que o aluno recebe: sem gabarito, já embaralhado. */
export type Vista =
  | { tipo: "multipla_escolha"; alternativas: string[] }
  | { tipo: "vf_bloco"; afirmativas: string[] }
  | { tipo: "linha_do_tempo"; eventos: string[] }
  | { tipo: "pares"; esquerda: string[]; direita: string[] }
  | { tipo: "fonte_primaria"; documento: string; perguntas: { pergunta: string; alternativas: string[] }[] }
  | { tipo: "causa_consequencia"; causas: string[]; consequencias: string[] }
  | { tipo: "encontrar_erro"; trechos: string[]; erros: number }
  | { tipo: "completar_lacunas"; partes: string[]; banco: string[] }
  | { tipo: "ordenar_frases"; frases: string[] }
  | { tipo: "interpretacao"; texto: string; alternativas: string[] }
  | { tipo: "quem_disse"; citacao: string; alternativas: string[] }
  | { tipo: "classificar"; grupos: string[]; itens: string[] }
  | { tipo: "intruso"; itens: string[] }
  | { tipo: "ponto_de_vista"; relatos: string[]; perspectivas: string[] }
  | { tipo: "linha_do_tempo_datas"; faixas: string[]; eventos: string[] }
  | { tipo: "mapa"; imagem: string; pinos: { x: number; y: number }[]; nomes: string[] };

/** Resposta do aluno, sempre em índices da ordem exibida. */
export type Resposta =
  | { tipo: "multipla_escolha"; escolha: number | null }
  | { tipo: "vf_bloco"; valores: (boolean | null)[] }
  | { tipo: "linha_do_tempo"; ordem: number[] }
  | { tipo: "pares"; ligacoes: (number | null)[] }
  | { tipo: "fonte_primaria"; escolhas: (number | null)[] }
  | { tipo: "causa_consequencia"; ligacoes: (number | null)[] }
  | { tipo: "encontrar_erro"; marcados: number[] }
  | { tipo: "completar_lacunas"; preenchidas: (number | null)[] }
  | { tipo: "ordenar_frases"; ordem: number[] }
  | { tipo: "interpretacao"; escolha: number | null }
  | { tipo: "quem_disse"; escolha: number | null }
  | { tipo: "classificar"; grupos: (number | null)[] }
  | { tipo: "intruso"; escolha: number | null }
  | { tipo: "ponto_de_vista"; ligacoes: (number | null)[] }
  | { tipo: "linha_do_tempo_datas"; faixas: (number | null)[] }
  | { tipo: "mapa"; pinos: (number | null)[] };

export const schemaResposta = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("multipla_escolha"), escolha: z.number().int().nullable() }),
  z.object({ tipo: z.literal("vf_bloco"), valores: z.array(z.boolean().nullable()).max(10) }),
  z.object({ tipo: z.literal("linha_do_tempo"), ordem: z.array(z.number().int()).max(10) }),
  z.object({ tipo: z.literal("pares"), ligacoes: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("fonte_primaria"), escolhas: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("causa_consequencia"), ligacoes: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("encontrar_erro"), marcados: z.array(z.number().int()).max(10) }),
  z.object({ tipo: z.literal("completar_lacunas"), preenchidas: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("ordenar_frases"), ordem: z.array(z.number().int()).max(10) }),
  z.object({ tipo: z.literal("interpretacao"), escolha: z.number().int().nullable() }),
  z.object({ tipo: z.literal("quem_disse"), escolha: z.number().int().nullable() }),
  z.object({ tipo: z.literal("classificar"), grupos: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("intruso"), escolha: z.number().int().nullable() }),
  z.object({ tipo: z.literal("ponto_de_vista"), ligacoes: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("linha_do_tempo_datas"), faixas: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("mapa"), pinos: z.array(z.number().int().nullable()).max(10) }),
]);

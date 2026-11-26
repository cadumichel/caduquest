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
  "tabuleiro",
  "estimativa",
  "quem_sou_eu",
  "monte_resposta",
  "investigue",
  "conversa",
  "conceito_secreto",
  "detalhe_imagem",
  "enquanto_isso",
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
  tabuleiro: "Tabuleiro",
  estimativa: "Estimativa na régua",
  quem_sou_eu: "Quem sou eu? (pistas)",
  monte_resposta: "Monte a resposta",
  investigue: "Investigue (com consulta)",
  conversa: "Conversa com o personagem",
  conceito_secreto: "Conceito secreto",
  detalhe_imagem: "Detalhe na imagem",
  enquanto_isso: "Enquanto isso… (duas linhas do tempo)",
};

/**
 * Tipos que pedem pesquisa: só fazem sentido com consulta. Não caem na rodada
 * final do desafio público e o painel avisa ao pô-los num desafio sem consulta.
 */
export const SO_COM_CONSULTA: readonly TipoQuestao[] = ["investigue"];

/**
 * Tipos respondidos em etapas, cada uma com o próprio botão (Enviar, Avançar,
 * letras). O botão "Confirmar resposta" só aparece quando a última etapa
 * termina: com os dois na tela, o aluno confirmava antes da hora e perdia a questão.
 */
export const EM_ETAPAS: readonly TipoQuestao[] = ["tabuleiro", "conversa", "conceito_secreto"];

/** Tipos de uma resposta só: o aluno precisa escolher antes de confirmar. */
export const ESCOLHA_UNICA: readonly TipoQuestao[] = [
  "multipla_escolha",
  "interpretacao",
  "quem_disse",
  "intruso",
  "quem_sou_eu",
  "estimativa",
  "investigue",
  "detalhe_imagem",
];

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
  tabuleiro: 90,
  estimativa: 40,
  quem_sou_eu: 90,
  monte_resposta: 120,
  investigue: 180,
  conversa: 90,
  conceito_secreto: 60,
  detalhe_imagem: 45,
  enquanto_isso: 90,
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

export const conteudoTabuleiro = z.object({
  // Quem percorre o caminho (ex.: Abraham Lincoln).
  personagem: texto.max(80, "Nome do personagem longo demais (máx. 80 caracteres)."),
  // Retrato enviado (caminho no bucket das questões), para quem não tem desenho no app.
  retrato: z.string().trim().optional(),
  // Na ordem do caminho: em cada casa, o que ele fez (certa) e o que não fez (errada).
  casas: z
    .array(
      z.object({
        certa: texto.max(200, "Opção longa demais (máx. 200 caracteres)."),
        errada: texto.max(200, "Opção longa demais (máx. 200 caracteres)."),
        // Emoji do assunto da casa (ex.: ⚔️ numa casa sobre guerra); aparece quando o peão chega.
        emoji: z.string().trim().max(16, "Use um emoji só por casa.").optional(),
      }),
    )
    .min(3, "Use de 3 a 10 casas.")
    .max(10, "Use de 3 a 10 casas."),
});

export const conteudoEstimativa = z
  .object({
    // Resposta certa e régua (no ano, negativo = a.C.).
    valor: z.number({ error: "Informe a resposta certa." }),
    minimo: z.number({ error: "Informe o início da régua." }),
    maximo: z.number({ error: "Informe o fim da régua." }),
    passo: z.number().positive("O passo da régua precisa ser maior que zero.").default(1),
    unidade: z.string().trim().max(20, "Unidade longa demais (máx. 20 caracteres).").default(""),
    // Régua de anos: mostra "27 a.C." e não usa separador de milhar.
    ano: z.boolean().default(false),
    // Até esta distância da resposta, nota cheia.
    acerto: z.number().min(0, "A faixa de acerto não pode ser negativa."),
    // A partir desta distância, zero. Entre as duas, a nota cai em linha reta.
    margem: z.number().positive("A margem precisa ser maior que zero."),
  })
  .refine((c) => c.maximo > c.minimo, "O fim da régua precisa ser maior que o início.")
  .refine((c) => c.valor >= c.minimo && c.valor <= c.maximo, "A resposta precisa estar dentro da régua.")
  .refine((c) => c.margem > c.acerto, "A margem (nota zero) precisa ser maior que a faixa de acerto.")
  .refine((c) => {
    const n = (c.maximo - c.minimo) / c.passo;
    return n >= 4 && n <= 5000;
  }, "A régua precisa ter de 4 a 5.000 passos: ajuste o início, o fim ou o passo.");

export const conteudoQuemSouEu = z
  .object({
    candidatos: z
      .array(texto.max(80, "Candidato longo demais (máx. 80 caracteres)."))
      .min(4, "Use de 4 a 8 candidatos.")
      .max(8, "Use de 4 a 8 candidatos."),
    correta: z.number().int().min(0),
    // Da mais difícil para a mais fácil: a primeira aparece logo de cara.
    pistas: z
      .array(texto.max(300, "Pista longa demais (máx. 300 caracteres)."))
      .min(3, "Use de 3 a 6 pistas.")
      .max(6, "Use de 3 a 6 pistas."),
  })
  .refine((c) => c.correta < c.candidatos.length, "Marque o candidato certo.");

export const conteudoMonteResposta = z.object({
  // Na ordem da resposta: cada espaço tem uma função e o trecho certo dele.
  espacos: z
    .array(
      z.object({
        rotulo: texto.max(40, "Nome do espaço longo demais (máx. 40 caracteres)."),
        trecho: texto.max(300, "Trecho longo demais (máx. 300 caracteres)."),
      }),
    )
    .min(2, "Use de 2 a 4 espaços.")
    .max(4, "Use de 2 a 4 espaços."),
  // Trechos que parecem servir e não servem.
  distratores: z
    .array(texto.max(300, "Trecho longo demais (máx. 300 caracteres)."))
    .min(2, "Use de 2 a 5 trechos que não servem.")
    .max(5, "Use de 2 a 5 trechos que não servem."),
});

export const conteudoInvestigue = z.object({
  // A primeira é a resposta principal (aparece no gabarito); as outras, variações aceitas.
  aceitas: z
    .array(texto.max(120, "Resposta longa demais (máx. 120 caracteres)."))
    .min(1, "Escreva a resposta certa.")
    .max(10, "Use no máximo 10 respostas aceitas."),
});

export const conteudoConversa = z.object({
  // Com quem o aluno conversa (ex.: "Operário em São Paulo, 1917").
  personagem: texto.max(80, "Nome do personagem longo demais (máx. 80 caracteres)."),
  // Retrato enviado (caminho no bucket das questões), para quem não tem desenho no app.
  retrato: z.string().trim().optional(),
  turnos: z
    .array(
      z.object({
        mensagem: texto.max(300, "Mensagem longa demais (máx. 300 caracteres)."),
        certa: texto.max(200, "Resposta longa demais (máx. 200 caracteres)."),
        erradas: z
          .array(texto.max(200, "Resposta longa demais (máx. 200 caracteres)."))
          .length(2, "Escreva 2 respostas erradas em cada turno."),
        // O que o personagem responde depois (aparece só depois da escolha).
        reacao: z.string().trim().max(300, "Reação longa demais (máx. 300 caracteres).").optional(),
      }),
    )
    .min(3, "Use de 3 a 8 turnos.")
    .max(8, "Use de 3 a 8 turnos."),
});

export const conteudoConceitoSecreto = z
  .object({
    palavra: texto.max(30, "Palavra longa demais (máx. 30 caracteres)."),
    definicao: texto.max(300, "Definição longa demais (máx. 300 caracteres)."),
  })
  .refine((c) => /^[\p{L}\s'-]+$/u.test(c.palavra), "Use só letras (e espaço ou hífen) na palavra.")
  .refine((c) => c.palavra.trim().split(/\s+/).length <= 3, "Use no máximo 3 palavras.")
  .refine((c) => (c.palavra.match(/\p{L}/gu) ?? []).length >= 4, "A palavra precisa ter ao menos 4 letras.");

export const conteudoDetalheImagem = z
  .object({
    // Caminho no bucket das questões, como no mapa.
    imagem: z.string().trim().min(1, "Envie a imagem."),
    // Centro da área certa, em % da largura e da altura da imagem.
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    // Raio da área, em % da largura da imagem.
    raio: z.number().min(2, "Área pequena demais.").max(30, "Área grande demais."),
    // Largura ÷ altura da imagem, para a área ser um círculo de verdade (1 = quadrada).
    proporcao: z.number().min(0.2).max(5).optional(),
    // Área criada pelo conector, ainda fora do lugar.
    posicionar: z.boolean().optional(),
  })
  .refine((c) => !c.posicionar, "Toque na imagem para marcar a área certa.");

export const conteudoEnquantoIsso = z
  .object({
    // As duas linhas do tempo (ex.: Brasil e Europa).
    linhas: z
      .array(texto.max(40, "Nome de linha longo demais (máx. 40 caracteres)."))
      .length(2, "Use 2 linhas (ex.: Brasil e Europa)."),
    // Colunas da grade, na ordem (ex.: "1500–1600").
    periodos: z
      .array(texto.max(40, "Período longo demais (máx. 40 caracteres)."))
      .min(2, "Use de 2 a 5 períodos.")
      .max(5, "Use de 2 a 5 períodos."),
    eventos: z
      .array(
        z.object({
          texto: texto.max(150, "Evento longo demais (máx. 150 caracteres)."),
          linha: z.number().int().min(0).max(1),
          periodo: z.number().int().min(0),
        }),
      )
      .min(4, "Use de 4 a 10 eventos.")
      .max(10, "Use de 4 a 10 eventos."),
  })
  .refine((c) => c.eventos.every((e) => e.periodo < c.periodos.length), "Escolha o período de cada evento.")
  .refine(
    (c) => [0, 1].every((l) => c.eventos.some((e) => e.linha === l)),
    "Cada linha precisa de ao menos um evento.",
  );

/** Máximo de letras que o aluno pode digitar no Investigue. */
export const MAX_DIGITADO = 160;

/**
 * No tabuleiro, a permutação tem 2 itens por casa (2k = certa, 2k+1 = errada).
 * Devolve a ordem das duas opções da casa k na tela: [0, 1] (certa à esquerda) ou [1, 0].
 */
export function ordemDaCasa(permutacao: number[], k: number): number[] {
  return ordemDoPasso(permutacao, k, 2);
}

/** Ordem na tela das opções do passo k quando cada passo tem `n` opções (a certa é a 0). */
export function ordemDoPasso(permutacao: number[], k: number, n: number): number[] {
  const sub = subPermutacao(permutacao, n * k, n);
  return sub.length === n ? sub : Array.from({ length: n }, (_, i) => i);
}

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
  tabuleiro: conteudoTabuleiro,
  estimativa: conteudoEstimativa,
  quem_sou_eu: conteudoQuemSouEu,
  monte_resposta: conteudoMonteResposta,
  investigue: conteudoInvestigue,
  conversa: conteudoConversa,
  conceito_secreto: conteudoConceitoSecreto,
  detalhe_imagem: conteudoDetalheImagem,
  enquanto_isso: conteudoEnquantoIsso,
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
export type ConteudoTabuleiro = z.infer<typeof conteudoTabuleiro>;
export type ConteudoEstimativa = z.infer<typeof conteudoEstimativa>;
export type ConteudoQuemSouEu = z.infer<typeof conteudoQuemSouEu>;
export type ConteudoMonteResposta = z.infer<typeof conteudoMonteResposta>;
export type ConteudoInvestigue = z.infer<typeof conteudoInvestigue>;
export type ConteudoConversa = z.infer<typeof conteudoConversa>;
export type ConteudoConceitoSecreto = z.infer<typeof conteudoConceitoSecreto>;
export type ConteudoDetalheImagem = z.infer<typeof conteudoDetalheImagem>;
export type ConteudoEnquantoIsso = z.infer<typeof conteudoEnquantoIsso>;

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
  | { tipo: "mapa"; conteudo: ConteudoMapa }
  | { tipo: "tabuleiro"; conteudo: ConteudoTabuleiro }
  | { tipo: "estimativa"; conteudo: ConteudoEstimativa }
  | { tipo: "quem_sou_eu"; conteudo: ConteudoQuemSouEu }
  | { tipo: "monte_resposta"; conteudo: ConteudoMonteResposta }
  | { tipo: "investigue"; conteudo: ConteudoInvestigue }
  | { tipo: "conversa"; conteudo: ConteudoConversa }
  | { tipo: "conceito_secreto"; conteudo: ConteudoConceitoSecreto }
  | { tipo: "detalhe_imagem"; conteudo: ConteudoDetalheImagem }
  | { tipo: "enquanto_isso"; conteudo: ConteudoEnquantoIsso };

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
    case "tabuleiro":
      return c.conteudo.casas.length * 2;
    case "estimativa":
    case "investigue":
      return 0;
    case "quem_sou_eu":
      return c.conteudo.candidatos.length;
    case "conversa":
      return c.conteudo.turnos.length * 3;
    case "conceito_secreto":
    case "detalhe_imagem":
      return 0;
    case "enquanto_isso":
      return c.conteudo.eventos.length;
    case "monte_resposta":
      return c.conteudo.espacos.length + c.conteudo.distratores.length;
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
    case "tabuleiro":
      return {
        tipo,
        conteudo: { personagem: "", casas: [0, 1, 2, 3, 4].map(() => ({ certa: "", errada: "", emoji: "" })) },
      };
    case "estimativa":
      return {
        tipo,
        conteudo: { valor: 1822, minimo: 1750, maximo: 1900, passo: 1, unidade: "", ano: true, acerto: 2, margem: 30 },
      };
    case "quem_sou_eu":
      return { tipo, conteudo: { candidatos: ["", "", "", "", "", ""], correta: 0, pistas: ["", "", "", "", ""] } };
    case "monte_resposta":
      return {
        tipo,
        conteudo: {
          espacos: ["Fato", "Consequência", "Conclusão"].map((rotulo) => ({ rotulo, trecho: "" })),
          distratores: ["", "", ""],
        },
      };
    case "investigue":
      return { tipo, conteudo: { aceitas: [""] } };
    case "conversa":
      return {
        tipo,
        conteudo: {
          personagem: "",
          turnos: [0, 1, 2, 3].map(() => ({ mensagem: "", certa: "", erradas: ["", ""], reacao: "" })),
        },
      };
    case "conceito_secreto":
      return { tipo, conteudo: { palavra: "", definicao: "" } };
    case "detalhe_imagem":
      return { tipo, conteudo: { imagem: "", x: 50, y: 50, raio: 10 } };
    case "enquanto_isso":
      return {
        tipo,
        conteudo: {
          linhas: ["", ""],
          periodos: ["", "", ""],
          eventos: [0, 1, 2, 3].map((i) => ({ texto: "", linha: i % 2, periodo: Math.floor(i / 2) })),
        },
      };
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
  | { tipo: "mapa"; imagem: string; pinos: { x: number; y: number }[]; nomes: string[] }
  /** Cada casa traz as duas opções na ordem da tela; avatar = retrato do personagem, se o app tiver. */
  | {
      tipo: "tabuleiro";
      personagem: string;
      avatar: string | null;
      casas: [string, string][];
      /** Emoji do assunto de cada casa (null = sem emoji). */
      emojis: (string | null)[];
    }
  | { tipo: "estimativa"; minimo: number; maximo: number; passo: number; unidade: string; ano: boolean }
  /**
   * pistas = as que o aluno já pode ler. No desafio, o servidor manda só as abertas
   * (as outras nem chegam à tela); no treino e na prévia, vêm todas e a tela vai abrindo.
   */
  | { tipo: "quem_sou_eu"; candidatos: string[]; pistas: string[]; total: number }
  | { tipo: "monte_resposta"; rotulos: string[]; banco: string[] }
  | { tipo: "investigue" }
  /** Mensagens do personagem e as 3 respostas de cada turno, na ordem da tela. */
  | { tipo: "conversa"; personagem: string; avatar: string | null; mensagens: string[]; opcoes: string[][] }
  /** padrao: "_" no lugar de cada letra; espaço e hífen aparecem. */
  | { tipo: "conceito_secreto"; definicao: string; padrao: string[] }
  | { tipo: "detalhe_imagem"; imagem: string }
  /** Eventos na ordem da tela; cada um vai para uma célula (linha × período). */
  | { tipo: "enquanto_isso"; linhas: string[]; periodos: string[]; eventos: string[] };

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
  | { tipo: "mapa"; pinos: (number | null)[] }
  /** Por casa: 0 = opção da esquerda, 1 = da direita (posições da tela). */
  | { tipo: "tabuleiro"; escolhas: (number | null)[]; fim?: boolean }
  | { tipo: "estimativa"; valor: number | null }
  /** pistas = quantas o aluno abriu (no desafio, vale o que o servidor gravou). */
  | { tipo: "quem_sou_eu"; escolha: number | null; pistas: number }
  | { tipo: "monte_resposta"; preenchidas: (number | null)[] }
  | { tipo: "investigue"; texto: string }
  /** Por turno: posição na tela da resposta escolhida. */
  | { tipo: "conversa"; escolhas: (number | null)[]; fim?: boolean }
  /** Letras tentadas, em maiúsculas sem acento (no desafio, vale o que o servidor gravou). */
  | { tipo: "conceito_secreto"; letras: string[]; fim?: boolean }
  /** Ponto tocado, em % da largura e da altura da imagem. */
  | { tipo: "detalhe_imagem"; ponto: { x: number; y: number } | null }
  /** Por evento na tela: célula escolhida (linha × nº de períodos + período). */
  | { tipo: "enquanto_isso"; celulas: (number | null)[] };

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
  z.object({
    tipo: z.literal("tabuleiro"),
    escolhas: z.array(z.number().int().min(0).max(1).nullable()).max(10),
    // A tela encerrou o caminho (chegada ou sem vidas): as casas que faltaram valem zero.
    fim: z.boolean().optional(),
  }),
  z.object({ tipo: z.literal("estimativa"), valor: z.number().finite().nullable() }),
  z.object({
    tipo: z.literal("quem_sou_eu"),
    escolha: z.number().int().nullable(),
    pistas: z.number().int().min(1).max(10),
  }),
  z.object({ tipo: z.literal("monte_resposta"), preenchidas: z.array(z.number().int().nullable()).max(10) }),
  z.object({ tipo: z.literal("investigue"), texto: z.string().max(MAX_DIGITADO) }),
  z.object({
    tipo: z.literal("conversa"),
    escolhas: z.array(z.number().int().min(0).max(2).nullable()).max(8),
    fim: z.boolean().optional(),
  }),
  z.object({
    tipo: z.literal("conceito_secreto"),
    letras: z.array(z.string().regex(/^[A-Z]$/)).max(26),
    fim: z.boolean().optional(),
  }),
  z.object({
    tipo: z.literal("detalhe_imagem"),
    ponto: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).nullable(),
  }),
  z.object({ tipo: z.literal("enquanto_isso"), celulas: z.array(z.number().int().min(0).max(9).nullable()).max(10) }),
]);

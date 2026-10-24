import { z } from "zod";

export const TIPOS = ["multipla_escolha", "vf_bloco", "linha_do_tempo", "pares"] as const;
export type TipoQuestao = (typeof TIPOS)[number];

export const NOME_TIPO: Record<TipoQuestao, string> = {
  multipla_escolha: "Múltipla escolha",
  vf_bloco: "Verdadeiro ou falso em bloco",
  linha_do_tempo: "Linha do tempo",
  pares: "Pares",
};

/** Tempo limite padrão por tipo, em segundos (escopo: 20 a 60 s). */
export const TEMPO_PADRAO: Record<TipoQuestao, number> = {
  multipla_escolha: 40,
  vf_bloco: 60,
  linha_do_tempo: 60,
  pares: 60,
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

export const SCHEMA_CONTEUDO = {
  multipla_escolha: conteudoMultiplaEscolha,
  vf_bloco: conteudoVfBloco,
  linha_do_tempo: conteudoLinhaDoTempo,
  pares: conteudoPares,
} as const;

export type ConteudoMultiplaEscolha = z.infer<typeof conteudoMultiplaEscolha>;
export type ConteudoVfBloco = z.infer<typeof conteudoVfBloco>;
export type ConteudoLinhaDoTempo = z.infer<typeof conteudoLinhaDoTempo>;
export type ConteudoPares = z.infer<typeof conteudoPares>;

export type Conteudo =
  | { tipo: "multipla_escolha"; conteudo: ConteudoMultiplaEscolha }
  | { tipo: "vf_bloco"; conteudo: ConteudoVfBloco }
  | { tipo: "linha_do_tempo"; conteudo: ConteudoLinhaDoTempo }
  | { tipo: "pares"; conteudo: ConteudoPares };

export function validarConteudo(tipo: TipoQuestao, conteudo: unknown) {
  return SCHEMA_CONTEUDO[tipo].safeParse(conteudo);
}

/** Número de itens que a permutação embaralha em cada tipo. */
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
  }
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
  }
}

/** O que o aluno recebe: sem gabarito, já embaralhado. */
export type Vista =
  | { tipo: "multipla_escolha"; alternativas: string[] }
  | { tipo: "vf_bloco"; afirmativas: string[] }
  | { tipo: "linha_do_tempo"; eventos: string[] }
  | { tipo: "pares"; esquerda: string[]; direita: string[] };

/** Resposta do aluno, sempre em índices da ordem exibida. */
export type Resposta =
  | { tipo: "multipla_escolha"; escolha: number | null }
  | { tipo: "vf_bloco"; valores: (boolean | null)[] }
  | { tipo: "linha_do_tempo"; ordem: number[] }
  | { tipo: "pares"; ligacoes: (number | null)[] };

export const schemaResposta = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("multipla_escolha"), escolha: z.number().int().nullable() }),
  z.object({ tipo: z.literal("vf_bloco"), valores: z.array(z.boolean().nullable()).max(10) }),
  z.object({ tipo: z.literal("linha_do_tempo"), ordem: z.array(z.number().int()).max(10) }),
  z.object({ tipo: z.literal("pares"), ligacoes: z.array(z.number().int().nullable()).max(10) }),
]);

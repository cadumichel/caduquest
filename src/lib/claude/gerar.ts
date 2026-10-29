import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { HABILIDADES } from "@/lib/habilidades";
import { NOME_TIPO, TEMPO_PADRAO, validarConteudo, type TipoQuestao } from "@/lib/questoes/tipos";

const MODELO = "claude-opus-5-5";

// Formato plano: um objeto por questão com campos de todos os tipos (null nos
// que não se aplicam). Cada questão é validada pelo schema do seu tipo depois.
const schemaLote = z.object({
  questoes: z.array(
    z.object({
      tipo: z.string().describe("multipla_escolha | vf_bloco | linha_do_tempo | pares"),
      enunciado: z.string(),
      habilidades: z.array(z.string()),
      dificuldade: z.string().describe("facil | media | dificil"),
      alternativas: z.array(z.string()).nullable(),
      indice_correta: z.number().int().nullable(),
      afirmativas: z.array(z.object({ texto: z.string(), verdadeira: z.boolean() })).nullable(),
      eventos_em_ordem: z.array(z.object({ texto: z.string(), data: z.string() })).nullable(),
      pares: z.array(z.object({ esquerda: z.string(), direita: z.string() })).nullable(),
      explicacao: z.string(),
    }),
  ),
});

export type PedidoGeracao = {
  capitulo: string;
  serie: string;
  habilidades: string[];
  tipos: TipoQuestao[];
  quantidade: number;
  dificuldade: "facil" | "media" | "dificil" | "misturada";
  referencia: string;
  questaoModelo: string;
};

export type QuestaoGerada = {
  tipo: TipoQuestao;
  enunciado: string;
  habilidades: string[];
  dificuldade: number;
  conteudo: unknown;
  explicacao: string;
  tempo_limite_s: number;
};

const SISTEMA = `Você gera questões de revisão de História para um app gamificado usado por alunos do ensino fundamental II e médio no Brasil, antes da prova.

Regras de conteúdo:
- Treine as mesmas habilidades e o mesmo nível da prova, mas nunca copie nem parafraseie de perto a questão modelo: o objetivo é preparar sem antecipar a prova.
- Use só fatos historicamente corretos e consistentes com o texto de referência. Na dúvida, não use o fato.
- Distratores de alto nível: plausíveis, do mesmo período e do mesmo campo semântico, baseados em confusões reais de alunos (causa trocada por consequência, personagem de período vizinho, conceito parecido). Nada de alternativas absurdas, piadas ou "todas as anteriores".
- Alternativas com tamanho e estilo parecidos, para que a correta não se destaque.
- Prefira questões que exigem raciocínio (relação, contexto, interpretação) a decoreba solta.
- Português do Brasil, linguagem clara para a série informada. Enunciados curtos: o aluno tem 40 a 60 segundos.
- Explicação: 2 a 4 frases dizendo por que a resposta certa é certa e, na múltipla escolha, o erro de cada distrator.

Regras por tipo:
- multipla_escolha: 4 alternativas em "alternativas" e o índice (0 a 3) em "indice_correta". Varie a posição da correta.
- vf_bloco: 4 ou 5 afirmativas sobre o mesmo tema ou fonte, mistura de verdadeiras e falsas (pelo menos uma de cada). As falsas devem ser erros sutis.
- linha_do_tempo: 4 a 6 eventos em "eventos_em_ordem", do mais antigo ao mais recente, com a data em "data". O texto do evento não pode conter a data nem pistas óbvias de ordem.
- pares: 4 ou 5 pares em "pares" (personagem e ideia, causa e consequência, conceito e definição). Cada item da direita deve servir para um único item da esquerda.
- Preencha só os campos do tipo da questão; os demais ficam null.`;

function dificuldadeNumero(d: string) {
  return d === "facil" ? 1 : d === "dificil" ? 3 : 2;
}

export async function gerarLote(pedido: PedidoGeracao): Promise<{ questoes: QuestaoGerada[]; descartadas: number }> {
  const client = new Anthropic();
  const instrucoes = [
    `Gere ${pedido.quantidade} questões.`,
    `Capítulo/tema: ${pedido.capitulo}`,
    pedido.serie && `Série: ${pedido.serie}`,
    `Tipos permitidos (distribua entre eles): ${pedido.tipos.map((t) => `${t} (${NOME_TIPO[t]})`).join(", ")}`,
    `Habilidades a treinar: ${(pedido.habilidades.length ? pedido.habilidades : HABILIDADES).join(", ")}. Use exatamente esses nomes em "habilidades".`,
    `Dificuldade: ${pedido.dificuldade === "misturada" ? "misture fácil, média e difícil" : pedido.dificuldade}`,
  ]
    .filter(Boolean)
    .join("\n");

  const conteudoUsuario = [
    instrucoes,
    pedido.referencia && `<texto_de_referencia>\n${pedido.referencia}\n</texto_de_referencia>`,
    pedido.questaoModelo &&
      `<questao_modelo_da_prova>\n${pedido.questaoModelo}\n</questao_modelo_da_prova>\nUse a questão modelo só para calibrar nível e habilidade. Não a reproduza.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const resposta = await client.beta.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(schemaLote) },
    system: SISTEMA,
    messages: [{ role: "user", content: conteudoUsuario }],
  });

  if (resposta.stop_reason === "refusal") throw new Error("O Claude recusou o pedido. Revise o texto de referência.");
  if (resposta.stop_reason === "max_tokens") throw new Error("O lote ficou grande demais. Peça menos questões.");
  const lote = resposta.parsed_output;
  if (!lote) throw new Error("A resposta do Claude veio em formato inesperado. Tente de novo.");

  const permitidas = new Set<string>(HABILIDADES);
  const questoes: QuestaoGerada[] = [];
  let descartadas = 0;
  for (const q of lote.questoes) {
    // Os campos de texto livre são validados aqui, não no schema, para que um
    // item fora do padrão descarte só aquela questão e não o lote inteiro.
    if (!pedido.tipos.includes(q.tipo as TipoQuestao)) {
      descartadas++;
      continue;
    }
    const tipo = q.tipo as TipoQuestao;
    const bruto =
      tipo === "multipla_escolha"
        ? { alternativas: q.alternativas ?? [], correta: q.indice_correta ?? -1 }
        : tipo === "vf_bloco"
          ? { afirmativas: q.afirmativas ?? [] }
          : tipo === "linha_do_tempo"
            ? { eventos: q.eventos_em_ordem ?? [] }
            : { pares: q.pares ?? [] };
    const conteudo = validarConteudo(tipo, bruto);
    if (!conteudo.success || !q.enunciado.trim()) {
      descartadas++;
      continue;
    }
    questoes.push({
      tipo: tipo,
      enunciado: q.enunciado.trim(),
      habilidades: q.habilidades.filter((h) => permitidas.has(h)),
      dificuldade: dificuldadeNumero(q.dificuldade),
      conteudo: conteudo.data,
      explicacao: q.explicacao.trim(),
      tempo_limite_s: TEMPO_PADRAO[tipo],
    });
  }
  return { questoes, descartadas };
}

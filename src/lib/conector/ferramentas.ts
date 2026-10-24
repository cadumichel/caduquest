import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { dataHoraLocalParaIso, formatarDataHora } from "@/lib/datas";
import { HABILIDADES } from "@/lib/habilidades";
import {
  NOME_TIPO,
  TEMPO_MAX_S,
  TEMPO_MIN_S,
  TEMPO_PADRAO,
  TIPOS,
  validarConteudo,
  type TipoQuestao,
} from "@/lib/questoes/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { professorDoConector } from "./professor";

const resultado = (dados: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(dados, null, 2) }],
});
const falha = (mensagem: string) => ({ content: [{ type: "text" as const, text: mensagem }], isError: true });

const dataHora = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use AAAA-MM-DDTHH:MM")
  .describe("Horário de Brasília, formato AAAA-MM-DDTHH:MM");

const schemaQuestao = z.object({
  tipo: z.enum(TIPOS),
  enunciado: z.string().describe("Curto: o aluno tem 40 a 60 segundos."),
  capitulo: z.string().describe("Use o mesmo nome do capítulo cadastrado na temporada (veja listar_turmas)."),
  habilidades: z.array(z.string()).describe(`Use só nomes desta lista: ${HABILIDADES.join(", ")}.`),
  dificuldade: z.number().int().min(1).max(3).describe("1 fácil, 2 média, 3 difícil"),
  explicacao: z.string().describe("1 ou 2 frases: por que a resposta certa é certa. Aparece no gabarito."),
  fonte: z.string().optional().describe("Origem do texto ou da imagem citada, se houver."),
  tempo_limite_s: z
    .number()
    .int()
    .min(TEMPO_MIN_S)
    .max(TEMPO_MAX_S)
    .optional()
    .describe("Padrão: 40 s na múltipla escolha e 60 s nos outros tipos."),
  alternativas: z.array(z.string()).optional().describe("multipla_escolha: 4 ou 5 alternativas."),
  correta: z.number().int().optional().describe("multipla_escolha: índice da alternativa correta, a partir de 0."),
  afirmativas: z
    .array(z.object({ texto: z.string(), verdadeira: z.boolean() }))
    .optional()
    .describe("vf_bloco: 3 a 6 afirmativas, com ao menos uma verdadeira e uma falsa."),
  eventos: z
    .array(z.object({ texto: z.string(), data: z.string().optional() }))
    .optional()
    .describe("linha_do_tempo: 4 a 6 eventos na ordem cronológica correta. O texto não pode conter a data."),
  pares: z
    .array(z.object({ esquerda: z.string(), direita: z.string() }))
    .optional()
    .describe("pares: 3 a 6 pares; cada item da direita serve para um único item da esquerda."),
});

function conteudoBruto(q: z.infer<typeof schemaQuestao>) {
  switch (q.tipo) {
    case "multipla_escolha":
      return { alternativas: q.alternativas ?? [], correta: q.correta ?? -1 };
    case "vf_bloco":
      return { afirmativas: q.afirmativas ?? [] };
    case "linha_do_tempo":
      return { eventos: q.eventos ?? [] };
    case "pares":
      return { pares: q.pares ?? [] };
  }
}

export function registrarFerramentas(server: McpServer, origem: string) {
  server.registerTool(
    "listar_turmas",
    {
      title: "Listar escolas, turmas e temporadas",
      description:
        "Lista as escolas, turmas e temporadas do CaduQuest, com os capítulos de cada temporada e os desafios já criados. Use antes de criar questões (para usar o nome exato do capítulo) e antes de criar desafios (para obter o temporada_id).",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      const { data: escolas } = await db
        .from("escolas")
        .select(
          "nome, periodo, turmas(nome, serie, codigo, temporadas(id, nome, inicio, data_prova, capitulos, desafios(titulo, abre_em, fecha_em)))",
        )
        .eq("professor_id", professorId)
        .order("nome");
      return resultado({ escolas: escolas ?? [] });
    },
  );

  server.registerTool(
    "listar_questoes",
    {
      title: "Listar questões do banco",
      description:
        "Lista questões do banco do CaduQuest (id, tipo, capítulo, status, enunciado). Use para não repetir questões que já existem e para escolher as questões de um desafio, que precisam estar publicadas.",
      inputSchema: z.object({
        capitulo: z.string().optional(),
        status: z.enum(["rascunho", "publicada", "arquivada"]).optional(),
        tipo: z.enum(TIPOS).optional(),
        busca: z.string().optional().describe("Trecho do enunciado."),
        limite: z.number().int().min(1).max(200).optional().describe("Padrão 50."),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ capitulo, status, tipo, busca, limite }) => {
      const professorId = await professorDoConector();
      let consulta = criarClienteAdmin()
        .from("questoes")
        .select("id, tipo, capitulo, status, dificuldade, habilidades, enunciado")
        .eq("professor_id", professorId)
        .order("criado_em", { ascending: false })
        .limit(limite ?? 50);
      if (capitulo) consulta = consulta.ilike("capitulo", capitulo);
      if (status) consulta = consulta.eq("status", status);
      if (tipo) consulta = consulta.eq("tipo", tipo);
      if (busca) consulta = consulta.ilike("enunciado", `%${busca}%`);
      const { data, error } = await consulta;
      if (error) return falha("Não foi possível consultar o banco de questões.");
      return resultado({ total: data.length, questoes: data });
    },
  );

  server.registerTool(
    "adicionar_questoes",
    {
      title: "Adicionar questões ao banco",
      description: [
        "Grava questões no banco do CaduQuest. Por padrão entram como rascunho, para o professor revisar e publicar no app; só use publicar=true se o professor pedir.",
        `Tipos: ${TIPOS.map((t) => `${t} (${NOME_TIPO[t]})`).join(", ")}. Preencha só os campos do tipo da questão.`,
        "Questões inválidas são recusadas uma a uma, com o motivo, e as válidas são gravadas: corrija e reenvie só as recusadas.",
        "Antes de gravar, mostre as questões ao professor e grave só depois que ele aprovar.",
      ].join(" "),
      inputSchema: z.object({
        questoes: z.array(schemaQuestao).min(1).max(30),
        publicar: z.boolean().optional().describe("true publica direto, sem passar por rascunho."),
      }),
    },
    async ({ questoes, publicar }) => {
      const professorId = await professorDoConector();
      const permitidas = new Set<string>(HABILIDADES);
      const linhas = [];
      const recusadas: { posicao: number; enunciado: string; motivo: string }[] = [];

      for (const [i, q] of questoes.entries()) {
        const conteudo = validarConteudo(q.tipo, conteudoBruto(q));
        const motivo = !q.enunciado.trim()
          ? "Enunciado vazio."
          : !q.capitulo.trim()
            ? "Capítulo vazio."
            : !conteudo.success
              ? conteudo.error.issues[0].message
              : null;
        if (motivo || !conteudo.success) {
          recusadas.push({ posicao: i + 1, enunciado: q.enunciado.slice(0, 80), motivo: motivo ?? "" });
          continue;
        }
        linhas.push({
          professor_id: professorId,
          tipo: q.tipo,
          enunciado: q.enunciado.trim(),
          capitulo: q.capitulo.trim(),
          habilidades: q.habilidades.filter((h) => permitidas.has(h)),
          dificuldade: q.dificuldade,
          explicacao: q.explicacao.trim(),
          fonte: q.fonte?.trim() || null,
          tempo_limite_s: q.tempo_limite_s ?? TEMPO_PADRAO[q.tipo as TipoQuestao],
          conteudo: conteudo.data,
          status: publicar ? "publicada" : "rascunho",
          origem: "claude",
        });
      }

      let gravadas: { id: string; enunciado: string }[] = [];
      if (linhas.length) {
        const { data, error } = await criarClienteAdmin().from("questoes").insert(linhas).select("id, enunciado");
        if (error) return falha("Não foi possível gravar as questões. Nada foi salvo.");
        gravadas = data;
      }
      const capitulos = [...new Set(linhas.map((l) => l.capitulo))];
      return resultado({
        gravadas: gravadas.length,
        status: publicar ? "publicada" : "rascunho",
        questoes: gravadas,
        recusadas,
        revisar_em: capitulos.map(
          (c) =>
            `${origem}/professor/questoes?status=${publicar ? "publicada" : "rascunho"}&capitulo=${encodeURIComponent(c)}`,
        ),
      });
    },
  );

  server.registerTool(
    "criar_desafio",
    {
      title: "Criar desafio semanal",
      description:
        "Cria um desafio para uma temporada, com 5 a 15 questões publicadas, na ordem dada. Em duas etapas: chame primeiro com confirmar=false para validar e mostrar a prévia ao professor; só chame com confirmar=true depois que ele aprovar, porque o desafio fica visível aos alunos na abertura.",
      inputSchema: z.object({
        temporada_id: z.string().uuid(),
        titulo: z.string().min(1),
        abre_em: dataHora,
        fecha_em: dataHora,
        questoes: z.array(z.string().uuid()).min(5).max(15).describe("ids de questões publicadas"),
        pontos_por_acerto: z.number().int().min(1).max(100).optional().describe("Padrão 10."),
        tempo_por_questao_s: z
          .number()
          .int()
          .min(TEMPO_MIN_S)
          .max(TEMPO_MAX_S)
          .optional()
          .describe("Tempo único para todas as questões, em segundos. Omita para usar o tempo de cada questão."),
        saida_zera_questao: z
          .boolean()
          .optional()
          .describe(
            "true: sair da tela (trocar de aba ou de app) durante uma questão faz ela valer zero. Padrão false.",
          ),
        confirmar: z.boolean(),
      }),
    },
    async (args) => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      const abre = dataHoraLocalParaIso(args.abre_em);
      const fecha = dataHoraLocalParaIso(args.fecha_em);
      if (fecha <= abre) return falha("O fechamento deve ser depois da abertura.");
      if (new Set(args.questoes).size !== args.questoes.length) return falha("Há questões repetidas na lista.");

      const { data: temporada } = await db
        .from("temporadas")
        .select("id, nome, turmas(nome)")
        .eq("id", args.temporada_id)
        .eq("professor_id", professorId)
        .maybeSingle();
      if (!temporada) return falha("Temporada não encontrada. Use listar_turmas para obter o id.");

      const { data: encontradas } = await db
        .from("questoes")
        .select("id, status, enunciado")
        .in("id", args.questoes)
        .eq("professor_id", professorId);
      const porId = new Map((encontradas ?? []).map((q) => [q.id, q]));
      const problemas = args.questoes.flatMap((id) => {
        const q = porId.get(id);
        if (!q) return [`${id}: não existe`];
        if (q.status !== "publicada") return [`${id}: está como ${q.status}, publique antes`];
        return [];
      });
      if (problemas.length) return falha(`Questões inválidas:\n${problemas.join("\n")}`);

      const previa = {
        temporada: temporada.nome,
        titulo: args.titulo,
        abre: formatarDataHora(abre),
        fecha: formatarDataHora(fecha),
        pontos_por_acerto: args.pontos_por_acerto ?? 10,
        tempo_por_questao: args.tempo_por_questao_s ? `${args.tempo_por_questao_s} s em todas` : "o de cada questão",
        sair_da_tela_zera: args.saida_zera_questao ?? false,
        questoes: args.questoes.map((id, i) => `${i + 1}. ${porId.get(id)!.enunciado}`),
      };
      if (!args.confirmar) return resultado({ previa, proximo_passo: "Mostre a prévia e confirme com o professor." });

      const { data: desafio, error } = await db
        .from("desafios")
        .insert({
          professor_id: professorId,
          temporada_id: args.temporada_id,
          titulo: args.titulo.trim(),
          abre_em: abre,
          fecha_em: fecha,
          pontos_por_acerto: args.pontos_por_acerto ?? 10,
          tempo_por_questao_s: args.tempo_por_questao_s ?? null,
          saida_zera_questao: args.saida_zera_questao ?? false,
        })
        .select("id")
        .single();
      if (error || !desafio) return falha("Não foi possível criar o desafio.");
      const { error: erroQuestoes } = await db
        .from("desafio_questoes")
        .insert(args.questoes.map((questao_id, posicao) => ({ desafio_id: desafio.id, questao_id, posicao })));
      if (erroQuestoes) {
        await db.from("desafios").delete().eq("id", desafio.id);
        return falha("Não foi possível salvar as questões do desafio. Nada foi criado.");
      }
      return resultado({ criado: previa, ver_em: `${origem}/professor/desafios/${desafio.id}` });
    },
  );
}

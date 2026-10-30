import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { gerarCodigoDia, PONTOS_RELAMPAGO } from "@/lib/cadurush";
import { dataHoraLocalParaIso, formatarData, formatarDataHora } from "@/lib/datas";
import { cartasDaTurma } from "@/lib/carta-coringa";
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
import { guardarImagemDaUrl } from "./imagem";
import { professorDoConector } from "./professor";

const resultado = (dados: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(dados, null, 2) }],
});
const falha = (mensagem: string) => ({ content: [{ type: "text" as const, text: mensagem }], isError: true });

const dataHora = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use AAAA-MM-DDTHH:MM")
  .describe("Horário de Brasília, formato AAAA-MM-DDTHH:MM");

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD")
  .describe("Data no formato AAAA-MM-DD");

const schemaQuestao = z.object({
  tipo: z.enum(TIPOS),
  enunciado: z.string().describe("Curto: o aluno tem 40 a 60 segundos."),
  capitulo: z.string().describe("Use o mesmo nome do capítulo cadastrado na temporada (veja listar_turmas)."),
  habilidades: z.array(z.string()).describe(`Use só nomes desta lista: ${HABILIDADES.join(", ")}.`),
  dificuldade: z.number().int().min(1).max(3).describe("1 fácil, 2 média, 3 difícil"),
  explicacao: z
    .string()
    .describe(
      "Aparece no gabarito depois que o desafio fecha. 2 a 4 frases: por que a resposta certa é certa e, na múltipla escolha, o erro de cada distrator (ex.: 'A) ... B) ...').",
    ),
  fonte: z.string().optional().describe("Origem do texto ou da imagem citada, se houver."),
  imagem_url: z
    .string()
    .optional()
    .describe(
      "Link https direto de uma imagem pública (PNG, JPG, WEBP ou GIF, até 2 MB), como uma pintura, charge, foto ou mapa da Wikimedia Commons (use a miniatura de 800 px: upload.wikimedia.org/.../thumb/.../800px-...). O app baixa e guarda a imagem; ela aparece acima do enunciado.",
    ),
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
  fonte_primaria: z
    .object({
      documento: z
        .string()
        .optional()
        .describe(
          "Trecho fiel da fonte (carta, lei, jornal, relato), até 2.500 caracteres. Vazio se a fonte for a imagem.",
        ),
      perguntas: z.array(
        z.object({
          pergunta: z.string(),
          alternativas: z.array(z.string()),
          correta: z.number().int().describe("Índice da alternativa correta, a partir de 0."),
        }),
      ),
    })
    .optional()
    .describe(
      "fonte_primaria: um documento (texto em documento e/ou imagem em imagem_url) e 2 ou 3 perguntas de 3 ou 4 alternativas, como 'De quando é?', 'Quem a produziu?' e 'Qual a intenção de quem a produziu?'. Crédito parcial por pergunta. Ponha a referência da fonte em fonte.",
    ),
  causa_consequencia: z
    .object({
      relacoes: z.array(z.object({ causa: z.string(), consequencia: z.string() })),
      extras: z.array(z.string()).optional(),
    })
    .optional()
    .describe(
      "causa_consequencia: 3 a 5 relações causa → consequência do mesmo processo, e até 2 consequências extras plausíveis do período que não decorrem de nenhuma das causas. Crédito parcial por relação.",
    ),
  encontrar_erro: z
    .object({
      trechos: z.array(
        z.object({
          texto: z.string(),
          errado: z.boolean(),
          correcao: z.string().optional().describe("Obrigatória nos trechos errados: o texto certo."),
        }),
      ),
    })
    .optional()
    .describe(
      "encontrar_erro: um parágrafo dividido em 4 a 10 trechos (frases ou orações), na ordem, com 1 a 3 trechos errados e ao menos 3 certos. Erros sutis: data, autor, lugar ou conceito de período vizinho, anacronismo, causa trocada. O aluno sabe quantos erros há. Crédito parcial por erro achado.",
    ),
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
    default:
      // Tipos novos: o campo com o nome do tipo já vem no formato gravado.
      return q[q.tipo] ?? {};
  }
}

export function registrarFerramentas(server: McpServer, origem: string) {
  server.registerTool(
    "listar_turmas",
    {
      title: "Listar escolas, turmas e temporadas",
      description:
        "Lista as escolas, turmas e temporadas do CaduQuest, com os capítulos de cada temporada e os desafios já criados. Use antes de criar questões (para usar o nome exato do capítulo), antes de criar temporadas (turma_id) e antes de criar ou editar desafios (temporada_id, desafio id). Também traz, em cartas_coringa, os temas que os campeões da última temporada escolheram para a próxima prova: quando o professor pedir a prova, inclua uma questão sobre cada tema e avise que ela é a carta coringa.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      const { data: escolas } = await db
        .from("escolas")
        .select(
          "nome, periodo, turmas(id, nome, serie, codigo, temporadas(id, nome, inicio, data_prova, capitulos, desafios(id, tipo, codigo_dia, titulo, abre_em, fecha_em)))",
        )
        .eq("professor_id", professorId)
        .order("nome");
      const turmas = (escolas ?? []).flatMap((e) => (e.turmas ?? []) as { id: string; nome: string }[]);
      const cartas = (
        await Promise.all(
          turmas.map(async (t) =>
            (await cartasDaTurma(db, t.id)).map((c) => ({
              turma: t.nome,
              aluno: c.apelido,
              temporada_vencida: c.temporadaNome,
              tema: c.tema,
            })),
          ),
        )
      ).flat();
      return resultado({ escolas: escolas ?? [], cartas_coringa: cartas });
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
        "Varie os formatos dentro do lote. fonte_primaria, causa_consequencia e encontrar_erro treinam as habilidades mais cobradas na prova: inclua ao menos uma de cada quando o capítulo permitir.",
        "Distratores de alto nível em todos os tipos: plausíveis, do mesmo período e baseados em confusões reais de alunos.",
        "Antes de gravar, mostre as questões ao professor e grave só depois que ele aprovar.",
        "Sempre envie junto, em curiosidades, 2 a 4 curiosidades históricas curtas e verdadeiras sobre os capítulos do lote, sem o professor precisar pedir: elas viram a Curiosidade do dia na tela dos alunos.",
      ].join(" "),
      inputSchema: z.object({
        questoes: z.array(schemaQuestao).min(1).max(30),
        publicar: z.boolean().optional().describe("true publica direto, sem passar por rascunho."),
        curiosidades: z
          .array(
            z.object({
              capitulo: z.string().describe("Mesmo nome do capítulo das questões."),
              texto: z.string().min(10).max(500).describe("1 ou 2 frases, fato verificável, linguagem do aluno."),
            }),
          )
          .max(10)
          .optional()
          .describe("Curiosidades do dia ligadas aos capítulos do lote."),
      }),
    },
    async ({ questoes, publicar, curiosidades }) => {
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
        const semTrechoCorrigido =
          conteudo.success &&
          q.tipo === "encontrar_erro" &&
          (conteudo.data as { trechos: { errado: boolean; correcao?: string }[] }).trechos.some(
            (t) => t.errado && !t.correcao?.trim(),
          );
        const imagem = !motivo && q.imagem_url ? await guardarImagemDaUrl(q.imagem_url, professorId) : null;
        const motivoFinal =
          motivo ??
          (semTrechoCorrigido ? "Escreva a correção de cada trecho errado." : null) ??
          (imagem && "erro" in imagem ? imagem.erro : null) ??
          (q.tipo === "fonte_primaria" && !imagem && !(conteudo.data as { documento: string }).documento
            ? "Fonte primária sem documento: envie o trecho em documento ou a imagem em imagem_url."
            : null);
        if (motivoFinal || !conteudo.success) {
          recusadas.push({ posicao: i + 1, enunciado: q.enunciado.slice(0, 80), motivo: motivoFinal ?? "" });
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
          imagem_path: imagem && "caminho" in imagem ? imagem.caminho : null,
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
      let curiosidadesGravadas = 0;
      const novasCuriosidades = (curiosidades ?? [])
        .map((c) => ({ professor_id: professorId, capitulo: c.capitulo.trim() || null, texto: c.texto.trim() }))
        .filter((c) => c.texto.length >= 10);
      if (novasCuriosidades.length) {
        const { error } = await criarClienteAdmin().from("curiosidades").insert(novasCuriosidades);
        if (!error) curiosidadesGravadas = novasCuriosidades.length;
      }
      const capitulos = [...new Set(linhas.map((l) => l.capitulo))];
      return resultado({
        gravadas: gravadas.length,
        curiosidades_gravadas: curiosidadesGravadas,
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
      title: "Criar desafio (semanal ou CaduRush)",
      description:
        "Cria um desafio para uma temporada, com 5 a 15 questões publicadas, na ordem dada. tipo='relampago' cria um CaduRush (feito em sala, peso 3, liberado com um código do dia que o app gera; abre_em/fecha_em = horário da aula). Em duas etapas: chame primeiro com confirmar=false para validar e mostrar a prévia ao professor; só chame com confirmar=true depois que ele aprovar, porque o desafio fica visível aos alunos na abertura.",
      inputSchema: z.object({
        temporada_id: z.string().uuid(),
        tipo: z
          .enum(["semanal", "relampago"])
          .optional()
          .describe("semanal (em casa, padrão) ou relampago (CaduRush, em sala)."),
        titulo: z.string().min(1),
        abre_em: dataHora,
        fecha_em: dataHora,
        questoes: z.array(z.string().uuid()).min(5).max(15).describe("ids de questões publicadas"),
        pontos_por_acerto: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Padrão 10 no semanal e 30 no CaduRush."),
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

      const relampago = args.tipo === "relampago";
      const pontos = args.pontos_por_acerto ?? (relampago ? PONTOS_RELAMPAGO : 10);
      const previa = {
        temporada: temporada.nome,
        tipo: relampago ? "CaduRush (em sala, com código do dia)" : "semanal",
        titulo: args.titulo,
        abre: formatarDataHora(abre),
        fecha: formatarDataHora(fecha),
        pontos_por_acerto: pontos,
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
          tipo: relampago ? "relampago" : "semanal",
          codigo_dia: relampago ? gerarCodigoDia() : null,
          titulo: args.titulo.trim(),
          abre_em: abre,
          fecha_em: fecha,
          pontos_por_acerto: pontos,
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
      return resultado({
        criado: previa,
        ver_em: `${origem}/professor/desafios/${desafio.id}`,
        ...(relampago && { aviso: "O código do dia aparece na página do desafio, junto do botão Liberar agora." }),
      });
    },
  );
  server.registerTool(
    "criar_temporada",
    {
      title: "Criar temporada",
      description:
        "Cria uma temporada (o período de revisão de uma turma, que termina na prova). Em duas etapas: chame primeiro com confirmar=false e mostre a prévia ao professor; só chame com confirmar=true depois que ele aprovar. Pegue o turma_id em listar_turmas.",
      inputSchema: z.object({
        turma_id: z.string().uuid(),
        nome: z.string().min(1).max(120).describe('Ex.: "1º trimestre: Brasil Colônia".'),
        inicio: data,
        data_prova: data.describe("Dia da prova, que encerra a temporada (AAAA-MM-DD)."),
        capitulos: z
          .array(z.string().min(1).max(200))
          .max(30)
          .describe("Capítulos ou conteúdos da temporada; as questões usam estes nomes."),
        narrativa: z.string().max(2000).optional().describe("Texto opcional de abertura que os alunos veem."),
        confirmar: z.boolean(),
      }),
    },
    async (args) => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      if (args.data_prova < args.inicio) return falha("A data da prova deve ser depois do início.");
      const { data: turma } = await db
        .from("turmas")
        .select("id, nome, escolas!inner(nome, professor_id), temporadas(nome, inicio, data_prova)")
        .eq("id", args.turma_id)
        .eq("escolas.professor_id", professorId)
        .maybeSingle();
      if (!turma) return falha("Turma não encontrada. Use listar_turmas para obter o turma_id.");

      const escola = turma.escolas as unknown as { nome: string };
      const sobrepostas = ((turma.temporadas ?? []) as { nome: string; inicio: string; data_prova: string }[])
        .filter((t) => t.inicio <= args.data_prova && args.inicio <= t.data_prova)
        .map((t) => `${t.nome} (${formatarData(t.inicio)} a ${formatarData(t.data_prova)})`);
      const capitulos = [...new Set(args.capitulos.map((c) => c.trim()).filter(Boolean))];
      const previa = {
        turma: `${turma.nome} · ${escola.nome}`,
        nome: args.nome.trim(),
        inicio: formatarData(args.inicio),
        prova: formatarData(args.data_prova),
        capitulos,
        narrativa: args.narrativa?.trim() || null,
        ...(sobrepostas.length && {
          aviso: `Esta turma já tem temporada no mesmo período: ${sobrepostas.join("; ")}.`,
        }),
      };
      if (!args.confirmar) return resultado({ previa, proximo_passo: "Mostre a prévia e confirme com o professor." });

      const { data: temporada, error } = await db
        .from("temporadas")
        .insert({
          professor_id: professorId,
          turma_id: args.turma_id,
          nome: previa.nome,
          inicio: args.inicio,
          data_prova: args.data_prova,
          capitulos,
          narrativa: previa.narrativa,
        })
        .select("id")
        .single();
      if (error || !temporada) return falha("Não foi possível criar a temporada.");
      return resultado({
        criada: previa,
        temporada_id: temporada.id,
        ver_em: `${origem}/professor/temporadas/${temporada.id}`,
      });
    },
  );

  server.registerTool(
    "editar_temporada",
    {
      title: "Editar temporada",
      description:
        "Altera nome, datas, capítulos ou narrativa de uma temporada. Só os campos enviados mudam; capitulos substitui a lista inteira. Em duas etapas: confirmar=false mostra o antes e depois; confirmar=true grava, só depois da aprovação do professor.",
      inputSchema: z.object({
        temporada_id: z.string().uuid(),
        nome: z.string().min(1).max(120).optional(),
        inicio: data.optional(),
        data_prova: data.optional(),
        capitulos: z.array(z.string().min(1).max(200)).max(30).optional(),
        narrativa: z.string().max(2000).optional().describe('Envie "" para apagar.'),
        confirmar: z.boolean(),
      }),
    },
    async (args) => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      const { data: atual } = await db
        .from("temporadas")
        .select("id, nome, inicio, data_prova, capitulos, narrativa")
        .eq("id", args.temporada_id)
        .eq("professor_id", professorId)
        .maybeSingle();
      if (!atual) return falha("Temporada não encontrada. Use listar_turmas para obter o id.");

      const novo = {
        nome: args.nome?.trim() ?? atual.nome,
        inicio: args.inicio ?? atual.inicio,
        data_prova: args.data_prova ?? atual.data_prova,
        capitulos: args.capitulos ? [...new Set(args.capitulos.map((c) => c.trim()).filter(Boolean))] : atual.capitulos,
        narrativa: args.narrativa === undefined ? atual.narrativa : args.narrativa.trim() || null,
      };
      if (novo.data_prova < novo.inicio) return falha("A data da prova deve ser depois do início.");
      const resumo = (t: typeof novo) => ({
        nome: t.nome,
        inicio: formatarData(t.inicio),
        prova: formatarData(t.data_prova),
        capitulos: t.capitulos,
        narrativa: t.narrativa,
      });
      const previa = { antes: resumo(atual), depois: resumo(novo) };
      if (!args.confirmar) return resultado({ previa, proximo_passo: "Mostre a prévia e confirme com o professor." });

      const { error } = await db.from("temporadas").update(novo).eq("id", atual.id);
      if (error) return falha("Não foi possível salvar a temporada.");
      return resultado({ salvo: previa.depois, ver_em: `${origem}/professor/temporadas/${atual.id}` });
    },
  );

  server.registerTool(
    "editar_desafio",
    {
      title: "Editar desafio",
      description:
        "Altera título, datas, pontos, tempo por questão, regra de saída de tela ou as questões de um desafio. Só os campos enviados mudam. As questões só podem ser trocadas enquanto nenhum aluno tiver começado o desafio. Em duas etapas: confirmar=false mostra o antes e depois; confirmar=true grava, só depois da aprovação do professor.",
      inputSchema: z.object({
        desafio_id: z.string().uuid(),
        titulo: z.string().min(1).optional(),
        abre_em: dataHora.optional(),
        fecha_em: dataHora.optional(),
        pontos_por_acerto: z.number().int().min(1).max(100).optional(),
        tempo_por_questao_s: z
          .number()
          .int()
          .min(0)
          .max(TEMPO_MAX_S)
          .optional()
          .describe(`Segundos (${TEMPO_MIN_S} a ${TEMPO_MAX_S}); 0 volta a usar o tempo de cada questão.`),
        saida_zera_questao: z.boolean().optional(),
        questoes: z
          .array(z.string().uuid())
          .min(5)
          .max(15)
          .optional()
          .describe("Nova lista completa de questões publicadas, na ordem."),
        confirmar: z.boolean(),
      }),
    },
    async (args) => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      const { data: atual } = await db
        .from("desafios")
        .select(
          "id, titulo, abre_em, fecha_em, pontos_por_acerto, tempo_por_questao_s, saida_zera_questao, desafio_questoes(posicao, questoes(id, enunciado))",
        )
        .eq("id", args.desafio_id)
        .eq("professor_id", professorId)
        .maybeSingle();
      if (!atual) return falha("Desafio não encontrado. Use listar_turmas para obter o id.");
      if (args.tempo_por_questao_s && args.tempo_por_questao_s < TEMPO_MIN_S) {
        return falha(
          `O tempo por questão vai de ${TEMPO_MIN_S} a ${TEMPO_MAX_S} s (ou 0 para o tempo de cada questão).`,
        );
      }

      const questoesAtuais = (
        (atual.desafio_questoes ?? []) as unknown as {
          posicao: number;
          questoes: { id: string; enunciado: string };
        }[]
      )
        .sort((a, b) => a.posicao - b.posicao)
        .map((dq) => dq.questoes);
      let novasQuestoes = questoesAtuais;
      if (args.questoes) {
        const { count } = await db
          .from("tentativas")
          .select("id", { count: "exact", head: true })
          .eq("desafio_id", atual.id);
        if (count)
          return falha(`${count} aluno(s) já começaram este desafio; as questões não podem mais ser trocadas.`);
        if (new Set(args.questoes).size !== args.questoes.length) return falha("Há questões repetidas na lista.");
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
        novasQuestoes = args.questoes.map((id) => porId.get(id)!);
      }

      const novo = {
        titulo: args.titulo?.trim() ?? atual.titulo,
        abre_em: args.abre_em ? dataHoraLocalParaIso(args.abre_em) : atual.abre_em,
        fecha_em: args.fecha_em ? dataHoraLocalParaIso(args.fecha_em) : atual.fecha_em,
        pontos_por_acerto: args.pontos_por_acerto ?? atual.pontos_por_acerto,
        tempo_por_questao_s:
          args.tempo_por_questao_s === undefined ? atual.tempo_por_questao_s : args.tempo_por_questao_s || null,
        saida_zera_questao: args.saida_zera_questao ?? atual.saida_zera_questao,
      };
      if (new Date(novo.fecha_em) <= new Date(novo.abre_em)) return falha("O fechamento deve ser depois da abertura.");
      const resumo = (d: typeof novo, qs: { enunciado: string }[]) => ({
        titulo: d.titulo,
        abre: formatarDataHora(d.abre_em),
        fecha: formatarDataHora(d.fecha_em),
        pontos_por_acerto: d.pontos_por_acerto,
        tempo_por_questao: d.tempo_por_questao_s ? `${d.tempo_por_questao_s} s em todas` : "o de cada questão",
        sair_da_tela_zera: d.saida_zera_questao,
        questoes: qs.map((q, i) => `${i + 1}. ${q.enunciado}`),
      });
      const previa = { antes: resumo(atual, questoesAtuais), depois: resumo(novo, novasQuestoes) };
      if (!args.confirmar) return resultado({ previa, proximo_passo: "Mostre a prévia e confirme com o professor." });

      const { error } = await db.from("desafios").update(novo).eq("id", atual.id);
      if (error) return falha("Não foi possível salvar o desafio.");
      if (args.questoes) {
        await db.from("desafio_questoes").delete().eq("desafio_id", atual.id);
        const { error: erroQuestoes } = await db
          .from("desafio_questoes")
          .insert(args.questoes.map((questao_id, posicao) => ({ desafio_id: atual.id, questao_id, posicao })));
        if (erroQuestoes) {
          await db
            .from("desafio_questoes")
            .insert(questoesAtuais.map((q, posicao) => ({ desafio_id: atual.id, questao_id: q.id, posicao })));
          return falha("Não foi possível trocar as questões; as anteriores foram mantidas.");
        }
      }
      return resultado({ salvo: previa.depois, ver_em: `${origem}/professor/desafios/${atual.id}` });
    },
  );
}

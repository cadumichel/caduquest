import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { gerarCodigoDia, PONTOS_RELAMPAGO } from "@/lib/cadurush";
import { dataHoraLocalParaIso, formatarData, formatarDataHora } from "@/lib/datas";
import { cartasDaTurma } from "@/lib/carta-coringa";
import { HABILIDADES } from "@/lib/habilidades";
import { ERA_IDS, ERAS, eraPorId, QUESTOES_FINAIS, QUESTOES_POR_PARTIDA } from "@/lib/publico/regras";
import {
  LIMITE_ENUNCIADO,
  LIMITE_ITEM,
  LIMITE_TOTAL,
  problemasRelampago,
  RELAMPAGO_MAX_S,
  RELAMPAGO_MIN_S,
  sugerirTempoRelampago,
  TIPOS_RELAMPAGO,
} from "@/lib/questoes/relampago";
import {
  NOME_TIPO,
  TEMPO_MAX_S,
  TEMPO_MIN_S,
  TEMPO_PADRAO,
  TIPOS,
  validarConteudo,
  type Conteudo,
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
  capitulo: z
    .string()
    .describe(
      "Use o mesmo nome do capítulo cadastrado na temporada (veja listar_turmas). Em questão do desafio público pode ficar vazio: vale o nome da era.",
    ),
  era_publica: z
    .enum(ERA_IDS)
    .optional()
    .describe(
      `Põe a questão no banco do desafio público (aberto a qualquer pessoa) daquela era: ${ERAS.map((e) => `${e.id} (${e.nome})`).join(", ")}. Omita nas questões das turmas.`,
    ),
  habilidades: z.array(z.string()).describe(`Use só nomes desta lista: ${HABILIDADES.join(", ")}.`),
  dificuldade: z.number().int().min(1).max(3).describe("1 fácil, 2 média, 3 difícil"),
  explicacao: z
    .string()
    .describe(
      "Aparece no gabarito depois que o desafio fecha. 2 a 4 frases: por que a resposta certa é certa e, na múltipla escolha, o erro de cada distrator (ex.: 'A) ... B) ...').",
    ),
  dica: z
    .string()
    .max(300)
    .describe(
      "Dica que o aluno pode abrir durante o desafio (ele tem só 3 por temporada). 1 frase curta que puxa o raciocínio certo (um contexto, uma pista de época ou de causa) sem entregar a resposta nem eliminar alternativas diretamente.",
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
    .describe(
      `Padrão: 40 s na múltipla escolha e 60 s nos outros tipos. Na relâmpago, ${RELAMPAGO_MIN_S} a ${RELAMPAGO_MAX_S} s; omita para usar o tempo sugerido pelo app.`,
    ),
  relampago: z
    .boolean()
    .optional()
    .describe(
      `Questão relâmpago: pergunta direta, sem texto motivador (nada de 'Leia o texto…' nem citação longa), para responder em ${RELAMPAGO_MIN_S} a ${RELAMPAGO_MAX_S} s. Só nos tipos ${TIPOS_RELAMPAGO.join(", ")} (vf_bloco com até 4 afirmativas). Enunciado de até ${LIMITE_ENUNCIADO} caracteres num parágrafo, cada item até ${LIMITE_ITEM} e tudo somado até ${LIMITE_TOTAL}. O aluno vê um destaque de relâmpago.`,
    ),
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
  completar_lacunas: z
    .object({
      texto: z.string().describe("Texto com ___ (três sublinhados) no lugar de cada palavra que falta."),
      lacunas: z.array(z.string()).describe("Respostas de cada ___, na ordem do texto."),
      extras: z
        .array(z.string())
        .optional()
        .describe("Até 3 palavras do mesmo campo que não servem em nenhuma lacuna."),
    })
    .optional()
    .describe(
      "completar_lacunas: texto de até 1.500 caracteres com 1 a 5 lacunas; o aluno monta com um banco de palavras (respostas + extras embaralhadas). Prefira conceitos-chave a datas soltas. Crédito parcial por lacuna.",
    ),
  ordenar_frases: z
    .object({ frases: z.array(z.string()).describe("Na ordem correta.") })
    .optional()
    .describe(
      "ordenar_frases: 3 a 6 frases que só fazem sentido numa ordem (etapas de um processo, encadeamento causal, argumento). Para ordem cronológica de eventos use linha_do_tempo. Crédito parcial por posição.",
    ),
  interpretacao: z
    .object({
      texto: z.string().describe("Texto-base: trecho de fonte, historiador ou descrição de charge."),
      alternativas: z.array(z.string()),
      correta: z.number().int().describe("Índice da interpretação correta, a partir de 0."),
    })
    .optional()
    .describe(
      "interpretacao: texto-base de até 2.500 caracteres e 4 ou 5 interpretações; só uma é sustentada pelo texto. Distratores: leitura literal, extrapolação, anacronismo, inversão do sentido.",
    ),
  quem_disse: z
    .object({
      citacao: z.string().describe("Citação curta e real, sem o nome de quem disse."),
      autores: z.array(z.string()).describe("4 ou 5 personagens ou grupos sociais do mesmo período."),
      correta: z.number().int().describe("Índice de quem disse, a partir de 0."),
    })
    .optional()
    .describe(
      "quem_disse: citação real e curta; as outras opções devem ser personagens ou grupos que poderiam plausivelmente dizê-la.",
    ),
  classificar: z
    .object({
      grupos: z.array(z.string()).describe("2 ou 3 nomes de grupo, ex.: ['Absolutismo', 'Iluminismo']."),
      itens: z.array(
        z.object({ texto: z.string(), grupo: z.number().int().describe("Índice do grupo, a partir de 0.") }),
      ),
    })
    .optional()
    .describe(
      "classificar: 4 a 8 itens curtos para o aluno pôr em cada grupo, com ao menos um item por grupo. Prefira itens que exigem entender o conceito (ideias, práticas, medidas), não só nomes. Crédito parcial por item.",
    ),
  intruso: z
    .object({
      itens: z.array(z.string()),
      intruso: z.number().int().describe("Índice do item que não pertence ao grupo, a partir de 0."),
      criterio: z.string().describe("O que os outros itens têm em comum; aparece no gabarito."),
    })
    .optional()
    .describe(
      "intruso: 4 ou 5 itens; o intruso deve parecer pertencer (mesmo período ou tema) e só sair pelo critério conceitual.",
    ),
  ponto_de_vista: z
    .object({
      relatos: z.array(
        z.object({
          texto: z.string().describe("Relato do mesmo fato, até 800 caracteres, sem dizer quem fala."),
          perspectiva: z.string().describe("Quem fala ou de que lugar social, ex.: 'Jesuíta', 'Senhor de engenho'."),
        }),
      ),
      extras: z
        .array(z.string())
        .optional()
        .describe("Até 2 perspectivas plausíveis que não correspondem a nenhum relato."),
    })
    .optional()
    .describe(
      "ponto_de_vista: 2 ou 3 relatos do mesmo fato histórico, de perspectivas diferentes; o aluno identifica a de cada um. Crédito parcial por relato.",
    ),
  linha_do_tempo_datas: z
    .object({
      inicio: z.number().int().describe("Ano inicial da régua (negativo para a.C.)."),
      fim: z.number().int().describe("Ano final da régua (exclusivo)."),
      passo: z.number().int().describe("Tamanho de cada faixa em anos: a régua precisa ter 3 a 8 faixas."),
      eventos: z.array(z.object({ texto: z.string().describe("Sem a data."), ano: z.number().int() })),
    })
    .optional()
    .describe(
      "linha_do_tempo_datas: régua dividida em faixas (ex.: 1500 a 1900, de 50 em 50) e 3 a 6 eventos; o aluno põe cada evento na faixa certa. Faixa vizinha vale meio ponto.",
    ),
  mapa: z
    .object({
      marcadores: z.array(
        z.object({
          nome: z.string().describe("Lugar que o aluno vai localizar."),
          x: z.number().optional().describe("Posição em % da largura (0 a 100), se você souber com segurança."),
          y: z.number().optional().describe("Posição em % da altura (0 a 100), se você souber com segurança."),
        }),
      ),
    })
    .optional()
    .describe(
      "mapa: exige imagem_url com o mapa (sem os nomes escritos nos lugares cobrados) e 2 a 6 marcadores. Se não souber as posições, omita x e y: a questão entra como rascunho e o professor toca no mapa, no app, para pôr os pinos no lugar. Avise o professor disso.",
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
    case "mapa":
      // A imagem e a marca "posicionar" entram depois da validação.
      return {
        imagem: "-",
        marcadores: (q.mapa?.marcadores ?? []).map((m, i) =>
          m.x === undefined || m.y === undefined
            ? { nome: m.nome, x: 10 + i * 15, y: 92 } // em fila no rodapé, esperando o professor
            : m,
        ),
      };
    default:
      // Tipos novos: o campo com o nome do tipo já vem no formato gravado.
      return q[q.tipo] ?? {};
  }
}

/** Tempo da relâmpago (o pedido ou o sugerido pelo app) e o que a impede de ser relâmpago. */
function avaliarRelampago(q: z.infer<typeof schemaQuestao>, conteudo: unknown) {
  const c = { tipo: q.tipo, conteudo } as Conteudo;
  const sugerido = sugerirTempoRelampago(q.enunciado, c, Boolean(q.imagem_url));
  const tempo = q.tempo_limite_s ?? sugerido;
  return { tempo, sugerido, problemas: problemasRelampago(q.enunciado, c, tempo) };
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
        relampago: z.boolean().optional().describe("true lista só as questões relâmpago."),
        era_publica: z.enum(ERA_IDS).optional().describe("Lista só as questões do desafio público desta era."),
        limite: z.number().int().min(1).max(200).optional().describe("Padrão 50."),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ capitulo, status, tipo, busca, relampago, era_publica, limite }) => {
      const professorId = await professorDoConector();
      let consulta = criarClienteAdmin()
        .from("questoes")
        .select("*")
        .eq("professor_id", professorId)
        .order("criado_em", { ascending: false })
        .limit(limite ?? 50);
      if (capitulo) consulta = consulta.ilike("capitulo", capitulo);
      if (status) consulta = consulta.eq("status", status);
      if (tipo) consulta = consulta.eq("tipo", tipo);
      if (busca) consulta = consulta.ilike("enunciado", `%${busca}%`);
      if (relampago !== undefined) consulta = consulta.eq("relampago", relampago);
      if (era_publica) consulta = consulta.eq("era_publica", era_publica);
      const { data, error } = await consulta;
      if (error) return falha("Não foi possível consultar o banco de questões.");
      const questoes = data.map((q) => ({
        id: q.id,
        tipo: q.tipo,
        capitulo: q.capitulo,
        status: q.status,
        dificuldade: q.dificuldade,
        habilidades: q.habilidades,
        relampago: q.relampago,
        ...(q.era_publica && { era_publica: q.era_publica }),
        tempo_limite_s: q.tempo_limite_s,
        enunciado: q.enunciado,
      }));
      return resultado({ total: questoes.length, questoes });
    },
  );

  server.registerTool(
    "listar_desafios_publicos",
    {
      title: "Ver os desafios públicos",
      description: `Mostra, para cada era do desafio público (aberto a qualquer pessoa), quantas questões publicadas e em rascunho ela tem e quantas partidas já foram jogadas. Uma era só abre com ${QUESTOES_POR_PARTIDA} questões publicadas; o ideal é 30, para quem joga de novo pegar questões diferentes. Use antes de escrever questões públicas, para saber onde faltam.`,
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      const [{ data: qs, error }, { data: ps }] = await Promise.all([
        db
          .from("questoes")
          .select("era_publica, status, tipo")
          .eq("professor_id", professorId)
          .not("era_publica", "is", null),
        db.from("partidas_publicas").select("era, vale_ranking").not("concluida_em", "is", null).limit(50000),
      ]);
      if (error) return falha("Banco sem os desafios públicos: rode o SQL deles no Supabase.");
      return resultado({
        endereco: `${origem}/jogar`,
        eras: ERAS.map((e) => {
          const daEra = (qs ?? []).filter((q) => q.era_publica === e.id);
          const publicadas = daEra.filter((q) => q.status === "publicada");
          const partidas = (ps ?? []).filter((p) => p.era === e.id);
          return {
            era: e.id,
            nome: e.nome,
            aberta: publicadas.length >= QUESTOES_POR_PARTIDA,
            publicadas: publicadas.length,
            rascunhos: daEra.filter((q) => q.status === "rascunho").length,
            formatos: [...new Set(publicadas.map((q) => q.tipo))],
            partidas_ranking: partidas.filter((p) => p.vale_ranking).length,
            partidas_treino: partidas.filter((p) => !p.vale_ranking).length,
          };
        }),
      });
    },
  );

  server.registerTool(
    "definir_dicas",
    {
      title: "Escrever dicas em questões que já existem",
      description:
        "Grava (ou troca) a dica de questões que já estão no banco, pelo id (veja listar_questoes). Use para dar dica às questões antigas, criadas antes das dicas existirem. A dica é 1 frase curta que puxa o raciocínio certo sem entregar a resposta. Mostre as dicas ao professor e grave só depois que ele aprovar.",
      inputSchema: z.object({
        dicas: z
          .array(z.object({ id: z.string(), dica: z.string().min(5).max(300) }))
          .min(1)
          .max(100),
      }),
    },
    async ({ dicas }) => {
      const professorId = await professorDoConector();
      const db = criarClienteAdmin();
      const gravadas: string[] = [];
      const recusadas: { id: string; motivo: string }[] = [];
      for (const { id, dica } of dicas) {
        const { data, error } = await db
          .from("questoes")
          .update({ dica: dica.trim() })
          .eq("id", id)
          .eq("professor_id", professorId)
          .select("id");
        if (error) recusadas.push({ id, motivo: "Banco sem o campo de dica: rode o SQL das ajudas no Supabase." });
        else if (!data?.length) recusadas.push({ id, motivo: "Questão não encontrada." });
        else gravadas.push(id);
      }
      return resultado({ gravadas: gravadas.length, recusadas });
    },
  );

  server.registerTool(
    "checar_relampago",
    {
      title: "Checar questões relâmpago e sugerir o tempo",
      description: `Confere, sem gravar nada, se cada questão serve como relâmpago (direta, sem texto motivador, curta) e devolve o tempo que o app sugere pelo tamanho do texto (${RELAMPAGO_MIN_S} a ${RELAMPAGO_MAX_S} s). Use antes de mostrar questões relâmpago ao professor: reescreva as que tiverem problemas e mostre o tempo sugerido de cada uma para ele ajustar. Mesmos campos de adicionar_questoes.`,
      inputSchema: z.object({ questoes: z.array(schemaQuestao).min(1).max(30) }),
      annotations: { readOnlyHint: true },
    },
    async ({ questoes }) =>
      resultado(
        questoes.map((q, i) => {
          const conteudo = validarConteudo(q.tipo, conteudoBruto(q));
          if (!conteudo.success) {
            return { posicao: i + 1, ok: false, problemas: [conteudo.error.issues[0].message] };
          }
          const r = avaliarRelampago(q, conteudo.data);
          return {
            posicao: i + 1,
            enunciado: q.enunciado.slice(0, 80),
            ok: r.problemas.length === 0,
            tempo_sugerido_s: r.sugerido,
            ...(q.tempo_limite_s !== undefined && { tempo_pedido_s: q.tempo_limite_s }),
            problemas: r.problemas,
          };
        }),
      ),
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
        "Toda questão leva uma dica (campo dica), escrita junto com ela.",
        `Questões relâmpago (relampago=true): quando o professor pedir relâmpago, escreva perguntas diretas, sem texto motivador, e chame checar_relampago antes de mostrá-las: mostre o tempo sugerido pelo app (${RELAMPAGO_MIN_S} a ${RELAMPAGO_MAX_S} s) ao lado de cada uma para o professor ajustar, e grave com o tempo que ele aprovar (ou omita tempo_limite_s para usar o sugerido).`,
        `Desafio público (era_publica): questões abertas a qualquer pessoa, de todas as idades, alunos ou não. Cada partida sorteia ${QUESTOES_POR_PARTIDA} questões da era; as ${QUESTOES_FINAIS} últimas são a rodada final, sem consulta, e qualquer questão pode cair nela. Escreva questões contextuais e conceituais: a resposta nunca é um nome, uma data ou um número decorado, e sim a interpretação de um contexto, de uma fonte ou de um conceito, que alguém sem a apostila consiga raciocinar. Linguagem acessível, sem citar capítulos ou apostilas. Varie os formatos do lote (todos os tipos valem, menos mapa sem posições). Use listar_desafios_publicos para ver quantas questões cada era já tem (o ideal é 30 por era).`,
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
      const pinosPorPosicionar: number[] = [];

      for (const [i, q] of questoes.entries()) {
        const conteudo = validarConteudo(q.tipo, conteudoBruto(q));
        const capitulo = q.capitulo.trim() || (q.era_publica ? (eraPorId(q.era_publica)?.nome ?? "") : "");
        const motivo = !q.enunciado.trim()
          ? "Enunciado vazio."
          : !capitulo
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
        const relampago = q.relampago && conteudo.success ? avaliarRelampago(q, conteudo.data) : null;
        const motivoRelampago = relampago?.problemas[0] ?? null;
        const imagem =
          !motivo && !motivoRelampago && q.imagem_url ? await guardarImagemDaUrl(q.imagem_url, professorId) : null;
        const motivoFinal =
          motivo ??
          motivoRelampago ??
          (semTrechoCorrigido ? "Escreva a correção de cada trecho errado." : null) ??
          (imagem && "erro" in imagem ? imagem.erro : null) ??
          (q.tipo === "fonte_primaria" && !imagem && !(conteudo.data as { documento: string }).documento
            ? "Fonte primária sem documento: envie o trecho em documento ou a imagem em imagem_url."
            : null) ??
          (q.tipo === "mapa" && !imagem ? "Mapa sem imagem: envie o mapa em imagem_url." : null);
        if (motivoFinal || !conteudo.success) {
          recusadas.push({ posicao: i + 1, enunciado: q.enunciado.slice(0, 80), motivo: motivoFinal ?? "" });
          continue;
        }
        const caminhoImagem = imagem && "caminho" in imagem ? imagem.caminho : null;
        let dados = conteudo.data;
        // No mapa, a imagem fica dentro do conteúdo, embaixo dos pinos.
        const posicionar =
          q.tipo === "mapa" && (q.mapa?.marcadores ?? []).some((m) => m.x === undefined || m.y === undefined);
        if (q.tipo === "mapa")
          dados = { ...dados, imagem: caminhoImagem ?? "", ...(posicionar && { posicionar: true }) };
        if (posicionar) pinosPorPosicionar.push(i + 1);
        linhas.push({
          professor_id: professorId,
          tipo: q.tipo,
          enunciado: q.enunciado.trim(),
          capitulo,
          ...(q.era_publica && { era_publica: q.era_publica }),
          habilidades: q.habilidades.filter((h) => permitidas.has(h)),
          dificuldade: q.dificuldade,
          explicacao: q.explicacao.trim(),
          dica: q.dica.trim() || null,
          fonte: q.fonte?.trim() || null,
          imagem_path: q.tipo === "mapa" ? null : caminhoImagem,
          tempo_limite_s: relampago?.tempo ?? q.tempo_limite_s ?? TEMPO_PADRAO[q.tipo as TipoQuestao],
          ...(relampago && { relampago: true }),
          conteudo: dados,
          status: publicar && !posicionar ? "publicada" : "rascunho",
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
        relampago: linhas
          .filter((l) => l.relampago)
          .map((l) => ({ enunciado: l.enunciado.slice(0, 80), tempo_s: l.tempo_limite_s })),
        recusadas,
        ...(pinosPorPosicionar.length && {
          aviso: `Questões de mapa nas posições ${pinosPorPosicionar.join(", ")} ficaram em rascunho: o professor precisa abrir cada uma no app e tocar no mapa para pôr os pinos no lugar.`,
        }),
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
            "Pesquisa bloqueada (true): sair da tela (trocar de aba ou de app) durante uma questão faz ela valer zero. Pesquisa liberada (false, padrão): o aluno pode sair para consultar; as saídas só são registradas. Pergunte ao professor se não estiver claro.",
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
        pesquisa: args.saida_zera_questao
          ? "bloqueada (sair da tela, apertar tecla ou extensão que mexe na tela zera a questão)"
          : "liberada",
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
        saida_zera_questao: z
          .boolean()
          .optional()
          .describe("true bloqueia a pesquisa (sair da tela zera a questão); false libera."),
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

import { JANELA_APOS_FECHAR_S } from "./questoes/correcao";
import type { TipoQuestao } from "@/lib/questoes/tipos";

export type Escola = { id: string; nome: string; periodo: "bimestre" | "trimestre" };
export type Turma = { id: string; escola_id: string; nome: string; serie: string | null; codigo: string };
export type Aluno = {
  id: string;
  turma_id: string;
  apelido: string;
  nome_real: string | null;
  pin_hash: string | null;
  avatar: number;
  cor: number;
  aprovado: boolean;
  ultimo_acesso: string | null;
  total_acessos: number;
  criado_em: string;
  /** Acessibilidade: tecla não zera a questão com pesquisa bloqueada. Nem toda consulta traz. */
  teclado_liberado?: boolean;
  /** Perfil do professor para ver o app como aluno; fora do ranking e das contas (ausente sem o SQL dele). */
  de_teste?: boolean;
};
export type Temporada = {
  id: string;
  turma_id: string;
  /** Nem toda consulta traz. */
  professor_id?: string;
  nome: string;
  narrativa: string | null;
  inicio: string;
  data_prova: string;
  capitulos: string[];
  /** Encerrada pelo professor antes da prova (ausente sem o SQL dos controles). */
  encerrada_em?: string | null;
  /**
   * Último dia que vale pontos; vazio = o dia da prova. Depois dele, até a prova,
   * é o período de estudo (ausente sem o SQL do encerramento).
   */
  encerramento?: string | null;
  /** No encerramento, libera o gabarito guardado para liberação manual (padrão true). */
  gabarito_no_encerramento?: boolean;
  /** Nenhum gabarito durante a temporada: tudo sai no encerramento (padrão false). */
  gabarito_so_no_encerramento?: boolean;
};

export type TemporadaEncerramento = Pick<Temporada, "data_prova"> &
  Partial<
    Pick<Temporada, "encerramento" | "encerrada_em" | "gabarito_no_encerramento" | "gabarito_so_no_encerramento">
  >;

/** Último dia que vale pontos (AAAA-MM-DD). */
export const ultimoDiaComPontos = (t: TemporadaEncerramento) => t.encerramento || t.data_prova;

/**
 * Fim da pontuação: 23h59 (Brasília) do último dia com pontos, ou antes, se o
 * professor encerrou a temporada na mão. Nenhum desafio fecha depois disso.
 */
export function fimDaPontuacao(t: TemporadaEncerramento): Date {
  const fimDoDia = new Date(`${ultimoDiaComPontos(t)}T23:59:00-03:00`);
  if (t.encerrada_em && new Date(t.encerrada_em) < fimDoDia) return new Date(t.encerrada_em);
  return fimDoDia;
}

/** A temporada já não vale pontos: encerrada, esperando a prova (período de estudo) ou terminada. */
export const pontuacaoEncerrada = (t: TemporadaEncerramento, agora = new Date()) => agora > fimDaPontuacao(t);

/**
 * Fase da temporada: "pontos" até o encerramento; "estudo" do encerramento até
 * o dia da prova (treino e revisão, sem pontos); depois, "encerrada".
 */
export function faseDaTemporada(t: TemporadaEncerramento, agora = new Date()): "pontos" | "estudo" | "encerrada" {
  if (!pontuacaoEncerrada(t, agora)) return "pontos";
  const hoje = new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  return hoje <= t.data_prova ? "estudo" : "encerrada";
}

/** No encerramento o gabarito guardado para liberação manual é liberado sozinho. */
export const gabaritoLiberadoNoEncerramento = (t: TemporadaEncerramento | null | undefined, agora = new Date()) =>
  !!t?.data_prova &&
  (t.gabarito_no_encerramento !== false || !!t.gabarito_so_no_encerramento) &&
  pontuacaoEncerrada(t, agora);
export type Questao = {
  id: string;
  tipo: TipoQuestao;
  capitulo: string | null;
  habilidades: string[];
  dificuldade: number;
  fonte: string | null;
  enunciado: string;
  imagem_path: string | null;
  tempo_limite_s: number;
  /** Questão relâmpago: direta, de 5 a 20 s (ausente sem o SQL dela). */
  relampago?: boolean;
  conteudo: unknown;
  explicacao: string | null;
  dica?: string | null;
  /** Tema curto, alternativa da verificação de leitura (ausente sem o SQL dela). */
  tema?: string | null;
  /** Era do desafio público em que a questão pode ser sorteada (ausente sem o SQL dele). */
  era_publica?: string | null;
  status: "rascunho" | "publicada";
  origem: "manual" | "claude";
  criado_em: string;
};
export type TipoDesafio = "semanal" | "relampago";
export type Desafio = {
  id: string;
  temporada_id: string;
  /** Nem toda consulta traz; ausente = semanal. */
  tipo?: TipoDesafio;
  /** Código do dia do CaduRush (só relâmpago). */
  codigo_dia?: string | null;
  titulo: string;
  abre_em: string;
  fecha_em: string;
  pontos_por_acerto: number;
  tempo_por_questao_s: number | null;
  /** Tempo da verificação de leitura (null = 15 s; ausente sem o SQL dos tempos). */
  tempo_verificacao_s?: number | null;
  /** Clique fora no sem consulta: proibido (padrão), tolerancia ou permitido (ausente sem o SQL). */
  regra_cliques?: string | null;
  /** Quantos cliques fora passam só com aviso, na regra "tolerancia". */
  tolerancia_cliques?: number | null;
  /** Quantas verificações de leitura (questões teste) por tentativa; null = automático (2 a cada 10). */
  verificacoes?: number | null;
  /** Saída da tela no sem consulta: proibido (padrão) ou tolerancia (ausente sem o SQL das regras extras). */
  regra_saidas?: string | null;
  tolerancia_saidas?: number | null;
  /** Teto de ajudas neste desafio, além da cota da temporada (null = só a cota; 0 = desligadas). */
  eliminacoes_max?: number | null;
  dicas_max?: number | null;
  /** Questões na ordem do desafio, igual para todos (padrão: embaralhadas por aluno). */
  ordem_fixa?: boolean;
  /** Alternativas embaralhadas nas questões de escolher (padrão true). */
  embaralhar_alternativas?: boolean;
  /** Apertar tecla zera no sem consulta (padrão true). */
  teclado_bloqueado?: boolean;
  /** O gabarito nunca é mostrado aos alunos. */
  gabarito_nunca?: boolean;
  /** Refazer como treino depois do fechamento (padrão true). */
  treino_liberado?: boolean;
  /** Acerto rápido ganha até 50% a mais (padrão false). */
  bonus_rapidez?: boolean;
  saida_zera_questao: boolean;
  /** Desafio especial: visual dourado, pontos multiplicados, tempo reduzido (ausentes sem o SQL). */
  especial?: boolean;
  multiplicador?: number | null;
  tempo_percentual?: number | null;
  /** O gabarito só aparece quando o professor liberar (ausente sem o SQL dos controles). */
  gabarito_manual?: boolean;
  gabarito_liberado_em?: string | null;
};
export type Tentativa = {
  id: string;
  desafio_id: string;
  aluno_id: string;
  ordem: string[];
  indice_atual: number;
  iniciada_em: string;
  concluida_em: string | null;
  pontos: number;
  /** Questões sorteadas para a verificação de leitura (ausente sem o SQL dela). */
  verificar?: string[];
  /** Cliques fora já tolerados com aviso neste desafio (ausente sem o SQL). */
  cliques_fora?: number;
  /** Saídas da tela já toleradas com aviso neste desafio (ausente sem o SQL). */
  saidas_toleradas?: number;
};
export type RespostaBanco = {
  id: string;
  tentativa_id: string;
  questao_id: string;
  posicao: number;
  permutacao: number[];
  servida_em: string;
  respondida_em: string | null;
  resposta: unknown;
  fracao: number | null;
  pontos: number | null;
  tempo_esgotado: boolean;
  saidas_tela: number;
  zerada_por_saida: boolean;
  motivo_zerada: "saida" | "teclado" | "tela_alterada" | "clique_fora" | "sem_mouse" | "verificacao" | null;
  /** Ausentes antes do SQL das ajudas. */
  eliminadas?: number[];
  dica_usada?: boolean;
  /**
   * Verificação de leitura (ausentes antes do SQL dela). verificacao_fracao
   * guarda a nota real enquanto a verificação está pendente; a questão vale 0
   * até o aluno acertar. verificacao_correta nunca vai para o aluno.
   */
  verificacao_fracao?: number | null;
  verificacao_opcoes?: string[] | null;
  verificacao_correta?: number | null;
  verificacao_servida_em?: string | null;
  verificacao_respondida_em?: string | null;
  verificacao_acertou?: boolean | null;
};

export function situacaoDesafio(d: Pick<Desafio, "abre_em" | "fecha_em">, agora = new Date()) {
  if (agora < new Date(d.abre_em)) return "agendado" as const;
  if (agora > new Date(d.fecha_em)) return "encerrado" as const;
  return "aberto" as const;
}

/** Quando o gabarito do desafio pode ser mostrado: um pouco depois do fechamento. */
export const gabaritoLiberadoEm = (d: Pick<Desafio, "fecha_em">) =>
  new Date(new Date(d.fecha_em).getTime() + JANELA_APOS_FECHAR_S * 1000);

type DesafioGabarito = Pick<Desafio, "fecha_em" | "gabarito_manual" | "gabarito_liberado_em" | "gabarito_nunca"> & {
  /** A temporada do desafio, quando a consulta traz (join "temporadas(*)"). */
  temporadas?: TemporadaEncerramento | null;
};

/**
 * O professor escolheu liberar o gabarito ele mesmo e ainda não liberou (ou
 * escolheu nunca mostrar). O guardado sai sozinho no encerramento da temporada.
 */
export const gabaritoAguardaProfessor = (d: DesafioGabarito, agora = new Date()) =>
  !!d.gabarito_nunca ||
  (!!d.gabarito_manual && !d.gabarito_liberado_em && !gabaritoLiberadoNoEncerramento(d.temporadas, agora));

/**
 * Temporada com "gabarito só no encerramento": até lá nenhum gabarito aparece
 * (a não ser que o professor libere um desafio na mão).
 */
export const gabaritoAguardaEncerramento = (d: DesafioGabarito, agora = new Date()) =>
  !d.gabarito_nunca &&
  !d.gabarito_liberado_em &&
  !!d.temporadas?.gabarito_so_no_encerramento &&
  !pontuacaoEncerrada(d.temporadas, agora);

/**
 * Gabarito visível ao aluno: depois do fim do prazo (com a janela de quem ainda
 * estava respondendo) e, se o professor quis, só depois de ele liberar ou do
 * encerramento da temporada.
 */
export const gabaritoLiberado = (d: DesafioGabarito, agora = new Date()) =>
  agora > gabaritoLiberadoEm(d) && !gabaritoAguardaProfessor(d, agora) && !gabaritoAguardaEncerramento(d, agora);

/** Refazer como treino: só com o gabarito visível e se o professor não desligou. */
export const treinoLiberado = (d: DesafioGabarito & Pick<Desafio, "treino_liberado">, agora = new Date()) =>
  d.treino_liberado !== false && gabaritoLiberado(d, agora);

export function urlImagem(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/questoes/${path}`;
}

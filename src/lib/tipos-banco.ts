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
};
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

type DesafioGabarito = Pick<Desafio, "fecha_em" | "gabarito_manual" | "gabarito_liberado_em" | "gabarito_nunca">;

/** O professor escolheu liberar o gabarito ele mesmo e ainda não liberou (ou escolheu nunca mostrar). */
export const gabaritoAguardaProfessor = (d: DesafioGabarito) =>
  !!d.gabarito_nunca || (!!d.gabarito_manual && !d.gabarito_liberado_em);

/**
 * Gabarito visível ao aluno: depois do fim do prazo (com a janela de quem ainda
 * estava respondendo) e, se o professor quis, só depois de ele liberar.
 */
export const gabaritoLiberado = (d: DesafioGabarito, agora = new Date()) =>
  agora > gabaritoLiberadoEm(d) && !gabaritoAguardaProfessor(d);

/** Refazer como treino: só com o gabarito visível e se o professor não desligou. */
export const treinoLiberado = (d: DesafioGabarito & Pick<Desafio, "treino_liberado">, agora = new Date()) =>
  d.treino_liberado !== false && gabaritoLiberado(d, agora);

export function urlImagem(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/questoes/${path}`;
}

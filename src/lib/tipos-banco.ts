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
  conteudo: unknown;
  explicacao: string | null;
  dica?: string | null;
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
  saida_zera_questao: boolean;
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
  motivo_zerada: "saida" | "teclado" | "tela_alterada" | null;
  /** Ausentes antes do SQL das ajudas. */
  eliminadas?: number[];
  dica_usada?: boolean;
};

export function situacaoDesafio(d: Pick<Desafio, "abre_em" | "fecha_em">, agora = new Date()) {
  if (agora < new Date(d.abre_em)) return "agendado" as const;
  if (agora > new Date(d.fecha_em)) return "encerrado" as const;
  return "aberto" as const;
}

/** Quando o gabarito do desafio pode ser mostrado: um pouco depois do fechamento. */
export const gabaritoLiberadoEm = (d: Pick<Desafio, "fecha_em">) =>
  new Date(new Date(d.fecha_em).getTime() + JANELA_APOS_FECHAR_S * 1000);

type DesafioGabarito = Pick<Desafio, "fecha_em" | "gabarito_manual" | "gabarito_liberado_em">;

/** O professor escolheu liberar o gabarito ele mesmo e ainda não liberou. */
export const gabaritoAguardaProfessor = (d: DesafioGabarito) => !!d.gabarito_manual && !d.gabarito_liberado_em;

/**
 * Gabarito visível ao aluno: depois do fim do prazo (com a janela de quem ainda
 * estava respondendo) e, se o professor quis, só depois de ele liberar.
 */
export const gabaritoLiberado = (d: DesafioGabarito, agora = new Date()) =>
  agora > gabaritoLiberadoEm(d) && !gabaritoAguardaProfessor(d);

export function urlImagem(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/questoes/${path}`;
}

import type { TipoQuestao } from "@/lib/questoes/tipos";

export type Escola = { id: string; nome: string; periodo: "bimestre" | "trimestre" };
export type Turma = { id: string; escola_id: string; nome: string; serie: string | null; codigo: string };
export type Aluno = {
  id: string;
  turma_id: string;
  apelido: string;
  nome_real: string | null;
  pin_hash: string | null;
  criado_em: string;
};
export type Temporada = {
  id: string;
  turma_id: string;
  nome: string;
  narrativa: string | null;
  inicio: string;
  data_prova: string;
  capitulos: string[];
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
  status: "rascunho" | "publicada";
  origem: "manual" | "claude";
  criado_em: string;
};
export type Desafio = {
  id: string;
  temporada_id: string;
  titulo: string;
  abre_em: string;
  fecha_em: string;
  pontos_por_acerto: number;
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
};

export function situacaoDesafio(d: Pick<Desafio, "abre_em" | "fecha_em">, agora = new Date()) {
  if (agora < new Date(d.abre_em)) return "agendado" as const;
  if (agora > new Date(d.fecha_em)) return "encerrado" as const;
  return "aberto" as const;
}

export function urlImagem(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/questoes/${path}`;
}

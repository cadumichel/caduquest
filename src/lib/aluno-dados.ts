import "server-only";
import { cache } from "react";
import { medalhasDaTurma } from "@/lib/medalhas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { temporadaAtual } from "@/lib/temporada-dados";

/*
 * Consultas que o layout do aluno e as páginas pedem na mesma navegação.
 * Com o cache por requisição, cada uma vai ao banco uma vez só.
 */
export const medalhasDaTurmaDoAluno = cache((turmaId: string) => medalhasDaTurma(criarClienteAdmin(), turmaId));

export const temporadaAtualDoAluno = cache((turmaId: string) => temporadaAtual(criarClienteAdmin(), turmaId));

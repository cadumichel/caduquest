-- Conquista "Aprendi com o erro": quando o aluno zerou a revisão de erros pela primeira vez.
-- Fica gravada para a conquista não sumir quando aparecerem erros novos. Idempotente.
alter table public.alunos add column if not exists revisao_zerada_em timestamptz;

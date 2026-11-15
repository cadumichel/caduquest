-- Personagens sorteados para o aluno (índices de PERSONAGENS), na ordem em que foram revelados.
-- Os iniciais não entram aqui: todo aluno já tem. Idempotente.
alter table public.alunos add column if not exists personagens_revelados smallint[] not null default '{}';

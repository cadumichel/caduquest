-- Aluno de teste: o perfil que o professor usa para ver o app como aluno.
-- Fica fora do ranking, da meta da turma e das contas do painel.
-- Idempotente: pode rodar mais de uma vez.

alter table alunos add column if not exists de_teste boolean not null default false;

-- Perfil personalizado: fundo do cartão e título escolhidos pelo aluno.
-- Idempotente: pode rodar mais de uma vez.

alter table alunos add column if not exists fundo smallint not null default 0;
alter table alunos add column if not exists titulo text;

alter table alunos drop constraint if exists alunos_fundo_check;
alter table alunos add constraint alunos_fundo_check check (fundo between 0 and 20);

alter table alunos drop constraint if exists alunos_titulo_check;
alter table alunos add constraint alunos_titulo_check check (titulo is null or length(titulo) <= 40);

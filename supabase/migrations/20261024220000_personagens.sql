-- Avatares viram personagens históricos: 20 básicos (0–19) e 10 especiais (20–29),
-- liberados por desafios vencidos.

alter table alunos drop constraint if exists alunos_avatar_check;
alter table alunos add constraint alunos_avatar_check check (avatar between 0 and 29);

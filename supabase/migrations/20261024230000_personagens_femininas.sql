-- Mais 10 personagens básicas (30–39) e 5 especiais (40–44).

alter table alunos drop constraint if exists alunos_avatar_check;
alter table alunos add constraint alunos_avatar_check check (avatar between 0 and 44);

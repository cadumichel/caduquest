-- Ajudas da temporada: eliminar alternativas erradas (6 por temporada) e dicas (3 por temporada).
-- A cota é contada pelo uso registrado nas respostas, então as temporadas abertas
-- já começam com as ajudas completas. Nada do que já foi respondido muda.
-- Idempotente: pode rodar mais de uma vez.

-- Dica da questão, escrita junto com ela.
alter table questoes add column if not exists dica text;

-- Alternativas eliminadas (índices originais do conteúdo) e se o aluno abriu a dica.
alter table respostas add column if not exists eliminadas int[] not null default '{}';
alter table respostas add column if not exists dica_usada boolean not null default false;

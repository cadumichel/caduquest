-- Questão relâmpago: pergunta direta, respondida em 5 a 20 segundos.
-- Idempotente: pode rodar mais de uma vez.

alter table questoes add column if not exists relampago boolean not null default false;

alter table questoes drop constraint if exists questoes_relampago_tempo_check;
alter table questoes add constraint questoes_relampago_tempo_check
  check (not relampago or tempo_limite_s between 5 and 20);

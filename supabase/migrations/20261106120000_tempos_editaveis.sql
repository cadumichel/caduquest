-- Tempo de resposta editável por questão em cada desafio e tempo da verificação de leitura.
-- Vazio (null) = automático: o tempo da própria questão e 15 s na verificação.
-- Pode rodar mais de uma vez.

alter table desafio_questoes add column if not exists tempo_limite_s int;
alter table desafio_questoes drop constraint if exists desafio_questoes_tempo_limite_s_check;
alter table desafio_questoes add constraint desafio_questoes_tempo_limite_s_check
  check (tempo_limite_s is null or tempo_limite_s between 5 and 600);

alter table desafios add column if not exists tempo_verificacao_s int;
alter table desafios drop constraint if exists desafios_tempo_verificacao_s_check;
alter table desafios add constraint desafios_tempo_verificacao_s_check
  check (tempo_verificacao_s is null or tempo_verificacao_s between 5 and 60);

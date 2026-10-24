-- Tempo por questão livre: de 5 s a 10 min, tanto na questão quanto no desafio.

alter table questoes drop constraint if exists questoes_tempo_limite_s_check;
alter table questoes add constraint questoes_tempo_limite_s_check check (tempo_limite_s between 5 and 600);

alter table desafios drop constraint if exists desafios_tempo_por_questao_s_check;
alter table desafios add constraint desafios_tempo_por_questao_s_check
  check (tempo_por_questao_s between 5 and 600);

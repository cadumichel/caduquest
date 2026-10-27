-- CaduRush: desafio relâmpago em sala, liberado com o código do dia.
-- Idempotente: pode rodar mais de uma vez.

alter type tipo_desafio add value if not exists 'relampago';

alter table desafios add column if not exists codigo_dia text;
alter table desafios drop constraint if exists desafios_codigo_dia_check;
alter table desafios add constraint desafios_codigo_dia_check
  check (codigo_dia is null or codigo_dia ~ '^[A-Z0-9]{4}$');

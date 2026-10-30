-- Controles do professor: gabarito liberado só por ele (opcional por desafio)
-- e encerramento antecipado da temporada. Pode rodar mais de uma vez.

alter table public.desafios add column if not exists gabarito_manual boolean not null default false;
alter table public.desafios add column if not exists gabarito_liberado_em timestamptz;
alter table public.temporadas add column if not exists encerrada_em timestamptz;

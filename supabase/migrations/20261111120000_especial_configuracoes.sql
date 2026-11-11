-- Desafio especial (substitui o CaduRush como tipo próprio) e padrões do professor.
-- Rode DEPOIS de 20261110140000_regras_extras.sql. Pode rodar mais de uma vez.

-- Especial: visual dourado, pontos multiplicados e tempo reduzido (100 = tempo normal).
alter table desafios add column if not exists especial boolean not null default false;
alter table desafios add column if not exists multiplicador numeric(3, 1);
alter table desafios drop constraint if exists desafios_multiplicador_check;
alter table desafios add constraint desafios_multiplicador_check
  check (multiplicador is null or multiplicador between 1 and 5);
alter table desafios add column if not exists tempo_percentual smallint;
alter table desafios drop constraint if exists desafios_tempo_percentual_check;
alter table desafios add constraint desafios_tempo_percentual_check
  check (tempo_percentual is null or tempo_percentual between 25 and 100);

-- Os CaduRush que já existem viram especiais "só em sala" (o tipo relampago continua
-- marcando o código do dia), com o multiplicador que os pontos deles já tinham.
update desafios
   set especial = true,
       multiplicador = coalesce(multiplicador, least(5, greatest(1, round(pontos_por_acerto / 10.0, 1))))
 where tipo = 'relampago' and not especial;

-- Padrões do professor para todo desafio novo (regras, pontos, tempos, especial).
create table if not exists configuracoes_professor (
  professor_id uuid primary key default auth.uid() references auth.users on delete cascade,
  padroes jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table configuracoes_professor enable row level security;
drop policy if exists dono on configuracoes_professor;
create policy dono on configuracoes_professor for all to authenticated
  using (professor_id = (select auth.uid())) with check (professor_id = (select auth.uid()));

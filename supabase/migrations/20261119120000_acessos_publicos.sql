-- Relatório do desafio aberto: um registro por jogador por dia em que ele
-- abriu o modo público (/jogar). Gravado sozinho pelo servidor do app (chave
-- secreta): RLS ligado e nenhuma política para anon/authenticated.
-- Idempotente: pode rodar mais de uma vez.

create table if not exists acessos_publicos (
  jogador_id uuid not null references jogadores_publicos on delete cascade,
  -- Dia no horário de Brasília.
  dia date not null,
  primeiro_em timestamptz not null default now(),
  primary key (jogador_id, dia)
);
create index if not exists acessos_publicos_dia_idx on acessos_publicos (dia);

alter table acessos_publicos enable row level security;

-- Histórico: reconstrói os dias de acesso que já ficaram registrados
-- (cadastro, último login, partidas e respostas) desde a criação do modo público.
insert into acessos_publicos (jogador_id, dia, primeiro_em)
select jogador_id, (em at time zone 'America/Sao_Paulo')::date, min(em)
from (
  select id as jogador_id, criado_em as em from jogadores_publicos
  union all
  select id, ultimo_acesso from jogadores_publicos where ultimo_acesso is not null
  union all
  select jogador_id, iniciada_em from partidas_publicas
  union all
  select jogador_id, concluida_em from partidas_publicas where concluida_em is not null
  union all
  select p.jogador_id, r.respondida_em
  from respostas_publicas r join partidas_publicas p on p.id = r.partida_id
  where r.respondida_em is not null
) h
group by jogador_id, (em at time zone 'America/Sao_Paulo')::date
on conflict (jogador_id, dia) do nothing;

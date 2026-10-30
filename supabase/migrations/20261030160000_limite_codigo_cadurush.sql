-- CaduRush: limite de tentativas do código do dia, para ninguém descobrir o
-- código de casa testando todas as combinações com um programa.
-- Conta por código: quando o professor troca o código, todos voltam a ter as tentativas.
-- Idempotente: pode rodar mais de uma vez.

create table if not exists codigo_tentativas (
  desafio_id uuid not null references desafios on delete cascade,
  aluno_id uuid not null references alunos on delete cascade,
  codigo_dia text not null,
  tentativas int not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (desafio_id, aluno_id, codigo_dia)
);
-- Só o servidor do app (chave secreta) usa esta tabela.
alter table codigo_tentativas enable row level security;

-- Soma uma tentativa e devolve o total, numa operação só (pedidos em paralelo não escapam da conta).
create or replace function contar_tentativa_codigo(p_desafio uuid, p_aluno uuid, p_codigo text)
returns int
language sql
set search_path = public
as $$
  insert into codigo_tentativas as c (desafio_id, aluno_id, codigo_dia, tentativas)
  values (p_desafio, p_aluno, p_codigo, 1)
  on conflict (desafio_id, aluno_id, codigo_dia)
  do update set tentativas = c.tentativas + 1, atualizado_em = now()
  returning tentativas;
$$;
revoke all on function contar_tentativa_codigo(uuid, uuid, text) from public, anon, authenticated;
grant execute on function contar_tentativa_codigo(uuid, uuid, text) to service_role;

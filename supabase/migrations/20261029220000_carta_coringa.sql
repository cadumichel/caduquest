-- Carta coringa: o campeão da temporada escolhe o tema de uma questão da próxima prova.
-- Idempotente: pode rodar mais de uma vez.

create table if not exists cartas_coringa (
  id uuid primary key default gen_random_uuid(),
  -- temporada que o aluno venceu
  temporada_id uuid not null references temporadas on delete cascade,
  aluno_id uuid not null references alunos on delete cascade,
  tema text not null check (length(trim(tema)) between 3 and 160),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (temporada_id, aluno_id)
);
alter table cartas_coringa enable row level security;

-- O professor vê e apaga as cartas das próprias temporadas; o aluno grava pelo servidor do app.
drop policy if exists professor_le on cartas_coringa;
create policy professor_le on cartas_coringa for select to authenticated
  using (exists (select 1 from temporadas t where t.id = temporada_id and t.professor_id = (select auth.uid())));
drop policy if exists professor_apaga on cartas_coringa;
create policy professor_apaga on cartas_coringa for delete to authenticated
  using (exists (select 1 from temporadas t where t.id = temporada_id and t.professor_id = (select auth.uid())));

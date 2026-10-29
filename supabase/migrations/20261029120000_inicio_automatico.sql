-- Página inicial automática: revisão de erros e curiosidades do dia.
-- Idempotente: pode rodar mais de uma vez.

-- Revisão de erros: cada questão errada que o aluno revisou. Sai da revisão
-- quando ele acerta (acertou_em preenchido).
create table if not exists revisoes (
  aluno_id uuid not null references alunos on delete cascade,
  questao_id uuid not null references questoes on delete cascade,
  tentativas int not null default 0,
  acertou_em timestamptz,
  atualizado_em timestamptz not null default now(),
  primary key (aluno_id, questao_id)
);
alter table revisoes enable row level security;

drop policy if exists professor_le on revisoes;
create policy professor_le on revisoes for select to authenticated
  using (exists (
    select 1 from alunos a join turmas t on t.id = a.turma_id
    where a.id = aluno_id and t.professor_id = (select auth.uid())
  ));

-- Curiosidades do dia: chegam pelo conector junto com os lotes de questões.
create table if not exists curiosidades (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users on delete cascade,
  capitulo text,
  texto text not null check (length(trim(texto)) between 10 and 500),
  criado_em timestamptz not null default now()
);
create index if not exists curiosidades_professor_idx on curiosidades (professor_id);
alter table curiosidades enable row level security;

drop policy if exists dono on curiosidades;
create policy dono on curiosidades for all to authenticated
  using (professor_id = (select auth.uid())) with check (professor_id = (select auth.uid()));

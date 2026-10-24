-- CaduQuest: esquema inicial (fase 1)
-- Professor: Supabase Auth + RLS (cada professor só vê o que é dele).
-- Aluno: sem conta no Supabase Auth. O servidor do app valida código da turma +
-- apelido + PIN e acessa as tabelas de aluno com a chave secreta, sempre filtrando
-- pela turma da sessão. Por isso, alunos, tentativas e respostas não têm política
-- de escrita para o papel "authenticated".

create extension if not exists pgcrypto;

create type periodo as enum ('bimestre', 'trimestre');
create type tipo_questao as enum ('multipla_escolha', 'vf_bloco', 'linha_do_tempo', 'pares');
create type status_questao as enum ('rascunho', 'publicada');
create type tipo_desafio as enum ('semanal');

create table escolas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  periodo periodo not null default 'trimestre',
  criado_em timestamptz not null default now()
);

create table turmas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users on delete cascade,
  escola_id uuid not null references escolas on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  serie text,
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),
  criado_em timestamptz not null default now()
);
create index on turmas (escola_id);

create table alunos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references turmas on delete cascade,
  apelido text not null check (length(trim(apelido)) between 2 and 20),
  nome_real text,
  pin_hash text,
  tentativas_falhas int not null default 0,
  bloqueado_ate timestamptz,
  versao_sessao int not null default 0,
  criado_em timestamptz not null default now()
);
create unique index alunos_apelido_unico on alunos (turma_id, lower(apelido));

create table temporadas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users on delete cascade,
  turma_id uuid not null references turmas on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  narrativa text,
  inicio date not null,
  data_prova date not null,
  capitulos text[] not null default '{}',
  criado_em timestamptz not null default now(),
  check (data_prova >= inicio)
);
create index on temporadas (turma_id);

create table questoes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users on delete cascade,
  tipo tipo_questao not null,
  capitulo text,
  habilidades text[] not null default '{}',
  dificuldade smallint not null default 2 check (dificuldade between 1 and 3),
  fonte text,
  enunciado text not null check (length(trim(enunciado)) > 0),
  imagem_path text,
  tempo_limite_s int not null default 40 check (tempo_limite_s between 10 and 180),
  conteudo jsonb not null,
  explicacao text,
  status status_questao not null default 'rascunho',
  origem text not null default 'manual' check (origem in ('manual', 'claude')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on questoes (professor_id, status);

create table desafios (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references auth.users on delete cascade,
  temporada_id uuid not null references temporadas on delete cascade,
  tipo tipo_desafio not null default 'semanal',
  titulo text not null check (length(trim(titulo)) > 0),
  abre_em timestamptz not null,
  fecha_em timestamptz not null,
  pontos_por_acerto int not null default 10 check (pontos_por_acerto > 0),
  criado_em timestamptz not null default now(),
  check (fecha_em > abre_em)
);
create index on desafios (temporada_id);

create table desafio_questoes (
  desafio_id uuid not null references desafios on delete cascade,
  questao_id uuid not null references questoes on delete restrict,
  posicao int not null,
  primary key (desafio_id, questao_id)
);

create table tentativas (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references desafios on delete cascade,
  aluno_id uuid not null references alunos on delete cascade,
  ordem uuid[] not null,
  indice_atual int not null default 0,
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  pontos numeric(8, 2) not null default 0,
  unique (desafio_id, aluno_id)
);

create table respostas (
  id uuid primary key default gen_random_uuid(),
  tentativa_id uuid not null references tentativas on delete cascade,
  questao_id uuid not null references questoes on delete restrict,
  posicao int not null,
  -- embaralhamento mostrado a este aluno (índices originais na ordem exibida)
  permutacao int[] not null default '{}',
  servida_em timestamptz not null default now(),
  respondida_em timestamptz,
  resposta jsonb,
  fracao numeric(5, 4),
  pontos numeric(8, 2),
  tempo_esgotado boolean not null default false,
  saidas_tela int not null default 0,
  unique (tentativa_id, questao_id)
);
create index on respostas (questao_id);

-- Atualiza "atualizado_em" das questões
create function tocar_atualizado_em() returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
create trigger questoes_atualizado_em before update on questoes
  for each row execute function tocar_atualizado_em();

-- RLS ---------------------------------------------------------------------
alter table escolas enable row level security;
alter table turmas enable row level security;
alter table alunos enable row level security;
alter table temporadas enable row level security;
alter table questoes enable row level security;
alter table desafios enable row level security;
alter table desafio_questoes enable row level security;
alter table tentativas enable row level security;
alter table respostas enable row level security;

create policy dono on escolas for all to authenticated
  using (professor_id = (select auth.uid())) with check (professor_id = (select auth.uid()));

create policy dono on turmas for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (
    professor_id = (select auth.uid())
    and exists (select 1 from escolas e where e.id = escola_id and e.professor_id = (select auth.uid()))
  );

create policy dono on temporadas for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (
    professor_id = (select auth.uid())
    and exists (select 1 from turmas t where t.id = turma_id and t.professor_id = (select auth.uid()))
  );

create policy dono on questoes for all to authenticated
  using (professor_id = (select auth.uid())) with check (professor_id = (select auth.uid()));

create policy dono on desafios for all to authenticated
  using (professor_id = (select auth.uid()))
  with check (
    professor_id = (select auth.uid())
    and exists (select 1 from temporadas t where t.id = temporada_id and t.professor_id = (select auth.uid()))
  );

create policy dono on desafio_questoes for all to authenticated
  using (exists (select 1 from desafios d where d.id = desafio_id and d.professor_id = (select auth.uid())))
  with check (
    exists (select 1 from desafios d where d.id = desafio_id and d.professor_id = (select auth.uid()))
    and exists (select 1 from questoes q where q.id = questao_id and q.professor_id = (select auth.uid()))
  );

-- Professor lê, edita (nome real, apelido, PIN) e remove alunos das próprias turmas.
-- Alunos se cadastram pelo servidor do app.
create policy professor_le on alunos for select to authenticated
  using (exists (select 1 from turmas t where t.id = turma_id and t.professor_id = (select auth.uid())));
create policy professor_edita on alunos for update to authenticated
  using (exists (select 1 from turmas t where t.id = turma_id and t.professor_id = (select auth.uid())))
  with check (exists (select 1 from turmas t where t.id = turma_id and t.professor_id = (select auth.uid())));
create policy professor_remove on alunos for delete to authenticated
  using (exists (select 1 from turmas t where t.id = turma_id and t.professor_id = (select auth.uid())));

create policy professor_le on tentativas for select to authenticated
  using (exists (select 1 from desafios d where d.id = desafio_id and d.professor_id = (select auth.uid())));

create policy professor_le on respostas for select to authenticated
  using (exists (
    select 1 from tentativas t join desafios d on d.id = t.desafio_id
    where t.id = tentativa_id and d.professor_id = (select auth.uid())
  ));

-- Storage: imagens das questões -------------------------------------------
-- Bucket público para leitura (só conteúdo didático, nunca dado de aluno).
-- Cada professor grava só na própria pasta: <professor_id>/<arquivo>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('questoes', 'questoes', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "questoes: professor envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'questoes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "questoes: professor atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'questoes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "questoes: professor apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'questoes' and (storage.foldername(name))[1] = (select auth.uid())::text);

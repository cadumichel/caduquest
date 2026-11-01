-- Desafios públicos: qualquer pessoa joga desafios de História por era, com
-- ranking próprio. Jogadores entram com apelido + PIN (sem e-mail) e não têm
-- relação com turmas. Tudo é lido e gravado pelo servidor do app (chave
-- secreta): RLS ligado e nenhuma política para anon/authenticated.
-- Idempotente: pode rodar mais de uma vez.

-- Questões do banco público: a era diz em qual desafio ela pode ser sorteada.
alter table questoes add column if not exists era_publica text;
alter table questoes drop constraint if exists questoes_era_publica_check;
alter table questoes add constraint questoes_era_publica_check
  check (era_publica is null or era_publica in
    ('pre_historia', 'antiga', 'medieval', 'moderna', 'contemporanea', 'brasil', 'tematica'));
create index if not exists questoes_era_publica_idx on questoes (era_publica) where era_publica is not null;

create table if not exists jogadores_publicos (
  id uuid primary key default gen_random_uuid(),
  apelido text not null check (length(trim(apelido)) between 2 and 20),
  pin_hash text not null,
  avatar int not null default 0,
  cor int not null default 0,
  tentativas_falhas int not null default 0,
  bloqueado_ate timestamptz,
  versao_sessao int not null default 1,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz
);
create unique index if not exists jogadores_publicos_apelido_unico on jogadores_publicos (lower(apelido));

create table if not exists partidas_publicas (
  id uuid primary key default gen_random_uuid(),
  jogador_id uuid not null references jogadores_publicos on delete cascade,
  era text not null,
  ordem uuid[] not null,
  indice_atual int not null default 0,
  -- Só a primeira partida de cada era vale para o ranking; as outras são treino.
  vale_ranking boolean not null default false,
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  pontos numeric(8, 2) not null default 0
);
-- Uma partida de ranking por era e uma partida em andamento por era.
create unique index if not exists partidas_publicas_ranking_unica
  on partidas_publicas (jogador_id, era) where vale_ranking;
create unique index if not exists partidas_publicas_andamento_unica
  on partidas_publicas (jogador_id, era) where concluida_em is null;
create index if not exists partidas_publicas_ranking_idx
  on partidas_publicas (era, pontos desc) where vale_ranking and concluida_em is not null;

create table if not exists respostas_publicas (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references partidas_publicas on delete cascade,
  questao_id uuid not null references questoes on delete restrict,
  posicao int not null,
  -- Rodada final: sem consulta (sair da tela, tecla ou clique fora zera a questão).
  final boolean not null default false,
  permutacao int[] not null default '{}',
  servida_em timestamptz not null default now(),
  respondida_em timestamptz,
  resposta jsonb,
  fracao numeric(5, 4),
  pontos numeric(8, 2),
  tempo_esgotado boolean not null default false,
  motivo_zerada text check (motivo_zerada is null or motivo_zerada in ('saida', 'teclado', 'tela_alterada', 'clique_fora')),
  saidas_tela int not null default 0,
  unique (partida_id, questao_id)
);
create index if not exists respostas_publicas_questao_idx on respostas_publicas (questao_id);

alter table jogadores_publicos enable row level security;
alter table partidas_publicas enable row level security;
alter table respostas_publicas enable row level security;

-- O professor vê as respostas públicas às próprias questões (para não alterar o
-- gabarito de uma questão já respondida nem apagá-la).
drop policy if exists professor_le on respostas_publicas;
create policy professor_le on respostas_publicas for select to authenticated
  using (exists (select 1 from questoes q where q.id = questao_id and q.professor_id = (select auth.uid())));

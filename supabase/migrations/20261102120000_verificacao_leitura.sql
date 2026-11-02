-- Verificação de leitura: em 2 de cada 10 questões, logo depois de responder,
-- o aluno marca qual era o tema da questão. Errou, a questão vale zero.
-- Idempotente: pode rodar mais de uma vez.

-- Tema curto da questão (escrito pelo Claude junto com ela). Vira alternativa da verificação.
alter table questoes add column if not exists tema text;
alter table questoes drop constraint if exists questoes_tema_check;
alter table questoes add constraint questoes_tema_check
  check (tema is null or length(trim(tema)) between 3 and 80);

-- Questões da tentativa sorteadas para ter verificação.
alter table tentativas add column if not exists verificar uuid[] not null default '{}';

-- Verificação de cada questão sorteada. A questão fica valendo zero até o aluno acertar.
alter table respostas add column if not exists verificacao_fracao numeric(5, 4);
alter table respostas add column if not exists verificacao_opcoes text[];
alter table respostas add column if not exists verificacao_correta smallint;
alter table respostas add column if not exists verificacao_servida_em timestamptz;
alter table respostas add column if not exists verificacao_respondida_em timestamptz;
alter table respostas add column if not exists verificacao_acertou boolean;

alter table respostas drop constraint if exists respostas_motivo_zerada_check;
alter table respostas add constraint respostas_motivo_zerada_check
  check (motivo_zerada is null or motivo_zerada in ('saida', 'teclado', 'tela_alterada', 'clique_fora', 'verificacao'));

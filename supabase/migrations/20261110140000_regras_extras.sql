-- Mais regras do desafio editáveis pelo professor (todas começam no comportamento de antes):
-- saída da tela com tolerância, teto de ajudas, ordem fixa, alternativas na ordem escrita,
-- teclado por desafio, gabarito nunca, treino e bônus por rapidez.
-- Rode DEPOIS de 20261110120000_regras_cliques_verificacoes.sql. Pode rodar mais de uma vez.

alter table desafios add column if not exists regra_saidas text not null default 'proibido';
alter table desafios drop constraint if exists desafios_regra_saidas_check;
alter table desafios add constraint desafios_regra_saidas_check check (regra_saidas in ('proibido', 'tolerancia'));

alter table desafios add column if not exists tolerancia_saidas int;
alter table desafios drop constraint if exists desafios_tolerancia_saidas_check;
alter table desafios add constraint desafios_tolerancia_saidas_check
  check (tolerancia_saidas is null or tolerancia_saidas between 1 and 20);

alter table desafios add column if not exists eliminacoes_max int;
alter table desafios drop constraint if exists desafios_eliminacoes_max_check;
alter table desafios add constraint desafios_eliminacoes_max_check
  check (eliminacoes_max is null or eliminacoes_max between 0 and 10);

alter table desafios add column if not exists dicas_max int;
alter table desafios drop constraint if exists desafios_dicas_max_check;
alter table desafios add constraint desafios_dicas_max_check check (dicas_max is null or dicas_max between 0 and 10);

alter table desafios add column if not exists ordem_fixa boolean not null default false;
alter table desafios add column if not exists embaralhar_alternativas boolean not null default true;
alter table desafios add column if not exists teclado_bloqueado boolean not null default true;
alter table desafios add column if not exists gabarito_nunca boolean not null default false;
alter table desafios add column if not exists treino_liberado boolean not null default true;
alter table desafios add column if not exists bonus_rapidez boolean not null default false;

-- Saídas da tela já toleradas (com aviso) de cada aluno no desafio.
alter table tentativas add column if not exists saidas_toleradas int not null default 0;

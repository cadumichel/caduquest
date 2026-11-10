-- Regras do desafio editáveis pelo professor:
-- 1) Clique fora das alternativas no sem consulta: proibido (padrão), tolerância com aviso ou permitido.
-- 2) Número de questões teste (verificação de leitura) por aluno; null = automático (2 a cada 10).
-- Pode rodar mais de uma vez.

alter table desafios add column if not exists regra_cliques text not null default 'proibido';
alter table desafios drop constraint if exists desafios_regra_cliques_check;
alter table desafios add constraint desafios_regra_cliques_check
  check (regra_cliques in ('proibido', 'tolerancia', 'permitido'));

alter table desafios add column if not exists tolerancia_cliques int;
alter table desafios drop constraint if exists desafios_tolerancia_cliques_check;
alter table desafios add constraint desafios_tolerancia_cliques_check
  check (tolerancia_cliques is null or tolerancia_cliques between 1 and 20);

alter table desafios add column if not exists verificacoes int;
alter table desafios drop constraint if exists desafios_verificacoes_check;
alter table desafios add constraint desafios_verificacoes_check
  check (verificacoes is null or verificacoes between 0 and 15);

-- Cliques fora já tolerados (com aviso) de cada aluno no desafio.
alter table tentativas add column if not exists cliques_fora int not null default 0;

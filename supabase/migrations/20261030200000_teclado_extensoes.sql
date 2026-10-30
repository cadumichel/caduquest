-- Pesquisa bloqueada: teclado e extensões também zeram a questão.
-- Idempotente: pode rodar mais de uma vez.

-- Professor libera o teclado para um aluno específico (acessibilidade).
alter table alunos add column if not exists teclado_liberado boolean not null default false;

-- Por que a questão foi zerada: saída da tela, tecla apertada ou tela alterada (extensão).
alter table respostas add column if not exists motivo_zerada text;
alter table respostas drop constraint if exists respostas_motivo_zerada_check;
alter table respostas add constraint respostas_motivo_zerada_check
  check (motivo_zerada is null or motivo_zerada in ('saida', 'teclado', 'tela_alterada'));
update respostas set motivo_zerada = 'saida' where zerada_por_saida and motivo_zerada is null;

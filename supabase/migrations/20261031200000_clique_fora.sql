-- Pesquisa bloqueada: clique fora das alternativas e botões também zera a questão.
-- Idempotente: pode rodar mais de uma vez.

alter table respostas drop constraint if exists respostas_motivo_zerada_check;
alter table respostas add constraint respostas_motivo_zerada_check
  check (motivo_zerada is null or motivo_zerada in ('saida', 'teclado', 'tela_alterada', 'clique_fora'));

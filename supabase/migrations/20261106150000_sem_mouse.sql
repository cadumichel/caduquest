-- Desafios sem consulta: responder sem mexer o mouse desde que a questão
-- apareceu zera a questão (motivo 'sem_mouse'). Clique feito por script zera
-- como 'tela_alterada'. Idempotente: pode rodar mais de uma vez.

alter table respostas drop constraint if exists respostas_motivo_zerada_check;
alter table respostas add constraint respostas_motivo_zerada_check
  check (motivo_zerada is null or motivo_zerada in ('saida', 'teclado', 'tela_alterada', 'clique_fora', 'sem_mouse', 'verificacao'));

alter table respostas_publicas drop constraint if exists respostas_publicas_motivo_zerada_check;
alter table respostas_publicas add constraint respostas_publicas_motivo_zerada_check
  check (motivo_zerada is null or motivo_zerada in ('saida', 'teclado', 'tela_alterada', 'clique_fora', 'sem_mouse'));

-- Ajudas nos desafios públicos: 4 eliminações e 2 dicas por partida, só nas
-- questões com consulta (1 a 8). A cota é contada pelo uso registrado nas respostas.
-- Idempotente: pode rodar mais de uma vez.

alter table respostas_publicas add column if not exists eliminadas int[] not null default '{}';
alter table respostas_publicas add column if not exists dica_usada boolean not null default false;

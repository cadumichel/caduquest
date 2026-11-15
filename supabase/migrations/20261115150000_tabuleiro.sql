-- Novo formato de questão: tabuleiro (um personagem percorre casas; em cada uma,
-- o aluno escolhe entre duas opções o que ele fez).
-- Idempotente: pode rodar mais de uma vez.

alter type tipo_questao add value if not exists 'tabuleiro';

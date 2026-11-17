-- Oito formatos novos de questão. Já cria os oito de uma vez, para não precisar
-- rodar outro SQL quando os próximos chegarem ao app:
-- estimativa (régua), quem_sou_eu (pistas), monte_resposta, investigue (com consulta),
-- conversa (chat com personagem), conceito_secreto, detalhe_imagem, enquanto_isso.
-- Idempotente: pode rodar mais de uma vez.

alter type tipo_questao add value if not exists 'estimativa';
alter type tipo_questao add value if not exists 'quem_sou_eu';
alter type tipo_questao add value if not exists 'monte_resposta';
alter type tipo_questao add value if not exists 'investigue';
alter type tipo_questao add value if not exists 'conversa';
alter type tipo_questao add value if not exists 'conceito_secreto';
alter type tipo_questao add value if not exists 'detalhe_imagem';
alter type tipo_questao add value if not exists 'enquanto_isso';

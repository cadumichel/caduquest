-- Novos formatos de questão. Já inclui os formatos das próximas etapas,
-- para não precisar rodar outro SQL depois.
-- Idempotente: pode rodar mais de uma vez.

alter type tipo_questao add value if not exists 'fonte_primaria';
alter type tipo_questao add value if not exists 'causa_consequencia';
alter type tipo_questao add value if not exists 'encontrar_erro';
alter type tipo_questao add value if not exists 'completar_lacunas';
alter type tipo_questao add value if not exists 'ordenar_frases';
alter type tipo_questao add value if not exists 'interpretacao';
alter type tipo_questao add value if not exists 'quem_disse';
alter type tipo_questao add value if not exists 'classificar';
alter type tipo_questao add value if not exists 'intruso';
alter type tipo_questao add value if not exists 'ponto_de_vista';
alter type tipo_questao add value if not exists 'linha_do_tempo_datas';
alter type tipo_questao add value if not exists 'mapa';

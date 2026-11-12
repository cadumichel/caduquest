-- Encerramento da temporada separado da data da prova.
-- encerramento = último dia que vale pontos (vazio = o dia da prova, como antes).
-- Entre o encerramento e a prova os alunos estudam: treino e revisão de erros,
-- sem pontos. gabarito_no_encerramento libera no encerramento o gabarito dos
-- desafios que aguardavam a liberação manual do professor; gabarito_so_no_encerramento
-- segura todos os gabaritos até o encerramento.
-- Rode DEPOIS de 20261111120000_especial_configuracoes.sql. Pode rodar mais de uma vez.

alter table temporadas add column if not exists encerramento date;
alter table temporadas add column if not exists gabarito_no_encerramento boolean not null default true;
-- true = nenhum gabarito aparece durante a temporada; tudo sai de uma vez no encerramento.
alter table temporadas add column if not exists gabarito_so_no_encerramento boolean not null default false;
alter table temporadas drop constraint if exists temporadas_encerramento_check;
alter table temporadas add constraint temporadas_encerramento_check
  check (encerramento is null or (encerramento >= inicio and encerramento <= data_prova));

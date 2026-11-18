-- Os personagens novos (PR #58) têm números acima de 44, mas a trava antiga do banco
-- só aceitava avatar de 0 a 44. Resultado: cadastro com "Griô do Mali" ou
-- "Antonieta de Barros" (ou sorteio desses) falhava e aparecia "apelido em uso";
-- trocar para um personagem novo no perfil dava "Não foi possível salvar".
-- O app já confere se o número existe; aqui só exigimos que não seja negativo.
-- Pode rodar mais de uma vez.
alter table alunos drop constraint if exists alunos_avatar_check;
alter table alunos add constraint alunos_avatar_check check (avatar >= 0);

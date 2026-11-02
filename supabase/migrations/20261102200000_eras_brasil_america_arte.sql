-- Desafio aberto: História do Brasil vira três eras (Pré-Cabralino e Colonial,
-- Império, República) e entram História da América e História da Arte.
-- As 10 questões que eram da era "brasil" são redistribuídas; a questão de pares,
-- que mistura Colônia e República, vai para História Temática.
-- Partidas antigas da era "brasil" ficam como estão (o app ainda mostra o nome).
-- Idempotente: pode rodar mais de uma vez.

alter table questoes drop constraint if exists questoes_era_publica_check;

update questoes set era_publica = 'brasil_colonia', capitulo = 'Brasil Pré-Cabralino e Colonial'
  where era_publica = 'brasil' and id in (
    'dacdece5-b5b8-4e0c-987a-8ef11598ef69', -- causa e consequência: mineração
    'a4532a1e-e4e3-415e-8141-9298b7c702fc', -- intruso: revoltas coloniais
    '9f7a0304-1344-4815-a93a-62f6dafd63b8'  -- lacunas: economia açucareira
  );
update questoes set era_publica = 'brasil_imperio', capitulo = 'Brasil Império'
  where era_publica = 'brasil' and id in (
    '519c4a20-1cc3-4acd-b288-9ed25647b690', -- ordenar: independência
    'fbab2983-014a-4a08-8ba6-56aeb7db8586'  -- múltipla escolha: 1850, tráfico e Lei de Terras
  );
update questoes set era_publica = 'brasil_republica', capitulo = 'Brasil República'
  where era_publica = 'brasil' and id in (
    '16453751-9e59-48cd-8861-2cbed3d0605a', -- V ou F: leis trabalhistas de Vargas
    '044d698f-bbb6-45d7-977c-6b2c9fd6a67f', -- interpretação: Revolta da Vacina
    'e77570d6-a403-4d70-b042-cb1ec65231e8', -- classificar: Primeira República x Era Vargas
    '47637ff0-4829-404c-8bba-674c13cb5844'  -- ponto de vista: Canudos
  );
update questoes set era_publica = 'tematica', capitulo = 'História Temática'
  where era_publica = 'brasil' and id = 'c624cb2c-33f1-4d97-9d1d-a7e940c3eddf'; -- pares: conceitos
-- Alguma questão de Brasil que não estava na lista volta para o banco geral, para o professor reclassificar.
update questoes set era_publica = null where era_publica = 'brasil';

alter table questoes add constraint questoes_era_publica_check
  check (era_publica is null or era_publica in
    ('pre_historia', 'antiga', 'medieval', 'moderna', 'contemporanea',
     'brasil_colonia', 'brasil_imperio', 'brasil_republica', 'america', 'arte', 'tematica'));

-- Perfil do aluno (avatar e cor), controle de acesso pelo professor e novas
-- opções de desafio (tempo fixo por questão e saída de tela que zera a questão).

alter table alunos
  add column avatar smallint not null default 0 check (avatar between 0 and 19),
  add column cor smallint not null default 0 check (cor between 0 and 11),
  add column aprovado boolean not null default true,
  add column ultimo_acesso timestamptz,
  add column total_acessos int not null default 0;

-- Novos cadastros esperam a aprovação do professor (pode ser desligado por turma).
alter table turmas add column exige_aprovacao boolean not null default true;

alter table desafios
  add column tempo_por_questao_s int check (tempo_por_questao_s between 10 and 180),
  add column saida_zera_questao boolean not null default false;

alter table respostas add column zerada_por_saida boolean not null default false;

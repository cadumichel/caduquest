# CaduQuest

Revisão gamificada de História: cada turma disputa uma **temporada** (bimestre ou trimestre) que termina na prova, com desafios semanais, ranking e geração de questões com o Claude.

Esta é a **fase 1 (núcleo)** do [escopo do MVP](https://claude.ai/artifact/VsBDAHEGnnpTXbas2KbCFf).

## O que já funciona

**Professor** (`/professor`)

- Login com e-mail e senha ou Google, limitado aos e-mails de `PROFESSORES_EMAILS`.
- Escolas (bimestre ou trimestre) e turmas, cada uma com código de acesso.
- Turma: lista de alunos (apelido + nome real só para o professor), redefinir PIN, remover aluno, ranking completo.
- Temporadas: nome, narrativa, datas, capítulos (viram a trilha do aluno).
- Banco de questões com filtros (capítulo, habilidade, tipo, dificuldade, status, uso anterior), publicar em lote, duplicar.
- Editor com upload de imagem e prévia ao vivo, embaralhada como o aluno vê.
- Gerar com o Claude: capítulo, habilidades, tipos, quantidade, texto da apostila e questão modelo. O lote entra como rascunho.
- Montar desafio semanal (5 a 15 questões publicadas, janela de abertura e fechamento, indicador da meta de 40% com imagem).
- Resultado por desafio: quem fez, pontos, acertos, tempo esgotado, saídas da tela, acerto por questão e exportação CSV.

**Aluno** (`/entrar`, sem e-mail)

- Entra com código da turma + apelido + PIN de 4 números. Bloqueio de 15 min após 5 PINs errados. Um aparelho por vez.
- Mapa da temporada: trilha de capítulos, contagem até a prova, desafios abertos e passados.
- Desafio: uma questão por vez, cronômetro, sem voltar, uma tentativa.
- Resultado: pontos e acertos na hora; gabarito comentado só depois que o desafio fecha.
- Ranking: top 10 e a própria posição (as últimas posições nunca aparecem).

**Tipos de questão:** múltipla escolha, verdadeiro ou falso em bloco, linha do tempo (arrastar ou setas) e pares.

**Defesas contra IA da fase 1:** tempo limite por questão controlado pelo servidor (o tempo corre mesmo fora da tela), enunciado em imagem, ordem das questões e dos itens embaralhada por aluno, texto não selecionável, uma tentativa, gabarito só após o fechamento e contagem de saídas da tela (alerta, sem punição automática).

**Pontuação:** 10 pontos por acerto; V/F, linha do tempo e pares dão crédito parcial proporcional. Desempate do ranking pela taxa de acerto.

## Ficam para a fase 2

Desafio relâmpago em sala, aposta de confiança, dois andares, lacunas, detetive de fontes, caça ao anacronismo, constância, ligas, equipes, medalhas, revisão espaçada e painel de alertas.

## Arquitetura

- Next.js 16 (App Router) + Tailwind 4, PWA instalável (`src/app/manifest.ts`).
- Supabase (Postgres + Auth + Storage). Professor acessa via RLS (`supabase/migrations`). Aluno não tem conta no Supabase: o servidor valida a sessão (cookie assinado) e acessa com a chave secreta, sempre filtrando pela turma do aluno. O gabarito nunca vai para o navegador durante o desafio.
- Claude (`claude-opus-5-5`) com saída estruturada para gerar lotes (`src/lib/claude/gerar.ts`).

## Como colocar no ar

1. **Supabase**: crie um projeto na região _South America (São Paulo)_. Rode a migração:
   ```bash
   npx supabase link --project-ref SEU_REF
   npx supabase db push
   ```
   Em _Authentication > Sign In / Providers_, desligue "Allow new users to sign up" e crie seu usuário em _Authentication > Users_. Para o Google, ative o provedor e adicione `https://SEU-DOMINIO/auth/callback` às URLs de redirecionamento.
2. **Vercel**: importe o repositório e configure as variáveis de `.env.example`. O `vercel.json` agenda uma consulta diária (`/api/manter-ativo`) para o Supabase gratuito não pausar por inatividade nas férias; ela só funciona com `CRON_SECRET` configurado.
3. **Conector do Claude** (opcional): crie `MCP_CHAVE` na Vercel e, no Claude, adicione um conector personalizado em _Configurações > Conectores_ com o endereço `https://SEU-DOMINIO/api/mcp/SUA_CHAVE`. O conector age em nome do primeiro e-mail de `PROFESSORES_EMAILS` e oferece `listar_turmas`, `listar_questoes`, `adicionar_questoes` (entram como rascunho) e `criar_desafio` (prévia e depois confirmação).
4. Entre em `/professor`, crie escola, turma e temporada, e passe o código da turma aos alunos.

## Desenvolvimento local

```bash
npm install
npx supabase start          # precisa de Docker
cp .env.example .env.local  # preencha com as chaves do `supabase start`
npm run dev
```

Testes: `npm test` · Tipos: `npm run typecheck` · Lint: `npm run lint`

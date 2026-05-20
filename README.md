# NEXO

Marketplace/API-first para contratação, agenda, reputação e pagamento de freelancers do mercado de eventos.

A NEXO conecta empresas que produzem eventos a profissionais freelancers, com fluxo de cadastro, busca, convite, contrato, pagamento simulado, carteira, avaliações, notificações, contestações e operação administrativa.

## Direção do Produto

O produto segue o documento de referência mais recente `../Esse APP de freelancers.txt`, mantendo o nome NEXO como marca provisória até decisão final.

Prioridade funcional do produto:

- Reduzir ligações, WhatsApp, planilhas e pagamentos manuais na montagem de equipes para eventos.
- Permitir busca de freelancers por nome/apelido, especialidade, localização, faixa de diária, disponibilidade, ferramentas e habilidades.
- Organizar eventos com múltiplas funções e contratação de vários profissionais por evento ou data.
- Dar ao freelancer perfil forte, agenda profissional, controle de ganhos, reputação e recebimento mais seguro.
- Centralizar pagamento pela plataforma, com carteira, meios de pagamento reais, repasse e comprovantes.
- Criar regras claras para aceite, confirmação, no-show, contestação, avaliação e liberação de pagamento.

## Estado do Projeto

MVP em validação local.

Já implementado:

- Site público responsivo de apresentação da plataforma.
- Alternância global entre tema claro e escuro com preferência salva no navegador.
- Cadastro e login para empresas, freelancers e admin.
- Recuperação de senha com token temporário para ambiente local.
- Dashboard logado separado por perfil.
- Gestão de eventos.
- Busca avançada de profissionais disponíveis por nome/apelido, cidade, especialidade, faixa de diária, ferramentas, transporte e agenda.
- Calendário visual do freelancer com eventos futuros, realizados, indisponibilidades e recebimentos.
- Fluxo inicial de oportunidades abertas e candidaturas, com aprovação pela empresa gerando contrato.
- Chat interno por convite ou candidatura para negociação entre empresa e freelancer.
- Negociação estruturada de valor em convites, com oferta, contraproposta, aceite e contrato usando o valor acordado.
- Convites individuais ou em lote entre empresa e freelancers.
- Contratos originados a partir de convites aceitos.
- Ciclo de contrato com pagamento, conclusão, no-show e cancelamento.
- Pagamento simulado, split da plataforma e carteira do freelancer.
- Gateway de pagamento abstraído com provider simulado configurável.
- Avaliações pós-contrato com atualização automática da média de reputação.
- Central de notificações com avisos automáticos para convites, pagamentos, avaliações e contestações.
- Abertura e resolução administrativa de contestações.
- Verificação administrativa de empresas e profissionais.
- Upload local autenticado de documentos e imagens para verificação cadastral.
- Relatórios operacionais por perfil com KPIs, gráficos de status e série temporal financeira real.
- Base inicial de testes automatizados para regras de contrato, pagamento e avaliação.
- Testes e2e de fluxos principais com Playwright.
- Healthcheck público da API em `/api/health`.
- Pipeline inicial de CI com lint, testes, build e e2e.
- Seed com contas e cenário demo.

Próximas entregas orientadas pelo novo documento:

- Carteira da empresa com carga de saldo e complemento de pagamento.
- Gateway real com cartão, boleto/Pix quando definido, comprovantes e webhooks.
- Regras automáticas de pós-evento: prazo de 1 dia útil para no-show, contestação e liberação de pagamento.
- Payout/saque real para conta do freelancer, com política de taxas da empresa e percentual do freelancer.
- Linguagem de "Contestações" aplicada na interface, mantendo `disputes` como nome técnico interno.
- Upload específico de foto/logo/avatar, além dos documentos de verificação.
- Provider real de e-mail para recuperação de senha e notificações.
- Notificações em tempo real, e-mail ou WhatsApp.
- Storage externo para documentos/imagens, como S3 ou R2, com retenção e auditoria.
- Auditoria real de ações administrativas e financeiras.
- Deploy, monitoramento e política completa de produção.
- PWA/mobile responsivo avançado.

## Stack

- Monorepo com pnpm workspaces.
- API: NestJS modular.
- Web: Next.js App Router.
- Banco: PostgreSQL.
- ORM: Prisma.
- Cache/filas: Redis preparado para uso futuro.
- Autenticação: JWT + refresh token.
- UI: React, CSS global e lucide-react para ícones.

## Estrutura

```txt
apps/
  api/          API NestJS, Prisma, módulos de domínio e seed
  web/          Aplicação Next.js, site público e dashboard
packages/
  shared/       Pacote compartilhado preparado para tipos/utilitários
  ui/           Pacote UI preparado para componentes compartilhados
docker-compose.yml
pnpm-workspace.yaml
```

## Requisitos

- Node.js compatível com o projeto.
- pnpm `10.33.0`.
- Docker e Docker Compose para PostgreSQL e Redis.

## Configuração Local

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Variáveis principais:

```env
DATABASE_URL="postgresql://nexus:nexus@localhost:5432/nexus?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
NEXT_PUBLIC_API_URL="http://localhost:3001"
PAYMENT_GATEWAY_PROVIDER="simulated"
PAYMENT_GATEWAY_TRANSACTION_PREFIX="sim"
PAYMENT_GATEWAY_PLATFORM_RECIPIENT_ID="platform"
EMAIL_PROVIDER="local"
EMAIL_EXPOSE_DEV_TOKENS="true"
JSON_BODY_LIMIT="8mb"
```

## Pagamentos

O fluxo de pagamento já passa por uma camada genérica de gateway. Em ambiente local, use:

```env
PAYMENT_GATEWAY_PROVIDER="simulated"
```

Quando a administração de pagamentos estiver definida, o próximo ajuste fica concentrado no módulo de pagamentos: adicionar o provider real, mapear `gatewayTransactionId`, recebedores do split e eventos de confirmação/estorno do gateway.

## E-mail

O fluxo de recuperação de senha já passa por uma camada de e-mail configurável. Em ambiente local, use:

```env
EMAIL_PROVIDER="local"
EMAIL_EXPOSE_DEV_TOKENS="true"
```

Nesse modo, a API registra o token no log e também o retorna para facilitar testes manuais. Para produção, o próximo ajuste fica concentrado no serviço de e-mail: adicionar um provider SMTP ou transacional e desativar `EMAIL_EXPOSE_DEV_TOKENS`.

## Documentos

Empresas e freelancers podem enviar documentos na tela de perfil. O ambiente local aceita PDF, JPG, PNG e WebP até 5 MB por arquivo e salva em `apps/api/uploads/verification-documents`.

A tela administrativa de verificações lista os documentos enviados e abre os arquivos por endpoint autenticado. Para produção, o próximo ajuste fica concentrado no módulo de documentos: trocar o armazenamento local por S3/R2, adicionar antivírus/validação documental e definir retenção/auditoria dos arquivos.

## Rodando Localmente

Instale dependências:

```bash
pnpm install
```

Suba banco e Redis:

```bash
docker compose up -d
```

Rode as migrations e o seed:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

Inicie API e Web:

```bash
pnpm dev
```

URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## Comandos Úteis

```bash
pnpm dev
pnpm build
pnpm test
pnpm e2e
pnpm ci:check
pnpm lint
pnpm format
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:seed
```

Checks usados durante o desenvolvimento:

```bash
pnpm --filter @nexus/web exec tsc --noEmit
pnpm --filter @nexus/api lint
pnpm --filter @nexus/api test
pnpm e2e
pnpm ci:check
git diff --check
```

## CI

O workflow `.github/workflows/ci.yml` sobe PostgreSQL e Redis, cria um `.env` temporário, aplica migrations com `pnpm prisma:deploy` e executa `pnpm ci:check`.

O comando `pnpm ci:check` roda Prisma generate, typecheck da API, typecheck da Web, testes unitários da API, build do monorepo e testes e2e.

## Contas Demo

Após rodar `pnpm prisma:seed`, use:

- Admin: `admin@nexo.local` / `Nexo@12345`
- Empresa: `empresa@nexo.local` / `Nexo@12345`
- Freelancer: `freelancer@nexo.local` / `Nexo@12345`

Contas extras de empresas:

- `aurora@nexo.local` / `Nexo@12345`
- `litoral@nexo.local` / `Nexo@12345`
- `sertao@nexo.local` / `Nexo@12345`

Contas extras de freelancers:

- `audio@nexo.local` / `Nexo@12345`
- `luz@nexo.local` / `Nexo@12345`
- `foto@nexo.local` / `Nexo@12345`
- `dj@nexo.local` / `Nexo@12345`
- `recepcao@nexo.local` / `Nexo@12345`
- `seguranca@nexo.local` / `Nexo@12345`
- `bar@nexo.local` / `Nexo@12345`
- `streaming@nexo.local` / `Nexo@12345`
- `montagem@nexo.local` / `Nexo@12345`

O seed cria uma base de testes com 4 empresas, 10 freelancers, 5 eventos, múltiplas especialidades, convites pendentes/aceitos/recusados, contratos em diferentes status, pagamentos simulados, carteira com repasse, avaliações, notificações, disponibilidade bloqueada e contestação em análise.

## Rotas Web

Site público:

- `/`: apresentação da NEXO.
- `/empresas`: página para empresas contratantes.
- `/freelancers`: página para profissionais.
- `/login`: entrada de usuários.
- `/recuperar-senha`: solicitação de token e redefinição de senha.
- `/cadastro/empresa`: cadastro de empresa.
- `/cadastro/freelancer`: cadastro de profissional.

Dashboard:

- `/dashboard`: visão geral por perfil.
- `/dashboard/eventos`: criação/listagem de eventos para empresas e visão operacional para admin.
- `/dashboard/agenda`: calendário visual do freelancer com eventos, bloqueios de agenda e recebimentos.
- `/dashboard/oportunidades`: eventos abertos para freelancers e candidaturas recebidas para empresas.
- `/dashboard/chat`: conversas de negociação criadas por convite ou candidatura.
- `/dashboard/profissionais`: busca de profissionais e envio de convites.
- `/dashboard/convites`: convites enviados e recebidos.
- `/dashboard/notificacoes`: central de notificações.
- `/dashboard/pagamentos`: contratos, pagamentos simulados, métricas admin, liberação de repasse e carteira.
- `/dashboard/avaliacoes`: avaliações pós-contrato e histórico de reputação.
- `/dashboard/disputas`: abertura, histórico, filtros e resolução admin de contestações.
- `/dashboard/verificacoes`: aprovação admin de empresas e profissionais.
- `/dashboard/usuarios`: listagem admin com filtros e ativação/desativação de acessos.
- `/dashboard/perfil`: dados de perfil, especialidades e disponibilidade.

## Fluxos Principais

Fluxo empresa:

1. Cadastra ou acessa a conta.
2. Completa o perfil da empresa.
3. Cria um evento.
4. Busca profissionais compatíveis.
5. Envia convite com oferta de valor ou analisa candidaturas recebidas.
6. Negocia oferta/contraproposta quando necessário.
7. Aprova uma candidatura ou convite aceito para gerar contrato.
8. Acompanha contrato.
9. Simula pagamento.
10. Conclui, cancela ou marca no-show.
11. Avalia o profissional após contrato concluído ou pago.

Evolução prevista do fluxo empresa:

- Buscar profissionais por nome/apelido, faixa de diária, ferramentas, habilidades e transporte.
- Contratar múltiplos profissionais de especialidades diferentes no mesmo evento com mais controle operacional.
- Carregar carteira da empresa ou complementar saldo no pagamento.
- Usar cartão/boleto/Pix quando gateway real for conectado.
- Receber alerta pós-evento para avaliar e marcar no-show dentro do prazo operacional.
- Visualizar comprovantes, custos por evento e relatórios financeiros mais completos.

Fluxo freelancer:

1. Cadastra ou acessa a conta.
2. Completa perfil, especialidades, diária e agenda.
3. Busca oportunidades abertas compatíveis.
4. Envia candidatura com mensagem e proposta de valor.
5. Recebe convites.
6. Aceita, recusa ou faz contraproposta de valor.
7. Acompanha contratos e carteira.
8. Acompanha agenda em calendário visual.
9. Conclui ou cancela contratos elegíveis.
10. Avalia a empresa após contrato concluído ou pago.

Evolução prevista do fluxo freelancer:

- Negociar valor em chat interno quando a empresa permitir.
- Informar dados bancários completos ligados ao provedor de pagamento.
- Acompanhar ganhos, recebimentos pendentes, repasses e comprovantes.

Fluxo admin:

1. Acompanha relatórios e dados operacionais.
2. Verifica empresas e profissionais.
3. Ativa ou desativa usuários.
4. Visualiza pagamentos.
5. Libera repasses simulados.
6. Analisa e resolve contestações.

## API

A API usa prefixo global `/api`.

Módulos principais:

- `auth`: cadastro, login e refresh token.
- `users`: dados de usuário.
- `companies`: perfil de empresa.
- `freelancers`: perfil, especialidades e busca pública.
- `skills`: especialidades.
- `availability`: bloqueios de agenda do freelancer.
- `events`: eventos, requisitos e busca de profissionais disponíveis.
- `invitations`: convites e respostas.
- `applications`: oportunidades abertas, candidaturas, aprovação/recusa e geração de contrato.
- `contracts`: contratos por perfil.
- `calendar`: experiência web inicial entregue com contratos, disponibilidade e carteira; módulo dedicado previsto para evolução.
- `chat`: conversas internas vinculadas a convites, candidaturas e contratos.
- `payments`: pagamento simulado, split e liberação.
- `wallet`: carteira e transações.
- `reviews`: avaliações e cálculo de reputação.
- `notifications`: notificações e leitura.
- `disputes`: abertura e acompanhamento técnico de contestações.
- `admin`: listagens operacionais, verificações e contestações.
- `audit`: previsto para trilha de auditoria real.
- `reports`: resumo operacional por perfil.

## Modelo de Dados

Entidades centrais:

- `User`
- `CompanyProfile`
- `FreelancerProfile`
- `Skill`
- `FreelancerSkill`
- `Availability`
- `Event`
- `EventRequirement`
- `Invitation`
- `Contract`
- `Payment`
- `PaymentSplit`
- `Wallet`
- `Transaction`
- `Payout`
- `Review`
- `Dispute`
- `Notification`
- `AuditLog`

## Observações

Os arquivos de referência de marca/produto ficam fora deste repositório. A imagem de apoio usada pelo site público está em `apps/web/public/nexo-brand-board.jpeg`.

O nome técnico do repositório ainda é `nexus`, mas a marca apresentada na interface é NEXO. Os materiais de referência usam nomes diferentes (`nexus`, `NEXO`, `NEXOX` e `Tratuz`); a decisão final de marca fica pendente e não deve bloquear a evolução funcional do MVP.

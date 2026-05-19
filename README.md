# NEXO

Marketplace/API-first para contratação, agenda, reputação e pagamento de freelancers do mercado de eventos.

A NEXO conecta empresas que produzem eventos a profissionais freelancers, com fluxo de cadastro, busca, convite, contrato, pagamento simulado, carteira, avaliações, notificações, disputas e operação administrativa.

## Estado do Projeto

MVP em validação local.

Já implementado:

- Site público responsivo de apresentação da plataforma.
- Cadastro e login para empresas, freelancers e admin.
- Dashboard logado separado por perfil.
- Gestão de eventos.
- Busca de profissionais disponíveis por cidade, especialidade e agenda.
- Convites entre empresa e freelancer.
- Contratos originados a partir de convites aceitos.
- Pagamento simulado, split da plataforma e carteira do freelancer.
- Avaliações pós-contrato com atualização automática da média de reputação.
- Central de notificações com avisos automáticos para convites, pagamentos, avaliações e disputas.
- Abertura e resolução administrativa de disputas.
- Verificação administrativa de empresas e profissionais.
- Relatórios operacionais básicos por perfil.
- Seed com contas e cenário demo.

Ainda pendente para produção:

- Gateway real de pagamento.
- Recuperação de senha real.
- Upload e validação de documentos/imagens.
- Testes automatizados dos fluxos principais.
- Notificações em tempo real, e-mail ou WhatsApp.
- Deploy, CI e monitoramento.
- Políticas completas de saque, chargeback e auditoria.

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
```

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
pnpm lint
pnpm format
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Checks usados durante o desenvolvimento:

```bash
pnpm --filter @nexus/web exec tsc --noEmit
pnpm --filter @nexus/api lint
git diff --check
```

## Contas Demo

Após rodar `pnpm prisma:seed`, use:

- Admin: `admin@nexo.local` / `Nexo@12345`
- Empresa: `empresa@nexo.local` / `Nexo@12345`
- Freelancer: `freelancer@nexo.local` / `Nexo@12345`

O seed também cria um evento demo, um convite aceito e um contrato pendente de pagamento para validar o fluxo empresa -> pagamento -> admin libera -> carteira do freelancer.

## Rotas Web

Site público:

- `/`: apresentação da NEXO.
- `/empresas`: página para empresas contratantes.
- `/freelancers`: página para profissionais.
- `/login`: entrada de usuários.
- `/recuperar-senha`: tela visual de recuperação de senha.
- `/cadastro/empresa`: cadastro de empresa.
- `/cadastro/freelancer`: cadastro de profissional.

Dashboard:

- `/dashboard`: visão geral por perfil.
- `/dashboard/eventos`: criação e listagem de eventos.
- `/dashboard/profissionais`: busca de profissionais e envio de convites.
- `/dashboard/convites`: convites enviados e recebidos.
- `/dashboard/notificacoes`: central de notificações.
- `/dashboard/pagamentos`: contratos, pagamentos simulados, liberação admin e carteira.
- `/dashboard/avaliacoes`: avaliações pós-contrato e histórico de reputação.
- `/dashboard/disputas`: abertura, histórico e resolução admin de disputas.
- `/dashboard/verificacoes`: aprovação admin de empresas e profissionais.
- `/dashboard/usuarios`: listagem admin e ativação/desativação de acessos.
- `/dashboard/perfil`: dados de perfil, especialidades e disponibilidade.

## Fluxos Principais

Fluxo empresa:

1. Cadastra ou acessa a conta.
2. Completa o perfil da empresa.
3. Cria um evento.
4. Busca profissionais compatíveis.
5. Envia convite.
6. Acompanha contrato.
7. Simula pagamento.
8. Avalia o profissional após contrato concluído ou pago.

Fluxo freelancer:

1. Cadastra ou acessa a conta.
2. Completa perfil, especialidades, diária e agenda.
3. Recebe convites.
4. Aceita ou recusa convites.
5. Acompanha contratos e carteira.
6. Avalia a empresa após contrato concluído ou pago.

Fluxo admin:

1. Acompanha relatórios e dados operacionais.
2. Verifica empresas e profissionais.
3. Ativa ou desativa usuários.
4. Visualiza pagamentos.
5. Libera repasses simulados.
6. Analisa e resolve disputas.

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
- `contracts`: contratos por perfil.
- `payments`: pagamento simulado, split e liberação.
- `wallet`: carteira e transações.
- `reviews`: avaliações e cálculo de reputação.
- `notifications`: notificações e leitura.
- `disputes`: abertura e acompanhamento de disputas.
- `admin`: listagens operacionais, verificações e disputas.
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
- `WalletTransaction`
- `Review`
- `Dispute`
- `Notification`
- `AuditLog`

## Observações

Os arquivos de referência de marca/produto ficam fora deste repositório. A imagem de apoio usada pelo site público está em `apps/web/public/nexo-brand-board.jpeg`.

O nome técnico do repositório ainda é `nexus`, mas a marca apresentada na interface é NEXO.

# nexus

Marketplace/API-first para contratação, agenda, reputação e pagamento de freelancers do mercado de eventos.

## Stack

- Monorepo com pnpm workspaces
- API: NestJS modular
- Web: Next.js App Router
- Banco: PostgreSQL
- ORM: Prisma
- Cache/filas: Redis preparado para uso futuro
- Autenticação: JWT + refresh token

## Rodando localmente

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

API: `http://localhost:3001`

Web: `http://localhost:3000`

## Estrutura do produto web

- `/`: site público de apresentação da NEXO
- `/empresas`: apresentação para empresas contratantes
- `/freelancers`: apresentação para profissionais
- `/login`: entrada para usuários cadastrados
- `/cadastro/empresa`: cadastro de empresas contratantes
- `/cadastro/freelancer`: cadastro de profissionais
- `/dashboard`: área logada por perfil
- `/dashboard/eventos`: gestão de eventos
- `/dashboard/profissionais`: busca e convite de profissionais
- `/dashboard/convites`: convites enviados/recebidos
- `/dashboard/pagamentos`: contratos, pagamentos e carteira

## Contas demo

Após rodar `pnpm prisma:seed`, use:

- Admin: `admin@nexo.local` / `Nexo@12345`
- Empresa: `empresa@nexo.local` / `Nexo@12345`
- Freelancer: `freelancer@nexo.local` / `Nexo@12345`

O seed também cria um evento demo, um convite aceito e um contrato pendente de pagamento para validar o fluxo empresa -> pagamento -> admin libera -> carteira do freelancer.

## Fase atual

MVP em validação:

- Monorepo
- API NestJS
- Prisma + PostgreSQL
- Auth
- Users
- Companies
- Freelancers
- Skills
- Eventos, convites e contratos
- Pagamento simulado, split e carteira
- Admin básico
- Relatórios operacionais por perfil
- Seed de especialidades e cenário demo

Os arquivos de referência de marca/produto ficam fora deste repositório.

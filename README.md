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

## Fase atual

Fase 1 do MVP:

- Monorepo
- API NestJS
- Prisma + PostgreSQL
- Auth
- Users
- Companies
- Freelancers
- Skills
- Seed inicial de especialidades

Os arquivos de referência de marca/produto ficam fora deste repositório.

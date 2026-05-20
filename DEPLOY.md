# Deploy e infraestrutura

Este guia descreve uma infraestrutura recomendada para colocar a NEXO no ar em um VPS, permitindo que socios acompanhem a evolucao do produto conforme as alteracoes forem commitadas.

## Arquitetura recomendada

Para a fase atual do projeto, a melhor infraestrutura e uma **homologacao em VPS unico**, com servicos simples, previsiveis e baratos:

```txt
Internet
  |
  | HTTPS
  v
Nginx + Certbot
  |-----------------------> Web Next.js :3000
  |
  | /api ou api.dominio --> API NestJS :3001

PostgreSQL 16
Redis 7
PM2
```

Essa estrutura e suficiente para validar o produto com socios, demonstrar fluxos, receber feedback e acompanhar releases sem pagar por uma arquitetura complexa antes da hora.

## Infraestrutura ideal por fase

### Fase 1: homologacao para socios

Use esta fase agora.

- 1 VPS Linux, preferencialmente Ubuntu LTS.
- 2 vCPU, 4 GB RAM e 40 GB SSD como ponto de partida.
- Nginx como proxy reverso.
- Certbot para HTTPS gratuito.
- PostgreSQL e Redis via Docker Compose.
- API NestJS e Web Next.js rodando com PM2.
- Deploy por `git pull`, `pnpm install`, migrations, build e restart.
- Subdominios:
  - `app.seudominio.com.br` para o painel/site.
  - `api.seudominio.com.br` para a API.

### Fase 2: beta com usuarios reais

Quando empresas e freelancers reais comecarem a usar:

- VPS maior ou dois servidores separados.
- Banco PostgreSQL gerenciado, se o orcamento permitir.
- Backup diario automatico do banco.
- Storage externo para documentos e imagens, como S3 ou Cloudflare R2.
- E-mail transacional real para recuperacao de senha e notificacoes.
- Gateway de pagamento real com webhooks.
- Logs persistentes e monitoramento de erro.
- Rotina automatica para regras pos-evento e liberacao de repasses.

### Fase 3: producao critica

Quando houver operacao financeira real e maior volume:

- Banco gerenciado com backup, replica e restore testado.
- Redis gerenciado ou isolado.
- Aplicacao em containers ou servico gerenciado.
- Pipeline CI/CD com deploy automatico apos merge.
- Observabilidade com logs, metricas, alertas e rastreamento.
- Politica de seguranca, LGPD, auditoria administrativa e financeira.
- Separacao clara entre ambientes: `staging` e `production`.

## Requisitos do VPS

Instale os pacotes base:

```bash
sudo apt update
sudo apt install -y git curl nginx docker.io docker-compose-plugin
```

Instale Node.js LTS e habilite o pnpm pelo Corepack:

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

Instale PM2:

```bash
pnpm add -g pm2
```

Opcional, mas recomendado:

```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
```

## Preparando o projeto

Clone o repositorio no servidor:

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <URL_DO_REPOSITORIO> nexus
cd nexus
```

Instale as dependencias:

```bash
pnpm install --frozen-lockfile
```

Crie o `.env`:

```bash
cp .env.example .env
```

Exemplo de `.env` para homologacao:

```env
DATABASE_URL="postgresql://nexus:SENHA_FORTE@localhost:5432/nexus?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="troque-por-um-segredo-grande"
JWT_REFRESH_SECRET="troque-por-outro-segredo-grande"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
NEXT_PUBLIC_API_URL="https://api.seudominio.com.br"
PAYMENT_GATEWAY_PROVIDER="simulated"
PAYMENT_GATEWAY_TRANSACTION_PREFIX="sim"
PAYMENT_GATEWAY_PLATFORM_RECIPIENT_ID="platform"
PLATFORM_COMPANY_FEE_BASIS_POINTS="800"
EMAIL_PROVIDER="local"
EMAIL_EXPOSE_DEV_TOKENS="false"
JSON_BODY_LIMIT="8mb"
```

Importante:

- Nunca use os segredos do `.env.example` em servidor.
- Em homologacao, o pagamento pode continuar como `simulated`.
- Para producao, `EMAIL_PROVIDER="local"` e `PAYMENT_GATEWAY_PROVIDER="simulated"` devem ser substituidos por providers reais.

## Banco e Redis

O `docker-compose.yml` atual sobe PostgreSQL e Redis. Para homologacao, ele pode ser usado no VPS:

```bash
docker compose up -d
```

Depois aplique as migrations:

```bash
pnpm prisma:deploy
pnpm prisma:seed
```

Use `pnpm prisma:seed` apenas em ambiente de demonstracao. Em producao real, o seed deve ser evitado ou adaptado.

## Build

Gere Prisma Client e compile API/Web:

```bash
pnpm prisma:generate
pnpm build
```

## Rodando com PM2

Inicie a API:

```bash
pm2 start "pnpm --filter @nexus/api start" --name nexus-api
```

Inicie o Web:

```bash
PORT=3000 pm2 start "pnpm --filter @nexus/web start" --name nexus-web
```

Salve o processo para reiniciar junto com o servidor:

```bash
pm2 save
pm2 startup
```

O comando `pm2 startup` vai imprimir um comando com `sudo`. Execute exatamente o comando exibido por ele.

## Nginx

Exemplo usando dois subdominios.

API:

```nginx
server {
  server_name api.seudominio.com.br;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Web:

```nginx
server {
  server_name app.seudominio.com.br;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Depois:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

Instale Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Gere os certificados:

```bash
sudo certbot --nginx -d app.seudominio.com.br -d api.seudominio.com.br
```

## Deploy de novas alteracoes

Depois que voce fizer commits e enviar para o repositorio, rode no VPS:

```bash
cd /var/www/nexus
git pull origin main
pnpm install --frozen-lockfile
pnpm prisma:deploy
pnpm build
pm2 restart nexus-api nexus-web
```

Se quiser, crie um script local no servidor em `/var/www/nexus/deploy.sh`:

```bash
#!/usr/bin/env bash
set -e

cd /var/www/nexus
git pull origin main
pnpm install --frozen-lockfile
pnpm prisma:deploy
pnpm build
pm2 restart nexus-api nexus-web
```

Depois:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Checklist antes de liberar para socios

- Dominio ou subdominio apontando para o IP do VPS.
- HTTPS ativo.
- `.env` com segredos fortes.
- `NEXT_PUBLIC_API_URL` apontando para a API publica.
- `EMAIL_EXPOSE_DEV_TOKENS="false"`.
- Banco e Redis rodando.
- Migrations aplicadas.
- Seed executado apenas se for ambiente demonstrativo.
- API respondendo em `/api/health`.
- Login de admin validado.
- PM2 salvo com `pm2 save`.

## O que ainda falta para producao real

Antes de operar dinheiro real e documentos reais em escala, ainda faltam pontos importantes:

- Gateway de pagamento real com Pix/cartao/boleto, webhooks e comprovantes.
- Payout/saque real para freelancers.
- E-mail transacional real.
- Storage externo para documentos, fotos e logos.
- Backup automatico do banco.
- Monitoramento e alertas.
- Logs persistentes.
- Auditoria administrativa e financeira.
- Politica de retencao de arquivos e dados.
- Hardening de seguranca do VPS.

## Recomendacao atual

Para o momento do projeto, a melhor escolha e:

- **1 VPS de 2 vCPU e 4 GB RAM**.
- **PostgreSQL e Redis no proprio VPS via Docker Compose**.
- **API e Web com PM2**.
- **Nginx + Certbot**.
- **Deploy manual por script**.

Essa configuracao entrega visibilidade para socios rapidamente, sem travar o produto em uma infraestrutura cara ou complexa antes de validar os fluxos principais.

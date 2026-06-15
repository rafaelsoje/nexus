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
- Currículo profissional do freelancer com resumo, experiência, cursos, portfólio, disponibilidade de viagem e detalhes técnicos por especialidade.
- Histórico público resumido de eventos realizados pela plataforma para análise da empresa.
- Fluxo inicial de oportunidades abertas e candidaturas, com aprovação pela empresa gerando contrato.
- Chat interno por convite ou candidatura para negociação entre empresa e freelancer.
- Negociação estruturada de valor em convites, com oferta, contraproposta, aceite e contrato usando o valor acordado.
- Convites individuais ou em lote entre empresa e freelancers.
- Contratos originados a partir de convites aceitos.
- Ciclo de contrato com pagamento, conclusão, no-show e cancelamento.
- Página pública de termos, LGPD e cookies, com aceite obrigatório no cadastro.
- Rodapé público com links institucionais, sociais e app.
- Pagamento marketplace simulado por evento, com múltiplos contratos em um pagamento e split individual por profissional.
- Carteira da empresa com carga de saldo simulada e uso automático no pagamento com complemento via gateway.
- Checkout simulado para aprovação, falha e cancelamento de pagamento via webhook.
- Gateway de pagamento abstraído com provider simulado configurável, recebedores, webhooks e idempotência local.
- Conta gateway/KYC simulada para freelancer em módulo dedicado, com dados de recebimento privados e mascarados.
- Payout/saque simulado solicitado pelo freelancer e processado pelo admin.
- Regra inicial pós-evento com prazo de 1 dia útil para no-show e processamento admin de repasses vencidos.
- Avaliações pós-contrato com atualização automática da média de reputação.
- Central de notificações com avisos automáticos para convites, pagamentos, avaliações e contestações.
- Abertura de contestações com bloqueio financeiro do split.
- Resolução financeira admin de contestações com desbloqueio, liberação de repasse ou estorno para empresa.
- Verificação administrativa de empresas e profissionais.
- Upload local autenticado de documentos e imagens para verificação cadastral.
- Perfil privado do freelancer com nome completo, CPF, documento, endereço completo com busca por CEP e upload/ajuste de avatar.
- Exibição de avatar do freelancer nas telas de análise de profissionais.
- Relatórios operacionais por perfil com KPIs, gráficos de status, série temporal e resumo financeiro de GMV, taxas, splits, payouts, estornos e chargebacks.
- Tela admin de detalhe do pagamento com splits, webhooks, auditoria e ações financeiras.
- Tela admin de auditoria geral com filtros por ação, entidade, usuário e período.
- Base inicial de testes automatizados para regras de contrato, pagamento e avaliação.
- Testes e2e de fluxos principais com Playwright.
- Healthcheck público da API em `/api/health`.
- Pipeline inicial de CI com lint, testes, build e e2e.
- Seed com contas e cenário demo.

Próximas entregas orientadas pelo novo documento:

- Gateway real com cartão, boleto/Pix quando definido, comprovantes e webhooks.
- Automação agendada das regras pós-evento, sem depender de acionamento administrativo manual.
- Payout/saque real para conta do freelancer, com política de taxas da empresa e percentual do freelancer.
- Linguagem de "Contestações" aplicada na interface, mantendo `disputes` como nome técnico interno.
- Separação progressiva entre perfil público e privado, evitando expor carteira, documentos, dados bancários e contato fora das telas autorizadas.
- Upload de logo da empresa e storage externo para fotos, logos e documentos.
- Provider real de e-mail para recuperação de senha e notificações.
- Notificações em tempo real, e-mail ou WhatsApp.
- Storage externo para documentos/imagens, como S3 ou R2, com retenção e auditoria.
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
SEED_DEMO_PASSWORD="change-me-demo-password"
DATABASE_URL="postgresql://nexus:nexus@localhost:5432/nexus?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_NAME="NEXO"
WEB_ORIGINS="http://localhost:3000"
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="1000"
PAYMENT_GATEWAY_PROVIDER="simulated"
PAYMENT_GATEWAY_TRANSACTION_PREFIX="sim"
PAYMENT_GATEWAY_PLATFORM_RECIPIENT_ID="platform"
PLATFORM_COMPANY_FEE_BASIS_POINTS="800"
PLATFORM_FREELANCER_FEE_BASIS_POINTS="0"
PLATFORM_FIXED_CONTRACT_FEE_CENTS="0"
PAYMENT_GATEWAY_FEE_BASIS_POINTS="0"
PAYMENT_GATEWAY_FIXED_FEE_CENTS="0"
POST_EVENT_AUTOMATION_ENABLED="true"
POST_EVENT_AUTOMATION_INTERVAL_MS="3600000"
DOCUMENT_STORAGE_PROVIDER="local"
DOCUMENT_STORAGE_LOCAL_DIR="uploads/verification-documents"
EMAIL_PROVIDER="local"
EMAIL_EXPOSE_DEV_TOKENS="true"
JSON_BODY_LIMIT="8mb"
```

## Pagamentos

O fluxo de pagamento já passa por uma camada genérica de gateway. Em ambiente local, use:

```env
PAYMENT_GATEWAY_PROVIDER="simulated"
```

O modelo atual segue a ideia de marketplace split:

- A empresa paga por evento.
- Um pagamento pode agrupar vários contratos do mesmo evento.
- Cada contrato gera um `PaymentSplit` individual para o freelancer.
- A plataforma registra taxa da empresa, eventual taxa do freelancer, taxa estimada do gateway e valor líquido do freelancer.
- O saldo da carteira da empresa é usado primeiro.
- Se faltar saldo, o gateway simulado cria um checkout em `/checkout/simulado/:gatewayPaymentId`.
- O webhook simulado confirma, falha, cancela, estorna ou marca chargeback.
- A liberação de repasse acontece por split, manualmente pelo admin ou por automação pós-evento.
- O freelancer recebe o repasse na carteira e pode solicitar saque.
- O admin processa payout simulado.

A regra financeira registra, em cada pagamento, o valor cobrado da empresa, taxa da empresa, taxa do freelancer, taxa estimada do gateway, receita da plataforma, valor líquido do freelancer, uso de carteira e complemento via gateway. A taxa de conveniência cobrada da empresa é configurada por `PLATFORM_COMPANY_FEE_BASIS_POINTS`, em basis points. O padrão `800` representa 8%. Também existem `PLATFORM_FREELANCER_FEE_BASIS_POINTS`, `PLATFORM_FIXED_CONTRACT_FEE_CENTS`, `PAYMENT_GATEWAY_FEE_BASIS_POINTS` e `PAYMENT_GATEWAY_FIXED_FEE_CENTS`.

A automação pós-evento roda em intervalo configurável por `POST_EVENT_AUTOMATION_INTERVAL_MS`. Ela avisa a empresa após o fim do evento para avaliar ou marcar no-show dentro de 1 dia útil e, se o prazo expirar sem contestação aberta, libera automaticamente o repasse para a carteira do freelancer com auditoria.

### Como Testar Pagamento Simulado

1. Entre como admin e verifique uma empresa e um freelancer em `/dashboard/verificacoes`.
2. Entre como freelancer e abra `/dashboard/perfil`.
3. No perfil do freelancer, informe CPF/endereço e clique em `Atualizar recebedor` para criar a conta gateway simulada pelo backend.
4. Entre como empresa.
5. Carregue saldo em `/dashboard/pagamentos`, se quiser testar pagamento com carteira.
6. Crie ou use um evento com contratos pendentes.
7. Em `/dashboard/pagamentos`, clique em `Pagar evento`.
8. Se houver complemento gateway, abra o link `Checkout`.
9. No checkout simulado, clique em `Aprovar`, `Falhar` ou `Cancelar`.
10. Volte ao dashboard admin em `/dashboard/pagamentos`.
11. Abra `Detalhes` do pagamento para ver splits, webhooks e auditoria.
12. Depois do evento, marque contrato como concluído ou processe vencidos como admin.
13. Libere split individual ou todos os elegíveis.
14. Entre como freelancer e solicite saque na carteira.
15. Entre como admin e marque o payout como pago ou falho.

### Webhooks Simulados

O endpoint público de desenvolvimento para webhooks simulados é:

```txt
POST /api/payment-webhooks/simulated
```

A rota genérica compatível com o desenho marketplace também está disponível:

```txt
POST /api/webhooks/payments/:gateway
```

Payloads úteis:

```json
{
  "event": "PAYMENT_APPROVED",
  "status": "PAID",
  "transactionId": "sim_marketplace_...",
  "gatewayEventId": "sim_marketplace_..._PAID"
}
```

```json
{
  "event": "PAYMENT_REFUNDED",
  "status": "REFUNDED",
  "transactionId": "sim_marketplace_...",
  "gatewayEventId": "sim_marketplace_..._REFUNDED"
}
```

```json
{
  "event": "PAYMENT_CHARGEBACK",
  "status": "CHARGEBACK",
  "transactionId": "sim_marketplace_...",
  "gatewayEventId": "sim_marketplace_..._CHARGEBACK"
}
```

O admin também pode reprocessar webhooks pela tela de detalhe do pagamento ou pela lista de webhooks:

```txt
POST /api/admin/payment-webhooks/:id/reprocess
```

### Contas Gateway de Recebimento

O cadastro de recebedor do freelancer passa pelo backend. O frontend nunca chama Asaas/Pagar.me diretamente.

Endpoints principais:

```txt
POST /api/gateway-accounts/freelancer/me
GET /api/gateway-accounts/freelancer/me
GET /api/admin/gateway-accounts
GET /api/admin/gateway-accounts/:id
POST /api/admin/gateway-accounts/:id/recheck
```

Em desenvolvimento, `PAYMENT_GATEWAY_PROVIDER="simulated"` cria `sim_recipient_*` e `sim_wallet_*`, marcando a conta como `ACTIVE` e KYC `APPROVED`. Antes de pagar um evento com split, todos os freelancers precisam ter `GatewayAccount` ativa; caso contrário, a API bloqueia o pagamento com erro claro.

### Contestações e Chargeback

- A abertura de contestação coloca o contrato em `DISPUTED` e bloqueia splits que aguardavam liberação.
- Chargeback simulado coloca o pagamento em `CHARGEBACK`, bloqueia splits não liberados e move contratos para disputa.
- Na tela `/dashboard/disputas`, o admin pode aplicar uma decisão financeira:
  - `Desbloquear`: rejeita a disputa e devolve o split para aguardando liberação.
  - `Liberar repasse`: rejeita a disputa, desbloqueia e tenta liberar o split.
  - `Estornar empresa`: resolve a disputa e estorna splits pendentes para a carteira da empresa.

### Auditoria Financeira

As ações sensíveis geram `AuditLog`, incluindo criação de pagamento, processamento/reprocessamento de webhook, liberação de split, estorno, payout, bloqueio por disputa/no-show e resolução financeira de disputa. O admin consulta os logs em `/dashboard/auditoria`.

O armazenamento de documentos passa por provider configurável. Em desenvolvimento use `DOCUMENT_STORAGE_PROVIDER="local"`. Para produção real, o próximo passo é implementar o provider `s3` ou `r2` usando as variáveis de bucket, endpoint, região e credenciais.

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

Rode as migrations e o seed base:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

O seed base cria apenas o administrador padrão e as especialidades iniciais da
plataforma. Ele não cria empresas, freelancers, eventos, convites ou contratos
demo.

Inicie API e Web:

```bash
pnpm dev
```

URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## Deploy

O projeto tem um script de deploy manual para o VPS em
`scripts/deploy-vps.sh`. Depois de criar commits localmente, envie o código para
o repositório bare do VPS:

```bash
git push vps main
```

No VPS, entre no diretório publicado e rode:

```bash
cd /var/www/nexo
pnpm deploy:vps
```

O comando `pnpm deploy:vps` executa:

- atualização do código por `git pull --ff-only`, quando houver remote `origin`;
- instalação de dependências com `pnpm install --frozen-lockfile`;
- geração do Prisma Client;
- aplicação das migrations com `pnpm prisma:deploy`;
- build da API e da Web;
- reinício dos processos PM2;
- teste local da API e da Web.

Padrões usados pelo script:

- API local: `127.0.0.1:3102`
- Web local: `127.0.0.1:3000`
- PM2 API: `nexus-api`
- PM2 Web: `nexus-web`
- Diretório: `/var/www/nexo`
- Branch: `main`

Esses valores podem ser sobrescritos por variáveis:

```bash
APP_DIR=/var/www/nexo API_PORT=3102 WEB_PORT=3000 pnpm deploy:vps
```

Se o VPS usa hook Git para atualizar `/var/www/nexo` automaticamente e você não
quiser que o script rode `git pull`, use:

```bash
SKIP_GIT_PULL=1 pnpm deploy:vps
```

Não rode o deploy como `root`. Se algum build anterior tiver criado arquivos
como `root` e aparecer erro `EACCES`, corrija a posse uma vez:

```bash
sudo chown -R rafael:rafael /var/www/nexo /home/rafael/.pm2
```

Resumo do fluxo após cada commit:

```bash
# na sua máquina
git push vps main

# no VPS
cd /var/www/nexo
pnpm deploy:vps
```

## Pendências Para Produção

Itens pendentes sem considerar credenciais reais de gateway:

- Implementar provider real de storage `s3` ou `r2` para documentos, fotos e logos.
- Implementar provider real de e-mail para recuperação de senha e notificações.
- Conectar provider real de pagamento com criação de cliente, recebedor, split, checkout/cobrança e payout.
- Validar assinatura real de webhooks do gateway.
- Mapear idempotência conforme provedor real.
- Implementar KYC real do recebedor.
- Implementar comprovantes reais de pagamento, estorno e payout.
- Separar permissões admin por papel operacional, como financeiro, suporte, verificação e owner.
- Configurar backup automático do PostgreSQL e testar restore.
- Definir política de retenção de documentos e dados.
- Adicionar logs estruturados, monitoramento e alertas.
- Criar CI/CD de deploy quando sair do deploy manual.
- Ampliar testes e2e conforme novas integrações reais forem conectadas.

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
pnpm prisma:seed:demo
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

## Seed Base e Contas Demo

Para preparar uma base limpa para testes manuais, rode:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

Esse seed padrão cria apenas:

- o primeiro administrador do sistema;
- as especialidades iniciais usadas em eventos e currículos.

Ele não cria empresas, freelancers, eventos, convites, candidaturas, contratos
ou pagamentos demo. Assim você consegue cadastrar os usuários e empresas na mão.

Conta criada pelo seed padrão:

- Admin: `admin@nexo.local`

A senha é definida por `SEED_DEMO_PASSWORD` no `.env`; se a variável não
existir, o seed usa o padrão local de desenvolvimento.

Para popular o sistema com cenários completos de demonstração, rode:

```bash
pnpm prisma:seed:demo
```

Depois disso, use:

- Admin: `admin@nexo.local`
- Empresa: `empresa@nexo.local`
- Freelancer: `freelancer@nexo.local`

Contas extras de empresas:

- `aurora@nexo.local`
- `litoral@nexo.local`
- `sertao@nexo.local`

Contas extras de freelancers:

- `audio@nexo.local`
- `luz@nexo.local`
- `foto@nexo.local`
- `dj@nexo.local`
- `recepcao@nexo.local`
- `seguranca@nexo.local`
- `bar@nexo.local`
- `streaming@nexo.local`
- `montagem@nexo.local`

O seed cria uma base de testes com 4 empresas, 10 freelancers, 19 eventos, múltiplas oportunidades abertas de várias empresas, múltiplas especialidades, convites pendentes/aceitos/recusados, candidaturas, chats com mensagens, contratos em diferentes status, pagamentos simulados, carteira com saldo/repasse/saque, avaliações, notificações, disponibilidade bloqueada e contestação em análise. As contas principais `empresa@nexo.local` e `freelancer@nexo.local` concentram mais dados para testar o fluxo completo sem preparar cenário manual.

Essas contas são apenas para desenvolvimento/demonstração. Não rode o seed demo
nem mantenha senhas demo em produção real.

## Rotas Web

Para uma explicação prática de como empresas, freelancers e admin usam o app no MVP, consulte [docs/FLUXO_DE_USO.md](docs/FLUXO_DE_USO.md).

Site público:

- `/`: apresentação da NEXO.
- `/empresas`: página para empresas contratantes.
- `/freelancers`: página para profissionais.
- `/termos`: termos de uso, política de LGPD, privacidade e cookies.
- `/login`: entrada de usuários.
- `/recuperar-senha`: solicitação de token e redefinição de senha.
- `/cadastro/empresa`: cadastro de empresa.
- `/cadastro/freelancer`: cadastro de profissional.
- `/checkout/simulado/:gatewayPaymentId`: checkout local para disparar webhook simulado.

Dashboard:

- `/dashboard`: visão geral por perfil.
- `/dashboard/eventos`: criação/listagem de eventos para empresas e visão operacional para admin.
- `/dashboard/agenda`: calendário visual do freelancer com eventos, bloqueios de agenda e recebimentos.
- `/dashboard/oportunidades`: eventos abertos para freelancers e candidaturas recebidas para empresas.
- `/dashboard/chat`: conversas de negociação criadas por convite ou candidatura.
- `/dashboard/profissionais`: busca de profissionais e envio de convites.
- `/dashboard/especialidades`: currículo, especialidades, níveis, habilidades e diárias do freelancer.
- `/dashboard/convites`: convites enviados e recebidos.
- `/dashboard/notificacoes`: central de notificações.
- `/dashboard/pagamentos`: contratos, pagamentos simulados, métricas admin, liberação de repasse, webhooks, payouts e carteira.
- `/dashboard/pagamentos/:id`: detalhe admin do pagamento, splits, webhooks, auditoria e ações financeiras.
- `/dashboard/avaliacoes`: avaliações pós-contrato e histórico de reputação.
- `/dashboard/disputas`: abertura, histórico, filtros e resolução admin financeira de contestações.
- `/dashboard/verificacoes`: aprovação admin de empresas e profissionais.
- `/dashboard/auditoria`: auditoria admin por ação, entidade, usuário e período.
- `/dashboard/usuarios`: listagem admin com filtros e ativação/desativação de acessos.
- `/dashboard/perfil`: dados de perfil, documentos, avatar/logo e recebedor gateway simulado do freelancer.

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
9. Paga o evento com carteira e, se necessário, complemento via checkout simulado.
10. Conclui, cancela ou marca no-show.
11. Abre contestação quando houver problema.
12. Avalia o profissional após contrato concluído ou pago.

Evolução prevista do fluxo empresa:

- Buscar profissionais por nome/apelido, faixa de diária, ferramentas, habilidades e transporte.
- Contratar múltiplos profissionais de especialidades diferentes no mesmo evento com mais controle operacional.
- Carregar carteira da empresa ou complementar saldo no pagamento.
- Usar cartão/boleto/Pix quando gateway real for conectado.
- Receber alerta pós-evento para avaliar e marcar no-show dentro do prazo operacional.
- Visualizar comprovantes reais quando gateway real for conectado.

Fluxo freelancer:

1. Cadastra ou acessa a conta.
2. Completa perfil, especialidades, diária e agenda.
3. Busca oportunidades abertas compatíveis.
4. Envia candidatura com mensagem e proposta de valor.
5. Recebe convites.
6. Aceita, recusa ou faz contraproposta de valor.
7. Acompanha contratos e carteira.
8. Acompanha agenda em calendário visual.
9. Atualiza recebedor financeiro simulado quando o perfil estiver verificado.
10. Conclui ou cancela contratos elegíveis.
11. Recebe repasse na carteira.
12. Solicita saque.
13. Avalia a empresa após contrato concluído ou pago.

Evolução prevista do fluxo freelancer:

- Negociar valor em chat interno quando a empresa permitir.
- Informar dados bancários completos ligados ao provedor real de pagamento.
- Acompanhar comprovantes reais de payout.

Fluxo admin:

1. Acompanha relatórios e dados operacionais.
2. Verifica empresas e profissionais.
3. Ativa ou desativa usuários.
4. Visualiza pagamentos.
5. Abre detalhe de pagamento com splits, webhooks e auditoria.
6. Reprocessa webhooks simulados quando necessário.
7. Libera repasses simulados.
8. Processa payouts simulados.
9. Analisa e resolve contestações com decisão financeira.
10. Consulta auditoria geral.

## API

A API usa prefixo global `/api`.

Módulos principais:

- `auth`: cadastro, login e refresh token.
- `users`: dados de usuário.
- `companies`: perfil de empresa.
- `freelancers`: perfil, currículo técnico, especialidades e busca pública.
- `skills`: especialidades.
- `availability`: bloqueios de agenda do freelancer.
- `events`: eventos, requisitos e busca de profissionais disponíveis.
- `invitations`: convites e respostas.
- `applications`: oportunidades abertas, candidaturas, aprovação/recusa e geração de contrato.
- `contracts`: contratos por perfil.
- `calendar`: experiência web inicial entregue com contratos, disponibilidade e carteira; módulo dedicado previsto para evolução.
- `chat`: conversas internas vinculadas a convites, candidaturas e contratos.
- `payments`: pagamento marketplace simulado por evento, checkout, splits, webhooks, estorno, chargeback e liberação.
- `payment-webhooks`: endpoints públicos de desenvolvimento para checkout/webhook simulado.
- `wallet`: carteira, transações e solicitação de payout.
- `reviews`: avaliações e cálculo de reputação.
- `notifications`: notificações e leitura.
- `disputes`: abertura e acompanhamento técnico de contestações.
- `admin`: listagens operacionais, verificações, contestações, payouts, reprocessamento de webhooks e auditoria.
- `reports`: resumo operacional e financeiro por perfil.

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

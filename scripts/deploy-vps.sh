#!/usr/bin/env bash
set -Eeuo pipefail

# Deploy padrao do NEXO no VPS.
#
# Uso comum no servidor:
#   cd /var/www/nexo
#   pnpm deploy:vps
#
# Variaveis opcionais:
#   APP_DIR=/var/www/nexo
#   BRANCH=main
#   REMOTE=origin
#   API_PORT=3102
#   WEB_PORT=3000
#   API_PM2_NAME=nexus-api
#   WEB_PM2_NAME=nexus-web
#   SKIP_GIT_PULL=1
#
# Se aparecer erro EACCES por arquivo criado como root, corrija uma vez:
#   sudo chown -R "$USER":"$USER" /var/www/nexo "$HOME/.pm2"

APP_DIR="${APP_DIR:-/var/www/nexo}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
API_PORT="${API_PORT:-3102}"
WEB_PORT="${WEB_PORT:-3000}"
API_PM2_NAME="${API_PM2_NAME:-nexus-api}"
WEB_PM2_NAME="${WEB_PM2_NAME:-nexus-web}"

if [ "${EUID:-$(id -u)}" -eq 0 ] && [ "${ALLOW_ROOT_DEPLOY:-0}" != "1" ]; then
  echo "Nao rode este deploy como root."
  echo "Use o usuario dono do projeto, por exemplo: rafael."
  echo "Se ja rodou como root e deu EACCES, execute:"
  echo "  sudo chown -R rafael:rafael /var/www/nexo /home/rafael/.pm2"
  exit 1
fi

cd "$APP_DIR"

echo "==> Diretorio: $APP_DIR"

if [ "${SKIP_GIT_PULL:-0}" != "1" ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git remote get-url "$REMOTE" >/dev/null 2>&1; then
    echo "==> Atualizando codigo: $REMOTE/$BRANCH"
    git fetch "$REMOTE" "$BRANCH"
    git checkout "$BRANCH"
    git pull --ff-only "$REMOTE" "$BRANCH"
  else
    echo "==> Remote '$REMOTE' nao encontrado. Pulando git pull."
  fi
else
  echo "==> Pulando git pull."
fi

echo "==> Instalando dependencias"
pnpm install --frozen-lockfile

echo "==> Gerando Prisma Client"
pnpm prisma:generate

echo "==> Aplicando migrations"
pnpm prisma:deploy

echo "==> Buildando aplicacao"
pnpm build

echo "==> Reiniciando PM2"
pm2 delete "$API_PM2_NAME" >/dev/null 2>&1 || true
pm2 delete "$WEB_PM2_NAME" >/dev/null 2>&1 || true

PORT="$API_PORT" pm2 start "pnpm --filter @nexus/api start" --name "$API_PM2_NAME"
PORT="$WEB_PORT" pm2 start "pnpm --filter @nexus/web start" --name "$WEB_PM2_NAME"
pm2 save

echo "==> Verificando servicos locais"
curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null
curl -fsSI "http://127.0.0.1:${WEB_PORT}" >/dev/null

echo "Deploy concluido."
echo "API local: http://127.0.0.1:${API_PORT}"
echo "Web local: http://127.0.0.1:${WEB_PORT}"

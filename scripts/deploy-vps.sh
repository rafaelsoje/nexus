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
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"

wait_for_url() {
  local name="$1"
  local url="$2"
  local curl_args="${3:-}"

  echo "==> Aguardando ${name}: ${url}"

  for attempt in $(seq 1 "$HEALTH_RETRIES"); do
    if curl -fsS $curl_args "$url" >/dev/null 2>&1; then
      echo "==> ${name} respondeu na tentativa ${attempt}/${HEALTH_RETRIES}"
      return 0
    fi

    sleep "$HEALTH_SLEEP_SECONDS"
  done

  echo "Erro: ${name} nao respondeu em ${url}."
  echo "Consulte os logs:"
  echo "  pm2 logs ${API_PM2_NAME} --lines 80"
  echo "  pm2 logs ${WEB_PM2_NAME} --lines 80"
  return 1
}

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

echo "==> Verificando servicos locais"
wait_for_url "API" "http://127.0.0.1:${API_PORT}/api/health"
wait_for_url "Web" "http://127.0.0.1:${WEB_PORT}" "-I"

pm2 save

echo "Deploy concluido."
echo "API local: http://127.0.0.1:${API_PORT}"
echo "Web local: http://127.0.0.1:${WEB_PORT}"

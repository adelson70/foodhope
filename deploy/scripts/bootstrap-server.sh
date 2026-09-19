#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/hope/apps/foodhope}"
INFRA_DIR="${INFRA_DIR:-/home/hope/infra/foodhope-cloudflared}"
RUNNER_DIR="${RUNNER_DIR:-/home/hope/actions-runner}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> App dir: $APP_DIR"
mkdir -p "$APP_DIR"
cp "$REPO_ROOT/compose.production.yml" "$APP_DIR/compose.production.yml"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$REPO_ROOT/.env.example" "$APP_DIR/.env"
  echo "    Criado $APP_DIR/.env — edite secrets (JWT, DATABASE_URL, etc.)."
fi

echo "==> Infra cloudflared: $INFRA_DIR"
mkdir -p "$INFRA_DIR"
cp "$REPO_ROOT/deploy/cloudflared/compose.yml" "$INFRA_DIR/compose.yml"
if [ ! -f "$INFRA_DIR/.env" ]; then
  cp "$REPO_ROOT/deploy/cloudflared/.env.example" "$INFRA_DIR/.env"
  echo "    Criado $INFRA_DIR/.env — preencha TUNNEL_TOKEN_WEB e TUNNEL_TOKEN_API."
fi

echo "==> Docker networks"
docker network create foodhope_edge 2>/dev/null || echo "    foodhope_edge já existe"
docker network inspect stack_default >/dev/null 2>&1 || {
  echo "    AVISO: network stack_default não encontrada. Suba Postgres/Redis da stack compartilhada antes."
}

echo "==> Grupo docker"
if groups | grep -qw docker; then
  echo "    Usuário já está no grupo docker."
else
  echo "    AVISO: rode 'sudo usermod -aG docker \$USER' e faça login de novo."
fi

echo "==> Runner dir (registro manual no GitHub): $RUNNER_DIR"
mkdir -p "$RUNNER_DIR"
if [ ! -f "$RUNNER_DIR/config.sh" ]; then
  echo "    Baixe o runner em Settings → Actions → Runners → New self-hosted runner"
  echo "    e descompacte em $RUNNER_DIR (nome sugerido: foodhope-server)."
else
  echo "    config.sh já presente."
fi

echo
echo "Próximos passos:"
echo "  1. Editar $APP_DIR/.env"
echo "  2. Editar $INFRA_DIR/.env (tokens Cloudflare)"
echo "  3. Criar DB: docker exec -it postgres psql -U USER -c 'CREATE DATABASE foodhope;'"
echo "  4. cd $INFRA_DIR && docker compose up -d"
echo "  5. Registrar runner em $RUNNER_DIR e ./svc.sh install && ./svc.sh start"
echo "  6. docker login ghcr.io  (se pacotes privados)"
echo "  7. Configurar Variables no GitHub (ver DEPLOY.md §7)"
echo "  8. Push na main ou workflow_dispatch"

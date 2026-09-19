#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/home/hope/apps/foodhope}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

mkdir -p "$APP_DIR"

cp -n "$REPO_ROOT/compose.production.yml" "$APP_DIR/compose.production.yml" 2>/dev/null || \
  cp "$REPO_ROOT/compose.production.yml" "$APP_DIR/compose.production.yml"

if [ ! -f "$APP_DIR/.env" ]; then
  cp "$REPO_ROOT/.env.example" "$APP_DIR/.env"
  echo "Criei $APP_DIR/.env a partir do .env.example — edite os secrets antes de subir."
fi

docker network create foodhope_edge 2>/dev/null || true

echo "Pronto: $APP_DIR"
echo "Próximos passos:"
echo "  1. Editar $APP_DIR/.env"
echo "  2. docker login ghcr.io  (se pacotes privados)"
echo "  3. docker compose -f $APP_DIR/compose.production.yml pull"
echo "  4. docker compose -f $APP_DIR/compose.production.yml up -d"
echo "  5. Subir tunnels em /home/hope/infra/foodhope-cloudflared"

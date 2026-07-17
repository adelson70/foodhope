#!/bin/sh
set -e

echo "Aplicando migrations (prisma migrate deploy)..."
npx prisma migrate deploy
echo "Migrations aplicadas."

exec node dist/src/main.js

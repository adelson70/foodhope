#!/bin/sh
set -e

echo "Aplicando migrations forward-only (prisma migrate deploy)..."
echo "Comandos destrutivos (migrate reset / db push / migrate dev) são proibidos neste boot."
npx prisma migrate deploy
echo "Migrations aplicadas."

exec node dist/src/main.js

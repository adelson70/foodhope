#!/bin/sh
# Cria (ou atualiza a senha de) o role "replicador" e o slot físico "notebook" no Postgres de
# produção. Idempotente. Rode no servidor, na pasta docker/:  sh postgres/replicacao.sh
# A senha vem de PG_REPLICA_PASSWORD no docker/.env e passa só por variável de ambiente.
set -eu
cd "$(dirname "$0")/.."
PG_REPLICA_PASSWORD=$(grep -E '^PG_REPLICA_PASSWORD=' .env | cut -d= -f2-)
[ -n "$PG_REPLICA_PASSWORD" ] || { echo "PG_REPLICA_PASSWORD vazio em docker/.env" >&2; exit 1; }
export PG_REPLICA_PASSWORD
docker exec -i -e PG_REPLICA_PASSWORD "${PG_CONTAINER:-foodhope-postgres}" \
  sh -c 'psql -v ON_ERROR_STOP=1 -qAt -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
\getenv senha PG_REPLICA_PASSWORD
SELECT format(
  CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'replicador')
       THEN 'ALTER ROLE replicador WITH REPLICATION LOGIN PASSWORD %L'
       ELSE 'CREATE ROLE replicador WITH REPLICATION LOGIN PASSWORD %L' END,
  :'senha') \gexec
SELECT 'slot criado' FROM (
  SELECT pg_create_physical_replication_slot('notebook')
   WHERE NOT EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = 'notebook')) s;
SQL
echo "replicador e slot notebook ok"

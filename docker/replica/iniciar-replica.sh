#!/bin/sh
# Entrypoint da réplica: clona o primário na primeira vez e sobe o Postgres como standby.
set -eu
mkdir -p "$PGDATA"
chown -R postgres:postgres "$(dirname "$PGDATA")"
chmod 700 "$PGDATA"
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "réplica: clonando $PRIMARIO_HOST:$PRIMARIO_PORTA (pg_basebackup)…"
  until su-exec postgres env PGPASSWORD="$PG_REPLICA_PASSWORD" pg_basebackup \
      -h "$PRIMARIO_HOST" -p "$PRIMARIO_PORTA" -U replicador \
      -D "$PGDATA" -S notebook -X stream -R --checkpoint=fast; do
    echo "réplica: primário indisponível, tentando de novo em 15 s"
    rm -rf "${PGDATA:?}"/*
    sleep 15
  done
fi
exec su-exec postgres postgres -c hot_standby=on

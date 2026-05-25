#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-pgic-postgres}"
SOURCE_DB="${1:-${RESTORE_TEST_SOURCE_DB:-identity_service}}"
TEST_DB="restore_test_${SOURCE_DB}_$(date +%Y%m%d%H%M%S)"

"$ROOT_DIR/scripts/db/backup-postgres.sh"
LATEST="$(ls -1t "$ROOT_DIR/backups/postgres/${SOURCE_DB}"_*.sql.gz | head -n 1)"

if [[ -z "$LATEST" ]]; then
  echo "[restore-test] no backup found for $SOURCE_DB"
  exit 1
fi

echo "[restore-test] creating temporary db '$TEST_DB'"
docker exec "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' psql -U '${POSTGRES_USER:-pgic}' -d postgres -v ON_ERROR_STOP=1 -c \"CREATE DATABASE \\\"$TEST_DB\\\";\"" >/dev/null

echo "[restore-test] restoring backup into '$TEST_DB'"
gunzip -c "$LATEST" \
  | docker exec -i "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' psql -U '${POSTGRES_USER:-pgic}' -d '$TEST_DB' -v ON_ERROR_STOP=1" >/dev/null

TABLE_COUNT="$(docker exec "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' psql -U '${POSTGRES_USER:-pgic}' -d '$TEST_DB' -Atc \"select count(*) from information_schema.tables where table_schema='public';\"")"

echo "[restore-test] public tables in '$TEST_DB': $TABLE_COUNT"

echo "[restore-test] dropping temporary db '$TEST_DB'"
docker exec "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' psql -U '${POSTGRES_USER:-pgic}' -d postgres -v ON_ERROR_STOP=1 -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TEST_DB';\" -c \"DROP DATABASE \\\"$TEST_DB\\\";\"" >/dev/null

echo "[restore-test] success"

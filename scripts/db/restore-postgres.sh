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
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"

usage() {
  echo "Usage: $0 --db <database> [--file <path.sql.gz>] [--create-db]"
  echo "If --file is omitted, latest backup matching '<db>_*.sql.gz' is used."
}

DB_NAME=""
BACKUP_FILE=""
CREATE_DB="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db)
      DB_NAME="${2:-}"
      shift 2
      ;;
    --file)
      BACKUP_FILE="${2:-}"
      shift 2
      ;;
    --create-db)
      CREATE_DB="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$DB_NAME" ]]; then
  usage
  exit 1
fi

if [[ -z "$BACKUP_FILE" ]]; then
  BACKUP_FILE="$(ls -1t "$BACKUP_DIR/${DB_NAME}"_*.sql.gz 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "[restore] backup file not found for db '$DB_NAME'"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "[restore] container '$CONTAINER_NAME' not running"
  exit 1
fi

if [[ "$CREATE_DB" == "true" ]]; then
  echo "[restore] ensuring database '$DB_NAME' exists"
  docker exec "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' psql -U '${POSTGRES_USER:-pgic}' -d postgres -v ON_ERROR_STOP=1 -c \"CREATE DATABASE \\\"$DB_NAME\\\";\"" >/dev/null 2>&1 || true
fi

echo "[restore] restoring '$DB_NAME' from $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" \
  | docker exec -i "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' psql -U '${POSTGRES_USER:-pgic}' -d '$DB_NAME' -v ON_ERROR_STOP=1"

echo "[restore] done"

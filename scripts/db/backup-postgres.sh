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
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
KEEP_MIN="${BACKUP_KEEP_MIN:-10}"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "[backup] container '$CONTAINER_NAME' not running"
  exit 1
fi

DBS="${BACKUP_DATABASES:-}"
if [[ -z "$DBS" ]]; then
  DBS="$(docker exec "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' psql -U '${POSTGRES_USER:-pgic}' -d postgres -Atc \"select datname from pg_database where datistemplate = false and datname not in ('postgres');\"")"
fi

if [[ -z "$DBS" ]]; then
  echo "[backup] no databases found"
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"

for DB in $DBS; do
  OUT_FILE="$BACKUP_DIR/${DB}_${TS}.sql.gz"
  echo "[backup] dumping '$DB' -> $OUT_FILE"
  docker exec "$CONTAINER_NAME" sh -lc "PGPASSWORD='${POSTGRES_PASSWORD:-pgic}' pg_dump -U '${POSTGRES_USER:-pgic}' -d '$DB' --no-owner --no-privileges" \
    | gzip -9 > "$OUT_FILE"
  test -s "$OUT_FILE"
done

if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$KEEP_MIN" =~ ^[0-9]+$ ]]; then
  echo "[backup] applying retention: ${RETENTION_DAYS} days (keeping at least ${KEEP_MIN} files)"
  mapfile -t ALL_FILES < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' | sort)
  if (( ${#ALL_FILES[@]} > KEEP_MIN )); then
    mapfile -t OLD_FILES < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' -mtime "+$RETENTION_DAYS" | sort)
    for file in "${OLD_FILES[@]}"; do
      mapfile -t NOW_FILES < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' | sort)
      if (( ${#NOW_FILES[@]} <= KEEP_MIN )); then
        break
      fi
      rm -f "$file"
      echo "[backup] removed old backup: $file"
    done
  fi
fi

echo "[backup] done"

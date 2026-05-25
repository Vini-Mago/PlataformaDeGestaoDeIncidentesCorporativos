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

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
DATABASES="${BACKUP_DATABASES:-identity_service request_service incident_service problem_change_service sla_service escalation_service notification_service audit_service reporting_service integration_service}"
ALERT_WEBHOOK_URL="${BACKUP_ALERT_WEBHOOK_URL:-}"

if ! [[ "$MAX_AGE_HOURS" =~ ^[0-9]+$ ]]; then
  echo "[backup-check] invalid BACKUP_MAX_AGE_HOURS: $MAX_AGE_HOURS"
  exit 2
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "[backup-check] backup dir not found: $BACKUP_DIR"
  exit 2
fi

FAILED=0
NOW_EPOCH="$(date +%s)"

for DB in $DATABASES; do
  LATEST="$(ls -1t "$BACKUP_DIR/${DB}"_*.sql.gz 2>/dev/null | head -n 1 || true)"
  if [[ -z "$LATEST" ]]; then
    echo "[backup-check] missing backup for db=$DB"
    FAILED=1
    continue
  fi

  FILE_EPOCH="$(stat -c %Y "$LATEST")"
  AGE_HOURS="$(( (NOW_EPOCH - FILE_EPOCH) / 3600 ))"

  if (( AGE_HOURS > MAX_AGE_HOURS )); then
    echo "[backup-check] stale backup db=$DB age=${AGE_HOURS}h file=$LATEST"
    FAILED=1
  else
    echo "[backup-check] ok db=$DB age=${AGE_HOURS}h"
  fi
done

if (( FAILED == 1 )); then
  if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
    PAYLOAD=$(printf '{"text":"PGIC backup check failed at %s"}' "$(date -Iseconds)")
    curl -fsS -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$ALERT_WEBHOOK_URL" >/dev/null || true
  fi
  exit 1
fi

echo "[backup-check] all backups are fresh"

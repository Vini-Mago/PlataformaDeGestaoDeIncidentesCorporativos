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

ALERT_WEBHOOK_URL="${BACKUP_ALERT_WEBHOOK_URL:-}"

if "$ROOT_DIR/scripts/db/backup-postgres.sh"; then
  echo "[backup-runner] backup succeeded"
  exit 0
fi

echo "[backup-runner] backup failed"
if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
  PAYLOAD=$(printf '{"text":"PGIC backup job failed at %s"}' "$(date -Iseconds)")
  curl -fsS -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$ALERT_WEBHOOK_URL" >/dev/null || true
fi

exit 1

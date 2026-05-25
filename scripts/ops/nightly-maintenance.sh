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

LOG_PREFIX="[ops-maintenance]"

echo "$LOG_PREFIX start $(date -Iseconds)"

# 1) Backup com alerta em falha
pnpm db:backup:run

# 2) Expurgo LGPD técnico (identity)
pnpm privacy:prune-identity -- \
  --access-logs-days "${LGPD_ACCESS_LOG_RETENTION_DAYS:-180}" \
  --password-reset-days "${LGPD_PASSWORD_RESET_RETENTION_DAYS:-30}" \
  --revoked-sessions-days "${LGPD_REVOKED_SESSION_RETENTION_DAYS:-90}"

# 3) Healthcheck operacional geral
pnpm ops:healthcheck

echo "$LOG_PREFIX success $(date -Iseconds)"

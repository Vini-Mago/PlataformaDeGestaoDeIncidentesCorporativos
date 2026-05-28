#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RULES_FILE="infra/observability/prometheus/pgic-alerts.yml"
DASHBOARD_FILE="infra/observability/grafana/dashboards/pgic-operational-overview.json"
PROMETHEUS_FILE="infra/observability/prometheus/prometheus.yml"
SERVICE="${1:-incident-service}"
FIVEXX_RATE="${SIMULATED_5XX_RATE:-0.08}"
THRESHOLD="${PGIC_5XX_RATE_THRESHOLD:-0.05}"

for file in "$RULES_FILE" "$DASHBOARD_FILE" "$PROMETHEUS_FILE"; do
  if [[ ! -s "$file" ]]; then
    echo "[observability-sim] missing required file: $file" >&2
    exit 1
  fi
done

node -e "JSON.parse(require('fs').readFileSync('$DASHBOARD_FILE', 'utf8')); console.log('[observability-sim] grafana dashboard json ok')"

if ! grep -q "PgicHighHttp5xxRate" "$RULES_FILE"; then
  echo "[observability-sim] PgicHighHttp5xxRate rule not found" >&2
  exit 1
fi

awk "BEGIN { exit !($FIVEXX_RATE > $THRESHOLD) }"

cat <<REPORT
[observability-sim] simulated alert fired
alert=PgicHighHttp5xxRate
service=$SERVICE
simulated_5xx_rate=$FIVEXX_RATE
threshold=$THRESHOLD
severity=warning
rules_file=$RULES_FILE
dashboard_file=$DASHBOARD_FILE
REPORT

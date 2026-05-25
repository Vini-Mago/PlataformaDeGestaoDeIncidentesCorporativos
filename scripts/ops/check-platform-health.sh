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

ALERT_WEBHOOK_URL="${OPS_ALERT_WEBHOOK_URL:-}"
RABBITMQ_MAX_QUEUE_DEPTH="${RABBITMQ_MAX_QUEUE_DEPTH:-1000}"
RABBITMQ_URL="${RABBITMQ_URL:-amqp://pgic:pgic@localhost:55672}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-pgic-postgres}"
RABBITMQ_CONTAINER_NAME="${RABBITMQ_CONTAINER_NAME:-pgic-rabbitmq}"
REDIS_CONTAINER_NAME="${REDIS_CONTAINER_NAME:-pgic-redis}"

FAILED=0
REPORT_LINES=()

check_http_health() {
  local name="$1"
  local url="$2"

  local code
  code="$(curl -s -o /tmp/pgic_health_body_$$.txt -w '%{http_code}' "$url" || true)"
  [[ -z "$code" ]] && code="000"
  if [[ "$code" != "200" ]]; then
    FAILED=1
    REPORT_LINES+=("[FAIL] $name health: HTTP $code ($url)")
    return
  fi
  REPORT_LINES+=("[ OK ] $name health: HTTP 200")
}

check_container_running() {
  local name="$1"
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$name"; then
    FAILED=1
    REPORT_LINES+=("[FAIL] container not running: $name")
  else
    REPORT_LINES+=("[ OK ] container running: $name")
  fi
}

check_rabbitmq_queue_depth() {
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$RABBITMQ_CONTAINER_NAME"; then
    FAILED=1
    REPORT_LINES+=("[FAIL] rabbitmq container not running: $RABBITMQ_CONTAINER_NAME")
    return
  fi

  local max_depth=0
  local offending=""
  while IFS=$'\t' read -r qname qmessages; do
    [[ -z "$qname" ]] && continue
    local n="${qmessages:-0}"
    if ! [[ "$n" =~ ^[0-9]+$ ]]; then n=0; fi
    if (( n > max_depth )); then
      max_depth=$n
      offending="$qname"
    fi
  done < <(docker exec "$RABBITMQ_CONTAINER_NAME" sh -lc "rabbitmqctl list_queues name messages -q" 2>/dev/null || true)

  if (( max_depth > RABBITMQ_MAX_QUEUE_DEPTH )); then
    FAILED=1
    REPORT_LINES+=("[FAIL] rabbitmq queue depth: max=${max_depth} queue=${offending} threshold=${RABBITMQ_MAX_QUEUE_DEPTH}")
  else
    REPORT_LINES+=("[ OK ] rabbitmq queue depth: max=${max_depth} threshold=${RABBITMQ_MAX_QUEUE_DEPTH}")
  fi
}

# Service health endpoints
check_http_health "identity" "http://localhost:${IDENTITY_SERVICE_PORT:-3201}/health"
check_http_health "request" "http://localhost:${REQUEST_SERVICE_PORT:-3202}/health"
check_http_health "incident" "http://localhost:${INCIDENT_SERVICE_PORT:-3204}/health"
check_http_health "problem-change" "http://localhost:${PROBLEM_CHANGE_SERVICE_PORT:-3205}/health"
check_http_health "sla" "http://localhost:${SLA_SERVICE_PORT:-3206}/health"
check_http_health "escalation" "http://localhost:${ESCALATION_SERVICE_PORT:-3207}/health"
check_http_health "notification" "http://localhost:${NOTIFICATION_SERVICE_PORT:-3208}/health"
check_http_health "audit" "http://localhost:${AUDIT_SERVICE_PORT:-3209}/health"
check_http_health "reporting" "http://localhost:${REPORTING_SERVICE_PORT:-3210}/health"
check_http_health "integration" "http://localhost:${INTEGRATION_SERVICE_PORT:-3211}/health"
check_http_health "gateway" "http://localhost:${GATEWAY_PORT:-58080}/health"

# Infra containers
check_container_running "$POSTGRES_CONTAINER_NAME"
check_container_running "$REDIS_CONTAINER_NAME"
check_container_running "$RABBITMQ_CONTAINER_NAME"

# Rabbit queue depth signal
check_rabbitmq_queue_depth

printf '%s\n' "${REPORT_LINES[@]}"

if (( FAILED == 1 )); then
  if [[ -n "$ALERT_WEBHOOK_URL" ]]; then
    MSG="PGIC ops healthcheck failed at $(date -Iseconds)"
    PAYLOAD=$(printf '{"text":"%s"}' "$MSG")
    curl -fsS -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$ALERT_WEBHOOK_URL" >/dev/null || true
  fi
  exit 1
fi

echo "[ OK ] platform healthcheck passed"

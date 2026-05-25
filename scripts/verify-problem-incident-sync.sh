#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3300}"
IDENTIFIER="${IDENTIFIER:-levidevadmin}"
PASSWORD="${PASSWORD:-Dev@12345678}"
INCIDENT_ID="${INCIDENT_ID:-}"
POLL_RETRIES="${POLL_RETRIES:-20}"
POLL_SLEEP_SECONDS="${POLL_SLEEP_SECONDS:-0.5}"

if ! command -v jq >/dev/null 2>&1; then
  echo "erro: jq não encontrado no PATH" >&2
  exit 1
fi

COOKIE_JAR="$(mktemp)"

api_json() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
      -H "Content-Type: application/json" \
      -X "$method" "$BASE_URL$path" \
      -d "$body"
  else
    curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
      -X "$method" "$BASE_URL$path"
  fi
}

current_problem_id() {
  api_json GET "/incidents/incidents" \
    | jq -r --arg iid "$INCIDENT_ID" '
      if type=="array"
      then (map(select(.id==$iid)) | .[0].problemId)
      else (.items | map(select(.id==$iid)) | .[0].problemId)
      end
    '
}

poll_until_equals() {
  local expected="$1"
  local label="$2"
  local ok=0
  for _ in $(seq 1 "$POLL_RETRIES"); do
    local got
    got="$(current_problem_id)"
    if [[ "$got" == "$expected" ]]; then
      ok=1
      break
    fi
    sleep "$POLL_SLEEP_SECONDS"
  done
  if [[ "$ok" -ne 1 ]]; then
    echo "FAIL: $label (esperado=$expected)" >&2
    return 1
  fi
}

cleanup_problem_link() {
  if [[ -n "${problem_id:-}" ]]; then
    api_json DELETE "/problem-change/problems/$problem_id/incidents/$INCIDENT_ID" >/dev/null || true
  fi
}
on_exit() {
  cleanup_problem_link
  rm -f "$COOKIE_JAR"
}
trap on_exit EXIT

echo "[1/6] login no BFF ($BASE_URL)"
api_json POST "/auth/login" "{\"identifier\":\"$IDENTIFIER\",\"password\":\"$PASSWORD\"}" >/dev/null

echo "[2/6] resolvendo incidente alvo"
if [[ -z "$INCIDENT_ID" ]]; then
  INCIDENT_ID="$(
    api_json GET "/incidents/incidents" \
      | jq -r 'if type=="array" then .[0].id else .items[0].id end // empty'
  )"
fi
if [[ -z "$INCIDENT_ID" ]]; then
  echo "erro: nenhum incidente encontrado; defina INCIDENT_ID manualmente" >&2
  exit 1
fi
echo "incidente alvo: $INCIDENT_ID"

echo "[3/6] criando problema temporário"
problem_payload="$(jq -nc --arg t "Sync check $(date +%s)" --arg d "Validação automática incident.problemId" '{title:$t,description:$d}')"
problem_id="$(api_json POST "/problem-change/problems" "$problem_payload" | jq -r '.id // empty')"
if [[ -z "$problem_id" ]]; then
  echo "erro: falha ao criar problema temporário" >&2
  exit 1
fi
echo "problema criado: $problem_id"

echo "[4/6] vinculando problema ao incidente"
api_json POST "/problem-change/problems/$problem_id/incidents" "{\"incidentId\":\"$INCIDENT_ID\"}" >/dev/null

echo "[5/6] aguardando incident.problemId == $problem_id"
poll_until_equals "$problem_id" "problemId não sincronizou após link" || exit 2
echo "ok: problemId sincronizado após link"

echo "[6/6] desvinculando e aguardando problemId == null"
cleanup_problem_link
problem_id=""
poll_until_equals "null" "problemId não limpou após unlink" || exit 3
echo "ok: problemId limpo após unlink"

echo "PASS: sincronização incidente-problema validada"

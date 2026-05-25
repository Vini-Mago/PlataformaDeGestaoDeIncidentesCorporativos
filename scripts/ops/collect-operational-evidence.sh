#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

OUT_DIR="${OPS_EVIDENCE_DIR:-$ROOT_DIR/out/ops-evidence}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/evidence-$STAMP.txt"

{
  echo "PGIC Operational Evidence"
  echo "timestamp=$STAMP"
  echo
  echo "== backup freshness =="
  pnpm db:backup:check || true
  echo
  echo "== platform healthcheck =="
  pnpm ops:healthcheck || true
} > "$OUT_FILE" 2>&1

echo "evidence_file=$OUT_FILE"

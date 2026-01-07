#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${STATE_DIR:-$SCRIPT_DIR/.state}"

ensure_state_dir() {
  mkdir -p "$STATE_DIR"
}

ensure_run_id() {
  if [ -z "${RUN_ID:-}" ]; then
    RUN_ID="run-$(date -u +%Y%m%dT%H%M%SZ)-$$-$RANDOM"
    export RUN_ID
  fi
}

append_jsonl() {
  local file="$1"
  shift

  ensure_state_dir
  ensure_run_id

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$STATE_DIR/$file" "$RUN_ID" "$@" <<'PY'
import json
import sys
import time

path = sys.argv[1]
run_id = sys.argv[2]
args = sys.argv[3:]

payload = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "run_id": run_id,
}

for item in args:
    if "=" not in item:
        continue
    k, v = item.split("=", 1)
    try:
        payload[k] = json.loads(v)
    except Exception:
        payload[k] = v

with open(path, "a", encoding="utf-8") as f:
    f.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")
PY
  else
    # Fallback (best-effort, not JSON-safe). Never fail callers.
    printf '%s run_id=%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$RUN_ID" "$*" >>"$STATE_DIR/$file" || true
  fi
}


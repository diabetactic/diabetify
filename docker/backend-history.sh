#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${STATE_DIR:-$SCRIPT_DIR/.state}"
LOG_FILE="$STATE_DIR/backend-history.jsonl"

LAST_N=25
RAW=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --raw)
      RAW=true
      shift
      ;;
    --last)
      LAST_N="${2:-25}"
      shift 2
      ;;
    -h|--help)
      cat <<EOF
Usage: ./backend-history.sh [--last N] [--raw]

Shows recent Docker backend lifecycle events recorded by ./start.sh, ./stop.sh, ./reset-db.sh.
EOF
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [ ! -f "$LOG_FILE" ]; then
  echo "No backend history found at: $LOG_FILE"
  exit 0
fi

if [ "$RAW" = true ]; then
  cat "$LOG_FILE"
  exit 0
fi

python3 - "$LOG_FILE" "$LAST_N" <<'PY'
import json
import sys

path = sys.argv[1]
last_n = int(sys.argv[2])

events = []
with open(path, "r", encoding="utf-8") as f:
  for line in f:
    line = line.strip()
    if not line:
      continue
    try:
      events.append(json.loads(line))
    except Exception:
      continue

for e in events[-last_n:]:
  ts = e.get("ts", "?")
  rid = e.get("run_id", "?")
  ev = e.get("event", "?")
  compose = e.get("compose_file", "")
  extra = []
  if compose:
    extra.append(f"compose={compose}")
  if "retries" in e:
    extra.append(f"retries={e.get('retries')}")
  if e.get("volumes_removed") is True:
    extra.append("volumes_removed=true")
  suffix = (" | " + " ".join(extra)) if extra else ""
  print(f"- {ts} | {rid} | {ev}{suffix}")
PY


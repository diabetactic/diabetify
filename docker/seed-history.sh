#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${STATE_DIR:-$SCRIPT_DIR/.state}"
LOG_FILE="$STATE_DIR/seed-history.jsonl"

LAST_N=10
RAW=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --raw)
      RAW=true
      shift
      ;;
    --last)
      LAST_N="${2:-10}"
      shift 2
      ;;
    -h|--help)
      cat <<EOF
Usage: ./seed-history.sh [--last N] [--raw]

Shows recent Docker seed runs recorded by ./seed-test-data.sh

Examples:
  ./seed-history.sh
  ./seed-history.sh --last 25
  ./seed-history.sh --raw | tail -n 50
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
  echo "No seed history found at: $LOG_FILE"
  exit 0
fi

if [ "$RAW" = true ]; then
  cat "$LOG_FILE"
  exit 0
fi

python3 - "$LOG_FILE" "$LAST_N" <<'PY'
import json
import sys
from collections import defaultdict

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

by_run = defaultdict(list)
for e in events:
  by_run[e.get("run_id", "unknown")].append(e)

def run_sort_key(run_id: str):
  ev = by_run[run_id]
  return max((x.get("ts", "") for x in ev), default="")

run_ids = sorted(by_run.keys(), key=run_sort_key, reverse=True)[:last_n]

print(f"Seed runs (last {len(run_ids)}): {path}\n")
for rid in run_ids:
  ev = sorted(by_run[rid], key=lambda x: x.get("ts", ""))
  start = next((x for x in ev if x.get("event") == "seed_start"), ev[0] if ev else {})
  complete = next((x for x in reversed(ev) if x.get("event") == "seed_complete"), {})
  mode = complete.get("mode") or start.get("mode") or "?"
  ts = complete.get("ts") or start.get("ts") or "?"
  branch = start.get("git_branch") or ""
  sha = start.get("git_sha") or ""
  created = complete.get("readings_created")
  user_id = complete.get("user_id")

  parts = [ts, rid, f"mode={mode}"]
  if branch:
    parts.append(f"{branch}@{sha}" if sha else branch)
  if user_id:
    parts.append(f"user_id={user_id}")
  if created is not None:
    parts.append(f"readings_created={created}")

  print("- " + " | ".join(parts))
PY


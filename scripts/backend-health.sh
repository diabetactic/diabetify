#!/usr/bin/env bash

set -euo pipefail

URLS=(
  "http://localhost:8000/health"
)

MAX_RETRIES="${BACKEND_HEALTH_RETRIES:-10}"
SLEEP_SECONDS="${BACKEND_HEALTH_SLEEP_SECONDS:-2}"

echo "🔍 Checking backend health (up to ${MAX_RETRIES} attempts)..."

for attempt in $(seq 1 "$MAX_RETRIES"); do
  all_ok=true

  for url in "${URLS[@]}"; do
    if ! curl -fsS "$url" > /dev/null; then
      echo "  - ${url} not ready yet (attempt ${attempt}/${MAX_RETRIES})"
      all_ok=false
      break
    fi
  done

  if [ "$all_ok" = true ]; then
    echo "✅ Backend health check passed on attempt ${attempt}."
    exit 0
  fi

  sleep "$SLEEP_SECONDS"
done

echo "❌ Backend health check failed after ${MAX_RETRIES} attempts."
exit 1


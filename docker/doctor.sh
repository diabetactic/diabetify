#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🐳 Diabetactic Docker Doctor"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not found"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker daemon not running"
  exit 1
fi

echo "== Compose status (local backend) =="
docker compose -f docker-compose.local.yml ps || true
echo ""

echo "== Last seed runs =="
if command -v python3 >/dev/null 2>&1; then
  ./seed-history.sh --last 5 || true
else
  echo "(python3 not found; cannot summarize seed history)"
fi

echo ""
echo "== Heuristics =="
echo "- If tests fail due to stale data: run ./seed-test-data.sh full (fast) or ./reset-db.sh (slow, wipes volumes)."
echo "- If a service is unhealthy: check ./logs.sh (healthcheck can also be misconfigured; use logs to confirm)."
echo "- If you changed Dockerfiles/compose or backend code: rebuild images with docker compose -f docker-compose.local.yml build --no-cache."
echo "- If something is badly wedged: docker compose -f docker-compose.local.yml down -v --remove-orphans then ./start.sh."

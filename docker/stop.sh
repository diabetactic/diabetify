#!/bin/bash
# Stop all Diabetactic backend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

source "$SCRIPT_DIR/_runlog.sh" 2>/dev/null || true

echo "🛑 Stopping Diabetactic local testing environment..."

if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "backend-history.jsonl" \
    event="backend_stop" \
    compose_file="docker-compose.local.yml" \
    cwd="$(pwd)" \
    || true
fi

docker compose -f docker-compose.local.yml down

echo "✅ All services stopped."
echo ""
echo "💡 To remove all data volumes, run:"
echo "   docker compose -f docker-compose.local.yml down -v"

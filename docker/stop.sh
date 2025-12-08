#!/bin/bash
# Stop all Diabetactic backend services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping Diabetactic local testing environment..."

docker compose -f docker-compose.local.yml down

echo "✅ All services stopped."
echo ""
echo "💡 To remove all data volumes, run:"
echo "   docker compose -f docker-compose.local.yml down -v"

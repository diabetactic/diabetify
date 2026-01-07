#!/bin/bash
# Reset all test databases (WARNING: This will delete all data!)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

source "$SCRIPT_DIR/_runlog.sh" 2>/dev/null || true

echo "⚠️  WARNING: This will delete ALL data in the local test databases!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Aborted."
    exit 1
fi

if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "backend-history.jsonl" \
    event="backend_reset_db" \
    compose_file="docker-compose.local.yml" \
    volumes_removed=true \
    cwd="$(pwd)" \
    || true
fi

echo "🔄 Stopping services..."
docker compose -f docker-compose.local.yml down -v --remove-orphans

echo "🚀 Restarting services with fresh databases..."
docker compose -f docker-compose.local.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo ""
        echo "✅ Databases reset successfully!"
        echo "   All data has been wiped and services are ready."
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo ""
    echo "⚠️  Services took longer than expected to start. Check logs with:"
    echo "   docker compose -f docker-compose.local.yml logs"
    exit 1
fi

echo ""
echo "🧱 Running database migrations..."
docker compose -f docker-compose.local.yml exec -T login_service alembic upgrade head
docker compose -f docker-compose.local.yml exec -T glucoserver alembic upgrade head
docker compose -f docker-compose.local.yml exec -T appointments alembic upgrade head
echo "   ✓ Migrations applied"

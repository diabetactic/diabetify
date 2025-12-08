#!/bin/bash
# Reset all test databases (WARNING: This will delete all data!)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "⚠️  WARNING: This will delete ALL data in the local test databases!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Aborted."
    exit 1
fi

echo "🔄 Stopping services..."
docker compose -f docker-compose.local.yml down

echo "🗑️  Removing database volumes..."
docker volume rm diabetify_postgres_data_users 2>/dev/null || true
docker volume rm diabetify_postgres_data_appointments 2>/dev/null || true
docker volume rm diabetify_postgres_data_glucoserver 2>/dev/null || true

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

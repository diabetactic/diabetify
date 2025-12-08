#!/bin/bash
# Start all Diabetactic backend services in Docker

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Diabetactic local testing environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start services
echo "📦 Starting all services (this may take a few minutes on first run)..."
docker compose -f docker-compose.local.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."

# Wait for API Gateway to be ready
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo ""
        echo "✅ All services are ready!"
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
echo "📊 Service Status:"
echo "  API Gateway:            http://localhost:8000"
echo "  API Gateway Backoffice: http://localhost:8001"
echo "  API Gateway Docs:       http://localhost:8000/docs"
echo ""
echo "🔧 Useful commands:"
echo "  View logs:        docker compose -f docker-compose.local.yml logs -f"
echo "  Stop services:    ./stop.sh"
echo "  Reset database:   ./reset-db.sh"
echo "  Create test user: ./create-user.sh <dni> <password>"
echo ""
echo "✨ Ready for testing!"

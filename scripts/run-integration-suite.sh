#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

export DOCKER_CONFIG="${DOCKER_CONFIG:-$ROOT_DIR/.docker-test-config}"
mkdir -p "$DOCKER_CONFIG"

echo "🧹 Ensuring backend stack is stopped..."
npm run backend:stop || true

echo ""
echo "🚀 Starting backend services via container-managing..."
npm run backend:start

echo ""
echo "🔍 Checking backend health..."
if ! npm run backend:health; then
  echo ""
  echo "❌ Backend health check failed. See logs above."
  echo "   (stack started via container-managing; consider checking its logs)"
  # Best-effort teardown
  npm run backend:stop || true
  exit 1
fi

echo ""
echo "🧪 Running Jest integration tests..."
API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:8004}" npm run test:integration

echo ""
echo "✅ Integration suite completed."

echo ""
echo "🧹 Stopping backend services..."
npm run backend:stop || true

#!/bin/bash
# Test suite for MOCK mode (fastest, no backend needed)

set -e

echo "========================================="
echo "🎭 MOCK MODE TEST SUITE"
echo "========================================="
echo ""

# Deploy in mock mode
echo "📦 Building and deploying in MOCK mode..."
npm run deploy:mock

echo ""
echo "Running complete test suite..."
./scripts/run-all-tests.sh

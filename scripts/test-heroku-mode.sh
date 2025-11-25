#!/bin/bash
# Test suite for HEROKU mode (requires backend)

set -e

echo "========================================="
echo "☁️  HEROKU MODE TEST SUITE"
echo "========================================="
echo ""

# Deploy in heroku mode
echo "📦 Building and deploying in HEROKU mode..."
npm run deploy:heroku

echo ""
echo "Running complete test suite..."
./scripts/run-all-tests.sh

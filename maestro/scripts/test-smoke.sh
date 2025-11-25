#!/bin/bash

# Smoke Test Runner - Quick validation (< 2 minutes)
# Runs critical path tests to validate app is working

echo "🚀 Running Diabetify Smoke Tests..."
echo "=================================="

# Set mock backend for fast, reliable tests
export BACKEND_MODE=mock

# Run smoke-tagged tests
maestro test --include-tags smoke ../tests/

echo ""
echo "✅ Smoke tests complete!"
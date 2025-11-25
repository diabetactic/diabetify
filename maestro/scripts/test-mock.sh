#!/bin/bash

# Mock Backend Test Runner
# Runs all tests using the mock adapter (no network required)

echo "🧪 Running All Tests with Mock Backend..."
echo "========================================="

# Configure for mock backend
export BACKEND_MODE=mock
export USE_MOCK_ADAPTER=true

# Run all tests
echo "Running authentication tests..."
maestro test ../tests/auth/

echo "Running dashboard tests..."
maestro test ../tests/dashboard/

echo "Running readings tests..."
maestro test ../tests/readings/

echo "Running appointments tests..."
maestro test ../tests/appointments/

echo "Running profile tests..."
maestro test ../tests/profile/

echo "Running integration tests..."
maestro test ../tests/integration/

echo ""
echo "✅ All mock tests complete!"
echo ""
echo "📊 Test Summary:"
echo "- Auth: Complete"
echo "- Dashboard: Complete"
echo "- Readings: Complete"
echo "- Appointments: Complete"
echo "- Profile: Complete"
echo "- Integration: Complete"
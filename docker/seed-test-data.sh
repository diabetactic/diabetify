#!/bin/bash
# =============================================================================
# Seed Test Data for E2E Tests
# =============================================================================
# Creates a deterministic test environment with known data for reproducible tests.
#
# Usage:
#   ./seed-test-data.sh              # Seed default test user (1000)
#   ./seed-test-data.sh full         # Seed with readings and appointments
#   ./seed-test-data.sh minimal      # Just create user, no data
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE=${1:-"full"}
API_URL="http://localhost:8000"
BACKOFFICE_URL="http://localhost:8001"

# Test user credentials (same as Heroku seed account for consistency)
TEST_USER_DNI="1000"
TEST_USER_PASSWORD="tuvieja"
TEST_USER_NAME="Test"
TEST_USER_SURNAME="User"
TEST_USER_EMAIL="test1000@diabetactic.test"

echo "🌱 Seeding test data (mode: $MODE)..."
echo ""

# -----------------------------------------------------------------------------
# Step 1: Create test user
# -----------------------------------------------------------------------------
echo "👤 Creating test user..."

# Check if user already exists
USER_EXISTS=$(curl -s "$API_URL/users/from_dni/$TEST_USER_DNI" 2>/dev/null | grep -c "user_id" || echo "0")

if [ "$USER_EXISTS" = "0" ]; then
    ./create-user.sh "$TEST_USER_DNI" "$TEST_USER_PASSWORD" "$TEST_USER_NAME" "$TEST_USER_SURNAME" "$TEST_USER_EMAIL"
else
    echo "   User $TEST_USER_DNI already exists, skipping creation"
fi

# -----------------------------------------------------------------------------
# Step 2: Get auth token
# -----------------------------------------------------------------------------
echo ""
echo "🔑 Getting auth token..."

TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$TEST_USER_DNI&password=$TEST_USER_PASSWORD")

AUTH_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Failed to get auth token"
    echo "   Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "   ✓ Got auth token"

# -----------------------------------------------------------------------------
# Step 3: Accept hospital account (if needed)
# -----------------------------------------------------------------------------
echo ""
echo "🏥 Checking hospital account status..."

# Update hospital account to 'accepted' via backoffice
docker exec diabetactic_test_utils python3 user_manager.py update-status "$TEST_USER_DNI" "accepted" 2>/dev/null || true

if [ "$MODE" = "minimal" ]; then
    echo ""
    echo "✅ Minimal seed complete!"
    echo "   User: $TEST_USER_DNI / $TEST_USER_PASSWORD"
    exit 0
fi

# -----------------------------------------------------------------------------
# Step 4: Seed glucose readings (full mode only)
# -----------------------------------------------------------------------------
echo ""
echo "📊 Seeding glucose readings..."

# Create 5 test readings with different values and times
READINGS=(
    '{"value": 95, "notes": "__E2E_TEST__ Morning fasting", "mealContext": "fasting"}'
    '{"value": 140, "notes": "__E2E_TEST__ After breakfast", "mealContext": "after_meal"}'
    '{"value": 110, "notes": "__E2E_TEST__ Before lunch", "mealContext": "before_meal"}'
    '{"value": 85, "notes": "__E2E_TEST__ Low reading", "mealContext": "fasting"}'
    '{"value": 180, "notes": "__E2E_TEST__ High after dinner", "mealContext": "after_meal"}'
)

READINGS_CREATED=0
for READING in "${READINGS[@]}"; do
    RESPONSE=$(curl -s -X POST "$API_URL/glucose/create" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$READING")

    if echo "$RESPONSE" | grep -q '"id"'; then
        READINGS_CREATED=$((READINGS_CREATED + 1))
    fi
done

echo "   ✓ Created $READINGS_CREATED glucose readings"

# -----------------------------------------------------------------------------
# Step 5: Clear appointment queue (full mode only)
# -----------------------------------------------------------------------------
echo ""
echo "📅 Clearing appointment queue..."

# Clear any existing appointments via backoffice
ADMIN_TOKEN_RESPONSE=$(curl -s -X POST "$BACKOFFICE_URL/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=admin")

ADMIN_TOKEN=$(echo "$ADMIN_TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    # Clear queue for test user
    curl -s -X DELETE "$BACKOFFICE_URL/appointments/queue/clear" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"user_id\": \"$TEST_USER_DNI\"}" > /dev/null 2>&1 || true
    echo "   ✓ Appointment queue cleared"
else
    echo "   ⚠ Could not clear appointment queue (backoffice auth failed)"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "✅ Test data seeded successfully!"
echo "=============================================="
echo ""
echo "Test User Credentials:"
echo "  DNI:      $TEST_USER_DNI"
echo "  Password: $TEST_USER_PASSWORD"
echo ""
echo "Seeded Data:"
echo "  - $READINGS_CREATED glucose readings (tagged with __E2E_TEST__)"
echo "  - Hospital account: accepted"
echo "  - Appointment queue: cleared"
echo ""
echo "API Endpoints:"
echo "  - Main API: $API_URL"
echo "  - Backoffice: $BACKOFFICE_URL"
echo ""

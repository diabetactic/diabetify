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

# Test user 1 credentials (same as Heroku seed account for consistency)
TEST_USER_DNI="1000"
TEST_USER_PASSWORD="tuvieja"
TEST_USER_NAME="Test"
TEST_USER_SURNAME="User"
TEST_USER_EMAIL="test1000@diabetactic.com"

# Test user 2 credentials (for multi-user E2E tests)
TEST_USER_2_DNI="1001"
TEST_USER_2_PASSWORD="tuvieja2"
TEST_USER_2_NAME="Second"
TEST_USER_2_SURNAME="Tester"
TEST_USER_2_EMAIL="test1001@diabetactic.com"

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

# Create second test user for multi-user E2E tests
echo ""
echo "👤 Creating second test user (for multi-user tests)..."
USER_2_EXISTS=$(curl -s "$API_URL/users/from_dni/$TEST_USER_2_DNI" 2>/dev/null | grep -c "user_id" || echo "0")

if [ "$USER_2_EXISTS" = "0" ]; then
    ./create-user.sh "$TEST_USER_2_DNI" "$TEST_USER_2_PASSWORD" "$TEST_USER_2_NAME" "$TEST_USER_2_SURNAME" "$TEST_USER_2_EMAIL"
    # Also accept hospital account for user 2
    docker exec diabetactic_test_utils python3 user_manager.py update-status "$TEST_USER_2_DNI" "accepted" 2>/dev/null || true
else
    echo "   User $TEST_USER_2_DNI already exists, skipping creation"
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
# Step 4: Clean up old test readings (prevent accumulation)
# -----------------------------------------------------------------------------
echo ""
echo "🧹 Cleaning up old test readings..."

# Delete ALL readings for test user to prevent accumulation from repeated runs
# This ensures a clean slate for each test session
docker exec diabetactic_glucoserver_db psql -U postgres -d glucoserver \
    -c "DELETE FROM glucose_readings WHERE user_id = (SELECT user_id FROM glucose_readings gr JOIN (SELECT 1 as user_id) u ON gr.user_id = u.user_id LIMIT 1);" 2>/dev/null || true

# More reliable: delete by user_id directly
docker exec diabetactic_glucoserver_db psql -U postgres -d glucoserver \
    -c "DELETE FROM glucose_readings WHERE user_id = 1;" 2>/dev/null || true

echo "   ✓ Cleaned up old readings"

# -----------------------------------------------------------------------------
# Step 5: Seed glucose readings (full mode only)
# -----------------------------------------------------------------------------
echo ""
echo "📊 Seeding glucose readings..."

# Create 5 test readings with different values using query params
# API format: /glucose/create?glucose_level=X&reading_type=ENUM&notes=TEXT
# Valid reading_type values: DESAYUNO, ALMUERZO, MERIENDA, CENA, EJERCICIO, OTRAS_COMIDAS, OTRO

READINGS_CREATED=0

# Reading 1: Morning fasting (95 mg/dL)
RESPONSE=$(curl -s -X POST "$API_URL/glucose/create?glucose_level=95&reading_type=DESAYUNO&notes=__E2E_TEST__%20Morning%20fasting" \
    -H "Authorization: Bearer $AUTH_TOKEN")
if echo "$RESPONSE" | grep -q '"id"'; then READINGS_CREATED=$((READINGS_CREATED + 1)); fi

# Reading 2: After breakfast (140 mg/dL)
RESPONSE=$(curl -s -X POST "$API_URL/glucose/create?glucose_level=140&reading_type=DESAYUNO&notes=__E2E_TEST__%20After%20breakfast" \
    -H "Authorization: Bearer $AUTH_TOKEN")
if echo "$RESPONSE" | grep -q '"id"'; then READINGS_CREATED=$((READINGS_CREATED + 1)); fi

# Reading 3: Before lunch (110 mg/dL)
RESPONSE=$(curl -s -X POST "$API_URL/glucose/create?glucose_level=110&reading_type=ALMUERZO&notes=__E2E_TEST__%20Before%20lunch" \
    -H "Authorization: Bearer $AUTH_TOKEN")
if echo "$RESPONSE" | grep -q '"id"'; then READINGS_CREATED=$((READINGS_CREATED + 1)); fi

# Reading 4: Low reading (85 mg/dL)
RESPONSE=$(curl -s -X POST "$API_URL/glucose/create?glucose_level=85&reading_type=OTRO&notes=__E2E_TEST__%20Low%20reading" \
    -H "Authorization: Bearer $AUTH_TOKEN")
if echo "$RESPONSE" | grep -q '"id"'; then READINGS_CREATED=$((READINGS_CREATED + 1)); fi

# Reading 5: High after dinner (180 mg/dL)
RESPONSE=$(curl -s -X POST "$API_URL/glucose/create?glucose_level=180&reading_type=CENA&notes=__E2E_TEST__%20High%20after%20dinner" \
    -H "Authorization: Bearer $AUTH_TOKEN")
if echo "$RESPONSE" | grep -q '"id"'; then READINGS_CREATED=$((READINGS_CREATED + 1)); fi

echo "   ✓ Created $READINGS_CREATED glucose readings"

# -----------------------------------------------------------------------------
# Step 6: Clear appointment queue (full mode only)
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
echo "Test User 1 Credentials:"
echo "  DNI:      $TEST_USER_DNI"
echo "  Password: $TEST_USER_PASSWORD"
echo ""
echo "Test User 2 Credentials (for multi-user tests):"
echo "  DNI:      $TEST_USER_2_DNI"
echo "  Password: $TEST_USER_2_PASSWORD"
echo ""
echo "Seeded Data:"
echo "  - $READINGS_CREATED glucose readings (tagged with __E2E_TEST__)"
echo "  - Hospital accounts: accepted"
echo "  - Appointment queues: cleared"
echo ""
echo "API Endpoints:"
echo "  - Main API: $API_URL"
echo "  - Backoffice: $BACKOFFICE_URL"
echo ""

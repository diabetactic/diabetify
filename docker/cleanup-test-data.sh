#!/bin/bash
# =============================================================================
# Cleanup Test Data after E2E Tests
# =============================================================================
# Removes test-tagged data to maintain clean state.
#
# Usage:
#   ./cleanup-test-data.sh           # Clean test data for user 1000
#   ./cleanup-test-data.sh <dni>     # Clean test data for specific user
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

API_URL="http://localhost:8000"
BACKOFFICE_URL="http://localhost:8001"

TEST_USER_DNI="${1:-1000}"
TEST_USER_PASSWORD="tuvieja"

echo "🧹 Cleaning up test data for user $TEST_USER_DNI..."
echo ""

# -----------------------------------------------------------------------------
# Step 1: Get auth token
# -----------------------------------------------------------------------------
echo "🔑 Getting auth token..."

TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$TEST_USER_DNI&password=$TEST_USER_PASSWORD")

AUTH_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$AUTH_TOKEN" ]; then
    echo "⚠ Could not get auth token, user may not exist"
    exit 0
fi

echo "   ✓ Got auth token"

# -----------------------------------------------------------------------------
# Step 2: Delete test-tagged readings
# -----------------------------------------------------------------------------
echo ""
echo "📊 Cleaning glucose readings..."

# Get all readings
READINGS=$(curl -s "$API_URL/glucose/mine" \
    -H "Authorization: Bearer $AUTH_TOKEN")

# Count readings with __E2E_TEST__ tag
TEST_READINGS=$(echo "$READINGS" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' || echo "")
DELETED=0

for READING_ID in $TEST_READINGS; do
    # Check if this reading has the test tag (simplified - delete all for clean state)
    READING_NOTES=$(echo "$READINGS" | grep -o "\"id\":$READING_ID[^}]*" | grep -o '"notes":"[^"]*"' | head -1)

    if echo "$READING_NOTES" | grep -q "__E2E_TEST__"; then
        curl -s -X DELETE "$API_URL/glucose/$READING_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null 2>&1 || true
        DELETED=$((DELETED + 1))
    fi
done

echo "   ✓ Deleted $DELETED test-tagged readings"

# -----------------------------------------------------------------------------
# Step 3: Clear appointment queue
# -----------------------------------------------------------------------------
echo ""
echo "📅 Clearing appointment queue..."

ADMIN_TOKEN_RESPONSE=$(curl -s -X POST "$BACKOFFICE_URL/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=admin")

ADMIN_TOKEN=$(echo "$ADMIN_TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    curl -s -X DELETE "$BACKOFFICE_URL/appointments/queue/clear" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"user_id\": \"$TEST_USER_DNI\"}" > /dev/null 2>&1 || true
    echo "   ✓ Appointment queue cleared"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "✅ Cleanup complete for user $TEST_USER_DNI"
echo ""

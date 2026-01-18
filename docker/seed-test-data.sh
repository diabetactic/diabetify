#!/bin/bash
# =============================================================================
# Seed Test Data for E2E Tests
# =============================================================================
# Creates a deterministic test environment with known data for reproducible tests.
#
# Usage:
#   ./seed-test-data.sh              # Seed default test user (40123456)
#   ./seed-test-data.sh full         # Seed with readings and appointments
#   ./seed-test-data.sh minimal      # Just create user, no data
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

source "$SCRIPT_DIR/_runlog.sh" 2>/dev/null || true

MODE=${1:-"full"}
API_URL="http://localhost:8000"
BACKOFFICE_URL="http://localhost:8001"

RUN_ID="${SEED_RUN_ID:-${RUN_ID:-}}"
export RUN_ID

PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_SHA="$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "")"
GIT_BRANCH="$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "seed-history.jsonl" \
    event="seed_start" \
    mode="$MODE" \
    api_url="$API_URL" \
    backoffice_url="$BACKOFFICE_URL" \
    git_sha="$GIT_SHA" \
    git_branch="$GIT_BRANCH" \
    || true
fi

# Ensure schema exists before seeding (fresh volumes can be empty)
echo "🧱 Ensuring database schema..."
docker compose -f docker-compose.local.yml exec -T login_service alembic upgrade head
docker compose -f docker-compose.local.yml exec -T glucoserver alembic upgrade head
docker compose -f docker-compose.local.yml exec -T appointments alembic upgrade head
echo "   ✓ Migrations applied"
echo ""

# Test user 1 credentials (primary E2E test account)
# IMPORTANT: Keep in sync with playwright/config/test-config.ts
TEST_USER_DNI="40123456"
TEST_USER_PASSWORD="thepassword"
TEST_USER_NAME="Test"
TEST_USER_SURNAME="User"
TEST_USER_EMAIL="test40123456@diabetactic.com"

# Test user 2 credentials (for multi-user E2E tests)
# IMPORTANT: Keep in sync with playwright/config/test-config.ts
TEST_USER_2_DNI="40123457"
TEST_USER_2_PASSWORD="thepassword2"
TEST_USER_2_NAME="Second"
TEST_USER_2_SURNAME="Tester"
TEST_USER_2_EMAIL="test40123457@diabetactic.com"

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
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="user_created" dni="$TEST_USER_DNI" || true
    fi
else
    echo "   User $TEST_USER_DNI already exists, skipping creation"
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="user_exists" dni="$TEST_USER_DNI" || true
    fi
fi

# Create second test user for multi-user E2E tests
echo ""
echo "👤 Creating second test user (for multi-user tests)..."
USER_2_EXISTS=$(curl -s "$API_URL/users/from_dni/$TEST_USER_2_DNI" 2>/dev/null | grep -c "user_id" || echo "0")

if [ "$USER_2_EXISTS" = "0" ]; then
    ./create-user.sh "$TEST_USER_2_DNI" "$TEST_USER_2_PASSWORD" "$TEST_USER_2_NAME" "$TEST_USER_2_SURNAME" "$TEST_USER_2_EMAIL"
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="user_created" dni="$TEST_USER_2_DNI" || true
    fi
else
    echo "   User $TEST_USER_2_DNI already exists, skipping creation"
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="user_exists" dni="$TEST_USER_2_DNI" || true
    fi
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
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="auth_token_failed" dni="$TEST_USER_DNI" || true
    fi
    exit 1
fi

echo "   ✓ Got auth token"
if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "seed-history.jsonl" event="auth_token_ok" dni="$TEST_USER_DNI" || true
fi

# -----------------------------------------------------------------------------
# Step 3: Accept hospital account (if needed)
# -----------------------------------------------------------------------------
echo ""
echo "🏥 Checking hospital account status..."

# Update hospital account to 'accepted' via backoffice
docker exec diabetactic_test_utils python3 user_manager.py update-status "$TEST_USER_DNI" "accepted" 2>/dev/null || true
if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "seed-history.jsonl" event="hospital_status_set" dni="$TEST_USER_DNI" status="accepted" || true
fi

if [ "$MODE" = "minimal" ]; then
    echo ""
    echo "✅ Minimal seed complete!"
    echo "   User: $TEST_USER_DNI / $TEST_USER_PASSWORD"
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="seed_complete" mode="$MODE" || true
    fi
    exit 0
fi

# Determine numeric user_id for deterministic cleanup.
USER_JSON=$(curl -s "$API_URL/users/from_dni/$TEST_USER_DNI" 2>/dev/null || echo "")
if command -v python3 >/dev/null 2>&1; then
  USER_ID=$(python3 - <<'PY' 2>/dev/null <<<"$USER_JSON" || true
import json, sys
try:
  data = json.load(sys.stdin)
  print(data.get("user_id", ""))
except Exception:
  print("")
PY
  )
else
  USER_ID=""
fi

if [ -z "${USER_ID:-}" ]; then
  echo "❌ Failed to determine user_id for DNI $TEST_USER_DNI"
  echo "   Response: $USER_JSON"
  if declare -F append_jsonl >/dev/null 2>&1; then
    append_jsonl "seed-history.jsonl" event="user_id_failed" dni="$TEST_USER_DNI" || true
  fi
  exit 1
fi

if ! [[ "$USER_ID" =~ ^[0-9]+$ ]]; then
  echo "❌ Invalid user_id for DNI $TEST_USER_DNI (expected integer): $USER_ID"
  echo "   Response: $USER_JSON"
  if declare -F append_jsonl >/dev/null 2>&1; then
    append_jsonl "seed-history.jsonl" event="user_id_invalid" dni="$TEST_USER_DNI" user_id="$USER_ID" || true
  fi
  exit 1
fi

# -----------------------------------------------------------------------------
# Step 4: Clean up old test readings (prevent accumulation)
# -----------------------------------------------------------------------------
echo ""
echo "🧹 Cleaning up old test readings..."

DELETED_BEFORE=$(docker exec diabetactic_glucoserver_db psql -U postgres -d glucoserver -tA \
    -c "SELECT COUNT(*) FROM glucose_readings WHERE user_id = $USER_ID;" 2>/dev/null || echo "")

# Delete ALL readings for this test user to prevent accumulation from repeated runs.
docker exec diabetactic_glucoserver_db psql -U postgres -d glucoserver \
    -c "DELETE FROM glucose_readings WHERE user_id = $USER_ID;" 2>/dev/null || true

DELETED_AFTER=$(docker exec diabetactic_glucoserver_db psql -U postgres -d glucoserver -tA \
    -c "SELECT COUNT(*) FROM glucose_readings WHERE user_id = $USER_ID;" 2>/dev/null || echo "")

if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "seed-history.jsonl" \
    event="readings_cleared" \
    user_id="$USER_ID" \
    count_before="${DELETED_BEFORE:-}" \
    count_after="${DELETED_AFTER:-}" \
    || true
fi

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
if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "seed-history.jsonl" event="readings_seeded" user_id="$USER_ID" created="$READINGS_CREATED" || true
fi

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
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="appointments_queue_cleared" dni="$TEST_USER_DNI" || true
    fi
else
    echo "   ⚠ Could not clear appointment queue (backoffice auth failed)"
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="appointments_queue_clear_failed" dni="$TEST_USER_DNI" || true
    fi
fi

# -----------------------------------------------------------------------------
# Step 7: Seed appointments (full mode only)
# -----------------------------------------------------------------------------
echo ""
echo "📅 Seeding appointments..."

if [ -n "$ADMIN_TOKEN" ]; then
    # 1. Create a DENIED appointment
    # User requests
    curl -s -X POST "$API_URL/appointments/submit" \
        -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null

    # Admin denies
    curl -s -X POST "$BACKOFFICE_URL/appointments/queue/deny" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"user_id\": \"$TEST_USER_DNI\"}" > /dev/null

    echo "   ✓ Created DENIED appointment"

    # 2. Create a COMPLETED (CREATED) appointment
    # User requests
    curl -s -X POST "$API_URL/appointments/submit" \
        -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null

    # Admin accepts
    curl -s -X POST "$BACKOFFICE_URL/appointments/queue/accept" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"user_id\": \"$TEST_USER_DNI\"}" > /dev/null

    # User creates (fills form)
    CREATE_BODY='{
      "glucose_objective": 100,
      "insulin_type": "rapid",
      "dose": 20,
      "fast_insulin": "Humalog",
      "fixed_dose": 5,
      "ratio": 15,
      "sensitivity": 50,
      "pump_type": "none",
      "control_data": "http://example.com/pdf",
      "motive": ["AJUSTE"],
      "other_motive": null,
      "another_treatment": null
    }'

    curl -s -X POST "$API_URL/appointments/create" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$CREATE_BODY" > /dev/null

    echo "   ✓ Created COMPLETED appointment"
    
    if declare -F append_jsonl >/dev/null 2>&1; then
      append_jsonl "seed-history.jsonl" event="appointments_seeded" user_id="$USER_ID" || true
    fi
else
    echo "   ⚠ Skipping appointment seeding (backoffice auth failed)"
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

if declare -F append_jsonl >/dev/null 2>&1; then
  append_jsonl "seed-history.jsonl" \
    event="seed_complete" \
    mode="$MODE" \
    user_id="$USER_ID" \
    readings_created="$READINGS_CREATED" \
    || true
fi

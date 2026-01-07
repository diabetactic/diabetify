#!/bin/bash
# =============================================================================
# Docker E2E Test Runner
# =============================================================================
# Complete E2E test orchestration with local Docker backend.
# Provides reproducible, deterministic test environment.
#
# Usage:
#   ./run-e2e-docker.sh                    # Run all Docker E2E tests
#   ./run-e2e-docker.sh playwright         # Run Playwright tests only
#   ./run-e2e-docker.sh maestro            # Run Maestro tests only
#   ./run-e2e-docker.sh --fresh            # Fresh DB before tests
#   ./run-e2e-docker.sh --keep-data        # Don't cleanup after tests
#
# Environment:
#   SKIP_BACKEND_START=1    Skip starting backend (if already running)
#   SKIP_SEED=1             Skip seeding test data
#   SKIP_CLEANUP=1          Skip cleanup after tests
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SCRIPT_DIR"

# Parse arguments
FRESH_DB=false
KEEP_DATA=false
TEST_SUITE="all"
DEBUG_MODE=false
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.local.yml"

while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH_DB=true
            shift
            ;;
        --keep-data)
            KEEP_DATA=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        playwright|maestro|all)
            TEST_SUITE=$1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=============================================="
echo "🐳 Docker E2E Test Runner"
echo "=============================================="
echo ""
echo "Configuration:"
echo "  Test Suite:  $TEST_SUITE"
echo "  Fresh DB:    $FRESH_DB"
echo "  Keep Data:   $KEEP_DATA"
echo "  Debug Mode:  $DEBUG_MODE"
echo ""

if [ -z "${E2E_DEBUG:-}" ] && [ "$DEBUG_MODE" = true ]; then
    export E2E_DEBUG=1
fi

dump_docker_state() {
    echo ""
    echo "🐳 Docker service status"
    docker compose -f "$COMPOSE_FILE" ps || true
    echo ""
    echo "🐳 Docker logs (tail=200)"
    docker compose -f "$COMPOSE_FILE" logs --tail=200 || true
}

# -----------------------------------------------------------------------------
# Step 1: Ensure Docker backend is running
# -----------------------------------------------------------------------------
if [ -z "$SKIP_BACKEND_START" ]; then
    echo "🔧 Step 1: Starting Docker backend..."

    if [ "$FRESH_DB" = true ]; then
        echo "   Resetting database for fresh start..."
        echo "yes" | ./reset-db.sh 2>/dev/null || ./reset-db.sh <<< "yes"
    else
        # Check if already running
        if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
            echo "   ✓ Backend already running"
        else
            ./start.sh
        fi
    fi

    # Wait for backend to be healthy
    echo "   Waiting for backend health..."
    MAX_RETRIES=30
    RETRY=0
    while [ $RETRY -lt $MAX_RETRIES ]; do
        if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
            echo "   ✓ Backend is healthy"
            break
        fi
        RETRY=$((RETRY + 1))
        sleep 2
    done

    if [ $RETRY -eq $MAX_RETRIES ]; then
        echo "❌ Backend failed to start"
        exit 1
    fi
else
    echo "⏭️  Skipping backend start (SKIP_BACKEND_START=1)"
fi

echo ""

# -----------------------------------------------------------------------------
# Step 2: Seed test data
# -----------------------------------------------------------------------------
if [ -z "$SKIP_SEED" ]; then
    echo "🌱 Step 2: Seeding test data..."
    ./seed-test-data.sh full
else
    echo "⏭️  Skipping seed (SKIP_SEED=1)"
fi

echo ""

# -----------------------------------------------------------------------------
# Step 3: Build frontend for local backend
# -----------------------------------------------------------------------------
echo "🔨 Step 3: Building frontend for local backend..."
cd "$PROJECT_DIR"

# Build with local environment
pnpm run build:local

echo "   ✓ Frontend built for local backend"
echo ""

# -----------------------------------------------------------------------------
# Step 4: Run tests
# -----------------------------------------------------------------------------
echo "🧪 Step 4: Running E2E tests ($TEST_SUITE)..."
echo ""

TEST_EXIT_CODE=0

if [ "$TEST_SUITE" = "all" ] || [ "$TEST_SUITE" = "playwright" ]; then
    echo "--- Playwright Tests ---"

    # Run Playwright tests against local backend
    E2E_BASE_URL="http://localhost:4200" \
    E2E_API_URL="http://localhost:8000" \
    E2E_BACKOFFICE_URL="http://localhost:8001" \
    E2E_TEST_USERNAME="1000" \
    E2E_TEST_PASSWORD="tuvieja" \
    E2E_DOCKER_TESTS="true" \
    pnpm run test:e2e --grep "@docker" || TEST_EXIT_CODE=$?

    echo ""
fi

if [ "$TEST_SUITE" = "all" ] || [ "$TEST_SUITE" = "maestro" ]; then
    echo "--- Maestro Tests ---"

    # Check if emulator is running
    if ! adb devices 2>/dev/null | grep -q "emulator"; then
        echo "⚠️  No Android emulator detected, skipping Maestro tests"
    else
        cd "$PROJECT_DIR/maestro"

        # Run Maestro tests against local backend
        API_BASE_URL="http://10.0.2.2:8000" \
        BACKOFFICE_API_URL="http://10.0.2.2:8001" \
        TEST_USER_ID="1000" \
        TEST_USER_PASSWORD="tuvieja" \
        maestro test tests/ --env DOCKER_BACKEND=true || TEST_EXIT_CODE=$?

        cd "$PROJECT_DIR"
    fi

    echo ""
fi

# -----------------------------------------------------------------------------
# Step 5: Cleanup (optional)
# -----------------------------------------------------------------------------
if [ "$KEEP_DATA" = false ] && [ -z "$SKIP_CLEANUP" ]; then
    echo "🧹 Step 5: Cleaning up test data..."
    cd "$SCRIPT_DIR"
    ./cleanup-test-data.sh
else
    echo "⏭️  Skipping cleanup (--keep-data or SKIP_CLEANUP=1)"
fi

echo ""

if [ "$DEBUG_MODE" = true ] || [ "${E2E_DEBUG:-}" = "1" ] || [ "${E2E_DEBUG:-}" = "true" ] || [ $TEST_EXIT_CODE -ne 0 ]; then
    dump_docker_state
fi


# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "=============================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Docker E2E Tests PASSED"
else
    echo "❌ Docker E2E Tests FAILED (exit code: $TEST_EXIT_CODE)"
fi
echo "=============================================="
echo ""
echo "Reports:"
echo "  - Playwright: $PROJECT_DIR/playwright-report/index.html"
echo "  - Maestro: $PROJECT_DIR/maestro/.maestro/tests/"
echo ""

exit $TEST_EXIT_CODE

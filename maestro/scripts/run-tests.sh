#!/bin/bash
# ==========================================
# Maestro Test Runner with API 36 Workaround
# ==========================================
# Maestro 2.0.10 has issues with launchApp on Android API 36.
# This script launches the app via adb before running tests.
#
# Usage:
#   ./run-tests.sh                    # Run all tests
#   ./run-tests.sh tests/readings/    # Run specific folder
#   ./run-tests.sh tests/readings/01-list-loads.yaml  # Run single test
#   ./run-tests.sh --clear            # Clear app data before running
#   ./run-tests.sh --sequential       # Run tests one by one (slower but isolated)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(dirname "$SCRIPT_DIR")"
APP_ID="io.diabetactic.app"

# Default env vars
export TEST_USER_ID="${TEST_USER_ID:-1000}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-tuvieja}"
export BACKOFFICE_API_URL="${BACKOFFICE_API_URL:-https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com}"
export BACKOFFICE_ADMIN_USERNAME="${BACKOFFICE_ADMIN_USERNAME:-admin}"
export BACKOFFICE_ADMIN_PASSWORD="${BACKOFFICE_ADMIN_PASSWORD:-admin}"

CLEAR_STATE=false
SEQUENTIAL=false
TEST_PATH=""

# Parse arguments
for arg in "$@"; do
    case $arg in
        --clear)
            CLEAR_STATE=true
            ;;
        --sequential)
            SEQUENTIAL=true
            ;;
        *)
            if [[ -z "$TEST_PATH" ]]; then
                TEST_PATH="$arg"
            fi
            ;;
    esac
done

# Default test path - use tests/ directory which Maestro will scan recursively
if [[ -z "$TEST_PATH" ]]; then
    TEST_PATH="tests/"
fi

echo "=========================================="
echo "  Maestro Test Runner (API 36 Workaround)"
echo "=========================================="
echo "App ID: $APP_ID"
echo "Test User: $TEST_USER_ID"
echo "Clear State: $CLEAR_STATE"
echo "Sequential: $SEQUENTIAL"
echo "Test Path: $TEST_PATH"
echo ""

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "ERROR: No Android device/emulator found."
    echo "Please start an emulator or connect a device first."
    exit 1
fi

launch_app() {
    # Stop app if running
    adb shell am force-stop "$APP_ID" 2>/dev/null || true
    sleep 1

    # Clear app data if requested
    if [[ "$CLEAR_STATE" == "true" ]]; then
        echo "Clearing app data..."
        adb shell pm clear "$APP_ID" 2>/dev/null || true
        sleep 1
    fi

    # Launch app via adb
    echo "Launching app via adb..."
    adb shell am start -n "$APP_ID/.MainActivity"
    sleep 3

    # Verify app is running
    if ! adb shell pidof "$APP_ID" > /dev/null 2>&1; then
        echo "ERROR: App failed to launch"
        return 1
    fi
    echo "App is running"
}

# Change to maestro directory
cd "$MAESTRO_DIR"

if [[ "$SEQUENTIAL" == "true" ]]; then
    # Run tests one by one with fresh app state between each
    echo ""
    echo "Running tests SEQUENTIALLY with fresh app state..."
    echo ""

    PASSED=0
    FAILED=0

    # Find all test files
    if [[ "$TEST_PATH" == *.yaml ]]; then
        TEST_FILES="$TEST_PATH"
    else
        TEST_FILES=$(find "$TEST_PATH" -name "*.yaml" -type f 2>/dev/null | grep -v "flows/" | sort)
    fi

    for test_file in $TEST_FILES; do
        echo "----------------------------------------"
        echo "Running: $test_file"
        echo "----------------------------------------"

        # Launch fresh app
        launch_app

        # Run single test
        if maestro test "$test_file" \
            --env TEST_USER_ID="$TEST_USER_ID" \
            --env TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
            --env BACKOFFICE_API_URL="$BACKOFFICE_API_URL" \
            --env BACKOFFICE_ADMIN_USERNAME="$BACKOFFICE_ADMIN_USERNAME" \
            --env BACKOFFICE_ADMIN_PASSWORD="$BACKOFFICE_ADMIN_PASSWORD"; then
            echo "PASSED: $test_file"
            ((PASSED++))
        else
            echo "FAILED: $test_file"
            ((FAILED++))
        fi
        echo ""
    done

    echo "=========================================="
    echo "Results: $PASSED passed, $FAILED failed"
    echo "=========================================="

    if [[ $FAILED -gt 0 ]]; then
        exit 1
    fi
else
    # Run all tests at once (Maestro handles parallelism)
    launch_app

    echo ""
    echo "Running Maestro tests: $TEST_PATH"
    echo "=========================================="

    maestro test "$TEST_PATH" \
        --env TEST_USER_ID="$TEST_USER_ID" \
        --env TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
        --env BACKOFFICE_API_URL="$BACKOFFICE_API_URL" \
        --env BACKOFFICE_ADMIN_USERNAME="$BACKOFFICE_ADMIN_USERNAME" \
        --env BACKOFFICE_ADMIN_PASSWORD="$BACKOFFICE_ADMIN_PASSWORD"
fi

echo ""
echo "Tests complete!"

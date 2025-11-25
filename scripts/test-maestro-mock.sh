#!/bin/bash
# Run all Mock mode compatible Maestro tests
# These tests use in-memory data and don't require backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Maestro Mock Mode Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Ensure we're in mock mode
echo -e "${YELLOW}Building for Mock mode...${NC}"
npm run build:mock
npm run cap:sync

echo ""
echo -e "${YELLOW}Installing APK...${NC}"
cd android && ./gradlew installDebug && cd ..

# Initialize counters
PASSED=0
FAILED=0
FAILED_LIST=""

# Function to run test with clean state
run_test() {
    local test="$1"
    local name=$(basename "$test")

    echo -e "${CYAN}Running: $name${NC}"

    # Clear state
    adb shell pm clear io.diabetactic.app 2>/dev/null
    adb shell am start -n io.diabetactic.app/.MainActivity 2>/dev/null
    sleep 2

    if maestro test "$test" > /tmp/maestro_$$.log 2>&1; then
        echo -e "${GREEN}✅ PASS: $name${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: $name${NC}"
        FAILED=$((FAILED + 1))
        FAILED_LIST="$FAILED_LIST\n  - $test"
    fi
    rm -f /tmp/maestro_$$.log
}

echo ""
echo -e "${YELLOW}Running Mock-specific tests...${NC}"

# Mock-specific tests
run_test "maestro/tests/auth/01-login-flow.mock.yaml"
run_test "maestro/tests/readings/02-add-reading.mock.yaml"
run_test "maestro/tests/integration/01-complete-workflow.mock.yaml"

echo ""
echo -e "${YELLOW}Running Universal tests...${NC}"

# Universal tests that work in all modes
run_test "maestro/tests/smoke-test.yaml"
run_test "maestro/tests/02-dashboard-navigation.yaml"
run_test "maestro/tests/03-theme-toggle.yaml"
run_test "maestro/tests/03-theme-toggle-simple.yaml"
run_test "maestro/tests/04-language-switch.yaml"
run_test "maestro/tests/04-language-switch-simple.yaml"

# Auth tests (excluding heroku-specific)
run_test "maestro/tests/auth/01-login-flow.yaml"

# Reading tests (excluding heroku-specific)
run_test "maestro/tests/readings/02-add-reading.yaml"
run_test "maestro/tests/readings/03-verify-stats.yaml"
run_test "maestro/tests/readings/05-add-reading-validation.yaml"

# Appointment tests
run_test "maestro/tests/appointments/04-segment-switch.yaml"
run_test "maestro/tests/appointments/06-edit-delete-appointment.yaml"

# Profile tests
run_test "maestro/tests/profile/04-settings-persist.yaml"
run_test "maestro/tests/profile/06-profile-edit.yaml"

# Integration tests
run_test "maestro/tests/integration/01-complete-workflow.yaml"
run_test "maestro/tests/integration/01-full-user-journey.yaml"
run_test "maestro/tests/integration/02-reading-to-dashboard.yaml"

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Mock Mode Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed tests:${NC}"
    echo -e "$FAILED_LIST"
fi

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All Mock mode tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
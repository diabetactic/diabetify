#!/bin/bash
# Run ALL Maestro tests with clean state for each
# Usage: ./scripts/test-maestro-all.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Maestro Complete Test Suite (41 Tests)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_LIST=""

# Store start time
START_TIME=$(date +%s)

# Function to run a test
run_test() {
    local test_file="$1"
    local test_name=$(basename "$test_file")

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo ""
    echo -e "${CYAN}[$TOTAL_TESTS] Running: $test_name${NC}"
    echo -e "${CYAN}Path: $test_file${NC}"

    # Clear app state
    adb shell pm clear io.diabetactic.app 2>/dev/null
    adb shell am start -n io.diabetactic.app/.MainActivity 2>/dev/null
    sleep 2

    # Run the test
    if maestro test "$test_file" > /tmp/maestro_output_$$.log 2>&1; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LIST="$FAILED_LIST\n  - $test_file"

        # Show error summary
        echo -e "${YELLOW}Error output:${NC}"
        tail -n 5 /tmp/maestro_output_$$.log
    fi

    # Clean up log
    rm -f /tmp/maestro_output_$$.log
}

# Categories of tests
echo -e "${YELLOW}Testing Auth (5 tests)...${NC}"
for test in maestro/tests/auth/*.yaml; do
    [ -f "$test" ] && run_test "$test"
done

echo ""
echo -e "${YELLOW}Testing Dashboard (2 tests)...${NC}"
for test in maestro/tests/dashboard/*.yaml maestro/tests/02-dashboard-navigation.yaml; do
    [ -f "$test" ] && run_test "$test"
done

echo ""
echo -e "${YELLOW}Testing Readings (9 tests)...${NC}"
for test in maestro/tests/readings/*.yaml; do
    [ -f "$test" ] && run_test "$test"
done

echo ""
echo -e "${YELLOW}Testing Appointments (6 tests)...${NC}"
for test in maestro/tests/appointments/*.yaml; do
    [ -f "$test" ] && run_test "$test"
done

echo ""
echo -e "${YELLOW}Testing Profile (3 tests)...${NC}"
for test in maestro/tests/profile/*.yaml; do
    [ -f "$test" ] && run_test "$test"
done

echo ""
echo -e "${YELLOW}Testing Integration (5 tests)...${NC}"
for test in maestro/tests/integration/*.yaml; do
    [ -f "$test" ] && run_test "$test"
done

echo ""
echo -e "${YELLOW}Testing Standalone Tests (11 tests)...${NC}"
# Theme and language tests
[ -f "maestro/tests/03-theme-toggle.yaml" ] && run_test "maestro/tests/03-theme-toggle.yaml"
[ -f "maestro/tests/03-theme-toggle-simple.yaml" ] && run_test "maestro/tests/03-theme-toggle-simple.yaml"
[ -f "maestro/tests/04-language-switch.yaml" ] && run_test "maestro/tests/04-language-switch.yaml"
[ -f "maestro/tests/04-language-switch-simple.yaml" ] && run_test "maestro/tests/04-language-switch-simple.yaml"

# Smoke and quick tests
[ -f "maestro/tests/smoke-test.yaml" ] && run_test "maestro/tests/smoke-test.yaml"
[ -f "maestro/tests/smoke-test-simple.yaml" ] && run_test "maestro/tests/smoke-test-simple.yaml"
[ -f "maestro/tests/quick-verify.yaml" ] && run_test "maestro/tests/quick-verify.yaml"
[ -f "maestro/tests/debug-simple.yaml" ] && run_test "maestro/tests/debug-simple.yaml"
[ -f "maestro/tests/simple-login-test.yaml" ] && run_test "maestro/tests/simple-login-test.yaml"
[ -f "maestro/tests/simple-login-manual.yaml" ] && run_test "maestro/tests/simple-login-manual.yaml"

# Device test
[ -f "maestro/tests/devices.yaml" ] && run_test "maestro/tests/devices.yaml"

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Print summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Suite Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo -e "Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"
echo -e "Duration: ${MINUTES}m ${SECONDS}s"

if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed Tests:${NC}"
    echo -e "$FAILED_LIST"
fi

echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
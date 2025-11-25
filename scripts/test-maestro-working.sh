#!/bin/bash
# Run only the confirmed working Maestro tests
# These tests are known to pass consistently

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Maestro Working Tests Suite${NC}"
echo -e "${BLUE}  Running 5 confirmed working tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# List of working tests (from run-maestro-suite.sh)
WORKING_TESTS=(
    "maestro/tests/smoke-test.yaml"
    "maestro/tests/02-dashboard-navigation.yaml"
    "maestro/tests/03-theme-toggle-simple.yaml"
    "maestro/tests/04-language-switch-simple.yaml"
    "maestro/tests/auth/01-login-flow.mock.yaml"
)

PASSED=0
FAILED=0

for test in "${WORKING_TESTS[@]}"; do
    echo -e "${YELLOW}Running: $(basename $test)${NC}"

    # Clear state and run test
    adb shell pm clear io.diabetactic.app 2>/dev/null
    adb shell am start -n io.diabetactic.app/.MainActivity 2>/dev/null
    sleep 2

    if maestro test "$test"; then
        echo -e "${GREEN}✅ PASS: $(basename $test)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: $(basename $test)${NC}"
        FAILED=$((FAILED + 1))
    fi
    echo ""
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All working tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed unexpectedly${NC}"
    exit 1
fi
#!/bin/bash
# Run complete Maestro test suite with simplified tests
# This script runs all working Maestro tests in sequence

set -e

echo "========================================="
echo "🎬 MAESTRO TEST SUITE"
echo "========================================="
echo ""

# Check device connection
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device/emulator connected"
    exit 1
fi

# Function to run a single test with app restart
run_test() {
    local test_file=$1
    local test_name=$2

    echo ""
    echo "📱 Running: $test_name"
    echo "----------------------------------------"

    # Stop and clear app
    adb shell am force-stop io.diabetactic.app 2>/dev/null || true
    sleep 1
    adb shell pm clear io.diabetactic.app 2>/dev/null || true
    sleep 1

    # Launch app
    adb shell am start -n io.diabetactic.app/.MainActivity 2>/dev/null || true
    sleep 5

    # Run the test
    if maestro test "$test_file" --no-ansi 2>&1 | grep -q "COMPLETED$"; then
        echo "✅ $test_name PASSED"
        return 0
    else
        echo "❌ $test_name FAILED"
        return 1
    fi
}

# Track results
PASSED=0
FAILED=0

# Run smoke test
if run_test "maestro/tests/smoke-test.yaml" "Smoke Test"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Run dashboard navigation test
if run_test "maestro/tests/02-dashboard-navigation.yaml" "Dashboard Navigation"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Run simplified theme toggle test
if run_test "maestro/tests/03-theme-toggle-simple.yaml" "Theme Toggle (Simple)"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Run simplified language switch test
if run_test "maestro/tests/04-language-switch-simple.yaml" "Language Switch (Simple)"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Run mock auth test
if run_test "maestro/tests/auth/01-login-flow.mock.yaml" "Mock Auth Flow"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Summary
echo ""
echo "========================================="
echo "📊 TEST RESULTS"
echo "========================================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED!"
    exit 0
else
    echo "⚠️  Some tests failed"
    exit 1
fi
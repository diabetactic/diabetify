#!/bin/bash
# Run Maestro test(s) with clean app state
# Workaround for API 36 launchApp issues

APP_ID="io.diabetactic.app"
ACTIVITY="io.diabetactic.app/.MainActivity"

usage() {
    echo "Usage: $0 <test-file.yaml | test-directory/>"
    echo ""
    echo "Examples:"
    echo "  $0 maestro/tests/smoke-test.yaml    # Single test"
    echo "  $0 maestro/tests/                   # All tests"
    echo "  $0 maestro/tests/auth/              # Auth tests only"
    exit 1
}

run_test() {
    local test_file="$1"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 Running: $test_file"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo "🧹 Clearing app state..."
    adb shell pm clear "$APP_ID" 2>/dev/null || true

    echo "🚀 Launching app..."
    adb shell am start -n "$ACTIVITY" > /dev/null
    sleep 3

    maestro test "$test_file"
    return $?
}

if [ -z "$1" ]; then
    usage
fi

TARGET="$1"
FAILED=0
PASSED=0
TOTAL=0

if [ -f "$TARGET" ]; then
    # Single file
    run_test "$TARGET"
    exit $?
elif [ -d "$TARGET" ]; then
    # Directory - run all yaml files
    echo "📂 Running all tests in: $TARGET"

    for test_file in $(find "$TARGET" -name "*.yaml" -type f | sort); do
        TOTAL=$((TOTAL + 1))
        if run_test "$test_file"; then
            PASSED=$((PASSED + 1))
        else
            FAILED=$((FAILED + 1))
        fi
    done

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Results: $PASSED/$TOTAL passed, $FAILED failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    [ $FAILED -eq 0 ]
else
    echo "❌ Not found: $TARGET"
    exit 1
fi

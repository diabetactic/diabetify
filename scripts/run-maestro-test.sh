#!/bin/bash
# Wrapper script to run a single Maestro test with proper app setup
# Usage: ./scripts/run-maestro-test.sh <test-file>

TEST_FILE=$1

if [ -z "$TEST_FILE" ]; then
    echo "Usage: $0 <test-file>"
    exit 1
fi

# Stop and clear app
adb shell am force-stop io.diabetactic.app 2>/dev/null || true
sleep 1

# Clear data for fresh start (if not a continuation test)
if [[ ! "$TEST_FILE" == *"continuation"* ]]; then
    adb shell pm clear io.diabetactic.app 2>/dev/null || true
    sleep 1
fi

# Launch app
adb shell am start -n io.diabetactic.app/.MainActivity 2>/dev/null || true
sleep 5

# Run the test
maestro test "$TEST_FILE"
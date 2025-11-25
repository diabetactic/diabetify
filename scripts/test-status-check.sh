#!/bin/bash
# Quick test status check

echo "=== Maestro Test Status Check ==="
echo ""

# Test list
TESTS=(
  "maestro/tests/smoke-test.yaml"
  "maestro/tests/02-dashboard-navigation.yaml"
  "maestro/tests/03-theme-toggle-simple.yaml"
  "maestro/tests/04-language-switch-simple.yaml"
  "maestro/tests/readings/04-filter-readings.yaml"
  "maestro/tests/profile/05-avatar-upload.yaml"
  "maestro/tests/integration/02-offline-sync.yaml"
)

PASSED=0
FAILED=0
FAILED_LIST=""

for test in "${TESTS[@]}"; do
  echo -n "Testing $(basename $test)... "

  # Clear app and restart
  adb shell pm clear io.diabetactic.app >/dev/null 2>&1
  adb shell am start -n io.diabetactic.app/.MainActivity >/dev/null 2>&1
  sleep 2

  # Run test
  if maestro test "$test" >/dev/null 2>&1; then
    echo "✅ PASS"
    PASSED=$((PASSED + 1))
  else
    echo "❌ FAIL"
    FAILED=$((FAILED + 1))
    FAILED_LIST="$FAILED_LIST\n  - $test"
  fi
done

echo ""
echo "=== Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -gt 0 ]; then
  echo -e "\nFailed tests:$FAILED_LIST"
fi
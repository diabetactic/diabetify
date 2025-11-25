#!/bin/bash
echo "Running quick smoke test..."
adb shell pm clear io.diabetactic.app
adb shell am start -n io.diabetactic.app/.MainActivity
sleep 5
maestro test maestro/tests/smoke-test.yaml

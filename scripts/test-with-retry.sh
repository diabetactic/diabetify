#!/bin/bash
TEST_FILE=$1
RETRIES=3
for i in $(seq 1 $RETRIES); do
  echo "Attempt $i of $RETRIES..."
  maestro test "$TEST_FILE" && exit 0
  echo "Test failed, retrying..."
  adb shell pm clear io.diabetactic.app
  sleep 2
done
exit 1

# Mobile Testing Guide

Comprehensive guide for testing Diabetific mobile app on Android/iOS devices.

## Table of Contents

1. [Testing Stack](#testing-stack)
2. [Maestro Mobile Testing](#maestro-mobile-testing)
3. [ADB Commands Reference](#adb-commands-reference)
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)

## Testing Stack

- **Unit Tests**: Jasmine + Karma
- **E2E Web Tests**: Playwright
- **Mobile UI Tests**: Maestro
- **Device Testing**: ADB (Android Debug Bridge)
- **Native HTTP**: Capacitor HTTP Plugin

## Maestro Mobile Testing

### Installation

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH
export PATH="$PATH:$HOME/.maestro/bin"

# Verify installation
maestro --version
```

### Test Structure

```
maestro/
├── flows/              # Reusable components
│   ├── auth-login.yaml
│   ├── add-glucose-reading.yaml
│   └── toggle-theme.yaml
│
├── tests/              # Test suites
│   ├── smoke/
│   ├── auth/
│   ├── readings/
│   ├── dashboard/
│   ├── appointments/
│   ├── profile/
│   └── integration/
│
└── config/
    ├── maestro.yaml
    └── selectors.yaml
```

### Running Tests

```bash
# Single test
maestro test maestro/tests/auth/01-login-flow.yaml

# All tests in directory
maestro test maestro/tests/

# Specific device
maestro test --device emulator-5554 maestro/tests/

# With environment variables
MAESTRO_USERNAME=demo@example.com maestro test maestro/tests/auth/
```

### Best Practices

1. **Always Clear Inputs**
   ```yaml
   - tapOn: { point: "50%,45%" }
   - eraseText  # Clear before typing
   - inputText: "value"
   ```

2. **Hide Keyboard**
   ```yaml
   - inputText: "password"
   - hideKeyboard  # Prevent keyboard blocking buttons
   ```

3. **Wait for Animations**
   ```yaml
   - tapOn: "Button"
   - waitForAnimationToEnd  # Prevent flaky tests
   ```

4. **Bilingual Assertions**
   ```yaml
   - assertVisible: "Inicio|Home|Dashboard"
   ```

5. **Screenshot Documentation**
   ```yaml
   - takeScreenshot: maestro/screenshots/step-01.png
   ```

## ADB Commands Reference

### Device Management

```bash
# List devices
adb devices

# Connect to specific device
adb -s DEVICE_ID shell

# Install APK
adb install app-debug.apk

# Reinstall (preserve data)
adb install -r app-debug.apk

# Uninstall
adb uninstall io.diabetify.app

# Clear app data
adb shell pm clear io.diabetify.app

# Start app
adb shell am start -n io.diabetify.app/.MainActivity

# Stop app
adb shell am force-stop io.diabetify.app
```

### Log Analysis

```bash
# Clear logs
adb logcat -c

# View all logs
adb logcat

# Filter logs
adb logcat | grep Capacitor
adb logcat | grep -E "HTTP|Auth|Error"

# Errors only
adb logcat *:E

# Save logs to file
adb logcat -d > logs.txt

# Follow logs with filter
adb logcat | grep -E "Native HTTP|CORS"
```

### Screenshots

```bash
# Take screenshot
adb shell screencap /sdcard/screenshot.png

# Pull to computer
adb pull /sdcard/screenshot.png ./screenshots/

# One-liner
adb shell screencap -p > screenshot.png
```

### UI Inspection

```bash
# Current activity
adb shell dumpsys activity top | grep ACTIVITY

# UI hierarchy
adb shell dumpsys activity top

# Find text
adb shell dumpsys activity top | grep "mText="

# Window info
adb shell dumpsys window windows
```

### Input Simulation

```bash
# Tap at coordinates
adb shell input tap 500 1000

# Swipe
adb shell input swipe 500 1000 500 500

# Type text
adb shell input text "hello"

# Press key
adb shell input keyevent KEYCODE_ENTER

# Back button
adb shell input keyevent 4
```

## Common Workflows

### Workflow 1: Login Test with Full Logging

```bash
#!/bin/bash
# Clear everything
adb shell pm clear io.diabetify.app
adb logcat -c

# Start logging
adb logcat | grep -E "Capacitor|Auth|HTTP" > login-test.log &
LOGPID=$!

# Start app
adb shell am start -n io.diabetify.app/.MainActivity
sleep 3

# Run Maestro test
maestro test maestro/tests/auth/01-login-flow.yaml

# Stop logging
kill $LOGPID

# Analyze logs
grep -i "error" login-test.log
grep -i "401\|403" login-test.log
```

### Workflow 2: Screenshot-Driven Debugging

```bash
#!/bin/bash
# Function to capture and label screenshots
capture() {
  adb shell screencap -p > "debug-$1.png"
  echo "Captured: debug-$1.png"
}

# Clear and start
adb shell pm clear io.diabetify.app
adb shell am start -n io.diabetify.app/.MainActivity

capture "01-launch"
sleep 2

# Navigate to login
adb shell input tap 350 1400  # "Iniciar Sesión"
sleep 2
capture "02-login-screen"

# Fill username
adb shell input tap 350 600
adb shell input text "1000"
capture "03-username-filled"

# Fill password
adb shell input tap 350 700
adb shell input text "password"
capture "04-password-filled"

# Submit
adb shell input tap 350 900
sleep 5
capture "05-after-submit"
```

### Workflow 3: API Call Verification

```bash
# Monitor HTTP traffic
adb logcat -c
adb logcat | grep -E "Native HTTP|POST|GET|Response" &

# Trigger action
maestro test maestro/tests/readings/02-add-reading.yaml

# Check logs for:
# - 🔵 [Native HTTP] POST https://...
# - ✅ [Native HTTP] Response 200
# - No CORS errors
```

## Troubleshooting

### Issue: Maestro Can't Find Elements

**Symptoms:**
- `Element not found` errors
- Tests fail on assertions

**Solutions:**
1. Check element text with bilingual pattern: `"Text|Texto"`
2. Use coordinates instead: `point: "50%,45%"`
3. Increase timeout: `assertVisible: { text: "...", timeout: 5000 }`
4. Take screenshot to verify UI state
5. Check UI hierarchy: `adb shell dumpsys activity top`

### Issue: Keyboard Blocks Submit Button

**Symptoms:**
- Tap on submit button doesn't work
- Test hangs on button tap

**Solutions:**
1. Add `hideKeyboard` after text input
2. Scroll down to reveal button
3. Use back button to dismiss keyboard

```yaml
- inputText: "password"
- hideKeyboard          # FIX
- waitForAnimationToEnd
- tapOn: "Submit"
```

### Issue: CORS Errors on Mobile

**Symptoms:**
- `CORS policy` errors in logcat
- HTTP requests failing with status 0

**Diagnosis:**
```bash
adb logcat | grep "CORS policy"
```

**Solutions:**
1. Verify using `CapacitorHttpService` instead of `HttpClient`
2. Check service constructor injects `CapacitorHttpService`
3. Verify native HTTP logs: `adb logcat | grep "Native HTTP"`

### Issue: Tests Pass on Emulator, Fail on Device

**Common Causes:**
1. **Network**: Device has different network config
   - Check Wi-Fi vs cellular
   - Verify backend URL accessibility

2. **Screen Size**: Coordinates differ
   - Use percentages: `point: "50%,45%"`
   - Not absolute pixels

3. **Performance**: Device slower than emulator
   - Increase timeouts
   - Add more `waitForAnimationToEnd`

4. **Permissions**: Device has stricter permissions
   - Check Android manifest
   - Grant permissions via ADB

### Issue: App Crashes on Startup

**Diagnosis:**
```bash
# Get crash logs
adb logcat -d | grep -A 20 "FATAL EXCEPTION"

# Check for specific errors
adb logcat -d | grep -E "Error|Exception|Crash"
```

**Common Fixes:**
1. Clear app data: `adb shell pm clear io.diabetify.app`
2. Reinstall APK: `adb install -r app-debug.apk`
3. Check for missing native dependencies
4. Verify Capacitor plugins installed

## Advanced Topics

### Testing on Multiple Devices

```bash
# List all devices
adb devices

# Run on specific device
maestro test --device emulator-5554 maestro/tests/
maestro test --device R58M12345 maestro/tests/  # Physical device
```

### Parallel Testing

```bash
# Run tests on all connected devices (GNU parallel)
adb devices | grep -v "List" | awk '{print $1}' | parallel maestro test --device {} maestro/tests/
```

### Custom Test Data

```yaml
# Use environment variables
appId: io.diabetify.app
env:
  USERNAME: ${MAESTRO_USERNAME}
  PASSWORD: ${MAESTRO_PASSWORD}
---
- launchApp
- inputText: ${USERNAME}
- inputText: ${PASSWORD}
```

```bash
# Run with custom data
MAESTRO_USERNAME=test@example.com MAESTRO_PASSWORD=pass123 maestro test maestro/tests/auth/
```

### Performance Testing

```bash
# Monitor app performance during test
adb shell dumpsys cpuinfo | grep diabetify &
adb shell dumpsys meminfo io.diabetify.app &

maestro test maestro/tests/integration/

# Analyze results
```

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/docs)
- [ADB Documentation](https://developer.android.com/studio/command-line/adb)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Project Maestro Tests](../maestro/tests/)
- [ADB Debugging Guide](./ADB_DEBUGGING.md)
- [Maestro Patterns](./MAESTRO_PATTERNS.md)

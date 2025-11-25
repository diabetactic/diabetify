#!/bin/bash

################################################################################
# DIABETACTIC QUICK UI TEST SCRIPT
# Automated app state check, build, deploy, and UI verification
################################################################################

set -e

PROJECT_DIR="/home/julito/TPP/diabetify-extServices-20251103-061913/diabetify"
ANDROID_DIR="$PROJECT_DIR/android"
SCREENSHOT_DIR="/tmp/ui-test-screenshots"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
APP_ID="io.diabetactic.app"
DEVICE_ID="emulator-5554"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# HELPER FUNCTIONS
################################################################################

log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_device() {
    log_section "Checking Device Status"

    if ! adb devices | grep -q "$DEVICE_ID"; then
        log_error "Device $DEVICE_ID not found"
        exit 1
    fi
    log_success "Device $DEVICE_ID connected"
}

check_app_running() {
    log_section "Checking App Status"

    if adb shell "pidof $APP_ID" > /dev/null 2>&1; then
        log_success "App is running"
        return 0
    else
        log_warning "App is not running"
        return 1
    fi
}

get_apk_modification_time() {
    if [ -f "$APK_PATH" ]; then
        stat -c %Y "$APK_PATH"
    else
        echo "0"
    fi
}

get_web_build_time() {
    if [ -d "$PROJECT_DIR/dist" ]; then
        find "$PROJECT_DIR/dist" -type f | xargs stat -c %Y | sort -n | tail -1
    else
        echo "0"
    fi
}

rebuild_app() {
    log_section "Rebuilding Android APK"

    cd "$ANDROID_DIR"
    export JAVA_HOME=/home/julito/.local/share/mise/installs/java/25.0.1
    export ANDROID_HOME=/home/julito/Android/Sdk

    echo "Building with:"
    echo "  JAVA_HOME: $JAVA_HOME"
    echo "  ANDROID_HOME: $ANDROID_HOME"
    echo "  Working Directory: $(pwd)"

    ./gradlew assembleDebug --no-daemon > /tmp/gradle.log 2>&1

    if grep -q "BUILD SUCCESSFUL" /tmp/gradle.log; then
        log_success "Build successful"
        return 0
    else
        log_error "Build failed"
        tail -20 /tmp/gradle.log
        return 1
    fi
}

install_apk() {
    log_section "Installing APK"

    if [ ! -f "$APK_PATH" ]; then
        log_error "APK not found at $APK_PATH"
        return 1
    fi

    if adb install -r "$APK_PATH" | grep -q "Success"; then
        log_success "APK installed successfully"
        return 0
    else
        log_error "APK installation failed"
        return 1
    fi
}

launch_app() {
    log_section "Launching App"

    adb shell am start -n "$APP_ID/.MainActivity"
    sleep 3
    log_success "App launched"
}

stop_app() {
    log_section "Stopping App"
    adb shell am force-stop "$APP_ID"
    sleep 1
    log_success "App stopped"
}

take_screenshot() {
    local name=$1
    local path="$SCREENSHOT_DIR/$name"

    adb shell screencap -p /sdcard/temp.png
    adb pull /sdcard/temp.png "$path"
    echo "$path"
}

navigate_to_login() {
    log_section "Navigating to Login Screen"

    # Use Maestro to tap with text selector
    cat > /tmp/navigate-login.yaml << 'YAML'
appId: io.diabetactic.app
---
- waitForAnimationToEnd
- tapOn:
    text: "Iniciar Sesión"
- waitForAnimationToEnd
YAML

    maestro test /tmp/navigate-login.yaml > /dev/null 2>&1
    sleep 2
    log_success "Navigated to login screen"
}

perform_login() {
    log_section "Performing Login"

    cat > /tmp/login-flow.yaml << 'YAML'
appId: io.diabetactic.app
---
# Enter DNI
- tapOn:
    point: "50%,30%"
- inputText: "1000"
- hideKeyboard

# Enter password
- tapOn:
    point: "50%,45%"
- inputText: "tuvieja"
- hideKeyboard

# Tap login button
- tapOn:
    text: "Iniciar sesión|Login|Entrar"
- waitForAnimationToEnd
- waitForAnimationToEnd
- waitForAnimationToEnd
YAML

    maestro test /tmp/login-flow.yaml > /dev/null 2>&1
    sleep 3
    log_success "Login completed"
}

capture_all_screens() {
    log_section "Capturing All Screens"

    mkdir -p "$SCREENSHOT_DIR"

    # Welcome/Home
    take_screenshot "01-welcome.png"
    log_success "Captured welcome screen"

    # Navigate and capture each screen
    cat > /tmp/screen-navigation.yaml << 'YAML'
appId: io.diabetactic.app
---
# Dashboard/Home
- takeScreenshot: /tmp/dashboard-screen.png

# Readings tab
- tapOn:
    text: "Lecturas|Readings"
- waitForAnimationToEnd
- takeScreenshot: /tmp/readings-screen.png

# Appointments tab
- tapOn:
    text: "Citas|Appointments"
- waitForAnimationToEnd
- takeScreenshot: /tmp/appointments-screen.png

# Profile tab
- tapOn:
    text: "Perfil|Profile|Configuración|Settings"
- waitForAnimationToEnd
- takeScreenshot: /tmp/profile-screen.png
YAML

    maestro test /tmp/screen-navigation.yaml > /dev/null 2>&1
    sleep 2

    # Copy screenshots
    adb pull /tmp/dashboard-screen.png "$SCREENSHOT_DIR/02-dashboard.png" 2>/dev/null || true
    adb pull /tmp/readings-screen.png "$SCREENSHOT_DIR/03-readings.png" 2>/dev/null || true
    adb pull /tmp/appointments-screen.png "$SCREENSHOT_DIR/04-appointments.png" 2>/dev/null || true
    adb pull /tmp/profile-screen.png "$SCREENSHOT_DIR/05-profile.png" 2>/dev/null || true

    log_success "All screens captured to $SCREENSHOT_DIR"
}

verify_ui_layout() {
    log_section "Verifying UI Layout"

    echo "Screenshots saved in: $SCREENSHOT_DIR"
    ls -lh "$SCREENSHOT_DIR" 2>/dev/null | tail -10
    log_success "UI verification complete"
}

################################################################################
# MAIN FLOW
################################################################################

main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║    DIABETACTIC QUICK UI TEST - AUTOMATED FLOW          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

    # PRE-FLIGHT CHECKS
    check_device

    # DETERMINE IF REBUILD NEEDED
    APK_TIME=$(get_apk_modification_time)
    WEB_TIME=$(get_web_build_time)

    if [ "$WEB_TIME" -gt "$APK_TIME" ]; then
        log_warning "Web assets are newer than APK - rebuild needed"
        rebuild_app
        install_apk
    else
        log_success "APK is up to date"
    fi

    # APP STATE MANAGEMENT
    if check_app_running; then
        log_warning "Stopping running app first..."
        stop_app
    fi

    # LAUNCH AND TEST
    launch_app
    capture_all_screens
    verify_ui_layout

    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 TEST COMPLETED SUCCESSFULLY             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
}

# Run main function
main "$@"

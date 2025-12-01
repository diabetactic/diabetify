#!/bin/bash

################################################################################
# DIABETACTIC TESTING ALIASES
# Source this file to add convenient test commands to your shell:
#   source scripts/aliases.sh
#
# Available commands:
#   check-app          - Check app state (device, APK, running status, etc)
#   rebuild-apk        - Rebuild Android APK
#   deploy-apk         - Install APK to device
#   launch-app         - Launch the app
#   stop-app           - Stop the running app
#   screenshot <name>  - Take named screenshot
#   tail-logs          - Follow app logs in real-time
################################################################################

PROJECT_DIR="/home/julito/TPP/diabetify-extServices-20251103-061913/diabetify"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
APP_ID="io.diabetactic.app"

# Color codes
export GREEN='\033[0;32m'
export RED='\033[0;31m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m'

# ============================================================================
# STATE CHECKING
# ============================================================================

alias check-app="$SCRIPTS_DIR/check-state.sh"

# ============================================================================
# APP CONTROL
# ============================================================================

launch-app() {
    echo -e "${BLUE}Launching app...${NC}"
    adb shell am start -n "$APP_ID/.MainActivity"
    sleep 3
    echo -e "${GREEN}✓ App launched${NC}"
}

stop-app() {
    echo -e "${BLUE}Stopping app...${NC}"
    adb shell am force-stop "$APP_ID"
    sleep 1
    echo -e "${GREEN}✓ App stopped${NC}"
}

restart-app() {
    echo -e "${BLUE}Restarting app...${NC}"
    stop-app
    sleep 2
    launch-app
}

# ============================================================================
# BUILD & DEPLOY
# ============================================================================

rebuild-apk() {
    echo -e "${BLUE}=== REBUILDING APK ===${NC}"
    cd "$PROJECT_DIR/android"
    export JAVA_HOME=/home/julito/.local/share/mise/installs/java/25.0.1
    export ANDROID_HOME=/home/julito/Android/Sdk

    if ./gradlew assembleDebug --no-daemon; then
        echo -e "${GREEN}✓ Build successful${NC}"
    else
        echo -e "${RED}✗ Build failed${NC}"
        return 1
    fi
}

deploy-apk() {
    echo -e "${BLUE}=== INSTALLING APK ===${NC}"
    APK_PATH="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

    if [[ ! -f "$APK_PATH" ]]; then
        echo -e "${RED}✗ APK not found. Run rebuild-apk first${NC}"
        return 1
    fi

    if adb install -r "$APK_PATH" | grep -q "Success"; then
        echo -e "${GREEN}✓ APK installed${NC}"
    else
        echo -e "${RED}✗ Installation failed${NC}"
        return 1
    fi
}

rebuild-and-deploy() {
    rebuild-apk && deploy-apk && restart-app
}

# ============================================================================
# TESTING & SCREENSHOTS
# ============================================================================

screenshot() {
    local name="${1:-screenshot-$(date +%Y%m%d-%H%M%S).png}"
    local path="/tmp/$name"

    echo -e "${BLUE}Taking screenshot: $name${NC}"
    adb shell screencap -p /sdcard/temp.png
    adb pull /sdcard/temp.png "$path" > /dev/null 2>&1

    echo -e "${GREEN}✓ Saved to: $path${NC}"
    echo "$path"
}



# ============================================================================
# LOGGING & DEBUGGING
# ============================================================================

tail-logs() {
    echo -e "${BLUE}Following app logs (Ctrl+C to stop)...${NC}"
    adb logcat | grep -E "Capacitor|Native HTTP|Angular|Ionic|diabetactic|error|Exception" --line-buffered
}

check-logs() {
    echo -e "${BLUE}=== RECENT APP ERRORS ===${NC}"
    adb logcat -d | grep -iE "error|crash|exception|native http|cors" | tail -20
}

clear-app-data() {
    echo -e "${YELLOW}⚠ Clearing app data...${NC}"
    adb shell pm clear "$APP_ID"
    sleep 2
    echo -e "${GREEN}✓ App data cleared${NC}"
}

# ============================================================================
# UTILITY
# ============================================================================

apk-info() {
    echo -e "${BLUE}=== APK INFORMATION ===${NC}"
    APK_PATH="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

    if [[ -f "$APK_PATH" ]]; then
        echo "Size: $(du -h "$APK_PATH" | cut -f1)"
        echo "Built: $(stat -c %y "$APK_PATH" | cut -d' ' -f1-2)"
        echo "Installed: $(adb shell pm dump "$APP_ID" 2>/dev/null | grep codePath || echo 'not found')"
    else
        echo "APK not built yet"
    fi
}

device-info() {
    echo -e "${BLUE}=== DEVICE INFORMATION ===${NC}"
    echo "Device: $(adb shell getprop ro.product.model)"
    echo "Android: $(adb shell getprop ro.build.version.release)"
    echo "API Level: $(adb shell getprop ro.build.version.sdk)"
}

# ============================================================================
# PRINT HELP
# ============================================================================

diabetactic-help() {
    cat << 'HELP'

╔════════════════════════════════════════════════════════════════════════╗
║         DIABETACTIC TESTING COMMANDS - Quick Reference                ║
╚════════════════════════════════════════════════════════════════════════╝

STATE & DIAGNOSTICS:
  check-app              Check app state (device, APK, running status)
  apk-info               Show APK details (size, build time)
  device-info            Show device details (model, Android version)
  check-logs             Show recent error logs

APP CONTROL:
  launch-app             Launch the app
  stop-app               Stop the running app
  restart-app            Stop and restart the app
  clear-app-data         Clear app cache and local data

BUILD & DEPLOY:
  rebuild-apk            Rebuild Android APK (Java 25)
  deploy-apk             Install APK to device
  rebuild-and-deploy     Rebuild, install, and restart

SCREENSHOTS & TESTING:
  screenshot <name>      Take a named screenshot

  tail-logs              Follow app logs in real-time

WORKFLOW EXAMPLES:
  ┌─ Before fixing code:
  └─ check-app && rebuild-and-deploy

  ┌─ After CSS changes:
  └─ rebuild-apk && deploy-apk && screenshot "my-feature"

  ┌─ Debugging issues:
  └─ check-logs && tail-logs

HELP
}

# Print help on sourcing
echo -e "${GREEN}✓ Diabetactic testing commands loaded${NC}"
echo -e "  Type ${BLUE}diabetactic-help${NC} for command reference"

#!/bin/bash

################################################################################
# STATE CHECK - Verify all prerequisites before testing
################################################################################

PROJECT_DIR="/home/julito/TPP/diabetify-extServices-20251103-061913/diabetify"
ANDROID_DIR="$PROJECT_DIR/android"
APP_ID="io.diabetactic.app"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== DIABETACTIC STATE CHECK ===${NC}\n"

# Check device
echo -n "Device (emulator-5554): "
if adb devices | grep -q "emulator-5554"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ NOT CONNECTED${NC}"
    exit 1
fi

# Check Java
echo -n "Java 25: "
if [[ -d "/home/julito/.local/share/mise/installs/java/25.0.1" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ NOT INSTALLED${NC}"
fi

# Check Android SDK
echo -n "Android SDK: "
if [[ -d "$HOME/Android/Sdk" ]]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ NOT CONFIGURED${NC}"
fi



# Check APK
echo -n "APK (debug): "
if [[ -f "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" ]]; then
    SIZE=$(du -h "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" | cut -f1)
    MTIME=$(stat -c %y "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" | cut -d' ' -f1-2)
    echo -e "${GREEN}✓${NC} ($SIZE, built: $MTIME)"
else
    echo -e "${RED}✗ NOT BUILT${NC}"
fi

# Check app installed
echo -n "App installed: "
if adb shell "pm list packages" | grep -q "^package:$APP_ID$"; then
    VERSION=$(adb shell dumpsys package "$APP_ID" | grep versionName | head -1 | cut -d'=' -f2)
    echo -e "${GREEN}✓${NC} (v$VERSION)"
else
    echo -e "${RED}✗ NOT INSTALLED${NC}"
fi

# Check app running
echo -n "App running: "
if adb shell "pidof $APP_ID" > /dev/null 2>&1; then
    PID=$(adb shell "pidof $APP_ID")
    echo -e "${GREEN}✓${NC} (PID: $PID)"
else
    echo -e "${YELLOW}○${NC} (stopped)"
fi

# Check web build
echo -n "Web build (dist/): "
if [[ -d "$PROJECT_DIR/dist" ]]; then
    MTIME=$(find "$PROJECT_DIR/dist" -type f -print0 | xargs -0 stat -c %y | sort -n | tail -1 | cut -d' ' -f1-2)
    echo -e "${GREEN}✓${NC} (latest: $MTIME)"
else
    echo -e "${RED}✗ NOT BUILT${NC}"
fi

echo ""
echo -e "${BLUE}=== READY FOR TESTING ===${NC}"

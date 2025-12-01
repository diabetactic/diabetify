#!/bin/bash
# Quick Android build and install script

set -e  # Exit on error

echo "🚀 Diabetactic Android Quick Build"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the android directory
if [ ! -f "build.gradle" ]; then
    echo -e "${YELLOW}Not in android directory, changing...${NC}"
    cd android/
fi

echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" != "17" ] && [ "$JAVA_VERSION" != "21" ]; then
    echo -e "${YELLOW}Warning: Java $JAVA_VERSION detected. Java 17 or 21 recommended.${NC}"
else
    echo -e "${GREEN}✓ Java $JAVA_VERSION${NC}"
fi

# Check if device/emulator is connected
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l)
if [ "$DEVICES" -eq 0 ]; then
    echo -e "${YELLOW}⚠ No devices connected. Starting emulator...${NC}"
    emulator -avd Medium_Phone_API_36.1 -no-snapshot-load &
    sleep 15
else
    echo -e "${GREEN}✓ Device connected${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Building debug APK...${NC}"
./gradlew assembleDebug --stacktrace

echo ""
echo -e "${BLUE}Step 3: Installing on device...${NC}"
./gradlew installDebug

echo ""
echo -e "${GREEN}✅ Build and install complete!${NC}"
echo ""
echo "Starting logcat (Ctrl+C to exit):"
echo "=================================="
adb logcat | grep -i "diabetactic\|chromium\|capacitor"

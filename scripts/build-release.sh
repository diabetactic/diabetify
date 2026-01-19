#!/bin/bash
# Build Release Script for Play Store
# Generates signed AAB (Android App Bundle) for Play Store upload

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/release-builds"

echo "🚀 Diabetactic Release Build"
echo "============================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Install with: npm install -g pnpm"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/android/keystore.properties" ]; then
    echo "❌ keystore.properties not found!"
    echo "   Copy android/keystore.properties.template to android/keystore.properties"
    echo "   and fill in your keystore credentials."
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/android/release-keystore.jks" ]; then
    echo "❌ release-keystore.jks not found!"
    echo "   Generate one with:"
    echo "   keytool -genkey -v -keystore android/release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias diabetactic-release"
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# Get version info
VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version")
VERSION_CODE=$(grep "versionCode" "$PROJECT_ROOT/android/app/build.gradle" | head -1 | grep -oP '\d+')

echo "📦 Building version $VERSION (code: $VERSION_CODE)"
echo ""

# Build web assets
echo "🔨 Building production web assets..."
cd "$PROJECT_ROOT"
pnpm run build:prod

# Sync Capacitor
echo "📲 Syncing Capacitor..."
pnpm exec cap sync android

# Build AAB
echo "📦 Building Android App Bundle (AAB)..."
cd "$PROJECT_ROOT/android"
chmod +x gradlew
./gradlew bundleRelease

# Also build APK for testing
echo "📱 Building APK for testing..."
./gradlew assembleRelease

# Copy outputs
echo "📁 Copying release files..."
mkdir -p "$OUTPUT_DIR"

AAB_FILE="$PROJECT_ROOT/android/app/build/outputs/bundle/release/app-release.aab"
APK_FILE="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$AAB_FILE" ]; then
    cp "$AAB_FILE" "$OUTPUT_DIR/diabetactic-v${VERSION}.aab"
    echo "✅ AAB: $OUTPUT_DIR/diabetactic-v${VERSION}.aab"
fi

if [ -f "$APK_FILE" ]; then
    cp "$APK_FILE" "$OUTPUT_DIR/diabetactic-v${VERSION}.apk"
    echo "✅ APK: $OUTPUT_DIR/diabetactic-v${VERSION}.apk"
fi

echo ""
echo "🎉 Build complete!"
echo ""
echo "📤 Next steps:"
echo "   1. Go to https://play.google.com/console"
echo "   2. Select your app (or create new)"
echo "   3. Go to Release > Production"
echo "   4. Upload: $OUTPUT_DIR/diabetactic-v${VERSION}.aab"
echo "   5. Add release notes and submit for review"
echo ""
echo "📝 Release files location: $OUTPUT_DIR/"
ls -la "$OUTPUT_DIR/"

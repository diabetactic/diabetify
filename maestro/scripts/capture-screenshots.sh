#!/bin/bash

# Screenshot Capture Script
# Captures all app screens in different states for documentation

echo "📸 Capturing Diabetify App Screenshots..."
echo "========================================="

# Ensure app is installed
echo "Checking app installation..."
adb shell pm list packages | grep io.diabetify.app > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ App not installed! Please install the APK first."
    exit 1
fi

# Launch app
echo "Launching app..."
adb shell am start -n io.diabetify.app/.MainActivity
sleep 3

# Create screenshot directories
mkdir -p ../screenshots/{auth,dashboard,readings,appointments,profile}

echo "Capturing authentication screens..."
maestro test ../tests/auth/01-login-flow.yaml

echo "Capturing dashboard views..."
maestro test ../tests/dashboard/02-verify-stats-calculations.yaml

echo "Capturing reading screens..."
maestro test ../tests/readings/02-add-reading.yaml

echo "Capturing appointment screens..."
maestro test ../tests/appointments/04-segment-switch.yaml

echo "Capturing profile screens..."
maestro test ../tests/03-theme-toggle.yaml
maestro test ../tests/04-language-switch.yaml

echo ""
echo "✅ Screenshot capture complete!"
echo ""
echo "📁 Screenshots saved to:"
echo "   maestro/screenshots/"
echo "   ├── auth/       (login, welcome)"
echo "   ├── dashboard/  (stats, navigation)"
echo "   ├── readings/   (list, add form)"
echo "   ├── appointments/ (list, details)"
echo "   └── profile/    (settings, theme)"
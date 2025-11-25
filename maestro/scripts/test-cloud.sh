#!/bin/bash

# Maestro Cloud Test Runner
# Runs tests on Maestro Cloud devices instead of local emulator

# Check if API key is set
if [ -z "$MAESTRO_CLOUD_API_KEY" ]; then
    echo "❌ Error: MAESTRO_CLOUD_API_KEY environment variable not set!"
    echo ""
    echo "📝 Setup instructions:"
    echo "1. Add to ~/.zshrc or ~/.bashrc:"
    echo "   export MAESTRO_CLOUD_API_KEY='your_api_key_here'"
    echo ""
    echo "2. Reload shell:"
    echo "   source ~/.zshrc"
    echo ""
    echo "3. Or set for this session only:"
    echo "   MAESTRO_CLOUD_API_KEY='your_key' maestro cloud tests/"
    exit 1
fi

echo "☁️  Running Tests on Maestro Cloud..."
echo "===================================="
echo "API Key: ${MAESTRO_CLOUD_API_KEY:0:20}..."
echo ""

# Parse arguments
TEST_PATH=${1:-"../tests/smoke-test.yaml"}
DEVICE_TYPE=${2:-"android"}

echo "📱 Device Type: $DEVICE_TYPE"
echo "📝 Test Path: $TEST_PATH"
echo ""

# Run on cloud
maestro cloud --device-type "$DEVICE_TYPE" "$TEST_PATH"

echo ""
echo "✅ Cloud test complete!"
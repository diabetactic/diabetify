#!/bin/bash
# Get user information by DNI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if required arguments are provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <dni>"
    echo ""
    echo "Example:"
    echo "  $0 40123456"
    exit 1
fi

DNI=$1

echo "🔍 Getting user information for DNI: $DNI"

# Check if test-utils container is running
if ! docker ps | grep -q diabetactic_test_utils; then
    echo "❌ Test utils container is not running. Start services first with ./start.sh"
    exit 1
fi

# Execute user query in test-utils container
docker exec diabetactic_test_utils python3 user_manager.py get "$DNI"

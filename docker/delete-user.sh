#!/bin/bash
# Delete a test user from the local environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if required arguments are provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <dni>"
    echo ""
    echo "Example:"
    echo "  $0 1000"
    exit 1
fi

DNI=$1

echo "🗑️  Deleting user with DNI: $DNI"

# Check if test-utils container is running
if ! docker ps | grep -q diabetactic_test_utils; then
    echo "❌ Test utils container is not running. Start services first with ./start.sh"
    exit 1
fi

# Execute user deletion in test-utils container
docker exec diabetactic_test_utils python3 user_manager.py delete "$DNI"

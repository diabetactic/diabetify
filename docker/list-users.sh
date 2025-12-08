#!/bin/bash
# List all users in the local environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📋 Listing all users..."

# Check if test-utils container is running
if ! docker ps | grep -q diabetactic_test_utils; then
    echo "❌ Test utils container is not running. Start services first with ./start.sh"
    exit 1
fi

# Execute user listing in test-utils container
docker exec diabetactic_test_utils python3 user_manager.py list

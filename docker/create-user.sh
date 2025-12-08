#!/bin/bash
# Create a test user in the local environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if required arguments are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <dni> <password> [name] [surname] [email]"
    echo ""
    echo "Examples:"
    echo "  $0 1000 tuvieja"
    echo "  $0 1001 password123 John Doe john@example.com"
    exit 1
fi

DNI=$1
PASSWORD=$2
NAME=${3:-"Test"}
SURNAME=${4:-"User"}
EMAIL=${5:-""}

echo "👤 Creating test user..."
echo "  DNI: $DNI"
echo "  Password: $PASSWORD"
echo "  Name: $NAME $SURNAME"

# Check if test-utils container is running
if ! docker ps | grep -q diabetactic_test_utils; then
    echo "❌ Test utils container is not running. Start services first with ./start.sh"
    exit 1
fi

# Execute user creation in test-utils container
if [ -z "$EMAIL" ]; then
    docker exec diabetactic_test_utils python3 user_manager.py create "$DNI" "$PASSWORD" "$NAME" "$SURNAME"
else
    docker exec diabetactic_test_utils python3 user_manager.py create "$DNI" "$PASSWORD" "$NAME" "$SURNAME" "$EMAIL"
fi

echo ""
echo "✅ You can now log in with:"
echo "   DNI: $DNI"
echo "   Password: $PASSWORD"

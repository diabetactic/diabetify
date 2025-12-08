#!/bin/bash
# View logs from all services or a specific service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ $# -eq 0 ]; then
    echo "📜 Showing logs from all services (press Ctrl+C to exit)..."
    docker compose -f docker-compose.local.yml logs -f
else
    SERVICE=$1
    echo "📜 Showing logs from $SERVICE (press Ctrl+C to exit)..."
    docker compose -f docker-compose.local.yml logs -f "$SERVICE"
fi

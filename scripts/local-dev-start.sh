#!/bin/bash
# =============================================================================
# Local Development Quick Start
# =============================================================================
# One command to start everything for local development:
#   1. Docker backend services
#   2. Seed test data
#   3. Angular dev server with local proxy
#
# Usage:
#   ./scripts/local-dev-start.sh           # Full start
#   ./scripts/local-dev-start.sh --fresh   # Fresh DB + start
#   ./scripts/local-dev-start.sh --stop    # Stop everything
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "=============================================="
echo "🚀 Diabetactic Local Development Environment"
echo "=============================================="
echo ""

# Parse arguments
FRESH_DB=false
STOP_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH_DB=true
            shift
            ;;
        --stop)
            STOP_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--fresh] [--stop]"
            exit 1
            ;;
    esac
done

# Stop only mode
if [ "$STOP_ONLY" = true ]; then
    echo -e "${YELLOW}Stopping all services...${NC}"
    cd "$DOCKER_DIR"
    ./stop.sh 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
fi

# -----------------------------------------------------------------------------
# Step 1: Start Docker Backend
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 1: Starting Docker backend...${NC}"
cd "$DOCKER_DIR"

if [ "$FRESH_DB" = true ]; then
    echo "   Resetting database for fresh start..."
    echo "yes" | ./reset-db.sh 2>/dev/null || true
else
    # Check if already running
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Backend already running${NC}"
    else
        ./start.sh
    fi
fi

# Wait for backend to be healthy
echo "   Waiting for backend..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Backend is healthy${NC}"
        break
    fi
    RETRY=$((RETRY + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo -e "${RED}   ✗ Backend failed to start${NC}"
    exit 1
fi

echo ""

# -----------------------------------------------------------------------------
# Step 2: Seed Test Data
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 2: Seeding test data...${NC}"
./seed-test-data.sh full 2>/dev/null || ./seed-test-data.sh

echo ""

# -----------------------------------------------------------------------------
# Step 3: Start Angular Dev Server
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 3: Starting Angular dev server...${NC}"
echo ""
echo "=============================================="
echo -e "${GREEN}✓ Local environment ready!${NC}"
echo "=============================================="
echo ""
echo "Services:"
echo "  - API Gateway:  http://localhost:8000"
echo "  - API Docs:     http://localhost:8000/docs"
echo "  - Backoffice:   http://localhost:8001"
echo "  - Angular App:  http://localhost:4200 (starting...)"
echo ""
echo "Test Credentials:"
echo "  - Username: 40123456"
echo "  - Password: thepassword"
echo ""
echo "Useful Commands:"
echo "  pnpm run docker:logs      # View backend logs"
echo "  pnpm run docker:seed      # Re-seed test data"
echo "  pnpm run docker:reset     # Reset database"
echo "  pnpm run test:e2e:local   # Run Playwright tests"
echo ""
echo -e "${YELLOW}Starting Angular dev server with local backend...${NC}"
echo ""

cd "$PROJECT_DIR"
ENV=local pnpm start

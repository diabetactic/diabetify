#!/usr/bin/env bash
#
# E2E LOCAL VALIDATION SCRIPT
# Fast local E2E testing that mirrors GitHub Actions docker-e2e job
#
# Usage: ./scripts/e2e-local.sh [OPTIONS]
#
# Options:
#   --quick          Run only critical path tests (~1min)
#   --full           Run all E2E tests (~5min)
#   --file <spec>    Run specific test file
#   --grep <pattern> Run tests matching pattern
#   --headed         Show browser (default: headless)
#   --debug          Run with Playwright inspector
#   --keep           Keep backend running after tests
#
# Examples:
#   ./scripts/e2e-local.sh --quick                    # Fast smoke test
#   ./scripts/e2e-local.sh --file login.spec.ts       # Run login tests only
#   ./scripts/e2e-local.sh --grep "@docker"           # Run Docker-tagged tests
#   ./scripts/e2e-local.sh --headed --debug           # Debug mode
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Defaults
MODE="full"
SPEC_FILE=""
GREP_PATTERN=""
HEADED=""
DEBUG=""
KEEP_BACKEND=""
PLAYWRIGHT_ARGS=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            MODE="quick"
            shift
            ;;
        --full)
            MODE="full"
            shift
            ;;
        --file)
            SPEC_FILE="$2"
            shift 2
            ;;
        --grep)
            GREP_PATTERN="$2"
            shift 2
            ;;
        --headed)
            HEADED="--headed"
            shift
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        --keep)
            KEEP_BACKEND="true"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          🎭 E2E LOCAL VALIDATION (Playwright)                 ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Mode: $MODE"
echo "║  Mirrors: .github/workflows/ci.yml docker-e2e job            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
echo -e "${BLUE}▶ Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Start backend if needed
echo -e "\n${BLUE}▶ Checking backend...${NC}"
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend already running${NC}"
else
    echo -e "${YELLOW}Starting Docker backend...${NC}"
    docker compose -f docker/docker-compose.ci.yml up -d --wait
    sleep 3

    # Seed test data
    echo -e "${YELLOW}Seeding test data...${NC}"
    ./docker/seed-test-data.sh full 2>/dev/null || true
    echo -e "${GREEN}✅ Backend ready${NC}"
fi

# Build Playwright args
PLAYWRIGHT_ARGS="--project=mobile-chromium"

if [[ -n "$SPEC_FILE" ]]; then
    PLAYWRIGHT_ARGS="$PLAYWRIGHT_ARGS playwright/$SPEC_FILE"
fi

if [[ -n "$GREP_PATTERN" ]]; then
    PLAYWRIGHT_ARGS="$PLAYWRIGHT_ARGS --grep \"$GREP_PATTERN\""
fi

if [[ "$MODE" == "quick" ]]; then
    # Quick mode: only run critical path tests
    PLAYWRIGHT_ARGS="$PLAYWRIGHT_ARGS --grep \"@smoke|@critical\""
fi

if [[ -n "$HEADED" ]]; then
    PLAYWRIGHT_ARGS="$PLAYWRIGHT_ARGS $HEADED"
fi

if [[ -n "$DEBUG" ]]; then
    PLAYWRIGHT_ARGS="$PLAYWRIGHT_ARGS $DEBUG"
fi

# Run tests
echo -e "\n${BLUE}▶ Running Playwright tests...${NC}"
echo -e "   Command: E2E_DOCKER_TESTS=true pnpm exec playwright test $PLAYWRIGHT_ARGS"
echo ""

START_TIME=$(date +%s)

# Set environment and run
export E2E_DOCKER_TESTS=true
export PLAYWRIGHT_BASE_URL="http://localhost:4200"

# Ensure www exists
if [ ! -d "www" ]; then
    echo -e "${YELLOW}Building app for E2E...${NC}"
    pnpm run build:mock
fi

# Start serve if not running
if ! curl -s http://localhost:4200 > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting frontend server...${NC}"
    npx serve www -l 4200 -s &
    SERVE_PID=$!
    sleep 2
fi

# Run Playwright
if eval "pnpm exec playwright test $PLAYWRIGHT_ARGS"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ E2E TESTS PASSED (${DURATION}s)${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    RESULT=0
else
    echo -e "\n${RED}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ❌ E2E TESTS FAILED${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Debug tips:${NC}"
    echo "  1. Run with --headed to see browser"
    echo "  2. Run with --debug for Playwright inspector"
    echo "  3. Check playwright-report/index.html for details"
    RESULT=1
fi

# Cleanup
if [[ -n "$SERVE_PID" ]]; then
    kill $SERVE_PID 2>/dev/null || true
fi

if [[ -z "$KEEP_BACKEND" ]]; then
    echo -e "\n${YELLOW}Stopping backend (use --keep to keep it running)...${NC}"
    docker compose -f docker/docker-compose.ci.yml down -v 2>/dev/null || true
fi

exit $RESULT

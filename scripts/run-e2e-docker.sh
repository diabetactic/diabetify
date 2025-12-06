#!/usr/bin/env bash

# ============================================================================
# Playwright E2E Tests in Docker
# ============================================================================
# This script orchestrates running Playwright E2E tests in Docker containers.
# It builds the Angular app, starts services, runs tests, and extracts results.
#
# Usage:
#   ./scripts/run-e2e-docker.sh [options]
#
# Options:
#   --build          Force rebuild of Docker images
#   --headed         Run tests in headed mode (requires X11)
#   --ui             Run tests in UI mode (requires X11)
#   --debug          Run with debug output
#   --clean          Clean up volumes after tests
#   --keep-running   Keep containers running after tests (for debugging)
#   --help           Show this help message
#
# Examples:
#   ./scripts/run-e2e-docker.sh                    # Run tests (build if needed)
#   ./scripts/run-e2e-docker.sh --build            # Force rebuild and run
#   ./scripts/run-e2e-docker.sh --headed           # Run with visible browser
#   ./scripts/run-e2e-docker.sh --keep-running     # Keep containers for debugging
#
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.e2e.yml"

# Default options
BUILD_FLAG=""
HEADED_MODE=false
UI_MODE=false
DEBUG_MODE=false
CLEAN_VOLUMES=false
KEEP_RUNNING=false

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    grep '^#' "$0" | grep -v '#!/usr/bin/env' | sed 's/^# //g' | sed 's/^#//g'
}

cleanup() {
    if [ "$KEEP_RUNNING" = true ]; then
        log_info "Containers kept running for debugging. Stop with: docker-compose -f $COMPOSE_FILE down"
    else
        log_info "Cleaning up containers..."
        docker-compose -f "$COMPOSE_FILE" down $CLEAN_FLAG 2>/dev/null || true
    fi
}

# ============================================================================
# Parse Arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_FLAG="--build"
            shift
            ;;
        --headed)
            HEADED_MODE=true
            shift
            ;;
        --ui)
            UI_MODE=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            set -x  # Enable bash debugging
            shift
            ;;
        --clean)
            CLEAN_VOLUMES=true
            shift
            ;;
        --keep-running)
            KEEP_RUNNING=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set cleanup flag
CLEAN_FLAG=""
if [ "$CLEAN_VOLUMES" = true ]; then
    CLEAN_FLAG="-v"
fi

# ============================================================================
# Preflight Checks
# ============================================================================

log_info "Starting Playwright E2E tests in Docker..."

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker."
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Docker Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# ============================================================================
# Build Angular App
# ============================================================================

log_info "Building Angular app with mock configuration..."
cd "$PROJECT_ROOT"

if ! npm run build:mock; then
    log_error "Angular build failed"
    exit 1
fi

log_success "Angular app built successfully"

# ============================================================================
# Set up test environment
# ============================================================================

# Ensure test artifact directories exist
mkdir -p "$PROJECT_ROOT/playwright/artifacts"
mkdir -p "$PROJECT_ROOT/playwright-report"

# Clean old artifacts
log_info "Cleaning old test artifacts..."
rm -rf "$PROJECT_ROOT/playwright/artifacts/*"
rm -rf "$PROJECT_ROOT/playwright-report/*"

# ============================================================================
# Run Docker Compose
# ============================================================================

# Trap exit to ensure cleanup
trap cleanup EXIT INT TERM

log_info "Starting Docker services..."

# Build and start services
if [ -n "$BUILD_FLAG" ]; then
    log_info "Forcing rebuild of Docker images..."
fi

docker-compose -f "$COMPOSE_FILE" up $BUILD_FLAG --abort-on-container-exit --exit-code-from playwright

# Capture exit code from playwright service
TEST_EXIT_CODE=$?

# ============================================================================
# Extract Test Results
# ============================================================================

log_info "Extracting test results..."

# Test artifacts are already mounted as volumes, so they're available locally

# Check if HTML report exists
if [ -f "$PROJECT_ROOT/playwright-report/index.html" ]; then
    log_success "HTML test report generated: playwright-report/index.html"
    log_info "View report: open playwright-report/index.html"
fi

# Check if JSON results exist
if [ -f "$PROJECT_ROOT/playwright-report/results.json" ]; then
    log_success "JSON test results: playwright-report/results.json"
fi

# Check for artifacts
ARTIFACT_COUNT=$(find "$PROJECT_ROOT/playwright/artifacts" -type f 2>/dev/null | wc -l)
if [ "$ARTIFACT_COUNT" -gt 0 ]; then
    log_info "Test artifacts saved: $ARTIFACT_COUNT files in playwright/artifacts/"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "============================================================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_success "All E2E tests passed!"
    echo "============================================================================"
    exit 0
else
    log_error "Some E2E tests failed (exit code: $TEST_EXIT_CODE)"
    echo "============================================================================"
    log_info "Review test report: playwright-report/index.html"
    log_info "Check artifacts: playwright/artifacts/"
    exit $TEST_EXIT_CODE
fi

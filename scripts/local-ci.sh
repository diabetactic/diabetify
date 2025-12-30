#!/usr/bin/env bash
#
# LOCAL CI VALIDATION SCRIPT
# Mirrors GitHub Actions CI workflow for fast local validation
# Run this before pushing to catch issues locally
#
# Usage: ./scripts/local-ci.sh [--quick|--full|--e2e|--act]
#   --quick  : Type check + lint only (fastest, ~15s)
#   --full   : All checks including unit tests (default, ~60s)
#   --e2e    : Run E2E tests with Docker backend (~3-5min)
#   --act    : Run via act for exact GH parity (slowest, ~5min)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timer
START_TIME=$(date +%s)

step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Parse arguments
MODE="${1:---full}"

echo -e "${YELLOW}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          🔍 LOCAL CI VALIDATION (mirrors GH Actions)          ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Mode: ${MODE}                                                    "
echo "║  Same checks as: .github/workflows/ci.yml                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd "$(dirname "$0")/.."

if [[ "$MODE" == "--act" ]]; then
    step "Running via act (exact GitHub parity)"
    act push -W .github/workflows/ci.yml -j lint -j unit-tests --bind --reuse
    exit $?
fi

if [[ "$MODE" == "--e2e" ]]; then
    step "Running E2E Tests (mirrors CI docker-e2e job)"
    echo "This runs the same tests as GitHub Actions docker-e2e job"
    echo ""

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        fail "Docker is not running. Start Docker first."
    fi

    # Run E2E with Docker backend
    cd "$(dirname "$0")/../docker"
    ./run-e2e-docker.sh playwright

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ E2E VALIDATION PASSED (${DURATION}s)${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}\n"
    exit 0
fi

# ============================================================================
# PHASE 1: FAST FEEDBACK (same as CI 'lint' job)
# ============================================================================

step "1/4 Type Check (tsc --noEmit)"
if pnpm exec tsc --noEmit -p tsconfig.build.json; then
    success "Type check passed"
else
    fail "Type check failed"
fi

step "2/4 ESLint + Stylelint"
if pnpm run lint; then
    success "Lint passed"
else
    fail "Lint failed"
fi

step "3/4 i18n Check"
if pnpm run i18n:check; then
    success "i18n check passed"
else
    fail "i18n check failed"
fi

if [[ "$MODE" == "--quick" ]]; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ QUICK VALIDATION PASSED (${DURATION}s)${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}\n"
    exit 0
fi

# ============================================================================
# PHASE 2: UNIT TESTS (same as CI 'unit-tests' job)
# ============================================================================

step "4/4 Unit Tests"
if pnpm test -- --run; then
    success "Unit tests passed"
else
    fail "Unit tests failed"
fi

# ============================================================================
# SUMMARY
# ============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ ALL CI CHECKS PASSED (${DURATION}s)                         ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Safe to push! These checks mirror GitHub Actions CI.          ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}\n"

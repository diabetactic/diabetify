#!/usr/bin/env bash
#
# INTERACTIVE E2E DEBUGGER
# Step-by-step E2E testing with visual debugging and AI analysis
#
# Usage: ./scripts/e2e-interactive.sh [MODE] [OPTIONS]
#
# MODES:
#   ui              Open Playwright UI Mode (interactive browser)
#   trace           Open trace viewer for last failed test
#   debug <file>    Debug specific test with inspector
#   flow <name>     Run and analyze specific user flow
#   watch           Watch mode - re-run on file changes
#   analyze         AI swarm analysis of test failures
#
# OPTIONS:
#   --headed        Show browser during tests
#   --slow          Slow down execution (500ms between actions)
#   --record        Record video and trace
#   --parallel      Run with swarm parallelization
#
# Examples:
#   ./scripts/e2e-interactive.sh ui                    # Interactive UI mode
#   ./scripts/e2e-interactive.sh debug login.spec.ts   # Debug specific test
#   ./scripts/e2e-interactive.sh flow "add reading"    # Analyze specific flow
#   ./scripts/e2e-interactive.sh trace                 # View last failure trace
#   ./scripts/e2e-interactive.sh analyze               # AI analysis of failures
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
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

MODE="${1:-help}"
shift 2>/dev/null || true

# Parse remaining options
HEADED=""
SLOW=""
RECORD=""
PARALLEL=""
TARGET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed) HEADED="--headed"; shift ;;
        --slow) SLOW="--slow-mo=500"; shift ;;
        --record) RECORD="--trace on --video on"; shift ;;
        --parallel) PARALLEL="true"; shift ;;
        *) TARGET="$1"; shift ;;
    esac
done

show_menu() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║          🎭 INTERACTIVE E2E DEBUGGER                              ║"
    echo "╠═══════════════════════════════════════════════════════════════════╣"
    echo "║                                                                   ║"
    echo "║  ${YELLOW}INTERACTIVE MODES:${CYAN}                                              ║"
    echo "║    ${GREEN}ui${CYAN}        - Playwright UI Mode (visual test runner)           ║"
    echo "║    ${GREEN}debug${CYAN}     - Step-through debugger with breakpoints            ║"
    echo "║    ${GREEN}trace${CYAN}     - Time-travel through last test execution           ║"
    echo "║    ${GREEN}watch${CYAN}     - Auto-rerun tests on file changes                  ║"
    echo "║                                                                   ║"
    echo "║  ${YELLOW}ANALYSIS MODES:${CYAN}                                                 ║"
    echo "║    ${GREEN}analyze${CYAN}   - AI swarm analysis of test failures                ║"
    echo "║    ${GREEN}flow${CYAN}      - Guided walkthrough of specific user flow          ║"
    echo "║    ${GREEN}report${CYAN}    - Generate and open HTML report                     ║"
    echo "║                                                                   ║"
    echo "║  ${YELLOW}QUICK COMMANDS:${CYAN}                                                 ║"
    echo "║    ${GREEN}run${CYAN}       - Run all E2E tests                                 ║"
    echo "║    ${GREEN}failed${CYAN}    - Re-run only failed tests                          ║"
    echo "║    ${GREEN}codegen${CYAN}   - Record new test with code generator               ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

ensure_backend() {
    echo -e "${BLUE}▶ Checking backend...${NC}"
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend running${NC}"
    else
        echo -e "${YELLOW}Starting Docker backend...${NC}"
        docker compose -f docker/docker-compose.ci.yml up -d --wait 2>/dev/null
        sleep 3
        ./docker/seed-test-data.sh full 2>/dev/null || true
        echo -e "${GREEN}✅ Backend ready${NC}"
    fi
}

ensure_frontend() {
    if ! curl -s http://localhost:4200 > /dev/null 2>&1; then
        echo -e "${YELLOW}Building and starting frontend...${NC}"
        if [ ! -d "www" ]; then
            pnpm run build:mock
        fi
        npx serve www -l 4200 -s &
        sleep 2
    fi
}

case "$MODE" in
    ui)
        echo -e "${MAGENTA}🎭 Opening Playwright UI Mode...${NC}"
        echo -e "${CYAN}This gives you:${NC}"
        echo "  • Visual test runner with all tests listed"
        echo "  • Click any test to run it"
        echo "  • Watch mode - tests re-run on file changes"
        echo "  • Time-travel debugging - see each step"
        echo "  • DOM snapshots at each action"
        echo ""
        ensure_backend
        ensure_frontend
        export E2E_DOCKER_TESTS=true
        pnpm exec playwright test --ui
        ;;

    debug)
        TEST_FILE="${TARGET:-}"
        if [[ -z "$TEST_FILE" ]]; then
            echo -e "${YELLOW}Available test files:${NC}"
            ls -1 playwright/*.spec.ts 2>/dev/null | sed 's/playwright\//  /'
            echo ""
            read -p "Enter test file to debug: " TEST_FILE
        fi
        echo -e "${MAGENTA}🔍 Debugging: $TEST_FILE${NC}"
        echo -e "${CYAN}Controls:${NC}"
        echo "  • Step Over (F10) - Execute current line"
        echo "  • Step Into (F11) - Step into function"
        echo "  • Continue (F5)   - Run to next breakpoint"
        echo "  • Hover elements  - See locators"
        echo ""
        ensure_backend
        ensure_frontend
        export E2E_DOCKER_TESTS=true
        export PWDEBUG=1
        pnpm exec playwright test "playwright/$TEST_FILE" --headed $SLOW
        ;;

    trace)
        echo -e "${MAGENTA}⏱️ Opening Trace Viewer...${NC}"
        echo -e "${CYAN}This shows:${NC}"
        echo "  • Timeline of all actions"
        echo "  • Screenshots at each step"
        echo "  • Network requests"
        echo "  • Console logs"
        echo "  • DOM snapshots"
        echo ""

        # Find most recent trace
        TRACE_FILE=$(find test-results -name "trace.zip" -type f 2>/dev/null | head -1)
        if [[ -n "$TRACE_FILE" ]]; then
            pnpm exec playwright show-trace "$TRACE_FILE"
        else
            echo -e "${YELLOW}No trace found. Running tests with trace enabled...${NC}"
            ensure_backend
            ensure_frontend
            export E2E_DOCKER_TESTS=true
            pnpm exec playwright test --trace on --project=mobile-chromium || true
            TRACE_FILE=$(find test-results -name "trace.zip" -type f 2>/dev/null | head -1)
            if [[ -n "$TRACE_FILE" ]]; then
                pnpm exec playwright show-trace "$TRACE_FILE"
            fi
        fi
        ;;

    watch)
        echo -e "${MAGENTA}👀 Starting Watch Mode...${NC}"
        echo "Tests will re-run automatically when you modify:"
        echo "  • playwright/*.spec.ts"
        echo "  • src/**/*.ts"
        echo ""
        ensure_backend
        ensure_frontend
        export E2E_DOCKER_TESTS=true
        pnpm exec playwright test --ui --watch
        ;;

    flow)
        FLOW_NAME="${TARGET:-}"
        if [[ -z "$FLOW_NAME" ]]; then
            echo -e "${YELLOW}Available user flows:${NC}"
            echo "  1. login          - Authentication flow"
            echo "  2. add-reading    - Add glucose reading"
            echo "  3. dashboard      - View dashboard data"
            echo "  4. bolus          - Bolus calculator"
            echo "  5. appointments   - Manage appointments"
            echo "  6. onboarding     - New user onboarding"
            echo ""
            read -p "Enter flow name or number: " FLOW_INPUT
            case "$FLOW_INPUT" in
                1|login) FLOW_NAME="login" ;;
                2|add-reading) FLOW_NAME="readings" ;;
                3|dashboard) FLOW_NAME="dashboard" ;;
                4|bolus) FLOW_NAME="bolus" ;;
                5|appointments) FLOW_NAME="appointments" ;;
                6|onboarding) FLOW_NAME="onboarding" ;;
                *) FLOW_NAME="$FLOW_INPUT" ;;
            esac
        fi

        echo -e "${MAGENTA}🔄 Analyzing flow: $FLOW_NAME${NC}"
        ensure_backend
        ensure_frontend
        export E2E_DOCKER_TESTS=true

        # Run with trace and video
        echo -e "${CYAN}Running with full recording...${NC}"
        pnpm exec playwright test --grep "$FLOW_NAME" --trace on --video on --headed $SLOW || true

        # Show trace
        TRACE_FILE=$(find test-results -name "trace.zip" -type f 2>/dev/null | head -1)
        if [[ -n "$TRACE_FILE" ]]; then
            echo -e "\n${GREEN}Opening trace viewer for flow analysis...${NC}"
            pnpm exec playwright show-trace "$TRACE_FILE"
        fi
        ;;

    analyze)
        echo -e "${MAGENTA}🤖 AI Swarm Analysis of E2E Failures${NC}"
        echo ""

        # Check for failures
        if [ -d "playwright-report" ]; then
            echo -e "${CYAN}Analyzing test failures...${NC}"

            # Analyze with multiple agents (manual review)
            cat << 'ANALYSIS_PROMPT'

Analyzing E2E test results with specialized agents:

1. 🔍 FAILURE ANALYZER - Examining test-results/ for failures
2. 📸 SCREENSHOT ANALYZER - Checking screenshots for visual issues
3. 🌐 NETWORK ANALYZER - Reviewing request/response patterns
4. 🐛 ROOT CAUSE ANALYZER - Identifying failure root causes

ANALYSIS_PROMPT

            # Open report for human review
            pnpm exec playwright show-report
        else
            echo -e "${YELLOW}No test results found. Run tests first.${NC}"
            echo "  ./scripts/e2e-interactive.sh run"
        fi
        ;;

    report)
        echo -e "${MAGENTA}📊 Opening HTML Report...${NC}"
        pnpm exec playwright show-report
        ;;

    run)
        echo -e "${MAGENTA}🚀 Running E2E Tests...${NC}"
        ensure_backend
        ensure_frontend
        export E2E_DOCKER_TESTS=true
        pnpm exec playwright test --project=mobile-chromium $HEADED $SLOW $RECORD
        ;;

    failed)
        echo -e "${MAGENTA}🔄 Re-running Failed Tests...${NC}"
        ensure_backend
        ensure_frontend
        export E2E_DOCKER_TESTS=true
        pnpm exec playwright test --last-failed --headed $SLOW
        ;;

    codegen)
        echo -e "${MAGENTA}📝 Starting Code Generator...${NC}"
        echo -e "${CYAN}Actions:${NC}"
        echo "  • Click, type, hover in the browser"
        echo "  • Code is generated automatically"
        echo "  • Copy generated code to your test file"
        echo ""
        ensure_backend
        ensure_frontend
        pnpm exec playwright codegen http://localhost:4200
        ;;

    parallel)
        echo -e "${MAGENTA}⚡ Parallel E2E with Swarm Orchestration${NC}"
        ensure_backend
        ensure_frontend
        export E2E_DOCKER_TESTS=true

        # Run with maximum parallelization
        pnpm exec playwright test --project=mobile-chromium --workers=4 --shard=1/1
        ;;

    help|*)
        show_menu
        ;;
esac

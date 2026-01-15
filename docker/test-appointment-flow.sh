#!/bin/bash
# =============================================================================
# Test Appointment Flow - Convenience Wrapper
# =============================================================================
# Quick commands for testing appointment state machine against Docker backend.
#
# Usage:
#   ./test-appointment-flow.sh accept [USER_ID]  # Accept appointment
#   ./test-appointment-flow.sh deny [USER_ID]    # Deny appointment
#   ./test-appointment-flow.sh clear [USER_ID]   # Clear queue
#   ./test-appointment-flow.sh open              # Open appointment queue
#   ./test-appointment-flow.sh close             # Close appointment queue
#   ./test-appointment-flow.sh status [USER_ID]  # Show queue status
#   ./test-appointment-flow.sh full [USER_ID]    # Full flow demo
#
# Environment:
#   BACKOFFICE_API_URL - Override backoffice URL (auto-detected)
#   USER_ID - Default user ID (default: 40123456)
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DEFAULT_USER_ID="40123456"
DEFAULT_PASSWORD="thepassword"
HEROKU_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
LOCAL_URL="http://localhost:8001"

# Auto-detect backend
detect_backend() {
    if [ -n "$BACKOFFICE_API_URL" ]; then
        echo "$BACKOFFICE_API_URL"
        return
    fi

    # Check if Docker backend is running
    if curl -s "http://localhost:8001/docs" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker backend detected${NC}" >&2
        echo "$LOCAL_URL"
    else
        echo -e "${YELLOW}⚠ Docker not running, using Heroku${NC}" >&2
        echo "$HEROKU_URL"
    fi
}

# Print state machine diagram
print_state_machine() {
    echo -e "${CYAN}"
    echo "┌─────────────────────────────────────────────────┐"
    echo "│          Appointment State Machine              │"
    echo "├─────────────────────────────────────────────────┤"
    echo "│                                                 │"
    echo "│   NONE ──[request]──> PENDING                   │"
    echo "│                          │                      │"
    echo "│              ┌───────────┼───────────┐          │"
    echo "│              │           │           │          │"
    echo "│        [deny]▼     [accept]▼    [close]▼        │"
    echo "│           DENIED      ACCEPTED    BLOCKED       │"
    echo "│              │           │                      │"
    echo "│        [request]   [create]▼                    │"
    echo "│              │        CREATED                   │"
    echo "│              ▼           │                      │"
    echo "│           NONE ◄─────────┘                      │"
    echo "│                                                 │"
    echo "└─────────────────────────────────────────────────┘"
    echo -e "${NC}"
}

# Get admin token
get_admin_token() {
    local url="$1"
    local admin_user="${BACKOFFICE_ADMIN_USERNAME:-admin}"
    local admin_pass="${BACKOFFICE_ADMIN_PASSWORD:-admin}"

    local response
    response=$(curl -s -X POST "$url/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$admin_user&password=$admin_pass")

    echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4
}

# Get queue status
get_status() {
    local url="$1"
    local token="$2"
    local user_id="$3"

    echo -e "${BLUE}📊 Getting queue status for user $user_id...${NC}"

    local response
    response=$(curl -s "$url/appointments/queue/status" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"user_id\": \"$user_id\"}" 2>/dev/null || echo '{"error": "Failed to get status"}')

    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
}

# Execute action
execute_action() {
    local action="$1"
    local url="$2"
    local token="$3"
    local user_id="$4"

    local endpoint=""
    local method="POST"
    local data="{\"user_id\": \"$user_id\"}"

    case "$action" in
        accept)
            endpoint="/appointments/queue/accept"
            echo -e "${GREEN}✓ Accepting appointment for user $user_id${NC}"
            ;;
        deny)
            endpoint="/appointments/queue/deny"
            echo -e "${RED}✗ Denying appointment for user $user_id${NC}"
            ;;
        clear)
            endpoint="/appointments/queue/clear"
            method="DELETE"
            echo -e "${YELLOW}🗑 Clearing queue for user $user_id${NC}"
            ;;
        open)
            endpoint="/appointments/queue/open"
            data="{}"
            echo -e "${GREEN}🔓 Opening appointment queue${NC}"
            ;;
        close)
            endpoint="/appointments/queue/close"
            data="{}"
            echo -e "${RED}🔒 Closing appointment queue${NC}"
            ;;
        *)
            echo -e "${RED}Unknown action: $action${NC}"
            exit 1
            ;;
    esac

    local response
    if [ "$method" = "DELETE" ]; then
        response=$(curl -s -X DELETE "$url$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X POST "$url$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}Error: $response${NC}"
        return 1
    else
        echo -e "${GREEN}Success!${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    fi
}

# Full flow demonstration
run_full_flow() {
    local url="$1"
    local token="$2"
    local user_id="$3"

    print_state_machine

    echo -e "${CYAN}Starting full appointment flow demo for user $user_id${NC}"
    echo ""

    # Step 1: Clear queue
    echo -e "${BLUE}Step 1: Clear existing queue${NC}"
    execute_action "clear" "$url" "$token" "$user_id"
    echo ""
    sleep 1

    # Step 2: Show status (should be NONE)
    echo -e "${BLUE}Step 2: Verify NONE state${NC}"
    get_status "$url" "$token" "$user_id"
    echo ""
    sleep 1

    # Step 3: Accept (simulates user requesting + admin accepting)
    echo -e "${BLUE}Step 3: Accept appointment (PENDING → ACCEPTED)${NC}"
    echo -e "${YELLOW}Note: In real flow, user requests first via app${NC}"
    execute_action "accept" "$url" "$token" "$user_id"
    echo ""
    sleep 1

    # Step 4: Show final status
    echo -e "${BLUE}Step 4: Verify ACCEPTED state${NC}"
    get_status "$url" "$token" "$user_id"
    echo ""

    echo -e "${GREEN}✅ Full flow complete!${NC}"
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Open mobile app with: npm run start:local"
    echo "  2. Login as user $user_id"
    echo "  3. Navigate to Appointments tab"
    echo "  4. Complete the appointment form"
}

# Main
main() {
    local action="${1:-status}"
    local user_id="${2:-$DEFAULT_USER_ID}"

    # Show help
    if [ "$action" = "-h" ] || [ "$action" = "--help" ]; then
        echo "Usage: $0 <action> [user_id]"
        echo ""
        echo "Actions:"
        echo "  accept [USER_ID]  Accept appointment request"
        echo "  deny [USER_ID]    Deny appointment request"
        echo "  clear [USER_ID]   Clear appointment queue"
        echo "  open              Open appointment queue"
        echo "  close             Close appointment queue"
        echo "  status [USER_ID]  Show queue status"
        echo "  full [USER_ID]    Run full flow demo"
        echo ""
        echo "Default USER_ID: $DEFAULT_USER_ID"
        print_state_machine
        exit 0
    fi

    # Detect backend
    local url
    url=$(detect_backend)
    echo -e "${BLUE}Using backend: $url${NC}"
    echo ""

    # Get token
    echo -e "${BLUE}🔑 Authenticating...${NC}"
    local token
    token=$(get_admin_token "$url")

    if [ -z "$token" ]; then
        echo -e "${RED}❌ Failed to authenticate with backoffice${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Authenticated${NC}"
    echo ""

    # Execute action
    case "$action" in
        status)
            get_status "$url" "$token" "$user_id"
            ;;
        full)
            run_full_flow "$url" "$token" "$user_id"
            ;;
        accept|deny|clear|open|close)
            execute_action "$action" "$url" "$token" "$user_id"
            ;;
        *)
            echo -e "${RED}Unknown action: $action${NC}"
            echo "Run '$0 --help' for usage"
            exit 1
            ;;
    esac
}

main "$@"

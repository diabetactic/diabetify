#!/bin/bash
# ============================================================================
# Docker Test Environment Helper
# ============================================================================
# Uses container-managing/docker-compose.test.yml for local backend testing
#
# Usage:
#   ./scripts/docker-test.sh start      # Start all services
#   ./scripts/docker-test.sh stop       # Stop and cleanup
#   ./scripts/docker-test.sh status     # Check health of all services
#   ./scripts/docker-test.sh reset      # Reset databases (restart)
#   ./scripts/docker-test.sh logs       # Show service logs
#   ./scripts/docker-test.sh create-user <email> <password>  # Create test user
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTAINER_MANAGING_DIR="$(dirname "$PROJECT_ROOT")/container-managing"
COMPOSE_FILE="$CONTAINER_MANAGING_DIR/docker-compose.test.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Check if container-managing exists
check_setup() {
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "docker-compose.test.yml not found at: $COMPOSE_FILE"
        log_info "Expected location: $CONTAINER_MANAGING_DIR"
        exit 1
    fi
}

# Start all services
cmd_start() {
    check_setup
    log_info "Starting Docker test environment..."
    cd "$CONTAINER_MANAGING_DIR"

    docker-compose -f docker-compose.test.yml up -d --wait --build

    log_success "All services started!"
    log_info ""
    log_info "Service URLs:"
    log_info "  API Gateway:      http://localhost:8004"
    log_info "  Backoffice API:   http://localhost:8006"
    log_info "  Login Service:    http://localhost:8003"
    log_info "  Glucoserver:      http://localhost:8002"
    log_info "  Appointments:     http://localhost:8005"
    log_info ""
    log_info "Run the app with: ENV=local npm start"
}

# Stop all services
cmd_stop() {
    check_setup
    log_info "Stopping Docker test environment..."
    cd "$CONTAINER_MANAGING_DIR"

    docker-compose -f docker-compose.test.yml down --volumes --remove-orphans

    log_success "All services stopped and cleaned up"
}

# Check status
cmd_status() {
    check_setup
    log_info "Checking service health..."

    SERVICES=(
        "API Gateway|http://localhost:8004/docs"
        "Backoffice|http://localhost:8006/docs"
        "Login|http://localhost:8003/docs"
        "Glucoserver|http://localhost:8002/docs"
        "Appointments|http://localhost:8005/docs"
    )

    ALL_HEALTHY=true
    for service in "${SERVICES[@]}"; do
        IFS='|' read -r name url <<< "$service"
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "$name: healthy"
        else
            log_error "$name: not responding"
            ALL_HEALTHY=false
        fi
    done

    if $ALL_HEALTHY; then
        log_success "All services healthy!"
    else
        log_warn "Some services are not healthy. Try: ./scripts/docker-test.sh start"
    fi
}

# Reset databases
cmd_reset() {
    check_setup
    log_info "Resetting databases (stop + start)..."
    cmd_stop
    cmd_start
}

# Show logs
cmd_logs() {
    check_setup
    cd "$CONTAINER_MANAGING_DIR"
    docker-compose -f docker-compose.test.yml logs -f --tail=100
}

# Create a test user
cmd_create_user() {
    local email="${1:-test@diabetactic.com}"
    local password="${2:-testpass123}"

    log_info "Creating test user: $email"

    RESPONSE=$(curl -sf -X POST "http://localhost:8003/users/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\", \"full_name\": \"Test User\"}" 2>&1) || {
        log_error "Failed to create user. Is the login service running?"
        log_info "Try: ./scripts/docker-test.sh start"
        exit 1
    }

    log_success "User created: $email / $password"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
}

# Main
case "${1:-}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    reset)
        cmd_reset
        ;;
    logs)
        cmd_logs
        ;;
    create-user)
        cmd_create_user "$2" "$3"
        ;;
    *)
        echo "Usage: $0 {start|stop|status|reset|logs|create-user}"
        echo ""
        echo "Commands:"
        echo "  start         Start all backend services"
        echo "  stop          Stop and cleanup all services"
        echo "  status        Check health of all services"
        echo "  reset         Reset databases (stop + start)"
        echo "  logs          Follow service logs"
        echo "  create-user   Create a test user (email password)"
        exit 1
        ;;
esac

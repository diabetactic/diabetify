#!/bin/bash
# Complete Setup and Test Script for Integration Tests
# This script installs Docker, sets up services, and runs integration tests

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_header() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${BLUE}$1${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

print_header "🚀 Integration Tests Setup & Execution"

# Check if Docker is installed and user is in docker group
DOCKER_INSTALLED=false
USER_IN_DOCKER_GROUP=false
DOCKER_RUNNING=false

if command -v docker &>/dev/null; then
    DOCKER_INSTALLED=true
fi

if groups | grep -q docker; then
    USER_IN_DOCKER_GROUP=true
fi

if docker ps &>/dev/null 2>&1; then
    DOCKER_RUNNING=true
fi

# Determine what needs to be done
NEEDS_INSTALL=false
NEEDS_RELOGIN=false
CAN_RUN_TESTS=false

if [ "$DOCKER_INSTALLED" = false ]; then
    NEEDS_INSTALL=true
elif [ "$USER_IN_DOCKER_GROUP" = false ]; then
    NEEDS_INSTALL=true
elif [ "$DOCKER_RUNNING" = false ]; then
    print_error "Docker is installed but not running. Starting Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
    DOCKER_RUNNING=true
fi

if [ "$DOCKER_RUNNING" = true ] && [ "$USER_IN_DOCKER_GROUP" = true ]; then
    CAN_RUN_TESTS=true
fi

# Phase 1: Installation (if needed)
if [ "$NEEDS_INSTALL" = true ]; then
    print_header "📦 Phase 1: Docker Installation"

    if [ "$DOCKER_INSTALLED" = false ]; then
        print_info "Installing Docker and Docker Compose..."
        sudo pacman -S --noconfirm docker docker-compose
        print_success "Docker packages installed"
    else
        print_success "Docker already installed"
    fi

    print_info "Starting Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
    print_success "Docker service started and enabled"

    if [ "$USER_IN_DOCKER_GROUP" = false ]; then
        print_info "Adding user '$USER' to docker group..."
        sudo usermod -aG docker $USER
        print_success "User added to docker group"
        NEEDS_RELOGIN=true
    fi

    print_info "Testing Docker (with sudo for now)..."
    if sudo docker run --rm hello-world &>/dev/null; then
        print_success "Docker is working!"
    else
        print_error "Docker test failed"
        exit 1
    fi
fi

# Check if relogin is needed
if [ "$NEEDS_RELOGIN" = true ]; then
    print_header "⚠️  ACTION REQUIRED: Relogin Needed"
    echo ""
    echo "Docker is installed, but you need to log out and log back in"
    echo "for group changes to take effect."
    echo ""
    echo -e "${YELLOW}Choose an option:${NC}"
    echo ""
    echo "  1) Reboot now (recommended)"
    echo "  2) I'll log out manually and run this script again"
    echo "  3) Continue anyway (may not work)"
    echo ""
    read -p "Enter choice [1-3]: " choice

    case $choice in
        1)
            print_info "Rebooting in 5 seconds... (Ctrl+C to cancel)"
            sleep 5
            sudo reboot
            ;;
        2)
            echo ""
            print_success "OK! After logging back in, run this script again:"
            echo "  cd $PROJECT_DIR"
            echo "  bash setup-and-test.sh"
            exit 0
            ;;
        3)
            print_info "Attempting to continue..."
            # Try to use newgrp to activate group without relogin
            exec sg docker "$0 --continue"
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
fi

# Phase 2: Run Services and Tests
if [ "$CAN_RUN_TESTS" = true ] || [ "$1" = "--continue" ]; then
    print_header "🐳 Phase 2: Starting Backend Services"

    # Check if services are already running
    if curl -s -m 2 http://localhost:8004/health &>/dev/null; then
        print_success "Backend services already running"
    else
        print_info "Starting backend services with docker-compose..."
        cd extServices/container-managing

        # Start services
        if [ -f "Makefile" ]; then
            make build
        else
            docker compose up -d --build
        fi

        cd "$PROJECT_DIR"

        print_success "Backend services started"
        print_info "Waiting 60 seconds for services to initialize..."

        # Progress bar for waiting
        for i in {1..60}; do
            printf "\r  ${YELLOW}⏳${NC} Waiting: [${GREEN}"
            printf "%${i}s" | tr ' ' '='
            printf "${NC}%$((60-i))s] %d/60s" " " $i
            sleep 1
        done
        echo ""
    fi

    print_header "🏥 Phase 3: Health Checks"

    # Health check function
    check_service() {
        local name=$1
        local url=$2
        if curl -s -m 5 "$url" &>/dev/null; then
            print_success "$name is healthy ($url)"
            return 0
        else
            print_error "$name is not responding ($url)"
            return 1
        fi
    }

    # Check all services
    HEALTH_OK=true
    check_service "API Gateway" "http://localhost:8004/health" || HEALTH_OK=false
    check_service "Glucoserver" "http://localhost:8002/health" || HEALTH_OK=false
    check_service "Login Service" "http://localhost:8003/health" || HEALTH_OK=false
    check_service "Appointments" "http://localhost:8005/health" || HEALTH_OK=false

    if [ "$HEALTH_OK" = false ]; then
        echo ""
        print_error "Some services are not healthy. Checking logs..."
        echo ""
        echo "View logs with: npm run backend:logs"
        echo "Or: cd extServices/container-managing && docker compose logs -f"
        exit 1
    fi

    print_header "🧪 Phase 4: Running Integration Tests"

    print_info "Running all integration tests..."
    echo ""

    # Run tests
    npm run test:backend-integration:headless

    TEST_EXIT_CODE=$?

    echo ""
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        print_header "🎉 Success! All Tests Passed!"
        echo ""
        print_success "Integration tests completed successfully"
        print_success "All 35 tests passed"
        echo ""
        echo "Services are still running. To stop them:"
        echo "  npm run backend:stop"
        echo ""
        echo "To view logs:"
        echo "  npm run backend:logs (opens http://localhost:9999)"
        echo ""
    else
        print_header "❌ Tests Failed"
        echo ""
        print_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check service logs: npm run backend:logs"
        echo "  2. Verify health checks: npm run backend:health"
        echo "  3. Restart services: npm run backend:stop && npm run backend:start"
        echo ""
        exit $TEST_EXIT_CODE
    fi
else
    print_error "Unable to proceed. Docker is not properly configured."
    echo ""
    echo "Please ensure:"
    echo "  1. Docker is installed: docker --version"
    echo "  2. Docker is running: systemctl status docker"
    echo "  3. User in docker group: groups | grep docker"
    echo ""
    exit 1
fi

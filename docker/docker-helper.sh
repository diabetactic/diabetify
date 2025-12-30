#!/bin/bash
# =============================================================================
# Optimized Docker Helper Script for Diabetactic Development
# =============================================================================
# High-performance commands using pnpm and modern Docker features.
#
# Usage:
#   ./docker/docker-helper.sh build    - Build the development image
#   ./docker/docker-helper.sh test     - Run unit tests
#   ./docker/docker-helper.sh e2e      - Run E2E tests with Playwright
#   ./docker/docker-helper.sh up       - Start the full stack (Compose)
#   ./docker/docker-helper.sh down     - Stop the full stack
#   ./docker/docker-helper.sh clean    - Prune volumes and unused images
# =============================================================================

set -e

IMAGE_NAME="diabetactic:dev"
DOCKERFILE="docker/Dockerfile.dev"
COMPOSE_FILE="docker/docker-compose.local.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed."
        exit 1
    fi
}

# Build with BuildKit and pnpm cache optimization
build_image() {
    log_info "Building Docker image using BuildKit: $IMAGE_NAME"
    DOCKER_BUILDKIT=1 docker build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -f "$DOCKERFILE" \
        -t "$IMAGE_NAME" .
}

# Run unit tests using pnpm
run_tests() {
    log_info "Running unit tests inside container..."
    docker run --rm "$IMAGE_NAME" pnpm run test:unit
}

# Start the full local stack using Compose
stack_up() {
    log_info "Starting full Diabetactic stack..."
    docker compose -f "$COMPOSE_FILE" up -d
    log_info "Stack is initializing. Check logs with: ./docker/docker-helper.sh logs"
}

# Stop the full stack
stack_down() {
    log_info "Stopping Diabetactic stack..."
    docker compose -f "$COMPOSE_FILE" down
}

# Run Playwright E2E tests
run_e2e() {
    log_info "Running Playwright E2E tests..."
    # Ensure reports directories exist locally to map volumes
    mkdir -p playwright-report playwright/artifacts

    docker run --rm \
        -e CI=true \
        -v "$(pwd)/playwright-report:/app/playwright-report" \
        -v "$(pwd)/playwright/artifacts:/app/playwright/artifacts" \
        "$IMAGE_NAME" pnpm run test:e2e
}

# Show container logs
show_logs() {
    docker compose -f "$COMPOSE_FILE" logs -f
}

# Deep clean of Docker resources
clean_all() {
    log_warn "This will remove all Diabetactic containers, images, and VOLUMES."
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f "$COMPOSE_FILE" down -v --rmi local
        docker image prune -f
        log_info "Cleanup complete."
    fi
}

show_help() {
    echo "Diabetactic Docker Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build    Build the dev image"
    echo "  up       Start backend services (detached)"
    echo "  down     Stop backend services"
    echo "  logs     Follow service logs"
    echo "  test     Run unit tests (pnpm)"
    echo "  e2e      Run Playwright tests"
    echo "  shell    Enter container shell"
    echo "  clean    Reset everything (including DB volumes)"
    echo ""
}

case "${1:-help}" in
    build) build_image ;;
    up) stack_up ;;
    down) stack_down ;;
    logs) show_logs ;;
    test) run_tests ;;
    e2e) run_e2e ;;
    shell) docker run --rm -it "$IMAGE_NAME" bash ;;
    clean) clean_all ;;
    help|--help|-h) show_help ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

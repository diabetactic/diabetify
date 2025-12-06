#!/bin/bash
# =============================================================================
# Docker Helper Script for Diabetactic Development
# =============================================================================
# Quick commands to build, test, and run the Dockerized app
#
# Usage:
#   ./docker/docker-helper.sh build    - Build the Docker image
#   ./docker/docker-helper.sh test     - Run unit tests
#   ./docker/docker-helper.sh e2e      - Run E2E tests
#   ./docker/docker-helper.sh dev      - Start dev server
#   ./docker/docker-helper.sh prod     - Production build
#   ./docker/docker-helper.sh shell    - Open interactive shell
#   ./docker/docker-helper.sh clean    - Clean up Docker resources
# =============================================================================

set -e

IMAGE_NAME="diabetactic:dev"
DOCKERFILE="docker/Dockerfile.dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
}

# Build the Docker image
build_image() {
    log_info "Building Docker image: $IMAGE_NAME"
    DOCKER_BUILDKIT=1 docker build -f "$DOCKERFILE" -t "$IMAGE_NAME" .
    log_info "Build complete!"
}

# Run unit tests
run_tests() {
    log_info "Running unit tests..."
    docker run --rm "$IMAGE_NAME" npm test
}

# Run unit tests with coverage
run_coverage() {
    log_info "Running unit tests with coverage..."
    docker run --rm -v "$(pwd)/coverage:/app/coverage" "$IMAGE_NAME" npm run test:coverage
    log_info "Coverage report saved to: coverage/"
}

# Run E2E tests
run_e2e() {
    log_info "Running E2E tests..."
    docker run --rm \
        -v "$(pwd)/playwright-report:/app/playwright-report" \
        -v "$(pwd)/playwright/artifacts:/app/playwright/artifacts" \
        "$IMAGE_NAME" npm run test:e2e
    log_info "E2E reports saved to: playwright-report/"
}

# Start dev server
start_dev() {
    log_info "Starting dev server on http://localhost:4200"
    log_warn "Press Ctrl+C to stop"
    docker run --rm -it -p 4200:4200 \
        -v "$(pwd)/src:/app/src" \
        "$IMAGE_NAME" npm start
}

# Production build
build_prod() {
    log_info "Building production bundle..."
    docker run --rm -v "$(pwd)/www:/app/www" "$IMAGE_NAME" npm run build:prod
    log_info "Production build saved to: www/"
}

# Open interactive shell
open_shell() {
    log_info "Opening interactive shell..."
    docker run --rm -it "$IMAGE_NAME" bash
}

# Run linting
run_lint() {
    log_info "Running ESLint..."
    docker run --rm "$IMAGE_NAME" npm run lint
}

# Run quality checks
run_quality() {
    log_info "Running quality checks (lint + test)..."
    docker run --rm "$IMAGE_NAME" npm run quality
}

# Clean up Docker resources
clean_docker() {
    log_info "Cleaning up Docker resources..."

    # Remove containers
    if [ "$(docker ps -aq -f ancestor=$IMAGE_NAME)" ]; then
        log_info "Removing containers..."
        docker rm -f $(docker ps -aq -f ancestor="$IMAGE_NAME")
    fi

    # Remove image
    if docker images "$IMAGE_NAME" | grep -q "$IMAGE_NAME"; then
        log_info "Removing image: $IMAGE_NAME"
        docker rmi "$IMAGE_NAME"
    fi

    # Prune dangling images
    log_info "Pruning dangling images..."
    docker image prune -f

    log_info "Cleanup complete!"
}

# Show help
show_help() {
    echo "Docker Helper for Diabetactic"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build       Build the Docker image"
    echo "  test        Run unit tests"
    echo "  coverage    Run unit tests with coverage report"
    echo "  e2e         Run E2E tests with Playwright"
    echo "  dev         Start development server (port 4200)"
    echo "  prod        Build production bundle"
    echo "  lint        Run ESLint"
    echo "  quality     Run lint + tests"
    echo "  shell       Open interactive bash shell"
    echo "  clean       Clean up Docker resources"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build              # Build image"
    echo "  $0 test               # Run tests"
    echo "  $0 dev                # Start dev server"
    echo ""
}

# Main script
main() {
    check_docker

    case "${1:-help}" in
        build)
            build_image
            ;;
        test)
            run_tests
            ;;
        coverage)
            run_coverage
            ;;
        e2e)
            run_e2e
            ;;
        dev)
            start_dev
            ;;
        prod)
            build_prod
            ;;
        lint)
            run_lint
            ;;
        quality)
            run_quality
            ;;
        shell)
            open_shell
            ;;
        clean)
            clean_docker
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"

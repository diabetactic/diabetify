#!/bin/bash
# Docker Installation Script for EndeavourOS/Arch Linux
# This script installs Docker and sets up everything needed for integration tests

set -e  # Exit on error

echo "================================================"
echo "🐳 Docker Installation for Integration Tests"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do NOT run this script as root (no sudo)"
    exit 1
fi

echo "Step 1: Checking current Docker installation..."
echo "------------------------------------------------"

# Check if Docker is already installed
if pacman -Qi docker &>/dev/null; then
    print_success "Docker is already installed"
    DOCKER_VERSION=$(pacman -Qi docker | grep Version | awk '{print $3}')
    echo "  Version: $DOCKER_VERSION"
else
    print_info "Docker not found, will install"

    echo ""
    echo "Step 2: Installing Docker and Docker Compose..."
    echo "------------------------------------------------"

    # Install Docker
    print_info "Running: sudo pacman -S --noconfirm docker docker-compose"
    sudo pacman -S --noconfirm docker docker-compose

    if [ $? -eq 0 ]; then
        print_success "Docker and Docker Compose installed successfully"
    else
        print_error "Failed to install Docker"
        exit 1
    fi
fi

echo ""
echo "Step 3: Starting and enabling Docker service..."
echo "------------------------------------------------"

# Start Docker service
sudo systemctl start docker
if [ $? -eq 0 ]; then
    print_success "Docker service started"
else
    print_error "Failed to start Docker service"
    exit 1
fi

# Enable Docker to start on boot
sudo systemctl enable docker
if [ $? -eq 0 ]; then
    print_success "Docker service enabled (will start on boot)"
else
    print_error "Failed to enable Docker service"
fi

echo ""
echo "Step 4: Adding user to docker group..."
echo "------------------------------------------------"

# Add user to docker group
if groups | grep -q docker; then
    print_success "User already in docker group"
else
    sudo usermod -aG docker $USER
    print_success "User added to docker group"
    print_info "You need to log out and back in for group changes to take effect"
fi

echo ""
echo "Step 5: Verifying Docker installation..."
echo "------------------------------------------------"

# Check Docker version
if sudo docker --version &>/dev/null; then
    DOCKER_VERSION=$(sudo docker --version)
    print_success "Docker installed: $DOCKER_VERSION"
else
    print_error "Docker not working properly"
    exit 1
fi

# Check Docker Compose version
if sudo docker compose version &>/dev/null; then
    COMPOSE_VERSION=$(sudo docker compose version)
    print_success "Docker Compose installed: $COMPOSE_VERSION"
else
    print_error "Docker Compose not working properly"
    exit 1
fi

# Test Docker with hello-world (using sudo for now)
echo ""
print_info "Testing Docker with hello-world container..."
if sudo docker run --rm hello-world &>/dev/null; then
    print_success "Docker is working correctly!"
else
    print_error "Docker test failed"
    exit 1
fi

echo ""
echo "================================================"
echo "✓ Docker Installation Complete!"
echo "================================================"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo ""
echo "1. Log out and log back in (or reboot) to apply group changes"
echo "   This allows you to run docker without sudo"
echo ""
echo "2. After logging back in, verify with:"
echo "   docker --version"
echo "   docker compose version"
echo ""
echo "3. Then start the backend services:"
echo "   cd $(pwd)"
echo "   npm run backend:start"
echo ""
echo "4. Wait 30-60 seconds, then run tests:"
echo "   npm run test:backend-integration"
echo ""
echo "================================================"

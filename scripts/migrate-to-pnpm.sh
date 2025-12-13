#!/bin/bash
# Migration script from npm to pnpm for Diabetify project
# DO NOT run this script until you have reviewed all configuration files

set -e  # Exit on error

echo "=========================================="
echo "Diabetify: npm to pnpm migration script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verify pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Error: pnpm is not installed${NC}"
    echo "Install pnpm globally first:"
    echo "  npm install -g pnpm"
    exit 1
fi

echo -e "${GREEN}✓ pnpm is installed ($(pnpm --version))${NC}"
echo ""

# Verify .npmrc exists
if [ ! -f ".npmrc" ]; then
    echo -e "${RED}Error: .npmrc file not found${NC}"
    echo "Please create .npmrc file first"
    exit 1
fi

echo -e "${GREEN}✓ .npmrc configuration found${NC}"
echo ""

# Backup package-lock.json
echo -e "${YELLOW}Step 1: Backing up package-lock.json...${NC}"
if [ -f "package-lock.json" ]; then
    cp package-lock.json package-lock.json.backup
    echo -e "${GREEN}✓ Backup created: package-lock.json.backup${NC}"
else
    echo -e "${YELLOW}⚠ No package-lock.json found (already using pnpm?)${NC}"
fi
echo ""

# Remove node_modules
echo -e "${YELLOW}Step 2: Removing node_modules...${NC}"
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo -e "${GREEN}✓ node_modules removed${NC}"
else
    echo -e "${YELLOW}⚠ node_modules directory not found${NC}"
fi
echo ""

# Remove package-lock.json
echo -e "${YELLOW}Step 3: Removing package-lock.json...${NC}"
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo -e "${GREEN}✓ package-lock.json removed${NC}"
else
    echo -e "${YELLOW}⚠ package-lock.json not found${NC}"
fi
echo ""

# Install dependencies with pnpm
echo -e "${YELLOW}Step 4: Installing dependencies with pnpm...${NC}"
pnpm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Verify build works
echo -e "${YELLOW}Step 5: Verifying production build...${NC}"
pnpm run build:prod
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production build successful${NC}"
else
    echo -e "${RED}✗ Production build failed${NC}"
    echo "Restoring backup and reverting..."

    # Restore backup
    if [ -f "package-lock.json.backup" ]; then
        mv package-lock.json.backup package-lock.json
        rm -rf node_modules pnpm-lock.yaml
        npm install
    fi

    exit 1
fi
echo ""

# Run tests
echo -e "${YELLOW}Step 6: Running tests...${NC}"
pnpm test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    echo "Please review test failures before continuing"
    exit 1
fi
echo ""

# Success message
echo "=========================================="
echo -e "${GREEN}Migration to pnpm completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review pnpm-lock.yaml and commit to git"
echo "2. Update CI/CD to use pnpm (CircleCI config)"
echo "3. Update documentation to use pnpm commands"
echo "4. Delete package-lock.json.backup if everything works"
echo ""
echo "To revert to npm if needed:"
echo "1. Restore package-lock.json.backup"
echo "2. Remove pnpm-lock.yaml and node_modules"
echo "3. Run npm install"
echo ""

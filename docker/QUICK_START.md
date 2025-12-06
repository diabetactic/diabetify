# Docker Quick Start Guide

Get Diabetactic running in Docker in 3 steps.

## Prerequisites

- Docker installed ([get Docker](https://docs.docker.com/get-docker/))
- 2GB free disk space
- Internet connection (first build only)

## Quick Commands

### 1. Build the Image (one time)

```bash
# Using helper script (recommended)
./docker/docker-helper.sh build

# Or using docker directly
docker build -f docker/Dockerfile.dev -t diabetactic:dev .
```

Build time: ~5 minutes (first time), ~30 seconds (subsequent builds with cache)

### 2. Run Tests

```bash
# Unit tests (1012 tests in ~30 seconds)
./docker/docker-helper.sh test

# E2E tests (Playwright)
./docker/docker-helper.sh e2e

# All quality checks (lint + tests)
./docker/docker-helper.sh quality
```

### 3. Start Development

```bash
# Dev server at http://localhost:4200
./docker/docker-helper.sh dev

# Or with docker-compose
docker-compose up dev
```

## Common Workflows

### Testing Workflow

```bash
# 1. Build image
./docker/docker-helper.sh build

# 2. Run unit tests with coverage
./docker/docker-helper.sh coverage

# 3. Run E2E tests
./docker/docker-helper.sh e2e

# 4. View reports
open coverage/lcov-report/index.html
open playwright-report/index.html
```

### Development Workflow

```bash
# Start dev server with live reload
docker-compose up dev

# In another terminal, run tests in watch mode
docker-compose up test-watch

# Access app at http://localhost:4200
```

### CI/CD Simulation

```bash
# Run entire CI pipeline locally
docker-compose up ci

# Or step by step
./docker/docker-helper.sh lint
./docker/docker-helper.sh test
./docker/docker-helper.sh e2e
./docker/docker-helper.sh prod
```

## Troubleshooting

### Build fails with "no space left on device"

```bash
# Clean up Docker resources
docker system prune -a
./docker/docker-helper.sh clean
```

### Tests fail but work locally

```bash
# Check Node.js version
docker run --rm diabetactic:dev node --version
# Should be: v20.x.x

# Check Playwright browsers
docker run --rm diabetactic:dev npx playwright --version
# Should be: v1.48.0
```

### Dev server not accessible

```bash
# Ensure port is free
lsof -i :4200

# Try explicit port mapping
docker run --rm -p 4200:4200 diabetactic:dev npm start
```

### Build is slow

```bash
# Enable BuildKit (faster builds)
export DOCKER_BUILDKIT=1
docker build -f docker/Dockerfile.dev -t diabetactic:dev .

# Or use docker-compose (BuildKit enabled by default)
docker-compose build
```

## File Structure

```
docker/
├── Dockerfile.dev          # Main Dockerfile
├── .dockerignore           # Build context exclusions
├── docker-helper.sh        # Helper script (./docker/docker-helper.sh [command])
├── README.md               # Detailed documentation
├── QUICK_START.md          # This file
└── github-actions-example.yml  # CI/CD workflow example

docker-compose.yml          # Multi-service orchestration
```

## Next Steps

1. **Customize backend mode**:

   ```bash
   docker run --rm -p 4200:4200 -e ENV=cloud diabetactic:dev npm start
   ```

2. **Add to CI/CD**:
   - Copy `docker/github-actions-example.yml` to `.github/workflows/docker-ci.yml`
   - Or integrate with CircleCI (see `docker/README.md`)

3. **Deploy to production**:

   ```bash
   # Build production bundle
   ./docker/docker-helper.sh prod

   # Deploy www/ directory to Netlify/Vercel/etc
   ```

## Help

```bash
# Show all commands
./docker/docker-helper.sh help

# Interactive shell
./docker/docker-helper.sh shell

# Run custom command
docker run --rm diabetactic:dev [your-command]
```

## Resources

- Full documentation: `docker/README.md`
- Dockerfile: `docker/Dockerfile.dev`
- Project docs: `CLAUDE.md`
- GitHub Actions example: `docker/github-actions-example.yml`

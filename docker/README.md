# Docker E2E Testing Infrastructure

This directory contains Docker infrastructure for running Playwright E2E tests in isolated containers.

## Files

- **Dockerfile.e2e** - Multi-stage Docker image for building the app and running Playwright tests
- **docker-compose.e2e.yml** - Orchestrates app server (nginx) and Playwright test runner
- **nginx.conf** - Nginx configuration optimized for Angular SPA with proper routing
- **.dockerignore** - Excludes unnecessary files from Docker build context

## Quick Start

```bash
# Run E2E tests in Docker (recommended)
npm run test:e2e:docker

# Or use the shell script directly
./scripts/run-e2e-docker.sh

# Force rebuild of Docker images
./scripts/run-e2e-docker.sh --build

# Keep containers running for debugging
./scripts/run-e2e-docker.sh --keep-running
```

## Architecture

### Services

1. **app** (nginx:1.25-alpine)
   - Serves the built Angular application
   - Port: 4200 (mapped from nginx port 80)
   - Handles Angular routing with try_files
   - Gzip compression enabled
   - Health check configured

2. **playwright** (mcr.microsoft.com/playwright:v1.48.0-jammy)
   - Runs Playwright E2E tests
   - Waits for app service to be healthy before starting
   - Outputs test reports and artifacts to mounted volumes
   - Automatically exits after tests complete

### Network

- All services connected via diabetactic-e2e bridge network
- Playwright service accesses app via http://app:80
- No external network dependencies during tests

## Test Reports

After tests run, reports are available locally:

- **HTML Report**: playwright-report/index.html
- **JSON Results**: playwright-report/results.json
- **Screenshots**: playwright/artifacts/ (on failure)
- **Videos**: playwright/artifacts/ (on failure)

## CI/CD Integration

See README.md for CircleCI and GitHub Actions examples.

## Troubleshooting

### Build Failures

docker system prune -a
./scripts/run-e2e-docker.sh --build --clean

### View Logs

docker-compose -f docker/docker-compose.e2e.yml logs app
docker-compose -f docker/docker-compose.e2e.yml logs playwright

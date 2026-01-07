# Docker E2E Testing Setup - Complete Guide

## Overview

This Docker infrastructure enables running Playwright E2E tests in isolated, reproducible containers. Perfect for CI/CD pipelines and local testing without environment setup hassles.

## What Was Created

### Core Files

1. **docker/Dockerfile.e2e-runner** (default)
   - Playwright test runner only (no Angular build)
   - Based on `mcr.microsoft.com/playwright:v1.57.0-jammy`
   - Installs repo deps via `pnpm install` (no scripts) with cache mounts

2. **docker/Dockerfile.e2e** (legacy/optional)
   - Multi-stage build: Angular app builder + Playwright test runner
   - Useful for experimentation; the default flow serves `www/browser` from the host via nginx

3. **docker/docker-compose.e2e.yml**
   - Orchestrates two services: `app` (nginx) and `playwright`
   - Configures networking, health checks, and volume mounts
   - Enables isolated test execution

4. **docker/nginx.conf**
   - Production-ready nginx config for Angular SPA
   - Handles client-side routing (try_files to index.html)
   - Gzip compression, security headers, proper caching

5. **docker/.dockerignore**
   - Optimizes build context by excluding unnecessary files
   - Reduces build time and image size

6. **scripts/run-e2e-docker.sh**
   - Executable shell script for running tests
   - Handles build, test execution, cleanup, and reporting
   - Multiple options for flexibility

7. **docker/README.md**
   - Quick reference guide
   - Troubleshooting tips
   - CI/CD integration examples

## Quick Start

### Option 1: pnpm script (Recommended)

```bash
# Run tests with existing images
pnpm -s run test:e2e:docker

# Force rebuild and run
pnpm -s run test:e2e:docker:build
```

### Option 2: Shell script

```bash
# Standard run
./scripts/run-e2e-docker.sh

# With rebuild
./scripts/run-e2e-docker.sh --build

# Keep containers for debugging
./scripts/run-e2e-docker.sh --keep-running

# Show all options
./scripts/run-e2e-docker.sh --help
```

### Option 3: Direct docker-compose

```bash
# Build and run
docker-compose -f docker/docker-compose.e2e.yml up --build --abort-on-container-exit

# Cleanup
docker-compose -f docker/docker-compose.e2e.yml down -v
```

## How It Works

### Build Process

1. **Angular Build** (Stage 1)

   ```
   node:22-alpine → pnpm install → pnpm run build:mock → www/
   ```

2. **Playwright Setup** (Stage 2)
   ```
   playwright:v1.57.0 → pnpm install → copy www/ → pnpm exec serve
   ```

### Test Execution Flow

1. **Start nginx** serving the built Angular app on port 4200
2. **Health check** ensures app is ready (5s interval, 5 retries)
3. **Start Playwright** container, connected to app via network
4. **Run tests** against http://app:80
5. **Generate reports** (HTML + JSON) via mounted volumes
6. **Exit** with test status code
7. **Cleanup** containers (optional: keep running for debug)

### Network Architecture

```
┌─────────────────────────────────────────┐
│  Docker Network: diabetactic-e2e        │
│  ┌───────────┐        ┌──────────────┐  │
│  │   nginx   │◄───────┤  playwright  │  │
│  │  (app:80) │        │   (tests)    │  │
│  └─────┬─────┘        └──────────────┘  │
│        │                                 │
└────────┼─────────────────────────────────┘
         │
    localhost:4200
```

## Features

### Isolation

- No dependency on local Angular dev server
- No port conflicts with other services
- Fresh environment every run

### Portability

- Works on any system with Docker installed
- Same results locally and in CI/CD
- No Node.js version conflicts

### Observability

- HTML test reports with screenshots
- JSON results for programmatic analysis
- Video recording on failure (configurable)
- Health checks for service readiness

### Flexibility

- Run all tests or specific suites
- Debug mode with kept containers
- Headed mode support (requires X11)
- Custom environment variables

## CI/CD Integration

### CircleCI

Add to `.circleci/config.yml`:

```yaml
jobs:
  e2e-docker:
    docker:
      - image: cimg/base:2024.01
    steps:
      - checkout
      - setup_remote_docker:
          version: 20.10.24
      - run:
          name: Run E2E Tests in Docker
          command: ./scripts/run-e2e-docker.sh --build --clean
      - store_test_results:
          path: playwright-report
      - store_artifacts:
          path: playwright-report
          destination: test-reports
      - store_artifacts:
          path: playwright/artifacts
          destination: test-artifacts
```

### GitHub Actions

Add to `.github/workflows/e2e.yml`:

```yaml
jobs:
  e2e-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E Tests
        run: ./scripts/run-e2e-docker.sh --build --clean
      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
      - name: Upload Artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-artifacts
          path: playwright/artifacts/
```

## Viewing Results

### HTML Report

```bash
# After tests run
open playwright-report/index.html

# Or use Playwright's viewer
npx playwright show-report
```

### JSON Results

```bash
# Parse test results programmatically
cat playwright-report/results.json | jq '.suites[].specs[].tests[].results[] | select(.status == "failed")'
```

### Artifacts

```bash
# Screenshots and videos on failure
ls -lh playwright/artifacts/
```

## Debugging

### Keep Containers Running

```bash
./scripts/run-e2e-docker.sh --keep-running

# In another terminal
docker-compose -f docker/docker-compose.e2e.yml logs -f app
docker-compose -f docker/docker-compose.e2e.yml logs -f playwright

# Access app in browser
open http://localhost:4200

# Run specific test interactively
docker-compose -f docker/docker-compose.e2e.yml exec playwright \
  npx playwright test accessibility-audit.spec.ts

# Cleanup when done
docker-compose -f docker/docker-compose.e2e.yml down
```

### Shell Access

```bash
# Access nginx container
docker-compose -f docker/docker-compose.e2e.yml exec app sh

# Access playwright container
docker-compose -f docker/docker-compose.e2e.yml exec playwright bash
```

### Rebuild from Scratch

```bash
# Clean all Docker resources
docker system prune -a

# Rebuild
./scripts/run-e2e-docker.sh --build --clean
```

## Performance

### Build Time

- Initial build: ~3-5 minutes (downloads base images)
- Incremental build: ~30-60 seconds (cached layers)
- Full rebuild: ~2-3 minutes (with `--no-cache`)

### Resource Usage

- Disk: ~2GB for images
- Memory: ~2GB during test execution
- CPU: Scales with Playwright workers (4 in CI, 6 locally)

### Optimization Tips

1. Use `.dockerignore` to reduce context size
2. Layer caching: don't modify package.json unnecessarily
3. Multi-stage builds: only final artifacts in test image
4. Clean up volumes: `docker-compose down -v`

## Troubleshooting

### Problem: Build fails with "Cannot find module"

**Solution**: Ensure `package.json` is in project root and `pnpm install` ran successfully.

### Problem: App doesn't load (404 on all routes)

**Solution**: Check that `www/` directory exists and contains `index.html`. Rebuild: `pnpm run build:mock`

### Problem: Tests timeout waiting for app

**Solution**: Increase health check timeout in `docker-compose.e2e.yml` or check nginx logs for errors.

### Problem: "Address already in use" on port 4200

**Solution**: Stop other services on port 4200 or change the port mapping in docker-compose.

### Problem: Playwright browsers not found

**Solution**: Ensure using official Playwright image with pre-installed browsers. Check `PLAYWRIGHT_BROWSERS_PATH` env var.

## Best Practices

1. **Run locally before CI** - Catch issues early
2. **Use mock backend** - Keep tests fast and deterministic
3. **Clean up regularly** - Docker volumes can consume disk space
4. **Version pin images** - Avoid surprises from upstream changes
5. **Monitor resources** - Docker can consume significant CPU/memory
6. **Parallelize wisely** - More workers = faster tests but more resource usage
7. **Fail fast** - Use `--abort-on-container-exit` to stop immediately on failure

## Migration from Local E2E

### Before (local dev server)

```bash
pnpm start &             # Start dev server
pnpm run test:e2e        # Run tests
pkill -f "ng serve"      # Manual cleanup
```

### After (Docker)

```bash
pnpm -s run test:e2e:docker # Build, test, cleanup - all automated
```

### Benefits

- No leftover node processes
- Consistent environment
- Works without local Node.js installation
- Same command in CI and locally

## Advanced Usage

### Custom Environment Variables

Edit `docker-compose.e2e.yml`:

```yaml
environment:
  - E2E_BASE_URL=http://app:80
  - CUSTOM_VAR=value
```

### Run Specific Tests

```bash
docker-compose -f docker/docker-compose.e2e.yml run --rm playwright \
  npx playwright test heroku-integration.spec.ts
```

### Headed Mode (requires X11)

```bash
docker-compose -f docker/docker-compose.e2e.yml run --rm \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  playwright npx playwright test --headed
```

### Debug Mode

```bash
docker-compose -f docker/docker-compose.e2e.yml run --rm \
  playwright npx playwright test --debug
```

## Maintenance

### Update Playwright Version

1. Update in `package.json`: `"@playwright/test": "^1.XX.0"`
2. Update in `Dockerfile.e2e`: `FROM mcr.microsoft.com/playwright:v1.XX.0-jammy`
3. Rebuild: `./scripts/run-e2e-docker.sh --build`

### Update Node.js Version

1. Update in `Dockerfile.e2e` builder stage: `FROM node:XX-alpine`
2. Update in Dockerfile.e2e test stage: `setup_XX.x`
3. Rebuild: `./scripts/run-e2e-docker.sh --build`

### Update nginx Version

1. Update in `docker-compose.e2e.yml`: `image: nginx:X.XX-alpine`
2. Restart: `docker-compose -f docker/docker-compose.e2e.yml up -d app`

## Support

- **Documentation**: See `docker/README.md` for quick reference
- **Issues**: Check logs with `docker-compose logs`
- **Playwright Docs**: https://playwright.dev/docs/docker
- **Nginx Docs**: https://nginx.org/en/docs/

---

**Created**: 2025-12-06  
**Version**: 1.0.0  
**Playwright**: 1.48.0  
**Node.js**: 20  
**nginx**: 1.25

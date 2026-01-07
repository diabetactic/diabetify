# Docker E2E Infrastructure - Verification Checklist

## Pre-flight Checks

Before running Docker E2E tests, verify:

- [ ] Docker is installed: `docker --version`
- [ ] Docker Compose is installed: `docker-compose --version`
- [ ] Docker daemon is running: `docker info`
- [ ] Angular app can build: `pnpm run build:mock`
- [ ] Sufficient disk space: `df -h` (need ~5GB)
- [ ] Sufficient memory: `free -h` (recommend 4GB free)

## File Verification

Verify all required files exist:

```bash
# Core Docker files
ls -lh docker/Dockerfile.e2e-runner
ls -lh docker/Dockerfile.e2e
ls -lh docker/docker-compose.e2e.yml
ls -lh docker/nginx.conf
ls -lh docker/.dockerignore

# Scripts
ls -lh scripts/run-e2e-docker.sh

# Check script is executable
test -x scripts/run-e2e-docker.sh && echo "✓ Executable" || echo "✗ Not executable"

# Documentation
ls -lh docker/README.md
ls -lh docker/DOCKER_E2E_SETUP.md
```

## Build Verification

Test the Docker build process:

```bash
# 1. Build Angular app
pnpm run build:mock

# Verify www directory was created
ls -lh www/index.html

# 2. Build Docker images
docker-compose -f docker/docker-compose.e2e.yml build

# Verify images were created
docker images | grep -E "diabetactic|playwright|nginx"

# Expected output:
# - One image based on nginx:1.25-alpine (~40MB)
# - One image based on mcr.microsoft.com/playwright (~1.5GB)
```

## Service Verification

Test individual services:

```bash
# 1. Start nginx service only
docker-compose -f docker/docker-compose.e2e.yml up -d app

# 2. Wait for health check
sleep 10

# 3. Verify app is accessible
curl -I http://localhost:4200
# Expected: HTTP/1.1 200 OK

# 4. Check nginx logs
docker-compose -f docker/docker-compose.e2e.yml logs app

# 5. Stop service
docker-compose -f docker/docker-compose.e2e.yml down
```

## End-to-End Test

Run a complete test cycle:

```bash
# Run E2E tests
./scripts/run-e2e-docker.sh --build

# Verify artifacts were created
ls -lh playwright-report/index.html
ls -lh playwright-report/results.json

# Open HTML report
open playwright-report/index.html
# OR
npx playwright show-report
```

## Common Issues and Fixes

### Issue: "Docker daemon not running"

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

### Issue: "Address already in use" (port 4200)

```bash
# Find process using port 4200
lsof -i :4200

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.e2e.yml
```

### Issue: "Cannot connect to Docker daemon"

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# macOS - restart Docker Desktop
```

### Issue: "No space left on device"

```bash
# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

### Issue: "Build fails with EACCES"

```bash
# Fix permissions on docker directory
sudo chown -R $USER:$USER docker/

# Fix script permissions
chmod +x scripts/run-e2e-docker.sh
```

### Issue: "Tests timeout waiting for app"

```bash
# Check if www directory has content
ls -lh www/

# Rebuild Angular app
pnpm run build:mock

# Check nginx logs
docker-compose -f docker/docker-compose.e2e.yml logs app
```

## Performance Verification

Measure build and test times:

```bash
# Time the complete process
time ./scripts/run-e2e-docker.sh --build

# Expected times:
# - First build: 3-5 minutes
# - Incremental build: 30-60 seconds
# - Test execution: 1-3 minutes (depends on test suite)
```

## CI/CD Verification

Test CI/CD integration locally:

```bash
# Simulate CI environment
export CI=true

# Run with CI flags
./scripts/run-e2e-docker.sh --build --clean

# Verify exit codes
echo $?
# Expected: 0 (success) or non-zero (failure)
```

## Report Verification

Check test reports are generated correctly:

```bash
# HTML report
test -f playwright-report/index.html && echo "✓ HTML report" || echo "✗ Missing"

# JSON results
test -f playwright-report/results.json && echo "✓ JSON results" || echo "✗ Missing"

# Parse JSON for test counts
cat playwright-report/results.json | jq '{
  total: .suites | map(.specs | length) | add,
  passed: .suites | map(.specs[].tests[].results[] | select(.status == "passed")) | length,
  failed: .suites | map(.specs[].tests[].results[] | select(.status == "failed")) | length
}'
```

## Network Verification

Verify Docker network setup:

```bash
# Start services
docker-compose -f docker/docker-compose.e2e.yml up -d

# Check network exists
docker network ls | grep diabetactic-e2e

# Inspect network
docker network inspect diabetactic-e2e

# Verify both containers are connected
docker network inspect diabetactic-e2e | jq '.[0].Containers | length'
# Expected: 2 (app + playwright)

# Cleanup
docker-compose -f docker/docker-compose.e2e.yml down
```

## Volume Verification

Verify volume mounts work correctly:

```bash
# Run tests
./scripts/run-e2e-docker.sh

# Check if artifacts are accessible on host
ls -lh playwright/artifacts/
ls -lh playwright-report/

# Verify ownership
ls -la playwright/artifacts/ | grep -v '^total'
# Should be owned by your user, not root
```

## Success Criteria

All checks should pass:

- [x] Docker and Docker Compose installed and running
- [x] All files created and in correct locations
- [x] Angular app builds successfully
- [x] Docker images build without errors
- [x] Nginx serves app correctly on port 4200
- [x] Playwright container connects to app
- [x] Tests execute and generate reports
- [x] HTML and JSON reports are created
- [x] Artifacts are accessible on host machine
- [x] Script exits with correct status code
- [x] Cleanup removes containers properly

## Next Steps

Once verification is complete:

1. Add Docker E2E job to CircleCI config
2. Update project documentation
3. Train team on new Docker workflow
4. Monitor CI/CD pipeline performance
5. Optimize based on feedback

## Rollback Plan

If Docker E2E tests cause issues:

1. Revert to standard E2E: `pnpm run test:e2e`
2. Remove Docker files: `rm -rf docker/ scripts/run-e2e-docker.sh`
3. Remove npm scripts from package.json
4. Document issues for future reference

---

**Last Updated**: 2025-12-06  
**Version**: 1.0.0

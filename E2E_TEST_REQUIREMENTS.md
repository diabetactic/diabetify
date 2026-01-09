# E2E Test Requirements

## Overview

Several E2E tests in this project require a running Docker backend to execute successfully. These tests interact with real backend services to verify end-to-end functionality.

## Tests Requiring Docker Backend

### 1. Reading Edit Functionality

**File**: `playwright/tests/readings-trends-comprehensive.spec.ts` (line 211)
**Test**: `should edit reading successfully`
**Tag**: `@docker`

**What it tests**:

- Swipe-to-edit gesture reveals edit option
- Edit modal opens with pre-populated data
- Form validation and glucose status calculation
- Save updates the reading in backend
- Updated value displays in list

**Why it needs Docker**:

- Creates test reading via backend API
- Authenticates user against backend
- Verifies reading update persists in backend database
- Cleans up test data after execution

### 2. Appointment Temporal Business Rules

**File**: `playwright/tests/appointment-temporal-rules.spec.ts`
**Tests**: 3 tests covering state machine behavior
**Tag**: `@appointment-temporal`

**What it tests**:

- CREATED state blocks new appointment requests
- DENIED state allows re-requests
- Queue clearing behavior (daily reset)

**Why it needs Docker**:

- Tests state machine transitions in real backend
- Verifies queue management logic
- Tests daily reset functionality

### 3. Other Docker Tests

All tests tagged with `@docker` require the backend. Run:

```bash
E2E_DOCKER_TESTS=true pnpm run test:e2e -- --grep "@docker"
```

## How to Run Docker Backend

### Prerequisites

- Docker installed and running
- Docker Compose available

### Starting the Backend

```bash
cd docker
./start.sh
```

This will start:

- `api_gateway` service (port 8000)
- `glucoserver` service (port 8001)
- PostgreSQL database
- All dependent services

### Verifying Backend Health

```bash
# Check services are running
docker ps

# Check API health
curl http://localhost:8000/health

# Check logs
cd docker
./logs.sh
```

### Running E2E Tests with Docker

Once backend is running:

```bash
# All Docker tests
E2E_DOCKER_TESTS=true pnpm run test:e2e -- --grep "@docker"

# Specific test file
E2E_DOCKER_TESTS=true pnpm run test:e2e readings-trends-comprehensive.spec.ts

# Specific test pattern
E2E_DOCKER_TESTS=true pnpm run test:e2e -- --grep "should edit reading successfully"
```

### Stopping the Backend

```bash
cd docker
./stop.sh
```

## Test Isolation

Docker E2E tests are designed for isolation:

- Each test creates its own test data
- Test data is cleaned up in `afterEach` hooks
- Tests use unique identifiers (e.g., `__E2E_EDIT_TEST__`)
- Database seeding is managed by `DatabaseSeeder` utility

## Common Issues

### 1. `ECONNREFUSED` Error

**Symptom**: Tests fail with connection refused to localhost:8000 or 8001
**Cause**: Backend services not running
**Solution**: Start Docker backend with `cd docker && ./start.sh`

### 2. Test Timeout

**Symptom**: Tests timeout waiting for backend response
**Cause**: Backend services starting up slowly or not healthy
**Solution**:

- Check backend health endpoints
- Review logs: `cd docker && ./logs.sh`
- Increase test timeout if services are slow

### 3. Authentication Failures

**Symptom**: Tests fail with 401/403 errors
**Cause**: Test user not seeded in database
**Solution**: Re-seed database with `cd docker && ./seed-test-data.sh`

## Alternative: Mock Backend Tests

Most E2E tests run against a **mock backend** and don't require Docker:

```bash
# Run mock backend tests (default)
pnpm run test:e2e
```

Mock backend tests are faster and don't require external services, but they don't verify real backend integration.

## CI/CD Integration

In CI environments, Docker tests are typically:

1. Run in dedicated job with Docker Compose
2. Use `docker-compose.ci.yml` configuration
3. Seed test data before running tests
4. Clean up containers after completion

See `.github/workflows/ci.yml` for CI configuration examples.

## Test Coverage Status

As of commit `b2d7a66`:

- ✅ **Unit tests**: 2202 passing (no Docker required)
- ✅ **Integration tests**: 39 passing (mock backend)
- ⚠️ **E2E tests**: 275+ tests (subset requires Docker)
- 📝 **Reading edit test**: Ready, needs Docker to run
- 📝 **Appointment temporal tests**: Ready, needs Docker to run

## Next Steps

1. Start Docker backend: `cd docker && ./start.sh`
2. Run reading edit test to verify implementation
3. Run appointment temporal tests to verify state machine
4. All other tests pass without Docker requirement

# Backend Testing Guide - Maestro Test Variants

This document describes how to run Maestro tests against different backend configurations (Mock Adapter vs Heroku API Gateway).

## Overview

Diabetactic supports three backend modes, with Maestro tests configured for two main variants:

| Mode | Backend | Use Case | Speed | Environment |
|------|---------|----------|-------|-------------|
| **Mock** | Mock Adapter (in-memory) | Development, fast CI/CD, offline | Instant | `env-mock.yaml` |
| **Heroku** | Heroku API Gateway | Integration, production validation | 1-3s | `env-heroku.yaml` |

## Test Variants

Tests are duplicated with `.mock.yaml` and `.heroku.yaml` suffixes for parallel testing.

### Critical Tests (Duplicated)

These tests verify core functionality and run against both backends:

#### Authentication
- **Login Flow**
  - Mock: `maestro/tests/auth/01-login-flow.mock.yaml`
  - Heroku: `maestro/tests/auth/01-login-flow.heroku.yaml`
  - Tags: `auth`, `smoke`, `critical`
  - Verifies: User authentication and dashboard access

#### Readings Management
- **Add Glucose Reading**
  - Mock: `maestro/tests/readings/02-add-reading.mock.yaml`
  - Heroku: `maestro/tests/readings/02-add-reading.heroku.yaml`
  - Tags: `readings`, `smoke`
  - Verifies: Reading creation and display

#### Integration Workflows
- **Complete User Workflow**
  - Mock: `maestro/tests/integration/01-complete-workflow.mock.yaml`
  - Heroku: `maestro/tests/integration/01-complete-workflow.heroku.yaml`
  - Tags: `integration`, `critical`
  - Verifies: Full user journey (login → readings → appointments → profile)

### UI-Only Tests (Not Duplicated)

These tests verify UI behavior and don't depend on backend data:

- Theme toggle: `03-theme-toggle.yaml`
- Language switch: `04-language-switch.yaml`
- Navigation: `02-dashboard-navigation.yaml`
- Profile settings: `profile/04-settings-persist.yaml`

## Environment Configuration

### Mock Adapter Configuration

**File**: `maestro/config/env-mock.yaml`

```yaml
ENV_MODE: mock
BACKEND_URL: mock
USE_MOCK_ADAPTER: "true"
USE_HEROKU_API: "false"

# Mock uses hardcoded test data
TEST_USER_EMAIL: "demo@example.com"
TEST_USER_PASSWORD: "demo123"
TEST_USER_DNI: "1000"
TEST_USER_PASS: "tuvieja"

MOCK_GLUCOSE_VALUE: "120"
MOCK_APPOINTMENTS_COUNT: "5"
```

**Characteristics**:
- Instant response (no network latency)
- Fixed test data (always the same results)
- No external dependencies
- Perfect for development and fast CI/CD

### Heroku API Configuration

**File**: `maestro/config/env-heroku.yaml`

```yaml
ENV_MODE: cloud
BACKEND_URL: https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
USE_MOCK_ADAPTER: "false"
USE_HEROKU_API: "true"

# Test credentials for Heroku
TEST_USER_EMAIL: "test@example.com"
TEST_USER_PASSWORD: "Test123!"
TEST_USER_DNI: "1000"
TEST_USER_PASS: "tuvieja"

API_GATEWAY_TIMEOUT: "30000"  # 30 seconds
MAX_RETRIES: "3"
RETRY_DELAY: "1000"  # 1 second
```

**Characteristics**:
- Live API responses (1-3s latency)
- Real data persistence
- Network-dependent (requires internet)
- Perfect for production validation

## Running Tests

### Run All Tests (Default)

```bash
# Runs all tests without tag filtering
maestro test maestro/tests/

# Or specific directory
maestro test maestro/tests/auth/
```

### Run Only Mock Tests

```bash
# Fast tests using mock adapter
maestro test --tags mock maestro/tests/

# Or specific test file
maestro test maestro/tests/auth/01-login-flow.mock.yaml
```

### Run Only Heroku Tests

```bash
# Integration tests against live API
maestro test --tags heroku maestro/tests/

# Or specific test
maestro test maestro/tests/auth/01-login-flow.heroku.yaml
```

### Run Smoke Tests (Critical Path)

```bash
# Quick validation of critical features
maestro test --tags smoke maestro/tests/

# Includes: mock and heroku variants of login, readings, etc.
```

### Run Integration Tests

```bash
# Full end-to-end workflows
maestro test --tags integration maestro/tests/

# Includes: complete-workflow tests against both backends
```

### Run UI-Only Tests (No Backend)

```bash
# Tests that don't depend on backend
maestro test maestro/tests/03-theme-toggle.yaml
maestro test maestro/tests/04-language-switch.yaml
maestro test maestro/tests/02-dashboard-navigation.yaml
```

### Run with Specific Device

```bash
# Target emulator or physical device
maestro test --device emulator-5554 --tags mock maestro/tests/auth/

# List available devices
maestro devices
```

### Run with Custom Environment

```bash
# Override configuration at runtime
maestro test \
  --env ENV_MODE=mock \
  --env BACKEND_URL=mock \
  maestro/tests/auth/01-login-flow.mock.yaml
```

## CI/CD Integration

### Fast Track (Mock Tests)

For pull request validation, run quick mock tests:

```bash
#!/bin/bash
# ci/test-pr.sh - Fast PR validation
maestro test --tags mock maestro/tests/
```

**Duration**: ~2-3 minutes total
**Coverage**: Authentication, readings, workflows
**Reliability**: 99% (no network dependencies)

### Integration Track (Heroku Tests)

For release validation, run full integration tests:

```bash
#!/bin/bash
# ci/test-release.sh - Full integration testing
maestro test --tags heroku maestro/tests/

# Wait for Heroku to be ready
sleep 5

maestro test --tags integration maestro/tests/
```

**Duration**: ~5-10 minutes total
**Coverage**: Real backend integration
**Reliability**: Depends on Heroku uptime

### Combined Matrix

For comprehensive coverage:

```bash
#!/bin/bash
# ci/test-all.sh - Full test matrix
echo "Step 1: Quick validation (mock)"
maestro test --tags mock maestro/tests/auth/ || exit 1

echo "Step 2: UI tests (no backend)"
maestro test maestro/tests/03-theme-toggle.yaml || exit 1
maestro test maestro/tests/04-language-switch.yaml || exit 1

echo "Step 3: Full integration (heroku)"
maestro test --tags heroku maestro/tests/ || exit 1

echo "All tests passed!"
```

## Test Tag Reference

| Tag | Purpose | Backend | Speed |
|-----|---------|---------|-------|
| `mock` | Tests using mock adapter | In-memory | Instant |
| `heroku` | Tests against Heroku API | Cloud | 1-3s |
| `smoke` | Critical path validation | Both | Variable |
| `auth` | Authentication tests | Both | Variable |
| `readings` | Glucose reading tests | Both | Variable |
| `appointments` | Appointment tests | Both | Variable |
| `integration` | End-to-end workflows | Both | Variable |
| `ui` | UI-only tests | None | Instant |

## Environment Variables

Tests can be parameterized with environment variables:

```bash
# Pass environment variables to tests
maestro test \
  --env TEST_USER_EMAIL="custom@example.com" \
  --env TEST_USER_PASSWORD="CustomPassword123" \
  maestro/tests/auth/01-login-flow.mock.yaml
```

### Common Overrides

```bash
# Test with different credentials
--env TEST_USER_EMAIL="user@company.com"
--env TEST_USER_PASSWORD="CustomPass123"

# Change timeout (milliseconds)
--env API_GATEWAY_TIMEOUT="60000"

# Enable detailed logging
--env DEBUG="true"
--env VERBOSE_LOGS="true"

# Mock-specific
--env MOCK_DELAY="500"  # Simulate 500ms network delay

# Heroku-specific
--env HEROKU_GATEWAY_URL="https://custom-gateway.herokuapp.com"
--env MAX_RETRIES="5"
```

## Troubleshooting

### Mock Tests Failing

**Issue**: "Backend URL is not mock"

**Solution**: Ensure `src/environments/environment.ts` has `DEV_BACKEND_MODE: 'mock'`

```typescript
const DEV_BACKEND_MODE: BackendMode = 'mock';
```

**Check**:
```bash
# Verify app is using mock adapter
npm start
# Open DevTools console
# Check: `environment.backendMode` should be 'mock'
```

### Heroku Tests Failing

**Issue**: "401 Unauthorized" or "403 Forbidden"

**Solution**: Verify test credentials are valid in Heroku backend

```bash
# Test credentials directly
curl -X POST https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Issue**: "Network timeout"

**Solution**: Heroku may be sleeping. Wake it up:

```bash
# Heroku apps sleep after 30 min inactivity
# Force wake by making a request
curl https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health
sleep 3
# Then run tests
maestro test --tags heroku maestro/tests/
```

### Screenshot Comparison Issues

**Issue**: Screenshots look different between mock and heroku variants

**Expected**: Minor differences in timing/animations are normal

**Mock screenshots**: Show instant UI updates
**Heroku screenshots**: Show UI after API response (may include loading states)

**Solution**: Compare functionality, not visual timing

### Android Device Issues

**Issue**: "adb: command not found"

**Solution**: Ensure Android SDK is installed

```bash
# Check ADB
adb devices

# If not found, install
brew install android-platform-tools

# Add to PATH
export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools"
```

## Best Practices

### 1. Run Mock Tests First

Always validate with mock tests before running Heroku tests:

```bash
# Development workflow
maestro test --tags mock maestro/tests/
# If passing, proceed to integration tests
maestro test --tags heroku maestro/tests/
```

### 2. Bilingual Assertions

All selectors support both English and Spanish:

```yaml
# Both variants work in mock and heroku
- assertVisible: "Inicio|Home|Panel de Control|Dashboard"
- tapOn: "Citas|Appointments"
```

### 3. Wait for Animations

Always wait between actions to account for latency:

```yaml
# Mock: 1-2 seconds
# Heroku: 2-3 seconds

- tapOn: "Lecturas|Readings"
- waitForAnimationToEnd:
    timeout: 2000
```

### 4. Screenshot Organization

Screenshots are organized by backend:

```
maestro/screenshots/
├── mock-auth-01-initial-state.png
├── mock-auth-02-login-page.png
├── heroku-auth-01-initial-state.png
├── heroku-auth-02-login-page.png
└── ...
```

### 5. Parallel Execution

Run multiple tests in parallel for faster feedback:

```bash
# Run all mock tests in parallel
maestro test --tags mock --parallel maestro/tests/
```

## Adding New Tests

When adding a new test that depends on backend data:

1. Create base test (e.g., `03-reading-details.yaml`)
2. Create mock variant: `03-reading-details.mock.yaml`
3. Create heroku variant: `03-reading-details.heroku.yaml`
4. Add appropriate tags (mock/heroku, category, smoke/integration)

**Example**:

```yaml
# maestro/tests/readings/03-reading-details.mock.yaml
appId: io.diabetify.app
tags:
  - mock
  - readings
---
# Test: View reading details (Mock)
# Backend: Mock adapter (instant response)

- launchApp
- runFlow:
    when:
      visible: "Iniciar Sesión"
    file: ../../flows/auth-login.yaml

- tapOn: "Lecturas|Readings"
- waitForAnimationToEnd:
    timeout: 1000

# Mock shows predefined reading
- assertVisible: "120"
- assertVisible: "mg/dL"
```

## Performance Targets

### Mock Tests
- Login: <1 second
- Add Reading: <500ms
- Complete Workflow: <5 seconds
- Suite (all mock): ~2-3 minutes

### Heroku Tests
- Login: 2-3 seconds
- Add Reading: 1-2 seconds
- Complete Workflow: 10-15 seconds
- Suite (all heroku): ~5-10 minutes

## Related Documentation

- [Maestro Setup Guide](./../../docs/MAESTRO_SETUP_GUIDE.md)
- [Environment Configuration](./../../src/environments/README.md)
- [Test Architecture](./../../docs/MAESTRO_TEST_ARCHITECTURE.md)

# Maestro Test Matrix - Backend Variants

This document outlines all test files and their backend variant coverage.

## Test Matrix Overview

### Critical Tests (Duplicated for Both Backends)

These tests are essential and run against both mock and heroku backends.

#### Authentication Tests

| Test Name | Path | Mock Variant | Heroku Variant | Tags | Purpose |
|-----------|------|--------------|-----------------|------|---------|
| Login Flow | auth/ | 01-login-flow.mock.yaml | 01-login-flow.heroku.yaml | auth, smoke, critical | User authentication and dashboard access |

**Verifies**:
- User can login with credentials
- Session is created
- Dashboard is accessible
- Tab navigation works

**Duration**:
- Mock: ~1-2 seconds
- Heroku: ~2-3 seconds

---

#### Readings Tests

| Test Name | Path | Mock Variant | Heroku Variant | Tags | Purpose |
|-----------|------|--------------|-----------------|------|---------|
| Add Reading | readings/ | 02-add-reading.mock.yaml | 02-add-reading.heroku.yaml | readings, smoke | Create and display glucose readings |

**Verifies**:
- User can add glucose reading
- Reading appears in readings list
- Mock: Uses predefined test data
- Heroku: Persists to backend

**Duration**:
- Mock: ~2-3 seconds
- Heroku: ~4-5 seconds

---

#### Integration Tests

| Test Name | Path | Mock Variant | Heroku Variant | Tags | Purpose |
|-----------|------|--------------|-----------------|------|---------|
| Complete Workflow | integration/ | 01-complete-workflow.mock.yaml | 01-complete-workflow.heroku.yaml | integration, critical | Full user journey |

**Verifies**:
- Login → Dashboard → Add Reading → View Readings → Appointments → Profile → Logout
- All screens accessible
- Data persistence and sync
- Navigation works throughout

**Duration**:
- Mock: ~5-6 seconds
- Heroku: ~12-15 seconds

---

### UI-Only Tests (No Backend Variants Needed)

These tests verify UI behavior and don't interact with backend data.

#### Theme & Language Tests

| Test Name | Path | Tags | Notes |
|-----------|------|------|-------|
| Theme Toggle | 03-theme-toggle.yaml | ui, theme | Dark/light mode switching |
| Language Switch | 04-language-switch.yaml | ui, language | English/Spanish switching |

#### Navigation Tests

| Test Name | Path | Tags | Notes |
|-----------|------|------|-------|
| Dashboard Navigation | 02-dashboard-navigation.yaml | ui, navigation | Tab switching and navigation |

#### Profile Tests

| Test Name | Path | Tags | Notes |
|-----------|------|------|-------|
| Settings Persistence | profile/04-settings-persist.yaml | ui, profile | Settings persistence |

---

## Test Execution Patterns

### Pattern 1: Development (Mock Fast Track)

**Purpose**: Rapid feedback during development

```bash
maestro test --tags mock maestro/tests/

# Or specific test
maestro test maestro/tests/auth/01-login-flow.mock.yaml
```

**Duration**: ~2-3 minutes total
**Cost**: Free (no API calls)
**Reliability**: 99%

### Pattern 2: Integration (Heroku Full Test)

**Purpose**: Validate against real backend before release

```bash
maestro test --tags heroku maestro/tests/

# Wait for slow API
maestro test maestro/tests/integration/01-complete-workflow.heroku.yaml
```

**Duration**: ~5-10 minutes total
**Cost**: Heroku API calls (free tier)
**Reliability**: Depends on Heroku uptime

### Pattern 3: Full Matrix (CI/CD)

**Purpose**: Comprehensive validation in CI pipeline

```bash
# Step 1: Quick validation
maestro test --tags mock maestro/tests/ || exit 1

# Step 2: UI validation
maestro test maestro/tests/03-theme-toggle.yaml || exit 1
maestro test maestro/tests/04-language-switch.yaml || exit 1

# Step 3: Integration validation
maestro test --tags heroku maestro/tests/ || exit 1

echo "All tests passed!"
```

**Duration**: ~15-20 minutes total
**Confidence**: Maximum (mock + heroku + UI)

---

## Tag Reference

| Tag | Count | Purpose | Speed |
|-----|-------|---------|-------|
| `mock` | 3 tests | Fast development testing | <1s each |
| `heroku` | 3 tests | Integration testing | 1-5s each |
| `smoke` | 6 tests | Critical path validation | Variable |
| `auth` | 2 tests | Authentication tests | Variable |
| `readings` | 2 tests | Reading management tests | Variable |
| `integration` | 2 tests | End-to-end workflows | Variable |
| `ui` | 4 tests | UI-only tests | Instant |

---

## Backend Configuration

### Mock Adapter (env-mock.yaml)

```yaml
ENV_MODE: mock
BACKEND_URL: mock
USE_MOCK_ADAPTER: "true"

# Test data (always the same)
TEST_USER_DNI: "1000"
TEST_USER_PASS: "tuvieja"
MOCK_GLUCOSE_VALUE: "120"
MOCK_APPOINTMENTS_COUNT: "5"

# Fast timeouts
WAIT_TIME: "1000"  # 1 second for animations
```

### Heroku Gateway (env-heroku.yaml)

```yaml
ENV_MODE: cloud
BACKEND_URL: https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
USE_MOCK_ADAPTER: "false"
USE_HEROKU_API: "true"

# Test credentials
TEST_USER_EMAIL: "test@example.com"
TEST_USER_PASSWORD: "Test123!"

# Cloud timeouts
API_GATEWAY_TIMEOUT: "30000"  # 30 seconds
MAX_RETRIES: "3"
WAIT_TIME: "2000"  # 2 seconds for API responses
```

---

## Performance Targets

### Mock Tests

| Operation | Target | Actual |
|-----------|--------|--------|
| Login | <1s | 0.5-1s |
| Add Reading | <500ms | 100-300ms |
| Navigation | <500ms | 100-200ms |
| Workflow | <6s | 5-6s |
| **Suite Total** | **<5 min** | **2-3 min** |

### Heroku Tests

| Operation | Target | Actual |
|-----------|--------|--------|
| Login | 2-3s | 2-3s |
| Add Reading | 1-2s | 1-2s |
| Navigation | <1s | 500-800ms |
| Workflow | <15s | 12-15s |
| **Suite Total** | **<15 min** | **5-10 min** |

---

## Adding New Backend-Dependent Tests

When adding new tests that depend on backend:

1. Create base test: `XX-feature-name.yaml`
2. Create mock variant: `XX-feature-name.mock.yaml`
   - Add tags: `mock`, `[category]`
   - Use mock-specific waits (shorter)
   - Expect mock data results

3. Create heroku variant: `XX-feature-name.heroku.yaml`
   - Add tags: `heroku`, `[category]`
   - Use heroku-specific waits (longer)
   - Expect real API responses

**Example**:

```yaml
# maestro/tests/readings/05-export-readings.mock.yaml
appId: io.diabetify.app
tags:
  - mock
  - readings
  - smoke
---
# Test: Export readings (Mock)
# Backend: Mock adapter (instant response)

- launchApp
- runFlow:
    when:
      visible: "Iniciar Sesión"
    file: ../../flows/auth-login.yaml

- tapOn: "Lecturas|Readings"
- waitForAnimationToEnd:
    timeout: 1000

# Mock provides sample CSV instantly
- tapOn: "Exportar|Export"
- waitForAnimationToEnd:
    timeout: 1000

- assertVisible: "Descarga completada|Download complete"
```

```yaml
# maestro/tests/readings/05-export-readings.heroku.yaml
appId: io.diabetify.app
tags:
  - heroku
  - readings
  - integration
---
# Test: Export readings (Heroku)
# Backend: Live API (2-3s response)

- launchApp
- runFlow:
    when:
      visible: "Iniciar Sesión"
    file: ../../flows/auth-login.yaml

- tapOn: "Lecturas|Readings"
- waitForAnimationToEnd:
    timeout: 2000

# Heroku API generates CSV asynchronously
- tapOn: "Exportar|Export"
- waitForAnimationToEnd:
    timeout: 3000

- assertVisible: "Descarga completada|Download complete"
```

---

## Monitoring & Debugging

### View Test Output

```bash
# Verbose output with timing
maestro test --verbose maestro/tests/auth/01-login-flow.mock.yaml

# Save logs to file
maestro test maestro/tests/ > test-results.log 2>&1
```

### Capture Screenshots on Failure

```bash
# Screenshots are auto-captured in maestro/screenshots/
ls -la maestro/screenshots/

# Mock screenshots: prefix mock-*
# Heroku screenshots: prefix heroku-*
```

### Check Device State

```bash
# List connected devices
maestro devices

# Get device info
maestro info
```

---

## Maintenance

### Update Test Data

If test credentials change:

1. Update `maestro/config/env-mock.yaml`
2. Update `maestro/config/env-heroku.yaml`
3. Update all test files using the old data

### Add New Test Category

1. Create directory: `maestro/tests/[category]/`
2. Create tests with both variants:
   - `01-test-name.mock.yaml`
   - `01-test-name.heroku.yaml`
3. Add to this matrix
4. Update CI/CD pipeline if needed

---

## See Also

- Full guide: [BACKEND_TESTING.md](./BACKEND_TESTING.md)
- Quick reference: [BACKEND_TESTING_QUICK_REFERENCE.md](./BACKEND_TESTING_QUICK_REFERENCE.md)
- Environment setup: [src/environments/environment.ts](../src/environments/environment.ts)

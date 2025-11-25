# Testing Guide for Diabetify

## Quick Test Execution

### Run ALL Tests
```bash
# Unit tests + Maestro tests in current environment
npm run test:ci && maestro test maestro/tests/
```

## Unit Tests (Environment Independent)

Unit tests always run the same way regardless of environment:

```bash
# Run all unit tests
npm test                 # Watch mode
npm run test:ci          # CI mode (headless)
npm run test:coverage    # With coverage report

# Results: 231/232 tests passing ✅
```

**Why environment doesn't matter for unit tests:**
- They use mocked services (don't actually call backend)
- Test files have their own mock data
- Always deterministic

## Maestro E2E Tests (Environment Aware)

### Test Categories

#### 1. **Environment-Agnostic Tests** (Work with ANY backend)
These tests work with mock, local, or heroku:

```bash
maestro test maestro/tests/smoke-test.yaml
maestro test maestro/tests/02-dashboard-navigation.yaml
maestro test maestro/tests/03-theme-toggle.yaml
maestro test maestro/tests/04-language-switch.yaml
```

**Why they work everywhere:**
- Test UI interactions only
- Don't care about real vs mock data
- Just verify buttons work, navigation works, etc.

#### 2. **Mock-Specific Tests** (Require mock mode)
These tests expect mock data patterns:

```bash
# Switch to mock mode first
npm run deploy:mock

# Then run mock tests
maestro test maestro/tests/auth/01-login-flow.mock.yaml
maestro test maestro/tests/appointments/01-view-appointments.mock.yaml
maestro test maestro/tests/readings/02-add-reading.mock.yaml
maestro test maestro/tests/integration/01-complete-workflow.mock.yaml
```

**Why mock-specific:**
- Expect specific mock data values (e.g., "148 mg/dL", "Dra. María González")
- Test offline-first features
- No backend needed

#### 3. **Heroku-Specific Tests** (Require cloud backend)
These tests hit real Heroku API:

```bash
# Switch to heroku mode first
npm run deploy:heroku

# Then run heroku tests
maestro test maestro/tests/auth/01-login-flow.heroku.yaml
maestro test maestro/tests/appointments/01-view-appointments.heroku.yaml
maestro test maestro/tests/readings/02-add-reading.heroku.yaml
maestro test maestro/tests/integration/01-complete-workflow.heroku.yaml
```

**Why heroku-specific:**
- Test real backend integration
- Verify API contracts
- Test network error handling
- Require valid credentials

## Environment-Based Test Execution

### Mock Mode Testing (Fastest, No Backend)

```bash
# 1. Deploy in mock mode
npm run deploy:mock

# 2. Run all compatible tests
npm run test:ci                                    # Unit tests
maestro test maestro/tests/smoke-test.yaml         # Quick smoke test
maestro test maestro/tests/**/*.mock.yaml          # Mock-specific tests
maestro test maestro/tests/02-dashboard-navigation.yaml  # UI tests
maestro test maestro/tests/03-theme-toggle.yaml    # Theme tests
maestro test maestro/tests/04-language-switch.yaml # i18n tests

# Expected: All pass ✅
```

**Best for:**
- Local development
- CI/CD pipelines
- Quick verification
- No backend dependencies

### Heroku Mode Testing (Real Backend)

```bash
# 1. Deploy in heroku mode
npm run deploy:heroku

# 2. Run all compatible tests
npm run test:ci                                     # Unit tests (always work)
maestro test maestro/tests/smoke-test.yaml          # Quick smoke test
maestro test maestro/tests/**/*.heroku.yaml         # Heroku-specific tests
maestro test maestro/tests/02-dashboard-navigation.yaml   # UI tests
maestro test maestro/tests/auth/02-wrong-credentials.yaml # Error handling

# Expected: All pass if backend is up ✅
```

**Best for:**
- Integration testing
- Pre-production verification
- API contract testing
- Real data validation

### Local Mode Testing (Local Backend)

```bash
# 1. Start local backend (if you have it)
npm run backend:start

# 2. Deploy in local mode
npm run deploy:local

# 3. Run tests
npm run test:ci                                     # Unit tests
maestro test maestro/tests/smoke-test.yaml          # Quick smoke test
# ... same tests as heroku mode

# Expected: Pass if local backend is running ✅
```

**Best for:**
- Backend development
- Debugging API issues
- Testing local changes

## What Happens When You Switch Environments?

### Unit Tests
```bash
npm run deploy:mock    # Build for mock
npm run test:ci        # ✅ PASS

npm run deploy:heroku  # Build for heroku
npm run test:ci        # ✅ PASS (same tests, same results)
```
**Result: Always pass** - Unit tests are isolated from environment

### Maestro Tests

#### Environment-Agnostic Tests (UI/Navigation)
```bash
npm run deploy:mock
maestro test maestro/tests/03-theme-toggle.yaml    # ✅ PASS

npm run deploy:heroku
maestro test maestro/tests/03-theme-toggle.yaml    # ✅ PASS (same test works)
```
**Result: Pass in any environment** - Just testing UI

#### Environment-Specific Tests
```bash
# ❌ WRONG - Mock test in heroku mode
npm run deploy:heroku
maestro test maestro/tests/auth/01-login-flow.mock.yaml
# FAIL: Expects mock data but gets real API data

# ✅ CORRECT - Mock test in mock mode
npm run deploy:mock
maestro test maestro/tests/auth/01-login-flow.mock.yaml
# PASS: Gets expected mock data

# ✅ CORRECT - Heroku test in heroku mode
npm run deploy:heroku
maestro test maestro/tests/auth/01-login-flow.heroku.yaml
# PASS: Real API available
```

## Complete Test Suite Execution

### Full Test Run (All Environments)

```bash
#!/bin/bash
# Complete test suite across all environments

echo "=== UNIT TESTS (environment-independent) ==="
npm run test:ci || exit 1

echo "=== MOCK MODE TESTS ==="
npm run deploy:mock
maestro test maestro/tests/smoke-test.yaml || exit 1
maestro test maestro/tests/**/*.mock.yaml || exit 1
maestro test maestro/tests/02-dashboard-navigation.yaml || exit 1
maestro test maestro/tests/03-theme-toggle.yaml || exit 1
maestro test maestro/tests/04-language-switch.yaml || exit 1

echo "=== HEROKU MODE TESTS ==="
npm run deploy:heroku
maestro test maestro/tests/smoke-test.yaml || exit 1
maestro test maestro/tests/**/*.heroku.yaml || exit 1

echo "✅ ALL TESTS PASSED!"
```

### Quick Smoke Test (Any Environment)

```bash
# Works in ANY environment
npm run test:ci && maestro test maestro/tests/smoke-test.yaml
```

## Test Matrix

| Test Type | Mock Mode | Heroku Mode | Local Mode |
|-----------|-----------|-------------|------------|
| Unit Tests | ✅ Pass | ✅ Pass | ✅ Pass |
| Smoke Test | ✅ Pass | ✅ Pass | ✅ Pass |
| UI Tests (navigation, theme, i18n) | ✅ Pass | ✅ Pass | ✅ Pass |
| Mock-specific tests (*.mock.yaml) | ✅ Pass | ❌ Fail | ❌ Fail |
| Heroku-specific tests (*.heroku.yaml) | ❌ Fail | ✅ Pass | ❌ Fail |
| Local-specific tests (*.local.yaml) | ❌ Fail | ❌ Fail | ✅ Pass |

## CI/CD Recommendations

### For Pull Requests
```bash
# Fast feedback - mock mode only
npm run deploy:mock
npm run test:ci
maestro test maestro/tests/smoke-test.yaml
maestro test maestro/tests/**/*.mock.yaml
```

### For Main Branch
```bash
# Full suite - all environments
npm run test:ci
npm run deploy:mock && maestro test maestro/tests/**/*.mock.yaml
npm run deploy:heroku && maestro test maestro/tests/**/*.heroku.yaml
```

### For Releases
```bash
# Production-like testing
npm run deploy:heroku
npm run test:ci
maestro test maestro/tests/
```

## Troubleshooting

### Test Fails After Environment Switch
```bash
# Clear app state and rebuild
adb shell pm clear io.diabetify.app
npm run deploy:mock  # or :heroku or :local
maestro test maestro/tests/smoke-test.yaml
```

### Maestro Can't Launch App
```bash
# Stop and restart
adb shell am force-stop io.diabetify.app
adb shell am start -n io.diabetify.app/.MainActivity
maestro test maestro/tests/smoke-test.yaml
```

### Backend Tests Fail
```bash
# Check backend is running
npm run backend:health  # For local
curl https://diabetactic-api-gateway-xxx.herokuapp.com/health  # For heroku
```

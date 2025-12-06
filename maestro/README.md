# Maestro E2E Tests

This directory contains Maestro integration tests for the Diabetactic mobile app. Maestro is a simple yet powerful UI testing framework for mobile apps that uses YAML-based test flows.

## Overview

Maestro tests run against a real Android emulator or device with the Diabetactic app installed. They simulate user interactions and verify app behavior in production-like conditions.

**Backend**: Tests run against Heroku production API (`dt-api-gateway-3dead350d8fa.herokuapp.com`)

**Test Status**: 14/14 passing (as of 2025-12-04)

## Directory Structure

```
maestro/
├── config.yaml                  # Global config (appId, env vars)
├── flows/                       # Reusable flows
│   ├── login.yaml               # Login with clearState
│   ├── login-no-clear.yaml      # Login without clearing state
│   └── navigate-*.yaml          # Navigation helpers
├── scripts/
│   ├── backoffice-api.js        # Admin operations (accept/deny/clear appointments)
│   └── setup-state.js           # Setup deterministic test state
├── fixtures/
│   └── test-data.json           # Test data fixtures for setup-state.js
└── tests/
    ├── appointments/            # Appointment flow tests
    ├── readings/                # Glucose readings tests
    ├── bolus-calculator/        # Bolus calculator tests
    ├── profile/                 # Profile management tests
    ├── settings/                # Settings persistence tests
    ├── errors/                  # Error handling tests
    └── resolution/              # Resolution compatibility tests
```

## Prerequisites

1. **Maestro CLI** installed:

   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Android emulator or device** with Diabetactic APK installed

3. **Environment variables** (optional, defaults provided):
   ```bash
   export TEST_USER_ID=1000
   export TEST_USER_PASSWORD=tuvieja
   export BACKOFFICE_API_URL=https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com
   export BACKOFFICE_ADMIN_USERNAME=admin
   export BACKOFFICE_ADMIN_PASSWORD=admin
   ```

## Running Tests

### All tests

```bash
cd maestro
maestro test tests/
```

### Specific test suite

```bash
maestro test tests/appointments/
maestro test tests/readings/
maestro test tests/bolus-calculator/
```

### Single test

```bash
maestro test tests/appointments/05-full-flow.yaml
```

### With custom env vars

```bash
maestro test tests/ \
  --env TEST_USER_ID=1000 \
  --env TEST_USER_PASSWORD=tuvieja
```

## Test Setup Scripts

### Deterministic State Setup

Before running tests, use `setup-state.js` to prepare the backend in a known state:

```bash
# Reset all test data (recommended before test suite)
ACTION=reset USER_ID=1000 node scripts/setup-state.js

# Prepare for appointment flow tests
ACTION=prepare-appointments USER_ID=1000 node scripts/setup-state.js

# Prepare for readings tests with sample data
ACTION=prepare-readings USER_ID=1000 node scripts/setup-state.js

# Load custom fixture
ACTION=load-fixture FIXTURE=fixtures/test-data.json node scripts/setup-state.js
```

### Backoffice API Operations

Use `backoffice-api.js` for manual appointment queue management:

```bash
# Accept next pending appointment for user
ACTION=accept USER_ID=1000 node scripts/backoffice-api.js

# Deny next pending appointment for user
ACTION=deny USER_ID=1000 node scripts/backoffice-api.js

# Clear entire appointment queue
ACTION=clear node scripts/backoffice-api.js

# Open appointment queue
ACTION=open node scripts/backoffice-api.js

# Close appointment queue
ACTION=close node scripts/backoffice-api.js
```

## Selector Strategy

Maestro tests use a **cascading selector strategy** for robustness:

### 1. data-testid (Most Reliable)

```yaml
- tapOn:
    id: 'login-submit-btn'
```

**Pros**: Explicit, stable across UI changes
**Cons**: Requires adding data-testid attributes to components
**Components with data-testid**: login, add-reading, bolus-calculator, stat-card

### 2. Bilingual Text Selectors (Fallback)

```yaml
- tapOn:
    text: 'Iniciar Sesión|Login|Sign In'
```

**Pros**: Works across language settings, no code changes needed
**Cons**: Breaks if translations change
**Usage**: Most tests use this as primary or fallback

### 3. Point-based Selectors (Last Resort)

```yaml
- tapOn:
    point: '50%,90%' # Bottom center
```

**Pros**: Works with shadow DOM (Ionic)
**Cons**: Fragile, resolution-dependent
**Usage**: Only for shadow DOM form inputs when data-testid isn't accessible

### Cascading Pattern (Recommended)

Use multiple optional selectors in priority order:

```yaml
# Try data-testid first
- tapOn:
    id: 'glucose-value-input'
    optional: true

# Fallback to text selector
- tapOn:
    text: 'Glucosa|Glucose'
    optional: true

# Last resort: point tap
- tapOn:
    point: '50%,35%'
    optional: true
```

## Shadow DOM Workaround

Ionic components use Shadow DOM which hides form inputs from Maestro. Solutions:

1. **Add data-testid** to the ion-input/ion-select (preferred)
2. **Point-based taps** at approximate positions (fragile)
3. **Label tap → input → hide keyboard** sequence:
   ```yaml
   - tapOn: { text: 'Glucosa|Glucose' }
   - inputText: '120'
   - hideKeyboard
   ```

## Timing and Hydration

Angular + Ionic apps have hydration delays. Use these patterns:

### Wait for Page Load

```yaml
- extendedWaitUntil:
    visible:
      text: 'Expected Text|Texto Esperado'
    timeout: 8000
```

### Animation Handling

```yaml
- waitForAnimationToEnd:
    timeout: 2000
```

### Scroll Before Tap

```yaml
- scrollUntilVisible:
    element:
      text: 'Button Text'
    direction: DOWN
```

## Appointment State Machine

Appointment tests follow this state machine:

```
NONE → PENDING → ACCEPTED → CREATED
              ↘ DENIED
```

**State transitions**:

- User requests → PENDING
- Admin accepts (backoffice API) → ACCEPTED
- User creates appointment → CREATED
- Admin denies (backoffice API) → DENIED

**Important**: Tests must clear queue between runs to ensure deterministic state.

## Common Patterns

### Login Flow

```yaml
- runFlow: ../../flows/login.yaml
```

This flow:

1. Clears app state (`clearState`)
2. Waits for welcome screen
3. Enters credentials
4. Submits login
5. Waits for dashboard

### Navigate to Tab

```yaml
- tapOn:
    text: 'Lecturas|Readings'
- waitForAnimationToEnd:
    timeout: 2000
```

### Form Input (Shadow DOM)

```yaml
# Tap input area
- tapOn:
    id: 'glucose-value-input'
    optional: true
- tapOn:
    point: '50%,35%'
    optional: true

# Type value
- inputText: '120'

# Dismiss keyboard
- hideKeyboard

# Wait for UI update
- waitForAnimationToEnd:
    timeout: 1000
```

### Verify Success

```yaml
- assertVisible:
    text: 'Éxito|Success'
```

### Optional Assertions

```yaml
- assertVisible:
    text: 'Optional Element'
    optional: true
```

## Test Data Fixtures

`fixtures/test-data.json` contains predefined test scenarios:

- **readings_test**: 2 pre-existing readings
- **appointments_test**: Clean appointment queue
- **bolus_calculator_test**: Current glucose reading
- **dashboard_test**: 6 readings over 2 days
- **empty_state_test**: No data (for empty state UI)
- **high_glucose_test**: High glucose alerts
- **low_glucose_test**: Low glucose alerts

Load fixtures with:

```bash
ACTION=load-fixture FIXTURE=maestro/fixtures/test-data.json node maestro/scripts/setup-state.js
```

## Debugging Tips

### View Maestro Logs

```bash
maestro test tests/mytest.yaml --debug-output maestro-debug.log
```

### Take Screenshots

```yaml
- takeScreenshot: screenshot-name
```

Screenshots saved to `~/.maestro/tests/<test-id>/`

### Slow Down Test

```yaml
- waitForAnimationToEnd:
    timeout: 5000 # Pause for 5s to observe state
```

### Record Video

Use Android screen recording:

```bash
adb shell screenrecord /sdcard/maestro-test.mp4 &
maestro test tests/mytest.yaml
adb pull /sdcard/maestro-test.mp4
```

## CI Integration

Maestro tests run in CircleCI `maestro-tests` job (master branch only):

```yaml
- maestro-tests:
    requires:
      - build-android-api30
    filters:
      branches:
        only: master
```

**CircleCI setup**:

1. Install Maestro CLI
2. Start Android emulator (API 30)
3. Install APK from workspace
4. Wait for emulator ready
5. Run `maestro test maestro/tests/`
6. Upload artifacts on failure

## Troubleshooting

### Test Fails Due to Timing

- Increase `timeout` in `extendedWaitUntil`
- Add `waitForAnimationToEnd` after interactions

### Shadow DOM Elements Not Found

- Add `data-testid` attribute to component
- Use point-based tap as fallback

### Queue State Pollution

- Run `ACTION=clear node scripts/backoffice-api.js` before tests
- Use `login.yaml` (with clearState) instead of `login-no-clear.yaml`

### Bilingual Text Not Matching

- Check both Spanish and English translations in `src/assets/i18n/`
- Use regex: `'Texto|Text'`

### Flaky Tests on CI

- Increase wait timeouts for slower emulators
- Add deterministic state setup before test suite
- Ensure APK is fully hydrated before first interaction

## Best Practices

1. **Always use cascading selectors** (data-testid → text → point)
2. **Start tests with deterministic state** (setup-state.js)
3. **Use bilingual text selectors** for language independence
4. **Add generous timeouts** for hydration (8-10s on first load)
5. **Clear state between test runs** (clearState in login.yaml)
6. **Avoid hardcoded coordinates** when possible (add data-testid instead)
7. **Test real user flows** end-to-end (not isolated features)
8. **Document assumptions** about backend state in test comments

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro YAML Reference](https://maestro.mobile.dev/reference/yaml-reference)
- [CircleCI Maestro Setup](https://maestro.mobile.dev/ci-integration/circleci)

## Test Maintenance

When updating tests:

1. **UI changes**: Update selectors (prefer data-testid)
2. **New features**: Add test file in appropriate directory
3. **Translations**: Update bilingual regex patterns
4. **Backend changes**: Update setup-state.js and fixtures
5. **Flakiness**: Increase timeouts or add state setup

## Contact

For questions or issues with Maestro tests, see:

- CircleCI build logs for failures
- Maestro debug output (`--debug-output`)
- Backend API logs (Heroku dashboard)

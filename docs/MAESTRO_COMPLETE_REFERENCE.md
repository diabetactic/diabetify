# Maestro Test Suite - Complete Reference

> LLM-optimized reference for analyzing, optimizing, and creating Maestro mobile tests

## Metadata

```yaml
project: Diabetify Mobile App
framework: Maestro Mobile Testing
app_id: io.diabetify.app
total_tests: 34
total_flows: 9
backend_modes: [default, heroku, mock]
languages: [en, es]
test_categories:
  auth: 5
  readings: 8
  appointments: 6
  integration: 6
  dashboard: 1
  profile: 3
  other: 5
```

---

## Test Inventory

### Authentication Tests (5)
| File | Backend | Tags | Purpose |
|------|---------|------|---------|
| `auth/01-login-flow.yaml` | default | smoke, auth, critical | Complete login with credentials → dashboard |
| `auth/01-login-flow.heroku.yaml` | heroku | cloud, auth | Login with cloud API (2-3s latency) |
| `auth/01-login-flow.mock.yaml` | mock | fast, auth | Login with mock adapter (instant) |
| `auth/02-wrong-credentials.yaml` | default | error, auth | Verify error message on invalid credentials |
| `auth/03-network-error.yaml` | default | error, network | Handle network timeout gracefully |

### Readings Tests (8)
| File | Backend | Tags | Purpose |
|------|---------|------|---------|
| `readings/02-add-reading.yaml` | default | regression, readings | Add glucose reading, verify in list |
| `readings/02-add-reading.heroku.yaml` | heroku | cloud, readings | Add reading via cloud API |
| `readings/02-add-reading.mock.yaml` | mock | fast, readings | Add reading with mock data |
| `readings/03-calculate-average.yaml` | default | stats, readings | Verify average glucose calculation |
| `readings/03-verify-stats.yaml` | default | stats, dashboard | Verify stats card displays correctly |
| `readings/04-filter-readings.yaml` | default | regression, filter | Filter readings by date/type |
| `readings/05-add-reading-validation.yaml` | default | validation, error | Test input validation (min/max values) |
| `readings/06-edit-delete-reading.yaml` | default | regression, crud | Edit and delete existing reading |
| `readings/07-bulk-operations.yaml` | default | performance, readings | Add multiple readings, verify batch |

### Appointments Tests (6)
| File | Backend | Tags | Purpose |
|------|---------|------|---------|
| `appointments/01-view-appointments.heroku.yaml` | heroku | cloud, appointments | View appointments from cloud API |
| `appointments/02-create-appointment.heroku.yaml` | heroku | cloud, crud | Create new appointment via API |
| `appointments/04-segment-switch.yaml` | default | ui, appointments | Switch between upcoming/past segments |
| `appointments/05-create-validation.yaml` | default | validation, error | Test appointment form validation |
| `appointments/06-edit-delete-appointment.yaml` | default | regression, crud | Edit and delete appointments |

### Integration Tests (6)
| File | Backend | Tags | Purpose |
|------|---------|------|---------|
| `integration/01-complete-workflow.yaml` | default | smoke, e2e | Full user journey: login → add reading → verify dashboard |
| `integration/01-complete-workflow.heroku.yaml` | heroku | cloud, e2e | Complete workflow with cloud backend |
| `integration/01-complete-workflow.mock.yaml` | mock | fast, e2e | Complete workflow with mock backend |
| `integration/01-full-user-journey.yaml` | default | smoke, comprehensive | Extended journey with all features |
| `integration/02-offline-sync.yaml` | default | offline, sync | Add reading offline, verify sync when online |
| `integration/02-reading-to-dashboard.yaml` | default | smoke, flow | Add reading → verify dashboard stats update |

### Other Tests (9)
| File | Backend | Tags | Purpose |
|------|---------|------|---------|
| `02-dashboard-navigation.yaml` | default | smoke, navigation | Navigate all tabs from dashboard |
| `03-theme-toggle.yaml` | default | ui, theme | Toggle dark/light theme, verify persistence |
| `04-language-switch.yaml` | default | i18n, ui | Switch EN ↔ ES, verify translations |
| `dashboard/02-verify-stats-calculations.yaml` | default | stats, calculations | Verify average/min/max glucose calculations |
| `profile/04-settings-persist.yaml` | default | settings, persistence | Change settings, restart, verify persisted |
| `profile/05-avatar-upload.yaml` | default | media, upload | Upload profile photo |
| `profile/06-profile-edit.yaml` | default | profile, crud | Edit profile fields, save |
| `smoke-test.yaml` | default | smoke, quick | Quick validation: launch → login → dashboard |
| `debug-simple.yaml` | default | debug | Minimal test for debugging issues |

---

## Configuration Files

### 1. maestro.yaml (Global Configuration)

```yaml
# App Configuration
appId: io.diabetify.app

# Default Environment Variables
env:
  EMAIL: test@example.com
  PASSWORD: Test123!
  API_URL: http://localhost:3000
  TIMEOUT: 30000

# Platform-specific settings
platform:
  android:
    package: io.diabetify.app
    activity: .MainActivity
  ios:
    bundleId: io.diabetify.app

# Timeouts (milliseconds)
timeouts:
  implicit: 10000      # Default wait for elements
  explicit: 30000      # Maximum wait
  animation: 2000      # Animation duration

# Retry configuration
retry:
  attempts: 3
  delay: 1000

# Logging
logging:
  level: info
  console: true
  file: maestro/logs/test-run.log
```

### 2. selectors.yaml (Bilingual UI Selectors)

**Key Pattern**: All selectors support English and Spanish using regex pipes

```yaml
# Authentication
LOGIN_BUTTON: "Login|Iniciar Sesión"
SIGNIN_BUTTON: "Iniciar Sesión|Sign In"
EMAIL_INPUT: "DNI o Email|Email"
PASSWORD_INPUT: "Contraseña|Password"
LOGOUT_BUTTON: ".*Cerrar sesión.*|.*[Ll]ogout.*"

# Navigation Tabs
TAB_DASHBOARD: "Inicio|Panel de Control|Dashboard|Home"
TAB_READINGS: "Lecturas|Readings"
TAB_APPOINTMENTS: "Citas|Appointments"
TAB_PROFILE: "Perfil|Profile"

# Dashboard Elements
DASHBOARD_TITLE: "Panel de Control|Mi Salud|Dashboard|My Health"
DASHBOARD_GLUCOSE_CARD: ".*(Glucosa|Azúcar|Glucose).*"
DASHBOARD_APPOINTMENTS_CARD: ".*(Citas|Appointments).*"

# Readings Screen
READINGS_ADD_BUTTON: "Agregar Lectura|Add Reading"
READINGS_EMPTY_STATE: "No hay lecturas|No readings available"

# Common UI
LOADING_INDICATOR: "Cargando|Loading"
ERROR_MESSAGE: "Error"
SUCCESS_MESSAGE: "Éxito|Success"
SAVE_BUTTON: "Guardar|Save"
CANCEL_BUTTON: "Cancelar|Cancel"
BACK_BUTTON: "Atrás|Back"

# Theme/Language
THEME_TOGGLE: ".*[Tt]heme.*|.*[Tt]ema.*"
DARK_MODE_TOGGLE: "Modo oscuro|Dark Mode"
LANGUAGE_SWITCHER: "Idioma|Language"
ENGLISH_OPTION: "English"
SPANISH_OPTION: "Español"
```

### 3. test-data.yaml (Test Credentials & Values)

```yaml
# Demo User Credentials
DEMO_USER_EMAIL: "demo@diabetactic.com"
DEMO_USER_PASSWORD: "demo123"

# Additional Test Users
TEST_USER_1_EMAIL: "patient1@test.com"
TEST_USER_1_PASSWORD: "test123"

# Test Data Values
GLUCOSE_READING_NORMAL: "120"
GLUCOSE_READING_HIGH: "250"
GLUCOSE_READING_LOW: "60"

# Appointment Test Data
APPOINTMENT_TITLE: "Test Appointment"
APPOINTMENT_DATE: "2024-12-15"
APPOINTMENT_TIME: "10:00"
APPOINTMENT_DOCTOR: "Dr. Smith"

# Timeouts (milliseconds)
DEFAULT_TIMEOUT: 10000
ANIMATION_TIMEOUT: 3000
DATA_LOAD_TIMEOUT: 15000
LOGIN_TIMEOUT: 8000

# Language/Theme Settings
DEFAULT_LANGUAGE: "en"
ALTERNATE_LANGUAGE: "es"
DEFAULT_THEME: "light"
ALTERNATE_THEME: "dark"
```

### 4. environments/heroku.yaml vs mock.yaml

**Heroku Mode** (Cloud API, 2-3s latency):
```yaml
env:
  BACKEND_MODE: heroku
  API_URL: https://diabetify-api-xxxx.herokuapp.com
  ENABLE_HEALTH_CHECK: true
  REQUEST_TIMEOUT: 5000
  RETRY_ATTEMPTS: 3
```

**Mock Mode** (Instant, local adapter):
```yaml
env:
  BACKEND_MODE: mock
  USE_MOCK_ADAPTER: true
  MOCK_DELAY: 0
  SKIP_NETWORK_CALLS: true
```

---

## Flow Components Library

### Core Flows (9 Reusable Components)

| Flow | Parameters | Purpose | Lines |
|------|-----------|---------|-------|
| `flows/auth/login.yaml` | USERNAME, PASSWORD | Login with credentials | 67 |
| `flows/add-glucose-reading.yaml` | GLUCOSE_VALUE, READING_TYPE | Add glucose reading | 47 |
| `flows/navigate-to-tab.yaml` | TAB_NAME | Navigate to specific tab | 31 |
| `flows/verify-reading-in-list.yaml` | GLUCOSE_VALUE | Verify reading appears in list | ~25 |
| `flows/wait-for-data-load.yaml` | TIMEOUT | Wait for API data to load | ~15 |
| `flows/ensure-app-ready.yaml` | - | Ensure app is launched and ready | ~20 |
| `flows/toggle-theme.yaml` | THEME_NAME | Toggle dark/light theme | ~30 |
| `flows/logout.yaml` | - | Logout from profile | ~25 |
| `flows/verify-offline-mode.yaml` | - | Verify app works offline | ~40 |

---

## Real Code Patterns

### Pattern 1: Bilingual Assertions

**File**: `maestro/tests/auth/01-login-flow.yaml` (lines 22-24)

```yaml
# Wait for login screen elements
- assertVisible:
    text: "DNI o Email|Email|Correo"
    optional: true  # Label may vary
- assertVisible: "Contraseña|Password"
```

**Why**: Supports both English and Spanish UI without separate test files.

**Optimize**: Use centralized selectors from `selectors.yaml`:
```yaml
- assertVisible: ${EMAIL_INPUT}
- assertVisible: ${PASSWORD_INPUT}
```

---

### Pattern 2: Coordinate-Based Taps (Ionic Inputs)

**File**: `maestro/flows/auth/login.yaml` (lines 43-47)

```yaml
# Fill email field (use center point because Ionic inputs lack stable IDs)
- tapOn:
    point: "50%,45%"
- eraseText
- inputText: ${USERNAME}
- hideKeyboard
```

**Why**: Ionic components use Shadow DOM, making IDs unstable. Coordinate taps are more reliable.

**Optimize**: Add `data-testid` attributes to Ionic components for stable selectors:
```html
<!-- Add to Ionic input -->
<ion-input data-testid="email-input"></ion-input>
```

---

### Pattern 3: Wait Strategies

**File**: `maestro/flows/add-glucose-reading.yaml` (lines 35-38)

```yaml
# Hide keyboard to ensure save button is visible
- hideKeyboard
- waitForAnimationToEnd:
    timeout: 500

# Save the reading
- tapOn: "GUARDAR LECTURA|SAVE READING|Guardar|Save"
- waitForAnimationToEnd:
    timeout: 3000  # API call takes time
```

**Why**:
- `hideKeyboard` ensures button is visible (keyboard blocks it)
- Different timeouts for UI animations (500ms) vs API calls (3000ms)

**Optimize**: Use data-driven timeouts from `test-data.yaml`:
```yaml
- waitForAnimationToEnd:
    timeout: ${ANIMATION_TIMEOUT}
```

---

### Pattern 4: Conditional Execution

**File**: `maestro/tests/readings/02-add-reading.yaml` (lines 14-17)

```yaml
# Login if needed
- runFlow:
    when:
      visible: "Iniciar Sesión|Sign In|Login"
    file: ../../flows/auth-login.yaml
```

**Why**: Tests can run from any state. If user already logged in, skip login flow.

**Optimize**: Good pattern. Consider adding to all tests for idempotency.

---

### Pattern 5: Flow Composition

**File**: `maestro/tests/readings/02-add-reading.yaml` (lines 31-41)

```yaml
# Add a glucose reading
- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "125"
      READING_TYPE: "DESAYUNO|Breakfast"

# Verify reading appears in list
- runFlow:
    file: ../../flows/verify-reading-in-list.yaml
    env:
      GLUCOSE_VALUE: "125"
```

**Why**: Reusable flows keep tests DRY. Same flow used in 8+ tests.

**Optimize**: Extract more common patterns (e.g., "navigate + wait + assert" → flow).

---

### Pattern 6: Screenshot Documentation

**File**: `maestro/tests/auth/01-login-flow.yaml` (lines 14, 25, 36, 50, 57)

```yaml
- takeScreenshot: "screenshots/auth-01-initial-state.png"
# ... actions ...
- takeScreenshot: "screenshots/auth-02-login-page.png"
# ... fill form ...
- takeScreenshot: "screenshots/auth-03-form-filled.png"
# ... submit ...
- takeScreenshot: "screenshots/auth-04-login-success.png"
```

**Why**: Visual evidence of test execution at key milestones.

**Naming Convention**: `{feature}-{step}-{description}.png`

**Optimize**: Too many screenshots (5 in 58 lines). Keep only:
- Initial state
- Success/error states
- Unexpected behaviors

---

### Pattern 7: Environment Variable Injection

**File**: `maestro/flows/add-glucose-reading.yaml` (line 21)

```yaml
- inputText: "${GLUCOSE_VALUE}"
```

**File**: `maestro/tests/readings/02-add-reading.yaml` (lines 34-35)

```yaml
env:
  GLUCOSE_VALUE: "125"
  READING_TYPE: "DESAYUNO|Breakfast"
```

**Why**: Makes flows reusable with different data. Same flow works for normal/high/low values.

**Optimize**: Good pattern. Use more env vars for timeouts, URLs, credentials.

---

### Pattern 8: Form Input Flow (Complete Example)

**File**: `maestro/flows/add-glucose-reading.yaml` (FULL FLOW)

```yaml
appId: io.diabetify.app
---
# Reusable flow: Add glucose reading
# Usage: runFlow with env vars GLUCOSE_VALUE and READING_TYPE

# Tap the floating action button to open add reading modal
- tapOn:
    point: "50%,93%"  # FAB button position (bottom right)
- waitForAnimationToEnd:
    timeout: 2000

# Verify modal opened
- assertVisible: "Agregar Lectura|Add Reading"

# Enter glucose value in input field
- tapOn:
    point: "50%,32%"  # Glucose input field position
- waitForAnimationToEnd:
    timeout: 500
- eraseText
- inputText: "${GLUCOSE_VALUE}"

# Select reading type if provided (optional)
- runFlow:
    when:
      visible: "Contexto de comida|Meal Context"
    commands:
      - tapOn: "Selecciona el contexto|Select context"
      - waitForAnimationToEnd:
          timeout: 1000
      - tapOn: "${READING_TYPE}"
      - waitForAnimationToEnd:
          timeout: 1000

# Hide keyboard to ensure save button is visible
- hideKeyboard
- waitForAnimationToEnd:
    timeout: 500

# Save the reading
- tapOn: "GUARDAR LECTURA|SAVE READING|Guardar|Save"
- waitForAnimationToEnd:
    timeout: 3000

# Verify success (return to dashboard or readings)
- assertVisible: "Panel de Control|Dashboard|Lecturas|Readings"
```

**Key Techniques**:
1. Coordinate taps for Ionic inputs (`50%,32%`)
2. `eraseText` before `inputText` (prevents append)
3. `hideKeyboard` before save (ensures button visible)
4. Conditional nested flow for optional field
5. Bilingual success assertion

---

## Backend Mode Strategy

### When to Use Each Mode

| Mode | Latency | API Calls | Use Case | Test Count |
|------|---------|-----------|----------|------------|
| **default** | ~1s | Real API (configured) | Standard regression tests | 23 |
| **heroku** | 2-3s | Cloud API (Heroku) | Integration tests with real backend | 7 |
| **mock** | instant | Local adapter | Fast smoke tests, CI/CD | 4 |

### Three-Variant Pattern

Many critical tests have 3 variants:

**Base test**: `readings/02-add-reading.yaml`
- Uses default backend from `maestro.yaml`
- For local development

**Heroku variant**: `readings/02-add-reading.heroku.yaml`
- Imports base test structure
- Overrides env with Heroku API URL
- For cloud integration tests

**Mock variant**: `readings/02-add-reading.mock.yaml`
- Imports base test structure
- Uses mock adapter (instant, no network)
- For fast CI/CD pipeline

### Decision Tree

```
Is this a smoke test or CI/CD?
├─ YES → Use .mock.yaml (instant, no API calls)
└─ NO → Is this testing API integration?
    ├─ YES → Use .heroku.yaml (real cloud API)
    └─ NO → Use .yaml (default backend)
```

---

## Architecture Analysis

### Strengths

1. **Bilingual Support**: All selectors support EN/ES via regex
2. **Reusable Flows**: 9 flows used across 34 tests (good DRY)
3. **Three-Variant Strategy**: Critical tests have base/heroku/mock variants
4. **Conditional Execution**: Tests adapt to app state (`when:` blocks)
5. **Screenshot Documentation**: Key milestones captured

### Optimization Opportunities

#### 1. Reduce Coordinate-Based Taps

**Current**: 70% of taps use `point: "50%,X%"`

**Problem**: Brittle on different screen sizes/orientations

**Solution**: Add `data-testid` to Ionic components
```html
<!-- Before -->
<ion-input></ion-input>

<!-- After -->
<ion-input data-testid="glucose-input"></ion-input>
```

```yaml
# Before
- tapOn:
    point: "50%,32%"

# After
- tapOn:
    id: "glucose-input"
```

**Impact**: 15+ tests, ~40+ coordinate taps

---

#### 2. Extract Common Patterns to Flows

**Current**: Repeated patterns across tests:
- Navigate tab + wait + assert (6 tests)
- Login + navigate + action (10 tests)
- Add item + verify in list (5 tests)

**Solution**: Create new flows:
- `flows/navigate-and-verify.yaml`
- `flows/login-and-navigate.yaml`
- `flows/add-and-verify.yaml`

**Impact**: Reduce test code by ~30%, improve maintainability

---

#### 3. Centralize Timeouts

**Current**: Hardcoded timeouts everywhere
```yaml
timeout: 3000  # Appears 40+ times
timeout: 2000  # Appears 30+ times
```

**Solution**: Use `test-data.yaml` timeouts
```yaml
timeout: ${ANIMATION_TIMEOUT}  # 3000
timeout: ${DATA_LOAD_TIMEOUT}  # 15000
```

**Impact**: Easy to tune performance across all tests

---

#### 4. Add Error Recovery Flows

**Current**: Only 2 tests explicitly handle errors:
- `auth/02-wrong-credentials.yaml`
- `auth/03-network-error.yaml`

**Missing**:
- Network timeout recovery
- API 500 error handling
- Offline mode transitions
- Form validation errors

**Solution**: Create error recovery flows:
- `flows/handle-network-error.yaml`
- `flows/retry-api-call.yaml`
- `flows/clear-error-state.yaml`

**Impact**: Tests more robust, better coverage

---

#### 5. Reduce Screenshot Bloat

**Current**: 57 screenshots total (~4.5MB)

**Problem**: Too many screenshots in passing tests

**Solution**:
- Keep screenshots only for: initial state, final state, errors
- Remove intermediate steps (form-filled, etc.)
- Generate screenshots on failure only

**Impact**: Reduce from 5-6 screenshots per test to 2-3

---

### Coverage Gaps

**Not Tested**:
1. **Profile editing**: `profile/06-profile-edit.yaml` exists but incomplete
2. **Offline sync**: Only basic offline test, not full sync flow
3. **Error scenarios**:
   - API 500 errors
   - Timeout recovery
   - Invalid data responses
4. **Bulk operations**: Only 1 test (`readings/07-bulk-operations.yaml`)
5. **Accessibility**: No tests verify screen reader labels
6. **Performance**: No tests measure load times, responsiveness

**Recommended New Tests**:
- `profile/07-edit-validation.yaml` - Validate profile form
- `integration/03-offline-to-online-sync.yaml` - Full sync workflow
- `error/01-api-timeout-recovery.yaml` - Handle API timeouts
- `performance/01-dashboard-load-time.yaml` - Measure metrics
- `a11y/01-screen-reader-labels.yaml` - Accessibility validation

---

## Quick Reference

### Run Tests

```bash
# All tests
maestro test maestro/tests/

# By category
maestro test maestro/tests/auth/
maestro test maestro/tests/readings/

# Specific test
maestro test maestro/tests/auth/01-login-flow.yaml

# By tag
maestro test maestro/tests/ --tag smoke
maestro test maestro/tests/ --tag cloud

# With environment
maestro test maestro/tests/ --env maestro/config/environments/heroku.yaml
```

### Common Commands

```bash
# Start emulator
maestro start-emulator

# List devices
maestro list-devices

# Run flow with env vars
maestro test maestro/flows/auth/login.yaml \
  --env USERNAME=test@example.com \
  --env PASSWORD=test123

# Capture screenshot
maestro screenshot output.png

# View hierarchy (debugging)
maestro hierarchy
```

### Debug Failing Tests

```bash
# 1. Run with verbose logging
maestro test maestro/tests/failing-test.yaml --verbose

# 2. Capture screenshots at failure point
maestro test maestro/tests/failing-test.yaml --screenshot-on-failure

# 3. View UI hierarchy to find selectors
maestro hierarchy > ui-hierarchy.txt

# 4. Test individual flow
maestro test maestro/flows/problem-flow.yaml
```

---

## Summary for LLM Analysis

**Total Size**: ~45KB, ~13K tokens

**Key Data Points**:
- 34 tests across 6 categories
- 9 reusable flows
- 3 backend modes (default, heroku, mock)
- Bilingual support (EN/ES)
- 117 centralized selectors

**Primary Optimization Areas**:
1. Replace 40+ coordinate taps with `data-testid` selectors
2. Extract 5+ new common flows
3. Centralize 70+ hardcoded timeouts
4. Add 10+ missing error recovery tests
5. Reduce screenshot count by 50%

**Test Quality Score**: 7/10
- ✅ Good: Bilingual, reusable flows, multiple backend modes
- ⚠️ Needs Work: Coordinate taps, missing error coverage, screenshot bloat
- ❌ Poor: No accessibility tests, minimal performance tests

**Recommended Actions**:
1. Add `data-testid` to all Ionic inputs (Priority: HIGH)
2. Create `flows/navigate-and-verify.yaml` (Priority: HIGH)
3. Extract timeout constants to env vars (Priority: MEDIUM)
4. Write error recovery flows (Priority: MEDIUM)
5. Add accessibility tests (Priority: LOW)

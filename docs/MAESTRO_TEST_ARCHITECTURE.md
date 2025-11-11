# Maestro Test Suite Architecture

## Overview

This document defines the Maestro mobile testing architecture for the Diabetify application. Maestro tests complement existing Playwright tests by providing native mobile UI automation focused on gestures, app lifecycle, and mobile-specific behaviors.

**App Identifier**: `io.diabetactic.app` (from `capacitor.config.ts`)

---

## Test Directory Structure

```
maestro/
├── tests/
│   ├── auth/
│   │   ├── 01-login-flow.yaml
│   │   ├── 02-login-validation.yaml
│   │   ├── 03-logout-flow.yaml
│   │   └── 04-session-persistence.yaml
│   ├── appointments/
│   │   ├── 01-view-appointments.yaml
│   │   ├── 02-create-appointment.yaml
│   │   ├── 03-appointment-details.yaml
│   │   ├── 04-pull-to-refresh.yaml
│   │   └── 05-cancel-appointment.yaml
│   ├── readings/
│   │   ├── 01-view-readings.yaml
│   │   ├── 02-filter-readings.yaml
│   │   └── 03-readings-chart.yaml
│   ├── settings/
│   │   ├── 01-theme-toggle.yaml
│   │   ├── 02-language-switch.yaml
│   │   └── 03-save-preferences.yaml
│   ├── navigation/
│   │   ├── 01-tab-navigation.yaml
│   │   ├── 02-back-button.yaml
│   │   └── 03-deep-links.yaml
│   ├── mobile/
│   │   ├── 01-orientation-change.yaml
│   │   ├── 02-app-lifecycle.yaml
│   │   ├── 03-swipe-gestures.yaml
│   │   └── 04-keyboard-handling.yaml
│   └── flows/
│       ├── common-login.yaml
│       ├── common-navigation.yaml
│       └── common-setup.yaml
├── screenshots/
│   ├── baseline/
│   └── results/
└── config/
    ├── android-config.yaml
    └── ios-config.yaml
```

---

## Test Categories

### 1. Authentication Tests (`auth/`)

**Purpose**: Verify login, logout, and session management flows.

**Mapped Playwright Tests**:
- `src/app/tests/integration/enhanced/auth-user-journey.spec.ts`
- `src/app/tests/integration/features/auth-flow.spec.ts`

**Test Files**:

#### `01-login-flow.yaml`
- Launch app
- Navigate to login page
- Fill DNI: `1000`
- Fill password: `tuvieja`
- Tap submit button
- Assert navigation to dashboard
- Screenshot: `auth-login-success.png`

#### `02-login-validation.yaml`
- Launch app
- Navigate to login page
- Submit empty form
- Assert validation errors visible
- Fill invalid DNI: `abc`
- Assert validation error
- Screenshot: `auth-validation-errors.png`

#### `03-logout-flow.yaml`
- Login via `flows/common-login.yaml`
- Navigate to profile tab
- Tap logout button
- Confirm logout alert
- Assert navigation to welcome/login
- Screenshot: `auth-logout-complete.png`

#### `04-session-persistence.yaml`
- Login via `flows/common-login.yaml`
- Navigate to dashboard
- Background app (5 seconds)
- Foreground app
- Assert still on dashboard (session persisted)
- Screenshot: `auth-session-persisted.png`

---

### 2. Appointments Tests (`appointments/`)

**Purpose**: Test appointment viewing, creation, and interaction.

**Mapped Playwright Tests**:
- `src/app/tests/integration/enhanced/appointments-interaction.spec.ts`
- `src/app/tests/integration/flows/appointments.spec.ts`

**Test Files**:

#### `01-view-appointments.yaml`
- Login via `flows/common-login.yaml`
- Navigate to appointments tab
- Assert appointment list visible
- Assert at least 1 appointment card
- Screenshot: `appointments-list-view.png`

#### `02-create-appointment.yaml`
- Login and navigate to appointments
- Tap "Create Appointment" FAB button
- Select doctor from dropdown
- Select date via ion-datetime
- Select time via ion-datetime
- Input reason: "Control de rutina"
- Tap submit
- Assert success toast
- Assert new appointment in list
- Screenshot: `appointments-create-success.png`

#### `03-appointment-details.yaml`
- Login and navigate to appointments
- Tap first appointment card
- Assert detail page visible
- Assert doctor name visible
- Assert date/time visible
- Screenshot: `appointments-detail-view.png`

#### `04-pull-to-refresh.yaml`
- Login and navigate to appointments
- Perform pull-to-refresh gesture (swipe down from top)
- Assert loading spinner appears
- Wait for data reload
- Assert appointments list updated
- Screenshot: `appointments-after-refresh.png`

#### `05-cancel-appointment.yaml`
- Login and navigate to appointments
- Tap first upcoming appointment
- Tap "Cancel Appointment" button
- Confirm cancellation in alert
- Assert appointment status changed to "Cancelled"
- Screenshot: `appointments-cancelled.png`

---

### 3. Readings Tests (`readings/`)

**Purpose**: Test glucose readings display and filtering.

**Mapped Playwright Tests**:
- `src/app/tests/integration/flows/readings.spec.ts`

**Test Files**:

#### `01-view-readings.yaml`
- Login via `flows/common-login.yaml`
- Navigate to readings tab
- Assert readings list visible
- Assert glucose values displayed
- Scroll down to load more
- Screenshot: `readings-list-view.png`

#### `02-filter-readings.yaml`
- Login and navigate to readings
- Tap filter button
- Select date range: "Last 7 days"
- Apply filter
- Assert readings filtered
- Screenshot: `readings-filtered.png`

#### `03-readings-chart.yaml`
- Login and navigate to readings
- Tap "Chart View" toggle
- Assert chart visible
- Assert data points plotted
- Screenshot: `readings-chart-view.png`

---

### 4. Settings Tests (`settings/`)

**Purpose**: Test theme toggle, language switching, and preferences.

**Mapped Playwright Tests**:
- `src/app/tests/integration/features/theme-toggle.spec.ts`
- `src/app/tests/integration/features/theme-switching.spec.ts`
- `src/app/tests/integration/features/language-switching.spec.ts`

**Test Files**:

#### `01-theme-toggle.yaml`
- Login via `flows/common-login.yaml`
- Navigate to profile → settings
- Assert current theme is "light"
- Tap theme select dropdown
- Select "dark" option
- Assert body class contains "dark-theme"
- Screenshot: `settings-dark-theme.png`
- Select "auto" option
- Assert body class reflects system preference
- Screenshot: `settings-auto-theme.png`

#### `02-language-switch.yaml`
- Login and navigate to settings
- Assert current language is "Español"
- Tap language dropdown
- Select "English"
- Assert UI text changed to English
- Assert "Settings" title visible (was "Ajustes")
- Screenshot: `settings-language-english.png`
- Switch back to "Español"
- Assert "Ajustes" title visible
- Screenshot: `settings-language-spanish.png`

#### `03-save-preferences.yaml`
- Login and navigate to settings
- Change theme to "dark"
- Change language to "English"
- Tap "Save Settings" button
- Assert success toast
- Navigate away and back
- Assert preferences persisted
- Screenshot: `settings-preferences-saved.png`

---

### 5. Navigation Tests (`navigation/`)

**Purpose**: Test tab navigation, back button, and deep linking.

**Mapped Playwright Tests**:
- `src/app/tests/integration/enhanced/auth-user-journey.spec.ts` (navigation sections)

**Test Files**:

#### `01-tab-navigation.yaml`
- Login via `flows/common-login.yaml`
- Assert on "Dashboard" tab
- Tap "Readings" tab
- Assert readings page visible
- Tap "Appointments" tab
- Assert appointments page visible
- Tap "Profile" tab
- Assert profile page visible
- Tap "Dashboard" tab
- Assert back on dashboard
- Screenshot: `navigation-tab-sequence.png`

#### `02-back-button.yaml`
- Login and navigate to dashboard
- Navigate to appointments
- Tap first appointment card (navigate to detail)
- Press Android back button
- Assert back on appointments list
- Press back button again
- Assert on dashboard (or previous tab)
- Screenshot: `navigation-back-button.png`

#### `03-deep-links.yaml`
- Launch app with deep link: `diabetactic://appointments/123`
- Assert redirected to login (if not authenticated)
- Login
- Assert navigated to appointment detail #123
- Screenshot: `navigation-deep-link-appointment.png`

---

### 6. Mobile-Specific Tests (`mobile/`)

**Purpose**: Test mobile-specific behaviors (orientation, lifecycle, gestures).

**No Direct Playwright Mapping** (Mobile-native behaviors)

**Test Files**:

#### `01-orientation-change.yaml`
- Login and navigate to dashboard
- Screenshot: `mobile-portrait-dashboard.png`
- Rotate device to landscape
- Assert UI adapts to landscape
- Assert all elements still visible
- Screenshot: `mobile-landscape-dashboard.png`
- Rotate back to portrait
- Assert UI back to portrait layout
- Screenshot: `mobile-portrait-restored.png`

#### `02-app-lifecycle.yaml`
- Login and navigate to appointments
- Background app (10 seconds)
- Foreground app
- Assert appointments list still visible
- Assert data persisted
- Screenshot: `mobile-after-background.png`
- Background app (30 seconds)
- Foreground app
- Assert session still valid
- Screenshot: `mobile-long-background.png`

#### `03-swipe-gestures.yaml`
- Login and navigate to appointments
- Swipe left on appointment card
- Assert swipe actions revealed (e.g., delete, edit)
- Screenshot: `mobile-swipe-actions.png`
- Swipe right to dismiss
- Assert card back to normal
- Screenshot: `mobile-swipe-dismissed.png`

#### `04-keyboard-handling.yaml`
- Launch app
- Navigate to login
- Tap DNI input
- Assert keyboard appears
- Assert UI scrolls to keep input visible
- Screenshot: `mobile-keyboard-visible.png`
- Dismiss keyboard
- Assert UI returns to normal
- Screenshot: `mobile-keyboard-hidden.png`

---

## Reusable Flows (`flows/`)

Maestro supports composable flows for common sequences.

### `common-login.yaml`
```yaml
appId: io.diabetactic.app
---
- launchApp
- tapOn: "Login"
- inputText: "1000"
- tapOn: "Password"
- inputText: "tuvieja"
- tapOn:
    id: "login-submit-btn"
- assertVisible: "Dashboard"
```

### `common-navigation.yaml`
```yaml
appId: io.diabetactic.app
---
- tapOn:
    text: "${TAB_NAME}"
- assertVisible: "${TAB_NAME}"
```

### `common-setup.yaml`
```yaml
appId: io.diabetactic.app
env:
  BACKEND_URL: "http://10.0.2.2:8000"
  USE_MOCK_DATA: "true"
---
- launchApp:
    clearState: true
```

---

## Test Data Strategy

### Approach
- **Use existing mock data** from `src/assets/mocks/`
- **Inject via environment variables** and API mocking
- **Leverage demo mode** (`environment.features.devTools = true`)

### Mock Data Files
- `src/assets/mocks/tidepool/readings_30d.json`: 90 glucose readings (30 days)

### Test Credentials
```yaml
validUser:
  dni: "1000"
  password: "tuvieja"

demoMode: true
```

### Data Injection
- Use Maestro environment variables:
  ```bash
  maestro test --env BACKEND_URL=http://10.0.2.2:8000 \
               --env USE_MOCK_DATA=true \
               tests/appointments/
  ```

- Configure backend mock responses via network conditions
- Use `clearState: true` in `launchApp` for clean test runs

---

## Device Configuration

### Android Emulator
```yaml
name: Pixel_8_API_34
platform: Android
version: 14
screenSize: 1080x2400
density: 420dpi
```

**Setup**:
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_8_API_34 -netdelay none -netspeed full
```

### iOS Simulator
```yaml
name: iPhone 15
platform: iOS
version: 17.0
screenSize: 1179x2556
```

**Setup**:
```bash
# List available simulators
xcrun simctl list devices

# Boot simulator
xcrun simctl boot "iPhone 15"
```

---

## Environment Configuration

### Backend Services
From `src/environments/environment.ts`:

```typescript
backendServices: {
  appointments: {
    baseUrl: "http://10.0.2.2:8000",  // Android emulator
    apiPath: "/appointments"
  },
  auth: {
    baseUrl: "http://10.0.2.2:8000"
  }
}
```

**Note**: Android emulator uses `10.0.2.2` to access host machine's `localhost`.

### Feature Flags
```typescript
features: {
  offlineMode: true,
  useTidepoolMock: true,
  devTools: true
}
```

---

## Common Maestro Patterns

### Ionic Component Selectors
```yaml
# Button
- tapOn:
    id: "ion-button"

# Card
- tapOn:
    id: "ion-card"

# Input
- tapOn:
    id: "ion-input"
- inputText: "value"

# Select dropdown
- tapOn:
    id: "ion-select"
- tapOn:
    text: "Option value"

# Toggle
- tapOn:
    id: "ion-toggle"

# Datetime picker
- tapOn:
    id: "ion-datetime"
- tapOn:
    text: "Nov 15, 2025"
```

### Gestures
```yaml
# Tap
- tapOn: "Button text"
- tapOn:
    id: "element-id"

# Scroll
- scroll
- scrollUntilVisible: "Element text"

# Swipe
- swipe:
    direction: LEFT
    from:
      x: 300
      y: 500

# Pull-to-refresh
- swipe:
    direction: DOWN
    from:
      x: 200
      y: 100

# Input text
- inputText: "Text value"

# Assert visibility
- assertVisible: "Expected text"
- assertVisible:
    id: "element-id"
```

### Screenshots
```yaml
# Capture screenshot
- takeScreenshot: "screenshots/test-step-name.png"

# With delay for animations
- wait:
    seconds: 1
- takeScreenshot: "screenshots/after-animation.png"
```

### Network Conditions
```bash
# Test offline mode
maestro test --offline tests/appointments/01-view-appointments.yaml

# Slow network
maestro test --network slow tests/appointments/04-pull-to-refresh.yaml
```

### Conditional Flows
```yaml
# Run flow if element exists
- runFlow:
    file: flows/common-login.yaml
    when:
      visible: "Login"

# Conditional assertion
- assertVisible:
    text: "Dashboard"
    optional: true
```

---

## Screenshot Strategy

### Capture Points
1. **Initial state**: Before any action
2. **After action**: Immediately after user interaction
3. **Success state**: After successful operation
4. **Error state**: When validation/errors occur

### Naming Convention
```
{category}-{step}-{state}.png

Examples:
- auth-login-success.png
- appointments-create-form.png
- settings-dark-theme.png
- mobile-landscape-dashboard.png
```

### Storage
```
maestro/screenshots/
├── baseline/           # Reference screenshots
│   ├── auth/
│   ├── appointments/
│   └── settings/
└── results/            # Test run screenshots
    ├── 2025-11-10/
    └── latest/
```

---

## Maestro Features

### Network Conditions
```bash
# Offline mode
maestro test --offline tests/

# Slow network
maestro test --network slow tests/

# Custom latency
maestro test --network custom --latency 500 tests/
```

### Tags
Organize tests with tags for selective execution:

```yaml
appId: io.diabetactic.app
tags:
  - smoke
  - auth
---
- launchApp
- tapOn: "Login"
```

Run by tag:
```bash
maestro test --tag smoke tests/
```

### Flows Composition
```yaml
# Call reusable flow
- runFlow: flows/common-login.yaml

# Pass environment variables
- runFlow:
    file: flows/common-navigation.yaml
    env:
      TAB_NAME: "Appointments"
```

### Assertions
```yaml
# Visibility
- assertVisible: "Dashboard"
- assertNotVisible: "Login"

# Text content
- assertVisible:
    text: "Welcome"
    index: 0  # First occurrence

# Element state
- assertTrue:
    selector:
      id: "ion-toggle"
    attribute: "checked"
```

---

## Execution Commands

### Run All Tests
```bash
cd maestro
maestro test tests/
```

### Run Category
```bash
maestro test tests/auth/
maestro test tests/appointments/
```

### Run Single Test
```bash
maestro test tests/auth/01-login-flow.yaml
```

### Run with Environment Variables
```bash
maestro test \
  --env BACKEND_URL=http://10.0.2.2:8000 \
  --env USE_MOCK_DATA=true \
  tests/appointments/
```

### Run by Tag
```bash
maestro test --tag smoke tests/
maestro test --tag regression tests/
```

### Continuous Mode (Watch)
```bash
maestro test --continuous tests/auth/01-login-flow.yaml
```

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Maestro Mobile Tests

on: [push, pull_request]

jobs:
  maestro-android:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Setup Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          script: |
            npm run cap:sync
            npm run cap:build:android
            maestro test maestro/tests/

      - name: Upload Screenshots
        uses: actions/upload-artifact@v3
        with:
          name: maestro-screenshots
          path: maestro/screenshots/results/
```

---

## Comparison: Maestro vs Playwright

| Aspect | Maestro | Playwright |
|--------|---------|-----------|
| **Platform** | Native mobile (iOS/Android) | Web browser (desktop/mobile web) |
| **Syntax** | YAML (declarative) | TypeScript (imperative) |
| **Gestures** | Native touch, swipe, pinch | Click, hover, keyboard |
| **App Lifecycle** | Background/foreground, orientation | Tab visibility, reload |
| **Network Mocking** | Built-in (`--offline`) | HTTP interceptors |
| **Screenshots** | Built-in (`takeScreenshot`) | Built-in (`screenshot()`) |
| **Speed** | Fast (native automation) | Fast (browser automation) |
| **Use Case** | Mobile-native behaviors | Web UI interactions |

**Complementary Approach**:
- Use **Playwright** for web-focused integration tests (forms, navigation, API mocking)
- Use **Maestro** for mobile-native scenarios (gestures, lifecycle, orientation)

---

## Next Steps

1. **Create base flow templates** (`flows/common-*.yaml`)
2. **Implement authentication tests** (`auth/01-login-flow.yaml`)
3. **Set up Android emulator** configuration
4. **Create first screenshot baseline** for visual comparison
5. **Integrate with CI/CD** pipeline
6. **Expand to appointments tests** after auth is stable
7. **Add mobile-specific tests** (orientation, lifecycle)
8. **Document test results** and screenshot diffs

---

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/getting-started)
- [Maestro CLI Reference](https://maestro.mobile.dev/cli/commands)
- [Ionic Framework Testing](https://ionicframework.com/docs/testing/overview)
- [Capacitor Native APIs](https://capacitorjs.com/docs/apis)
- [Android Emulator Setup](https://developer.android.com/studio/run/emulator)
- [Xcode Simulator](https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device)

---

## Appendix: Playwright Test Mapping

### Authentication
| Playwright Test | Maestro Equivalent |
|-----------------|-------------------|
| `auth-user-journey.spec.ts`: "Complete login flow" | `auth/01-login-flow.yaml` |
| `auth-user-journey.spec.ts`: "Failed login with error" | `auth/02-login-validation.yaml` |
| `auth-user-journey.spec.ts`: "Navigation guards" | `auth/04-session-persistence.yaml` |

### Appointments
| Playwright Test | Maestro Equivalent |
|-----------------|-------------------|
| `appointments-interaction.spec.ts`: "Render appointment list" | `appointments/01-view-appointments.yaml` |
| `appointments-interaction.spec.ts`: "Pull-to-refresh" | `appointments/04-pull-to-refresh.yaml` |
| `appointments-interaction.spec.ts`: "Card interaction" | `appointments/03-appointment-details.yaml` |
| `appointments-interaction.spec.ts`: "Form interaction" | `appointments/02-create-appointment.yaml` |

### Settings
| Playwright Test | Maestro Equivalent |
|-----------------|-------------------|
| `theme-toggle.spec.ts`: "Switch to dark theme" | `settings/01-theme-toggle.yaml` |
| `language-switching.spec.ts`: "Switch UI language" | `settings/02-language-switch.yaml` |

---

**Architecture Version**: 1.0
**Last Updated**: 2025-11-10
**Status**: Ready for Implementation

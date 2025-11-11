# Maestro Mobile Testing Suite

This directory contains Maestro test files for native mobile UI automation of the Diabetify app.

## Quick Start

### Prerequisites

1. **Install Maestro**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   export PATH="$PATH:$HOME/.maestro/bin"
   maestro --version
   ```

2. **Set up Android Emulator**:
   ```bash
   # List available emulators
   emulator -list-avds

   # Start emulator
   emulator -avd Pixel_8_API_34
   ```

3. **Build and install app**:
   ```bash
   npm run cap:sync
   npm run cap:build:android

   # Install APK to emulator
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Run Tests

```bash
# Run all tests
maestro test tests/

# Run specific category
maestro test tests/auth/

# Run single test
maestro test tests/auth/01-login-flow.yaml

# Run with environment variables
maestro test --env USE_MOCK_DATA=true tests/

# Run by tag
maestro test --tag smoke tests/
```

## Directory Structure

```
maestro/
├── README.md                    # This file
├── tests/
│   ├── flows/                   # Reusable flows
│   │   └── common-login.yaml    # Login flow
│   ├── auth/                    # Authentication tests
│   │   └── 01-login-flow.yaml   # Complete login test
│   ├── appointments/            # Appointment tests
│   ├── readings/                # Readings tests
│   ├── settings/                # Settings tests
│   ├── navigation/              # Navigation tests
│   └── mobile/                  # Mobile-specific tests
└── screenshots/                 # Test screenshots
    ├── baseline/
    └── results/
```

## Test Categories

### Authentication (`auth/`)
- Complete login flow
- Form validation
- Logout flow
- Session persistence

### Appointments (`appointments/`)
- View appointments list
- Create appointment
- Appointment details
- Pull-to-refresh
- Cancel appointment

### Readings (`readings/`)
- View readings list
- Filter readings
- Readings chart view

### Settings (`settings/`)
- Theme toggle (light/dark/auto)
- Language switch (English/Spanish)
- Save preferences

### Navigation (`navigation/`)
- Tab navigation
- Back button handling
- Deep linking

### Mobile-Specific (`mobile/`)
- Orientation changes
- App lifecycle (background/foreground)
- Swipe gestures
- Keyboard handling

## Prerequisites

1. **Install Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   export PATH="$PATH:$HOME/.maestro/bin"
   maestro --version
   ```

2. **Build the app** (if testing on real device):
   ```bash
   # For Android
   npm run cap:sync
   cd android && ./gradlew assembleDebug

   # For iOS
   npm run cap:sync
   # Open Xcode and build
   ```

3. **Start a device/emulator**:
   ```bash
   # Android emulator
   emulator -avd Pixel_6_API_33

   # iOS simulator
   open -a Simulator
   ```

## Running Tests

### Run all tests sequentially:
```bash
maestro test maestro/tests/
```

### Run a specific test:
```bash
maestro test maestro/tests/01-login-flow.yaml
```

### Run with continuous mode (watch for changes):
```bash
maestro test --continuous maestro/tests/01-login-flow.yaml
```

### Run and generate report:
```bash
maestro test maestro/tests/ --format junit --output test-results.xml
```

## Test Data

All tests use the demo credentials:
- **DNI**: 1000
- **Password**: tuvieja

This account has pre-populated data:
- 30 days of glucose readings
- 3 upcoming appointments
- 2 past appointments
- Complete user profile

## Screenshots

Test screenshots are automatically saved to `maestro/tests/screenshots/` directory with descriptive names:
- `01_welcome_screen.png` - Initial app screen
- `04_login_success_dashboard.png` - After successful login
- `07_dashboard_stat_cards.png` - Dashboard with stat cards
- etc.

## Debugging Tests

### Run with debug mode:
```bash
maestro test --debug maestro/tests/01-login-flow.yaml
```

### View Maestro Studio (interactive mode):
```bash
maestro studio
```

### Check device connection:
```bash
maestro test --device <device-id>
```

## CI/CD Integration

### GitHub Actions Example:
```yaml
- name: Run Maestro Tests
  uses: mobile-dev-inc/action-maestro-cloud@v1
  with:
    api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
    app-file: android/app/build/outputs/apk/debug/app-debug.apk
    flows: maestro/tests/
```

## Test Architecture

Each test follows this pattern:
1. **Setup**: Launch app, wait for animations
2. **Action**: Interact with UI elements (tap, input, scroll)
3. **Assertion**: Verify expected elements are visible
4. **Teardown**: Take screenshots, handle cleanup

### Best Practices Used:
- ✅ Descriptive test names and comments
- ✅ Wait for animations between actions
- ✅ Language-agnostic selectors (English/Spanish)
- ✅ Screenshots at critical checkpoints
- ✅ Proper assertion placement
- ✅ Scroll and refresh handling

## Troubleshooting

### Test fails immediately:
- Verify app is installed: `adb shell pm list packages | grep diabetactic`
- Check appId matches: `io.diabetactic.app` (see `capacitor.config.ts`)

### Element not found:
- Run `maestro studio` to inspect current UI hierarchy
- Adjust selectors to match actual element IDs/text

### Timeout errors:
- Increase timeout in `waitForAnimationToEnd`
- Add explicit `wait` commands between actions

### Language mismatch:
- Tests support both English and Spanish using OR patterns: `.*English.*|.*Español.*`

## Related Documentation

- [Maestro Documentation](https://maestro.mobile.dev/docs)
- [App Architecture](../../docs/ARCHITECTURE.md)
- [Demo Credentials](../../docs/DEMO_CREDENTIALS.md)
- [Testing Guide](../../docs/TESTING_GUIDE.md)

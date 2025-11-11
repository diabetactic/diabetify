# Maestro Test Infrastructure Setup Guide

## Overview

This document provides a comprehensive guide to the Maestro test infrastructure for the Diabetify mobile application. The infrastructure includes reusable flows, centralized configuration, and complete documentation for mobile UI testing.

## Created Infrastructure

### Directory Structure

```
maestro/
├── README.md                       # Complete testing guide
├── config/
│   ├── test-data.yaml             # Test credentials and data values
│   └── selectors.yaml             # UI element selectors
├── flows/
│   ├── auth-login.yaml            # Reusable authentication flow
│   ├── navigate-to-tab.yaml       # Tab navigation helper
│   ├── wait-for-data-load.yaml    # Loading state handler
│   ├── logout.yaml                # Logout flow
│   └── verify-offline-mode.yaml   # Offline mode testing
├── tests/
│   ├── 01-launch-app.yaml         # Existing: App launch test
│   ├── 02-navigation.yaml         # Existing: Navigation test
│   ├── 03-theme-toggle.yaml       # Existing: Theme test
│   └── 04-language-switch.yaml    # Existing: Language test
└── screenshots/                    # Auto-generated screenshots
```

### Files Created

#### 1. Reusable Flows (5 files)

**maestro/flows/auth-login.yaml**
- Complete login flow with environment variable support
- Handles welcome screen, login form, and verification
- Supports: USERNAME, PASSWORD, CLEAR_STATE, CLEAR_KEYCHAIN
- Takes verification screenshot

**maestro/flows/navigate-to-tab.yaml**
- Universal tab navigation helper
- Required variable: TAB_NAME (Dashboard, Readings, Appointments, Profile)
- Verifies successful navigation
- Captures screenshot for each tab

**maestro/flows/wait-for-data-load.yaml**
- Waits for loading indicators to disappear
- Handles async data loading
- Configurable timeout and data indicators
- Takes screenshot after load completes

**maestro/flows/logout.yaml**
- Complete logout flow
- Navigates to Profile, scrolls, and taps logout
- Verifies return to welcome/login screen
- Captures logout confirmation

**maestro/flows/verify-offline-mode.yaml**
- Tests offline-first functionality
- Enables airplane mode programmatically
- Verifies cached data accessibility
- Disables airplane mode and waits for reconnection

#### 2. Configuration Files (2 files)

**maestro/config/test-data.yaml**
- Demo user credentials (DEMO_USER_EMAIL, DEMO_USER_PASSWORD)
- Additional test users (TEST_USER_1, TEST_USER_2)
- Tidepool demo credentials
- Test data values (glucose readings, dates, appointments)
- Timeout configurations
- Language and theme settings

**maestro/config/selectors.yaml**
- Organized by screen (Auth, Dashboard, Readings, Appointments, Profile)
- Common UI elements (buttons, loaders, errors)
- Theme and language toggles
- Tidepool integration elements
- Form elements, cards, and lists

#### 3. Documentation

**maestro/README.md** (Comprehensive guide with 10+ sections)
- Overview and prerequisites
- Installation instructions
- Project structure
- Running tests (npm scripts and CLI)
- Writing tests guide
- Reusable flows documentation
- Configuration usage
- Troubleshooting (6 common issues)
- CI/CD integration (GitHub Actions, Maestro Cloud, GitLab)
- Best practices

### NPM Scripts Added

```json
{
  "scripts": {
    "test:maestro": "maestro test maestro/tests/",
    "test:maestro:flow": "maestro test",
    "test:maestro:studio": "maestro studio",
    "test:maestro:continuous": "maestro test maestro/tests/ --continuous"
  }
}
```

## Usage Examples

### 1. Using Reusable Login Flow

```yaml
appId: io.diabetactic.app
---
# Test requiring authentication

# Login with default credentials
- runFlow: maestro/flows/auth-login.yaml

# Continue with authenticated test
- tapOn: "Dashboard"
- assertVisible: "Glucose Data"
```

### 2. Using Configuration

```yaml
appId: io.diabetactic.app
---
# Test using centralized config

# Login with config values
- runFlow:
    file: maestro/flows/auth-login.yaml
    env:
      USERNAME: ${DEMO_USER_EMAIL}
      PASSWORD: ${DEMO_USER_PASSWORD}

# Use selectors from config
- assertVisible: ${DASHBOARD_TITLE}
- tapOn: ${TAB_READINGS}
```

### 3. Complete User Journey Test

```yaml
appId: io.diabetactic.app
---
# Test: Complete user journey

# 1. Login
- runFlow: maestro/flows/auth-login.yaml

# 2. Navigate to each tab
- runFlow:
    file: maestro/flows/navigate-to-tab.yaml
    env:
      TAB_NAME: "Dashboard"

- runFlow:
    file: maestro/flows/navigate-to-tab.yaml
    env:
      TAB_NAME: "Readings"

- runFlow:
    file: maestro/flows/navigate-to-tab.yaml
    env:
      TAB_NAME: "Appointments"

# 3. Test offline mode
- runFlow: maestro/flows/verify-offline-mode.yaml

# 4. Logout
- runFlow: maestro/flows/logout.yaml
```

## Quick Start Commands

```bash
# 1. Install Maestro (if not installed)
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"

# 2. Verify installation
maestro --version

# 3. Build and install app
npm run build
npm run cap:sync
npm run cap:run:android

# 4. Run all tests
npm run test:maestro

# 5. Run specific test
npm run test:maestro:flow -- maestro/tests/01-launch-app.yaml

# 6. Interactive development
npm run test:maestro:studio

# 7. Watch mode (auto-rerun on changes)
npm run test:maestro:continuous
```

## Integration with Existing Tests

The existing test files (01-launch-app.yaml, 02-navigation.yaml, 03-theme-toggle.yaml, 04-language-switch.yaml) can now be enhanced using the reusable flows:

### Example: Enhanced Navigation Test

**Before** (maestro/tests/02-navigation.yaml):
```yaml
appId: io.diabetactic.app
---
- launchApp
- assertVisible: "Diabetactic"
- tapOn: "Dashboard"
- assertVisible: "Dashboard"
- takeScreenshot: maestro/screenshots/02-dashboard.png
```

**After** (using reusable flows):
```yaml
appId: io.diabetactic.app
---
# Enhanced navigation test with reusable flows

- launchApp
- assertVisible: "Diabetactic"

# Use reusable navigation flow
- runFlow:
    file: maestro/flows/navigate-to-tab.yaml
    env:
      TAB_NAME: "Dashboard"

# Wait for data to load
- runFlow: maestro/flows/wait-for-data-load.yaml
```

## Configuration Management

### Test Data Variables

All test data is centralized in `maestro/config/test-data.yaml`:

```yaml
# Credentials
DEMO_USER_EMAIL: "demo@diabetactic.com"
DEMO_USER_PASSWORD: "demo123"

# Timeouts
DEFAULT_TIMEOUT: 10000
ANIMATION_TIMEOUT: 3000
DATA_LOAD_TIMEOUT: 15000

# Settings
DEFAULT_LANGUAGE: "en"
DEFAULT_THEME: "light"
```

### UI Selectors

All UI selectors are in `maestro/config/selectors.yaml`:

```yaml
# Navigation
TAB_DASHBOARD: "Dashboard"
TAB_READINGS: "Readings"
TAB_APPOINTMENTS: "Appointments"
TAB_PROFILE: "Profile"

# Common elements
LOADING_INDICATOR: "Loading"
ERROR_MESSAGE: "Error"
SUCCESS_MESSAGE: "Success"
```

## Troubleshooting Reference

### Common Issues and Solutions

1. **Maestro not found**: Install with `curl -Ls "https://get.maestro.mobile.dev" | bash`
2. **No devices**: Start emulator with `emulator -avd <name>` or check `adb devices`
3. **App not installed**: Run `npm run cap:run:android` or manually install APK
4. **Element not found**: Add timeout, use regex, or take screenshot to debug
5. **Test timeout**: Increase timeout in flow or environment variable
6. **Permission dialogs**: Grant permissions with `evalScript` or handle in test

Full troubleshooting guide available in `maestro/README.md`.

## CI/CD Integration

### GitHub Actions Template

```yaml
name: Maestro Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run cap:sync
      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH
      - name: Run Tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          script: |
            adb install android/app/build/outputs/apk/debug/app-debug.apk
            maestro test maestro/tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: screenshots
          path: maestro/screenshots/
```

### Maestro Cloud (Recommended)

```bash
# Upload to Maestro Cloud for parallel testing
maestro cloud \
  --apiKey $MAESTRO_CLOUD_API_KEY \
  android/app/build/outputs/apk/debug/app-debug.apk \
  maestro/tests/
```

## Benefits of This Infrastructure

1. **Reusability**: Common flows (login, navigation, logout) used across all tests
2. **Maintainability**: Centralized configuration for test data and selectors
3. **Consistency**: Standardized patterns for all tests
4. **Scalability**: Easy to add new tests using existing building blocks
5. **Documentation**: Comprehensive README with examples and troubleshooting
6. **CI/CD Ready**: Templates for GitHub Actions, GitLab CI, and Maestro Cloud
7. **Developer Experience**: npm scripts for quick test execution
8. **Debugging**: Screenshot capture and Maestro Studio integration

## Next Steps

1. **Enhance Existing Tests**: Update current test files to use reusable flows
2. **Add More Flows**: Create flows for specific features (e.g., adding readings, booking appointments)
3. **Integrate CI/CD**: Set up GitHub Actions workflow using provided template
4. **Expand Configuration**: Add more test data and selectors as needed
5. **Run Tests Regularly**: Make Maestro tests part of development workflow

## Resources

- **Main Documentation**: `maestro/README.md` (comprehensive guide)
- **Reusable Flows**: `maestro/flows/` (5 pre-built flows)
- **Configuration**: `maestro/config/` (test-data.yaml, selectors.yaml)
- **Examples**: `maestro/tests/` (4 existing tests to learn from)
- **Maestro Docs**: https://maestro.mobile.dev/docs

## Memory Status

Stored in claude-flow memory under key `maestro-helpers-status`:
- 5 reusable flows created
- 2 configuration files created
- 1 comprehensive README
- 4 npm scripts added
- Complete setup guide in docs/

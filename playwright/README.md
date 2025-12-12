# Playwright E2E Tests

Comprehensive end-to-end testing suite for Diabetactic mobile app.

## Test Projects

The configuration supports multiple test environments:

### 1. **mobile-chromium** (Primary)

- Mobile-optimized web testing
- Simulates Pixel 5 device (390x844 viewport)
- Touch events enabled
- Default for `npm run test:e2e`

### 2. **desktop-chromium** (Secondary)

- Desktop web testing
- 1280x720 viewport
- For responsive design validation
- Run with: `npm run test:e2e -- --project=desktop-chromium`

### 3. **mobile-webkit** (Optional)

- iPhone 14 simulation
- WebKit engine
- iOS-specific testing
- Run with: `npm run test:e2e -- --project=mobile-webkit`

## Running Tests

```bash
# Run all tests (mobile-chromium by default)
npm run test:e2e

# Run specific project
npm run test:e2e -- --project=mobile-chromium
npm run test:e2e -- --project=desktop-chromium
npm run test:e2e -- --project=mobile-webkit

# Run with headed browser (see UI)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- profile-edit.spec.ts

# Run accessibility tests only
npm run test:a11y

# Run with specific environment
E2E_HEROKU_TESTS=true npm run test:e2e
```

## Test Categories

### Core Functionality

- `e2e-flow.spec.ts` - Full user journey
- `appointment-full-flow.spec.ts` - Appointment state machine
- `heroku-integration.spec.ts` - Production API integration

### UI & Accessibility

- `accessibility-audit.spec.ts` - WCAG compliance
- `settings-theme.spec.ts` - Theme switching

### Features

- `profile-edit.spec.ts` - Profile editing
- `settings-persistence.spec.ts` - Settings persistence
- `error-handling.spec.ts` - Error scenarios

## Environment Variables

```bash
# Test credentials
E2E_TEST_USERNAME=1000
E2E_TEST_PASSWORD=tuvieja

# Heroku integration tests
E2E_HEROKU_TESTS=true

# Custom server
E2E_PORT=4200
E2E_HOST=localhost
E2E_BASE_URL=http://localhost:4200

# Skip starting dev server (use existing)
E2E_SKIP_SERVER=true
```

## Android Testing

### Option 1: Mobile Web Simulation (Default)

Already configured via `mobile-chromium` project. No additional setup needed.

### Option 2: Real Android Device/Emulator (Advanced)

For testing on actual Android WebView:

1. **Install Playwright Android**:

   ```bash
   npm i -D @playwright/android
   ```

2. **Connect Android device or start emulator**:

   ```bash
   adb devices  # Verify device connected
   ```

3. **Run tests on Android**:
   ```bash
   E2E_ANDROID=true npm run test:e2e
   ```

This will run tests in the real Android WebView on your device/emulator.

### Option 3: Capacitor Android App

For testing the actual Capacitor Android app:

1. **Build and install the app**:

   ```bash
   npm run mobile:install
   ```

2. **Use Maestro for native testing** (recommended):
   ```bash
   cd maestro
   maestro test tests/
   ```

Maestro is better suited for native Android app testing than Playwright.

## Test Organization

```
playwright/
├── tests/
│   ├── accessibility-audit.spec.ts   # WCAG compliance
│   ├── appointment-full-flow.spec.ts  # Appointments
│   ├── e2e-flow.spec.ts              # Core user journey
│   ├── error-handling.spec.ts        # Error scenarios
│   ├── heroku-integration.spec.ts    # API integration
│   ├── profile-edit.spec.ts          # Profile features
│   ├── settings-persistence.spec.ts  # Settings
│   └── settings-theme.spec.ts        # Theme switching
├── artifacts/                         # Test artifacts (screenshots, traces, videos)
└── README.md                         # This file
```

## CI/CD Integration

Tests run automatically in GitHub Actions on push to master/main:

- Lint + Unit tests (with coverage)
- Production build
- E2E tests (sharded Playwright)
- Netlify deployment

See `.github/workflows/ci.yml` for details.

## Troubleshooting

### Tests timeout or fail

- Increase timeout in test or config
- Check if dev server is running
- Verify network connectivity for Heroku tests

### Screenshots not captured

- Check `playwright/artifacts/` directory
- Ensure `screenshot: 'only-on-failure'` (config) or override per-test if needed

### Accessibility violations

- Review `playwright-report/` for details
- Check specific violations in test output
- Use `npm run test:a11y:headed` to debug visually

### Android tests fail

- Verify `adb devices` shows device
- Check WebView is updated on device
- Try `E2E_SKIP_SERVER=true` if server issues

## Best Practices

1. **Mobile-first**: Always test mobile viewport first
2. **Explicit waits**: Use `waitForSelector` instead of `waitForTimeout`
3. **Bilingual**: Support both English and Spanish selectors
4. **Resilient selectors**: Prefer data-testid or semantic selectors
5. **Screenshots**: Capture on failure for debugging
6. **Accessibility**: Run a11y tests regularly

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Playwright Android](https://playwright.dev/docs/android)
- [Ionic Testing Guide](https://ionicframework.com/docs/testing/overview)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

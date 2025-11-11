# Maestro + Playwright Integration Guide

Comprehensive strategy for complementary mobile and web testing in Diabetify.

## Overview

Diabetify uses a **dual-testing strategy** with Maestro and Playwright to provide comprehensive test coverage across web and mobile platforms. This guide explains how these tools complement each other and when to use each.

## Testing Architecture

```
                    Diabetify Test Suite
                            |
        +-------------------+-------------------+
        |                                       |
    Maestro                               Playwright
  (Mobile Native)                      (Web Browsers)
        |                                       |
  Android / iOS                          Chrome / Safari
  Real Devices                           Desktop / Mobile Web
  Simple UI Flows                        Complex Scenarios
```

## When to Use Each Tool

### Use Maestro For:

**Mobile-Specific Features**
- Native mobile gestures (swipe, pinch, long-press)
- Device-specific UI elements (status bar, navigation bar)
- Mobile keyboard interactions
- Device orientation changes
- Push notifications testing

**Quick Validation**
- Smoke tests on real devices
- App launch and basic navigation
- Visual UI validation with screenshots
- Regression testing on physical hardware
- Quick feedback loops during development

**Simple UI Flows**
- Tab navigation
- Button taps and form fills
- Theme switching
- Language switching
- Profile settings

**Example Maestro Test:**
```yaml
# Quick smoke test - 10 seconds
appId: io.diabetactic.app
---
- launchApp
- assertVisible: "Welcome"
- tapOn: "GET STARTED"
- tapOn: "Dashboard"
- assertVisible: "Dashboard"
```

### Use Playwright For:

**Complex Test Logic**
- Multi-step user journeys
- Conditional assertions
- API mocking and network intercepts
- Database state verification
- Complex data-driven scenarios

**Web-Specific Features**
- Browser-specific behavior
- JavaScript execution and console logs
- Network request monitoring
- Local storage / session storage
- Cookie management

**Deep Integration Testing**
- Backend service integration
- Authentication flows with API validation
- Data synchronization (Tidepool API)
- Error handling and recovery
- Performance and accessibility testing

**Example Playwright Test:**
```typescript
// Complex integration test
test('complete appointment booking with backend', async ({ page }) => {
  // Mock API responses
  await page.route('**/api/appointments', route => {
    route.fulfill({ json: mockAppointments });
  });

  // Complex user journey
  await page.goto('/appointments');
  await page.click('[data-testid="new-appointment"]');
  await page.fill('#date', '2025-12-25');
  await page.fill('#notes', 'Annual checkup');
  await page.click('button:has-text("Save")');

  // API verification
  await expect(page.locator('.success-message')).toBeVisible();

  // Network assertion
  const requests = await page.context().requests();
  expect(requests.some(r => r.url().includes('/appointments'))).toBe(true);
});
```

## Coverage Matrix

| Feature | Maestro | Playwright | Notes |
|---------|---------|------------|-------|
| **App Launch** | ✅ Primary | ⚠️ Limited | Maestro tests native app launch |
| **Navigation** | ✅ Quick checks | ✅ Deep tests | Both test navigation differently |
| **Forms** | ✅ Basic fills | ✅ Validation | Playwright for complex validation |
| **Authentication** | ⚠️ Basic flow | ✅ Full OAuth | Playwright for API integration |
| **API Mocking** | ❌ Not supported | ✅ Full support | Playwright only |
| **Theme Toggle** | ✅ Visual check | ✅ CSS validation | Both complement each other |
| **Language Switch** | ✅ UI strings | ✅ i18n validation | Both test different aspects |
| **Appointments** | ✅ UI flow | ✅ CRUD + API | Maestro for UI, Playwright for logic |
| **Readings** | ✅ Display check | ✅ Data sync | Playwright for Tidepool integration |
| **Profile** | ✅ Settings UI | ✅ Data persistence | Both test different layers |
| **Offline Mode** | ✅ Device network | ✅ IndexedDB | Playwright for storage verification |
| **Gestures** | ✅ Native gestures | ❌ Limited | Maestro only |
| **Screenshots** | ✅ Native quality | ✅ Browser quality | Both capture screenshots |
| **Performance** | ⚠️ Basic | ✅ Detailed metrics | Playwright for performance |
| **Accessibility** | ⚠️ Limited | ✅ Full a11y tests | Playwright for WCAG compliance |

**Legend:**
- ✅ Fully Supported
- ⚠️ Partially Supported / Best for specific scenarios
- ❌ Not Supported / Not Recommended

## Test Organization Strategy

### Current Test Counts

**Playwright Tests:** 4 test files
```
playwright/tests/
├── app-smoke.spec.ts           # Basic app health
├── basic-navigation.spec.ts    # Tab navigation
├── settings-theme.spec.ts      # Theme switching
└── user-journey.spec.ts        # Complete user flow
```

**Karma/Jasmine Integration Tests:** 14 test files
```
src/app/tests/integration/
├── backend/                     # API integration (3 files)
├── components/                  # Component DOM (2 files)
├── enhanced/                    # Enhanced flows (3 files)
├── features/                    # Feature tests (5 files)
└── flows/                       # User flows (3 files)
```

**Maestro Tests:** 5 test files
```
maestro/tests/
├── 01-launch-and-navigate.yaml  # App launch
├── 02-navigation.yaml           # Tab navigation
├── 03-theme-toggle.yaml         # Theme switching
├── 04-language-switch.yaml      # Language switching
└── 05-appointments-flow.yaml    # Appointments workflow
```

### Recommended Test Distribution

**Maestro (Mobile Native) - 20% of tests**
- App launch and welcome flow
- Basic tab navigation
- Visual UI verification
- Quick smoke tests
- Device-specific features

**Playwright (Web E2E) - 30% of tests**
- Complex user journeys
- API integration scenarios
- Network mocking
- Performance and accessibility
- Cross-browser testing

**Karma/Jasmine (Integration) - 50% of tests**
- Component integration
- Service layer testing
- State management
- Business logic
- Unit-like integration tests

## Running Tests Together

### Local Development

```bash
# 1. Start app
npm start

# 2. Run Playwright tests (web)
npm run test:e2e

# 3. Run Karma tests (integration)
npm run test

# 4. Run Maestro tests (mobile)
npm run test:maestro
```

### CI/CD Pipeline

```yaml
# .github/workflows/test-suite.yml
name: Complete Test Suite
on: [push, pull_request]

jobs:
  karma-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Dependencies
        run: npm ci
      - name: Run Karma Tests
        run: npm run test:ci

  playwright-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install
      - name: Run Playwright Tests
        run: npm run test:e2e

  maestro-tests:
    runs-on: macos-latest  # macOS for iOS simulator
    steps:
      - uses: actions/checkout@v4
      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
      - name: Build Android APK
        run: |
          npm ci
          npm run cap:sync
          cd android && ./gradlew assembleDebug
      - name: Run Maestro Tests
        run: |
          export PATH="$PATH:$HOME/.maestro/bin"
          maestro test maestro/tests/
```

## Device Testing Strategy

### Development Devices

**Local Testing:**
```bash
# Android Emulator
npm run cap:run:android
maestro test maestro/tests/

# iOS Simulator
npx cap run ios
maestro test maestro/tests/ --device booted
```

**Physical Devices:**
```bash
# Connect device via USB
adb devices  # Android
xcrun xctrace list devices  # iOS

# Run on specific device
maestro test maestro/tests/ --device <device-id>
```

### Cloud Testing (BrowserStack)

**Web Testing (Playwright):**
```bash
# Use BrowserStack Automate
npm run test:browserstack:web
```

**Mobile Testing (Maestro/Appium):**
```bash
# Use BrowserStack App Automate
npm run test:browserstack:mobile
```

**Device Matrix:**
| Platform | Device | OS | Purpose |
|----------|--------|----|---------|
| Android | Samsung Galaxy S24 | 14 | High-end testing |
| Android | Google Pixel 8 | 14 | Stock Android |
| Android | Samsung Galaxy A54 | 13 | Mid-range device |
| iOS | iPhone 15 Pro | 17 | Latest iOS |
| iOS | iPhone 13 | 16 | Previous iOS |
| iOS | iPad Pro | 17 | Tablet testing |

## Maintenance Guidelines

### Test Maintenance Schedule

**Daily:**
- Run local Maestro smoke tests before commits
- Run Playwright tests during development
- Fix failing tests immediately

**Weekly:**
- Review test coverage reports
- Update test data and fixtures
- Clean up screenshots and artifacts

**Monthly:**
- Review test execution times
- Optimize slow tests
- Update test documentation

### Adding New Features

**Checklist for New Feature:**

1. **Plan Tests:**
   - [ ] Identify mobile-specific aspects (Maestro)
   - [ ] Identify complex logic (Playwright)
   - [ ] Identify integration points (Karma)

2. **Write Tests:**
   - [ ] Add Maestro test if mobile UI changes
   - [ ] Add Playwright test if web flow changes
   - [ ] Add Karma test for service/component logic

3. **Verify Coverage:**
   - [ ] Run all test suites
   - [ ] Check coverage reports
   - [ ] Update documentation

**Example: Adding Glucose Readings Chart**

```bash
# 1. Maestro - Visual validation
maestro/tests/06-glucose-chart.yaml
- Navigate to Readings
- Verify chart displays
- Take screenshot

# 2. Playwright - Data loading
playwright/tests/glucose-chart.spec.ts
- Mock Tidepool API
- Verify chart renders with data
- Test error handling

# 3. Karma - Component logic
src/app/readings/glucose-chart.component.spec.ts
- Unit test chart calculations
- Test data transformation
- Test edge cases
```

### Test Debugging

**Maestro Debugging:**
```bash
# Run in Studio mode
maestro studio

# Record new flow
maestro record maestro/tests/debug.yaml

# View screenshots
open maestro/screenshots/
```

**Playwright Debugging:**
```bash
# Run with UI mode
npm run test:e2e:headed

# View trace
npx playwright show-trace trace.zip

# Debug specific test
npx playwright test --debug user-journey.spec.ts
```

**Common Issues:**

| Issue | Maestro Fix | Playwright Fix |
|-------|-------------|----------------|
| Element not found | Add `optional: true` | Use `waitForSelector()` |
| Timeout | Increase `timeouts` in config | Add explicit `timeout: 30000` |
| Flaky test | Add `waitForAnimationToEnd` | Use `waitForLoadState('networkidle')` |
| Screenshot mismatch | Update baseline screenshot | Update snapshot with `-u` flag |

## Performance Optimization

### Test Execution Times

**Current Estimates:**
- **Maestro Suite:** ~1-2 minutes (5 tests)
- **Playwright Suite:** ~3-5 minutes (4 tests)
- **Karma Suite:** ~5-10 minutes (14 files)

**Total Suite:** ~10-15 minutes

### Optimization Strategies

**Parallel Execution:**
```bash
# Maestro - run tests in parallel
maestro test maestro/tests/ --parallel

# Playwright - use workers
npm run test:e2e -- --workers=4

# Karma - use parallel browsers
ng test --browsers=ChromeHeadless,Firefox
```

**Selective Execution:**
```bash
# Run only affected tests
npm run test:maestro:smoke  # Quick smoke test
npm run test:e2e:critical   # Critical path only

# Run on specific files
maestro test maestro/tests/01-launch-and-navigate.yaml
```

**Test Sharding (CI):**
```yaml
# GitHub Actions sharding
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npm run test:e2e -- --shard=${{ matrix.shard }}/4
```

## Reporting and Metrics

### Test Reports

**Maestro:**
```bash
# Generate JUnit report
maestro test maestro/tests/ --format junit --output maestro/results/

# HTML report (via CI tools)
# Upload to test reporting service
```

**Playwright:**
```bash
# Generate HTML report
npm run test:e2e
npx playwright show-report

# Upload to CI
npx playwright test --reporter=html,junit
```

**Combined Dashboard:**
```bash
# Aggregate reports
npm run test:report:all

# View in browser
open test-reports/index.html
```

### Key Metrics

**Track These Metrics:**
1. **Test Count:** Total tests across all suites
2. **Coverage:** Code coverage percentage
3. **Execution Time:** Total time to run all tests
4. **Flakiness Rate:** % of tests that fail intermittently
5. **Pass Rate:** % of successful test runs
6. **Device Coverage:** Number of devices/platforms tested

**Target Metrics:**
- **Total Tests:** 50+ (currently 23)
- **Code Coverage:** >80%
- **Execution Time:** <15 minutes
- **Flakiness Rate:** <5%
- **Pass Rate:** >95%
- **Device Coverage:** 6+ devices

## Best Practices Summary

### Maestro Best Practices

1. ✅ Use for mobile-specific UI flows
2. ✅ Keep tests simple and focused
3. ✅ Use reusable flows from `maestro/flows/`
4. ✅ Capture screenshots at key points
5. ✅ Use environment variables for test data
6. ✅ Test on real devices regularly
7. ❌ Don't use for complex logic testing
8. ❌ Don't test API integrations directly

### Playwright Best Practices

1. ✅ Use for complex user journeys
2. ✅ Mock API responses for reliability
3. ✅ Use page objects for maintainability
4. ✅ Test accessibility with `axe-core`
5. ✅ Monitor network requests
6. ✅ Use traces for debugging
7. ❌ Don't test mobile-specific features
8. ❌ Don't duplicate Maestro tests

### Integration Best Practices

1. ✅ Run Maestro tests before commits (fast feedback)
2. ✅ Run Playwright tests in CI (comprehensive)
3. ✅ Run Karma tests continuously (watch mode)
4. ✅ Share test data fixtures across suites
5. ✅ Document complementary test coverage
6. ✅ Maintain test execution order independence
7. ❌ Don't create duplicate tests across tools
8. ❌ Don't let test suites grow unbounded

## Next Steps

### Immediate Actions

1. **Add npm scripts** for Maestro:
   ```json
   "test:maestro": "maestro test maestro/tests/",
   "test:maestro:single": "maestro test",
   "test:maestro:device": "maestro test maestro/tests/ --device"
   ```

2. **Create CI workflow** for Maestro tests

3. **Document test ownership:**
   - Assign team members to maintain specific test suites
   - Create CODEOWNERS for test directories

### Future Enhancements

**Short Term (1-2 weeks):**
- [ ] Add visual regression testing with Maestro screenshots
- [ ] Implement BrowserStack integration for cloud devices
- [ ] Create test execution dashboard

**Medium Term (1-2 months):**
- [ ] Add performance testing with Playwright
- [ ] Implement accessibility testing in all suites
- [ ] Create automated test generation from specs

**Long Term (3-6 months):**
- [ ] AI-powered test generation
- [ ] Self-healing tests with Maestro Studio
- [ ] Comprehensive test analytics and insights

## Resources

**Maestro:**
- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro Best Practices](https://maestro.mobile.dev/best-practices)
- [Maestro Cloud](https://cloud.mobile.dev/)

**Playwright:**
- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test](https://playwright.dev/docs/test-configuration)

**Integration:**
- [Mobile Testing Strategy](https://martinfowler.com/articles/mobile-testing.html)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Diabetify Testing Guide](../docs/TESTING_GUIDE.md)

---

**Summary:** This integration guide ensures Maestro and Playwright work together harmoniously, providing comprehensive test coverage without duplication. Use Maestro for fast mobile UI validation and Playwright for complex web scenarios.

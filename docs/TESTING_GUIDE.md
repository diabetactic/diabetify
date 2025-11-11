# Testing Guide - Diabetify

Comprehensive testing strategy for the Diabetify mobile health application.

## Testing Stack

- **Unit Tests**: Jasmine + Karma
- **E2E Tests**: Playwright
- **Mobile Testing**: Capacitor + ADB
- **CI/CD**: GitHub Actions

## Quick Reference

```bash
# Unit Testing
npm test                        # Watch mode
npm run test:ci                 # CI mode (headless)
npm run test:coverage           # With coverage report

# Targeted Test Runs (Faster)
karma start karma-auth-only.conf.js         # Auth services only
karma start karma-appointments-only.conf.js  # Appointments only

# E2E Testing
npm run test:e2e                # Headless
npm run test:e2e:headed         # With visible browser

# Mobile Testing
npm run cap:run:android         # Run on device
# Use android-adb MCP for screenshots/debugging
# Use BrowserStack MCP for cross-device testing
```

## Unit Testing

### Test Structure

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ServiceName]
    });

    service = TestBed.inject(ServiceName);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies
3. **Coverage**: Aim for 80%+ coverage
4. **Fast**: Keep tests under 5s total runtime
5. **Descriptive**: Clear test names

### Common Patterns

```typescript
// Mock HTTP responses
httpMock.expectOne('/api/endpoint').flush(mockData);

// Test async operations
await expectAsync(service.method()).toBeResolved();

// Test error handling
httpMock.expectOne('/api/endpoint').error(
  new ErrorEvent('Network error')
);
```

## E2E Testing

### Playwright Configuration

Located in `playwright.config.ts`:
- Base URL: `http://localhost:4200`
- Test directory: `playwright/tests/`
- Timeout: 30s per test
- Screenshots on failure
- Video on retry

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Page Object Pattern

```typescript
// playwright/pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
```

## Mobile Testing

### Android Testing with ADB

```bash
# List connected devices
adb devices

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Take screenshot
adb exec-out screencap -p > screenshot.png

# View logs
adb logcat | grep diabetactic
```

### Cross-Device Testing

Use BrowserStack MCP for testing on real devices:
- Multiple Android versions
- Multiple iOS versions
- Different screen sizes
- Various device manufacturers

See [CLAUDE.md](../CLAUDE.md#5-browserstack---cross-device-testing) for BrowserStack integration.

## Test Data

### Mock Data

Located in `src/assets/mocks/`:
- `glucose-readings.json`
- `user-profiles.json`
- `appointments.json`

### Test Environments

```typescript
// src/environments/environment.test.ts
export const environment = {
  production: false,
  useMockData: true,
  apiUrl: 'http://localhost:3000/api',
  ...
};
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Nightly builds

### GitHub Actions Workflow

```yaml
- name: Run tests
  run: npm run test:ci

- name: E2E tests
  run: npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Unit Test Debugging

```bash
# Run specific test file
npm test -- --include='**/auth.service.spec.ts'

# Debug mode
npm test -- --browsers=Chrome --watch
```

### E2E Test Debugging

```bash
# Run with browser visible
npm run test:e2e:headed

# Run specific test
npx playwright test tests/login.spec.ts

# Debug mode
npx playwright test --debug
```

## Coverage Requirements

- **Services**: 90% coverage minimum
- **Components**: 80% coverage minimum
- **Overall**: 85% coverage target

Check coverage:
```bash
npm run test:coverage
open coverage/index.html
```

## Common Issues

### Timeout Errors
- Increase timeout in test: `jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000`
- Check for unresolved promises
- Mock slow HTTP calls

### Flaky Tests
- Avoid hard-coded waits
- Use `waitForAsync()` for async operations
- Ensure proper test isolation

### Memory Leaks
- Clean up subscriptions in `afterEach()`
- Destroy components properly
- Clear timers and intervals

## MCP Testing Tools

### Playwright MCP
For browser automation and E2E testing:
```javascript
mcp__playwright__browser_navigate { url: "http://localhost:4200" }
mcp__playwright__browser_snapshot {}
mcp__playwright__browser_click { element: "Login", ref: "#login-btn" }
```

### Android-ADB MCP
For mobile testing:
```javascript
mcp__android-adb__adb_devices {}
mcp__android-adb__launch_app { package_name: "com.diabetactic.app" }
mcp__android-adb__take_screenshot_and_save { output_path: "test.png" }
```

See [CLAUDE.md](../CLAUDE.md#development-mcp-servers) for complete MCP reference.

## Resources

- [Jasmine Documentation](https://jasmine.github.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Angular Testing Guide](https://angular.dev/guide/testing)
- [Ionic Testing Best Practices](https://ionicframework.com/docs/angular/testing)

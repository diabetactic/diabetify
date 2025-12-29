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

### Standard E2E Tests

```bash
# Run all tests (mobile-chromium by default)
npm run test:e2e

# Run with headed browser (see UI)
npm run test:e2e:headed

# Run a specific test file
npm run test:e2e -- profile-edit.spec.ts
```

### Docker Backend E2E Tests

These tests run against a local Docker backend, providing a stable and reproducible environment.

**Prerequisites:**

- Docker installed and running.
- The Docker backend services are running. You can start them with `cd docker && ./start.sh`.

**Running the Tests:**

```bash
# Run all Docker E2E tests
npm run test:e2e -- --grep "@docker"
```

### Visual Regression Tests

Visual regression tests capture screenshots and compare them against baseline images.

```bash
# Run visual regression tests
E2E_DOCKER_TESTS=true npm run test:e2e -- --grep "@docker-visual"

# Update baseline snapshots (when UI intentionally changes)
E2E_DOCKER_TESTS=true npm run test:e2e -- --grep "@docker-visual" --update-snapshots

# Update specific test snapshots
E2E_DOCKER_TESTS=true npm run test:e2e -- --grep "Dashboard - main view" --update-snapshots
```

**Note**: Visual regression tests will fail when the UI changes. This is expected behavior. Review the diff images in `playwright/artifacts/` to verify the changes are intentional, then update snapshots.

**Test Orchestration:**

The Docker E2E tests are now self-contained and manage their own setup and teardown. The following utilities are used to orchestrate the test environment:

- **`DockerTestManager`**: Ensures that the Docker services (`api_gateway` and `glucoserver`) are healthy before any tests are run.
- **`DatabaseSeeder`**: Handles all database operations, including resetting the database, seeding it with test data, and cleaning up after the tests have completed.

Each test is run in a separate database transaction, which is rolled back after the test is complete. This ensures that each test is independent and that the database is in a clean state for every test.

## Test Categories

### Core Functionality

- `e2e-flow.spec.ts` - Full user journey
- `appointment-full-flow.spec.ts` - Appointment state machine
- `docker-backend-e2e.spec.ts` - Docker backend integration

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

# Enable Docker tests
E2E_DOCKER_TESTS=true

# Custom server
E2E_PORT=4200
E2E_HOST=localhost
E2E_BASE_URL=http://localhost:4200
```

## Test Organization

```
playwright/
├── tests/
│   ├── accessibility-audit.spec.ts
│   ├── appointment-full-flow.spec.ts
│   ├── docker-backend-e2e.spec.ts
│   ├── e2e-flow.spec.ts
│   ├── error-handling.spec.ts
│   ├── profile-edit.spec.ts
│   ├── settings-persistence.spec.ts
│   └── settings-theme.spec.ts
├── helpers/
│   ├── docker-test-manager.ts
│   └── database-seeder.ts
├── artifacts/
└── README.md
```

## CI/CD Integration

Tests run automatically in GitHub Actions on push to master/main. See `.github/workflows/ci.yml` for details.

## Troubleshooting

### Tests timeout or fail

- Increase timeout in test or config
- Check if dev server is running
- Verify network connectivity for Heroku tests

### Screenshots not captured

- Check `playwright/artifacts/` directory
- Ensure `screenshot: 'only-on-failure'` in config

## Best Practices

1. **Mobile-first**: Always test mobile viewport first
2. **Explicit waits**: Use `waitForSelector` instead of `waitForTimeout`
3. **Resilient selectors**: Prefer data-testid or semantic selectors
4. **Screenshots**: Capture on failure for debugging
5. **Accessibility**: Run a11y tests regularly

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Ionic Testing Guide](https://ionicframework.com/docs/testing/overview)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

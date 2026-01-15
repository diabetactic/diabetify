# Playwright E2E Tests

Comprehensive end-to-end testing suite for Diabetactic mobile app.

## Test Projects

The configuration uses an optimized mobile-first setup:

### 1. **mobile-chromium** (Primary)

- Mobile-optimized web testing
- iPhone-sized viewport (390x844)
- Touch events enabled
- Default for `pnpm run test:e2e`

### 2. **desktop-chromium** (Secondary)

- Desktop web testing
- 1440x900 viewport
- For responsive design validation
- Only runs for visual regression tests (see `playwright.config.ts`)

## Running Tests

### Standard E2E Tests

```bash
# Run all tests (mobile-chromium by default)
pnpm run test:e2e

# Run with headed browser (see UI)
pnpm run test:e2e:headed

# Run a specific test file
pnpm run test:e2e -- playwright/tests/smoke/auth.smoke.spec.ts
```

### Docker Backend E2E Tests

These tests run against a local Docker backend.

**Prerequisites:**

- Docker installed and running.
- The Docker backend services are running. You can start them with `cd docker && ./start.sh`.

**Running the Tests:**

```bash
# Run all Docker-tagged tests
pnpm run test:e2e
```

### Visual Regression Tests

Visual regression tests capture screenshots and compare them against baseline images.

```bash
# Run visual regression tests
pnpm run test:e2e -- --grep "@visual"

# Update baseline snapshots (when UI intentionally changes)
pnpm run test:e2e -- --grep "@visual" --update-snapshots

# Update specific test snapshots
pnpm run test:e2e -- --grep "Visual Regression - Pages" --update-snapshots
```

**Note**: Visual regression tests will fail when the UI changes. This is expected behavior. Review the diff images in `playwright/artifacts/` to verify the changes are intentional, then update snapshots.

## Test Categories

Tests are organized under `playwright/tests/`:

- `smoke/` (auth, API health, navigation)
- `functional/` (feature flows)
- `visual/` (screenshots)

## Environment Variables

```bash
# Custom server
E2E_PORT=4200
E2E_HOST=localhost
E2E_BASE_URL=http://localhost:4200
```

## Test Organization

```
playwright/
├── tests/
│   ├── smoke/
│   ├── functional/
│   └── visual/
├── fixtures/
├── pages/
├── helpers/
├── config/
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

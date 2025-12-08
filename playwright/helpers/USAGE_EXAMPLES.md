# Playwright Helper Usage Examples

This document shows how to use the new helper utilities to improve test reliability and reduce code duplication.

---

## Before & After Comparison

### ❌ BEFORE: Repetitive, Fragile Code

```typescript
// heroku-integration.spec.ts (OLD)
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // ❌ Hardcoded wait

  if (page.url().includes('/welcome')) {
    const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
    if ((await loginBtn.count()) > 0) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

  const username = process.env.E2E_TEST_USERNAME;
  const password = process.env.E2E_TEST_PASSWORD;

  await page.fill('#username', username!);
  await page.fill('#password', password!);

  // ❌ Race condition: waitForResponse AFTER click
  const loginResponsePromise = page.waitForResponse(response => response.url().includes('/token'), {
    timeout: 15000,
  });
  await page.click('[data-testid="login-submit-btn"]');
  await loginResponsePromise;

  await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // ❌ Another hardcoded wait
});
```

**Issues**:

- 40+ lines of repetitive code
- 2 hardcoded waits (adds delays)
- Race condition in login response wait
- Difficult to maintain

---

### ✅ AFTER: Clean, Reliable Code

```typescript
// heroku-integration.spec.ts (NEW)
import { loginToHeroku } from '../helpers';

test.beforeEach(async ({ page }) => {
  await loginToHeroku(page);
});
```

**Benefits**:

- 1 line vs 40 lines
- No hardcoded waits
- Race-condition-safe
- Single source of truth

---

## Usage Examples

### 1. Authentication

#### Basic Login

```typescript
import { loginToHeroku, loginAndGetToken } from '../helpers';

test('should load dashboard after login', async ({ page }) => {
  // Simple login
  await loginToHeroku(page);

  // Now at /tabs/dashboard, ready to test
  await expect(page).toHaveURL(/\/tabs\/dashboard/);
});
```

#### Login with Custom Credentials

```typescript
test('should login with specific user', async ({ page }) => {
  await loginToHeroku(page, {
    username: 'specific-user@example.com',
    password: 'specific-password',
  });
});
```

#### Get Auth Token for API Calls

```typescript
test('should fetch data with auth token', async ({ page, request }) => {
  const token = await loginAndGetToken(page);

  // Use token in API request
  const response = await request.get('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok()).toBe(true);
});
```

#### Check Login State

```typescript
import { isLoggedIn } from '../helpers';

test('should check if user is logged in', async ({ page }) => {
  expect(await isLoggedIn(page)).toBe(false);

  await loginToHeroku(page);

  expect(await isLoggedIn(page)).toBe(true);
});
```

---

### 2. Navigation

#### Navigate to Tabs

```typescript
import { navigateToTab, navigateAndWait } from '../helpers';

test('should navigate between tabs', async ({ page }) => {
  await loginToHeroku(page);

  // Navigate to readings
  await navigateToTab(page, 'readings');
  await expect(page).toHaveURL(/\/tabs\/readings/);

  // Navigate to appointments
  await navigateToTab(page, 'appointments');
  await expect(page).toHaveURL(/\/appointments/);

  // Navigate to profile
  await navigateToTab(page, 'profile');
  await expect(page).toHaveURL(/\/tabs\/profile/);
});
```

#### Open Add Reading Modal

```typescript
import { openAddReadingModal } from '../helpers';

test('should add reading via FAB button', async ({ page }) => {
  await loginToHeroku(page);
  await navigateToTab(page, 'readings');

  // Open via FAB
  await openAddReadingModal(page, 'fab');

  // Form is now ready
  const glucoseInput = page.locator('ion-input input').first();
  await expect(glucoseInput).toBeVisible();
});
```

#### Navigate to Custom Page

```typescript
test('should navigate to settings', async ({ page }) => {
  await loginToHeroku(page);

  await navigateAndWait(page, '/settings', {
    waitForSelector: 'h1:has-text("Settings")',
    timeout: 10000,
  });
});
```

---

### 3. Configuration

#### Use Centralized Backend URLs

```typescript
import { HEROKU_URLS, buildApiUrl } from '../helpers';

test('should fetch from correct backend', async ({ request }) => {
  // Direct URL access
  const response = await request.get(`${HEROKU_URLS.apiGateway}/users/me`);

  // Or build URL dynamically
  const url = buildApiUrl('apiGateway', '/users/me');
  const response2 = await request.get(url);
});
```

#### Check Test Configuration

```typescript
import { shouldRunHerokuTests, getHerokuSkipMessage, TEST_CONFIG } from '../helpers';

test.describe('Heroku Integration', () => {
  // Simplified skip logic
  test.skip(!shouldRunHerokuTests(true), getHerokuSkipMessage(true));

  test.setTimeout(TEST_CONFIG.timeouts.herokuTest);

  test('should run if enabled', async ({ page }) => {
    // Test code
  });
});
```

---

### 4. Data Cleanup

#### Track and Clean Up Created Items

```typescript
import { createCleanupTracker, loginAndGetToken } from '../helpers';
import { request } from '@playwright/test';

test.describe('Readings CRUD', () => {
  const cleanup = createCleanupTracker();
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    authToken = await loginAndGetToken(page);
  });

  test.afterAll(async () => {
    const apiContext = await request.newContext();
    await cleanup.cleanup(apiContext, authToken);
    await apiContext.dispose();
  });

  test('should create reading', async ({ page }) => {
    // Create reading
    const reading = await createReading(page, 120);

    // Track for cleanup
    cleanup.track(reading.id, 'reading');

    // Test continues...
  });

  test('should create multiple readings', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      const reading = await createReading(page, 100 + i);
      cleanup.track(reading.id, 'reading');
    }

    // All will be cleaned up automatically
  });
});
```

#### Manual Cleanup

```typescript
import { deleteReading, deleteAppointment } from '../helpers';
import { request } from '@playwright/test';

test('should clean up manually', async ({ page }) => {
  const token = await loginAndGetToken(page);
  const apiContext = await request.newContext();

  // Create and track reading
  const readingId = '12345';

  // Clean up
  await deleteReading(apiContext, readingId, token);

  await apiContext.dispose();
});
```

---

### 5. Ionic Hydration

#### Wait for Ionic to Hydrate

```typescript
import { waitForIonicHydration } from '../helpers';

test('should wait for hydration', async ({ page }) => {
  await page.goto('/dashboard');

  // ✅ Wait for Ionic to hydrate (replaces waitForTimeout(500))
  await waitForIonicHydration(page);

  // Now safe to interact with Ionic components
  const content = page.locator('ion-content');
  await expect(content).toBeVisible();
});
```

---

## Full Example: Refactored Heroku Test

### ❌ BEFORE (60+ lines)

```typescript
test.describe('Heroku Readings', () => {
  const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;
  const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;

  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true...');
  test.skip(!hasCredentials, 'Requires E2E_TEST_USERNAME...');

  test.setTimeout(60000);

  const createdReadingIds: string[] = [];
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    // ... 30 more lines of login logic
  });

  test.afterAll(async () => {
    if (createdReadingIds.length > 0 && authToken) {
      const apiContext = await request.newContext();
      for (const id of createdReadingIds) {
        try {
          const response = await apiContext.delete(`${BACKEND_URL}/api/v1/readings/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          // ... more cleanup code
        } catch (e) {
          console.error(e);
        }
      }
      await apiContext.dispose();
    }
  });

  test('create reading', async ({ page }) => {
    // ... test code
  });
});
```

---

### ✅ AFTER (25 lines)

```typescript
import {
  loginAndGetToken,
  navigateToTab,
  shouldRunHerokuTests,
  getHerokuSkipMessage,
  TEST_CONFIG,
  createCleanupTracker,
} from '../helpers';
import { request } from '@playwright/test';

test.describe('Heroku Readings', () => {
  test.skip(!shouldRunHerokuTests(true), getHerokuSkipMessage(true));
  test.setTimeout(TEST_CONFIG.timeouts.herokuTest);

  const cleanup = createCleanupTracker();
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    authToken = await loginAndGetToken(page);
  });

  test.afterAll(async () => {
    const apiContext = await request.newContext();
    await cleanup.cleanup(apiContext, authToken);
    await apiContext.dispose();
  });

  test('create reading', async ({ page }) => {
    await navigateToTab(page, 'readings');
    // ... test code
    cleanup.track(reading.id, 'reading');
  });
});
```

**Result**: 60% less code, 100% more reliable

---

## Migration Checklist

When refactoring a test file:

- [ ] Replace login logic with `loginToHeroku()` or `loginAndGetToken()`
- [ ] Replace `waitForTimeout(500)` with `waitForIonicHydration()`
- [ ] Replace race-prone `waitForResponse` with helpers
- [ ] Use `navigateToTab()` for tab navigation
- [ ] Use centralized `HEROKU_URLS` for backend URLs
- [ ] Use `shouldRunHerokuTests()` for skip logic
- [ ] Add cleanup tracking for created data
- [ ] Test that changes don't break existing tests

---

## Helper API Reference

### Authentication (`auth.ts`)

| Function                                      | Purpose                   | Returns            |
| --------------------------------------------- | ------------------------- | ------------------ |
| `loginToHeroku(page, credentials?, options?)` | Login via UI              | `Promise<void>`    |
| `loginAndGetToken(page, credentials?)`        | Login and get auth token  | `Promise<string>`  |
| `isLoggedIn(page)`                            | Check login state         | `Promise<boolean>` |
| `logout(page)`                                | Logout from app           | `Promise<void>`    |
| `waitForIonicHydration(page, timeout?)`       | Wait for Ionic to hydrate | `Promise<void>`    |

### Navigation (`navigation.ts`)

| Function                                | Purpose                | Returns            |
| --------------------------------------- | ---------------------- | ------------------ |
| `navigateToTab(page, tab, timeout?)`    | Navigate to tab        | `Promise<void>`    |
| `navigateAndWait(page, path, options?)` | Navigate to page       | `Promise<void>`    |
| `openAddReadingModal(page, from?)`      | Open add reading form  | `Promise<void>`    |
| `goBack(page)`                          | Navigate back          | `Promise<void>`    |
| `refreshPage(page)`                     | Refresh current page   | `Promise<void>`    |
| `isTabActive(page, tab)`                | Check if tab is active | `Promise<boolean>` |
| `waitForRoute(page, route, timeout?)`   | Wait for route         | `Promise<void>`    |

### Configuration (`config.ts`)

| Export                                | Type     | Purpose                   |
| ------------------------------------- | -------- | ------------------------- |
| `HEROKU_URLS`                         | Object   | Backend URLs              |
| `TEST_CONFIG`                         | Object   | Test configuration        |
| `shouldRunHerokuTests(requireCreds?)` | Function | Check if tests should run |
| `getHerokuSkipMessage(requireCreds?)` | Function | Get skip message          |
| `buildApiUrl(backend, path)`          | Function | Build API URL             |

### Cleanup (`cleanup.ts`)

| Function                                    | Purpose                | Returns                           |
| ------------------------------------------- | ---------------------- | --------------------------------- |
| `deleteReading(apiContext, id, token)`      | Delete reading         | `Promise<boolean>`                |
| `deleteAppointment(apiContext, id, token)`  | Delete appointment     | `Promise<boolean>`                |
| `cleanupTestData(apiContext, items, token)` | Batch cleanup          | `Promise<{success, failed}>`      |
| `createCleanupTracker()`                    | Create cleanup tracker | Object with track/cleanup methods |

---

## Tips for Best Results

1. **Always use helpers for common operations** - Don't duplicate logic
2. **Import from index** - `import { loginToHeroku } from '../helpers'`
3. **Track all created data** - Use cleanup tracker to avoid pollution
4. **Centralize configuration** - Use `TEST_CONFIG` and `HEROKU_URLS`
5. **Avoid hardcoded waits** - Use `waitForIonicHydration()` instead
6. **Fix race conditions** - Use `Promise.all()` pattern from helpers
7. **Keep tests independent** - Clean up after each test
8. **Document edge cases** - If you can't use a helper, explain why

---

**Remember**: These helpers are designed to make tests:

- ✅ **Faster** (no hardcoded waits)
- ✅ **More reliable** (proper wait strategies)
- ✅ **Easier to maintain** (single source of truth)
- ✅ **Less repetitive** (60% code reduction)

Start with high-traffic test files first, then migrate others gradually.

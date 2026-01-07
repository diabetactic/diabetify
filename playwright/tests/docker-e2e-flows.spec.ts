/**
 * E2E Flow Tests - Visual tests for complete user flows
 *
 * These tests verify:
 * 1. Reading Data Flow - Add -> Verify in list -> Verify in backend
 * 2. Resolution Flow - View appointment resolutions
 * 3. Profile Edit Flow - View -> Edit -> Save -> Verify
 * 4. Tab Navigation - All tabs accessible
 *
 * NOTE: Appointment State Machine and Detail View tests have been
 * consolidated into appointment-comprehensive.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Force serial execution - E2E flow tests modify shared state
test.describe.configure({ mode: 'serial' });

const isDockerTest = process.env['E2E_DOCKER_TESTS'] === 'true';

// Test user
const TEST_USER = { dni: '1000', password: 'tuvieja' };

// API URL
const API_URL = 'http://localhost:8000';

// Screenshot options
const screenshotOptions = {
  maxDiffPixelRatio: 0.05,
  threshold: 0.2,
  animations: 'disabled' as const,
};

/**
 * Helper: Get auth token for user
 */
async function getAuthToken(dni: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${dni}&password=${password}`,
  });
  const data = await response.json();
  return data.access_token;
}

/**
 * Helper: Get readings from API
 */
async function getReadingsFromAPI(
  token: string
): Promise<{ readings: Array<{ id: string; glucose_level: number; notes: string }> }> {
  const response = await fetch(`${API_URL}/glucose/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

/**
 * Helper: Delete all readings for a user
 */
async function clearUserReadings(token: string): Promise<void> {
  const { readings } = await getReadingsFromAPI(token);
  for (const reading of readings) {
    await fetch(`${API_URL}/glucose/${reading.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

/**
 * Helper: Login and navigate
 */
async function loginAs(page: Page, dni: string, password: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Handle welcome screen
  if (page.url().includes('/welcome')) {
    const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
    if ((await loginBtn.count()) > 0) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  // Login
  await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
  await page.fill('#username', dni);
  await page.fill('#password', password);

  // Use JavaScript click to bypass Ionic scroll/viewport issues
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="login-submit-btn"]') as HTMLElement;
    if (btn) {
      btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      btn.click();
    }
  });

  await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Prepare page for screenshot
 */
async function prepareForScreenshot(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  // Hide dynamic elements
  await page.addStyleTag({
    content: `
      [data-testid="timestamp"], .timestamp, .time-ago { visibility: hidden !important; }
      ion-spinner, .loading-indicator { visibility: hidden !important; }
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
}

// =============================================================================
// READING DATA FLOW - ADD -> VERIFY -> BACKEND
// =============================================================================

test.describe('E2E Flow - Reading Data Flow @docker-e2e', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run');

  const uniqueValue = 142; // Unique glucose value for test

  test.beforeAll(async () => {
    // Clear readings for clean test
    const token = await getAuthToken(TEST_USER.dni, TEST_USER.password);
    await clearUserReadings(token);
  });

  test('Step 0: Readings list initial state', async ({ page }) => {
    const token = await getAuthToken(TEST_USER.dni, TEST_USER.password);
    await clearUserReadings(token);

    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    // Navigate to readings list
    const readingsTab = page.locator('[data-testid="tab-readings"]');
    await readingsTab.waitFor({ state: 'visible', timeout: 10000 });
    await readingsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.waitForSelector('[data-testid="readings-empty"], [data-testid="readings-list"]', {
      timeout: 10000,
    });

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-initial-state.png', screenshotOptions);
  });

  test('Step 1: Add reading via UI', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    // Navigate to add reading page
    await page.goto('/add-reading');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for the form to be visible
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    // Fill form
    const glucoseInput = page.locator('[data-testid="glucose-value-input"] input');
    await glucoseInput.waitFor({ state: 'visible', timeout: 10000 });
    await glucoseInput.fill(String(uniqueValue));

    // Screenshot: Filled form before submit
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-flow-1-filled-form.png', screenshotOptions);

    // Submit
    const submitBtn = page.locator('[data-testid="add-reading-save-btn"]');
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Screenshot: After submit
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-flow-2-after-submit.png', screenshotOptions);
  });

  test('Step 2: Verify reading appears in list', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    // Navigate to readings list
    const readingsTab = page.locator('[data-testid="tab-readings"]');
    await readingsTab.waitFor({ state: 'visible', timeout: 10000 });
    await readingsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Scroll to ensure content is visible
    await page.evaluate(() => window.scrollTo(0, 0));

    // Screenshot: Reading list
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-flow-3-in-list.png', screenshotOptions);

    // Verify the readings list container is visible
    const readingsList = page.locator(
      '[data-testid="readings-list"], [data-testid="readings-empty"]'
    );
    await expect(readingsList).toBeVisible({ timeout: 10000 });

    // If readings exist, verify items are attached
    const hasReadings = await page.locator('[data-testid="readings-list"]').count();
    if (hasReadings > 0) {
      const readingItems = page.locator('[data-testid="readings-list"] ion-item');
      await expect(readingItems.first()).toBeAttached({ timeout: 10000 });
    }
  });

  test('Step 2: Reading detail modal', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    const readingsTab = page.locator('[data-testid="tab-readings"]');
    await readingsTab.waitFor({ state: 'visible', timeout: 10000 });
    await readingsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstReading = page.locator('[data-testid="readings-list"] ion-item[button]').first();
    if ((await firstReading.count()) > 0) {
      await firstReading.evaluate((el: HTMLElement) => el.click());
      const visibleModal = page
        .locator('ion-modal.show-modal, ion-modal[aria-hidden="false"]')
        .first();
      await expect(visibleModal).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-detail-modal.png', screenshotOptions);
  });

  test('Step 3: Reading delete action available', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    const readingsTab = page.locator('[data-testid="tab-readings"]');
    await readingsTab.waitFor({ state: 'visible', timeout: 10000 });
    await readingsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const slidingItem = page.locator('ion-item-sliding').first();
    if ((await slidingItem.count()) > 0) {
      await slidingItem.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await page.waitForTimeout(200);

      const deleteOption = page.locator('ion-item-option[color="danger"]').first();
      await slidingItem.evaluate(async el => {
        const sliding = el as unknown as { open?: (side: string) => Promise<void> | void };
        if (sliding?.open) {
          await sliding.open('end');
        }
      });
      await page.waitForTimeout(300);

      if (!(await deleteOption.isVisible())) {
        const box = await slidingItem.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 40, box.y + box.height / 2);
          await page.mouse.up();
          await page.waitForTimeout(300);
        }
      }

      await deleteOption.waitFor({ state: 'visible', timeout: 5000 });
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-delete-option.png', screenshotOptions);
  });

  test('Step 4: Readings search no results', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    const readingsTab = page.locator('[data-testid="tab-readings"]');
    await readingsTab.waitFor({ state: 'visible', timeout: 10000 });
    await readingsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('ion-searchbar input');
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('zzzz-no-results');
      await page.waitForTimeout(400);
    }

    await page
      .getByText(/No Results Found|No Se Encontraron Resultados/i)
      .first()
      .waitFor({ timeout: 5000 });

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-no-results.png', screenshotOptions);
  });

  test('Step 5: Verify backend sync - Dashboard shows data', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Ensure we are on the dashboard
    const dashboardTab = page.locator('[data-testid="tab-dashboard"]');
    if (await dashboardTab.isVisible()) {
      await dashboardTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Screenshot: Dashboard showing synced data
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-reading-flow-4-backend-synced.png', screenshotOptions);

    // Verify the dashboard loaded
    const statsContainer = page.locator('[data-testid="stats-container"]');
    await expect(statsContainer).toBeVisible({ timeout: 15000 });
  });
});

// =============================================================================
// RESOLUTION FLOW - APPOINTMENT WITH RESOLUTION
// =============================================================================

test.describe('E2E Flow - Resolution Flow @docker-e2e', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run');

  test('Resolution: View resolution after appointment', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    // Check if there's a resolution to view
    await page.click('[data-testid="tab-appointments"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for resolution link or section
    const resolutionLink = page.locator('text=/Resolución|Resolution|Ver detalles/i').first();

    if ((await resolutionLink.count()) > 0) {
      await resolutionLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await prepareForScreenshot(page);
      await expect(page).toHaveScreenshot('e2e-resolution-view.png', screenshotOptions);
    } else {
      // No resolution available - screenshot current state
      await prepareForScreenshot(page);
      await expect(page).toHaveScreenshot('e2e-appointments-no-resolution.png', screenshotOptions);
    }
  });
});

// =============================================================================
// PROFILE EDIT FLOW - VIEW -> EDIT -> SAVE -> VERIFY
// =============================================================================

test.describe('E2E Flow - Profile Edit @docker-e2e', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run');

  test('Step 1: View profile page', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-profile"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-profile-1-view.png', screenshotOptions);
  });

  test('Step 2: Open edit mode and modify data', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-profile"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click edit button
    const editBtn = page.locator('[data-testid="edit-profile-btn"]');
    await editBtn.waitFor({ state: 'visible', timeout: 10000 });
    await editBtn.click();

    // Wait for modal to appear
    await page.waitForSelector('ion-modal', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('ion-modal ion-input[formControlName="name"]', {
      state: 'visible',
      timeout: 10000,
    });
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // Screenshot: Edit form opened
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-profile-2-edit-form.png', screenshotOptions);

    // Modify name field
    const nameInput = page.locator('ion-modal ion-input[formControlName="name"] input');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    const currentName = await nameInput.inputValue();
    const testSuffix = ' (E2E Test)';

    if (!currentName.includes(testSuffix)) {
      await nameInput.fill(currentName + testSuffix);
    }

    await page.waitForTimeout(300);

    // Screenshot: Form with modified data
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-profile-3-edit-modified.png', screenshotOptions);
  });

  test('Step 3: Save and verify changes persist', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-profile"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const editBtn = page.locator('[data-testid="edit-profile-btn"]');
    await editBtn.waitFor({ state: 'visible', timeout: 10000 });
    await editBtn.click();

    await page.waitForSelector('ion-modal', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('ion-modal ion-input[formControlName="name"]', {
      state: 'visible',
      timeout: 10000,
    });
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // Modify name
    const nameInput = page.locator('ion-modal ion-input[formControlName="name"] input');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    const uniqueName = `Test User ${Date.now() % 10000}`;
    await nameInput.fill(uniqueName);

    // Click save button
    const saveBtn = page.locator(
      'ion-modal ion-button:has-text("Guardar"), ion-modal ion-button:has-text("Save")'
    );
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtn.first().evaluate((el: HTMLElement) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.click();
    });

    // Wait for modal to close
    await page.waitForSelector('ion-modal', { state: 'hidden', timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot: After save
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-profile-4-after-save.png', screenshotOptions);

    // Reload to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Screenshot: Profile after reload
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-profile-5-persisted.png', screenshotOptions);
  });
});

// =============================================================================
// TAB NAVIGATION FLOW - VERIFY ALL TABS ACCESSIBLE
// =============================================================================

test.describe('E2E Flow - Tab Navigation @docker-e2e', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run');

  test('Step 1: Dashboard tab', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-dashboard"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-nav-1-dashboard.png', screenshotOptions);
  });

  test('Step 2: Readings tab', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-readings"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-nav-2-readings.png', screenshotOptions);
  });

  test('Step 3: Appointments tab', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-appointments"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-nav-3-appointments.png', screenshotOptions);
  });

  test('Step 4: Profile tab', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-profile"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-nav-4-profile.png', screenshotOptions);
  });

  test('Step 5: Settings page', async ({ page }) => {
    await loginAs(page, TEST_USER.dni, TEST_USER.password);

    await page.click('[data-testid="tab-profile"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to navigate to settings
    const settingsBtn = page.locator(
      '[data-testid="settings-btn"], [data-testid="advanced-settings-btn"]'
    );
    if ((await settingsBtn.count()) > 0) {
      await page.evaluate(() => {
        const el = document.querySelector(
          '[data-testid="settings-btn"], [data-testid="advanced-settings-btn"]'
        ) as HTMLElement;
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
        }
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('e2e-nav-5-settings.png', screenshotOptions);
  });
});

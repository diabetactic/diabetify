/**
 * Heroku Readings CRUD Integration Tests
 *
 * Tests full CRUD operations for glucose readings against Heroku backend.
 * Requires E2E_HEROKU_TESTS=true and valid credentials.
 */

import { test, expect, request } from '@playwright/test';

const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;
const BACKEND_URL = 'https://dt-api-gateway-glucoserver-791f97472097.herokuapp.com'; // Adjust if needed

test.describe('Heroku Readings CRUD', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');
  test.skip(
    !hasCredentials,
    'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
  );

  // Increase timeout for Heroku tests
  test.setTimeout(60000);

  const createdReadingIds: string[] = [];
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Brief hydration buffer
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await page.waitForSelector('input[placeholder*="DNI"], input[placeholder*="email"]', {
      timeout: 10000,
    });
    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await page.fill('input[type="password"]', password);

    // Capture token from login response if possible, or we'll get it separately
    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/token') || response.url().includes('/login'),
      { timeout: 15000 }
    );

    await page.waitForSelector('button:has-text("Iniciar"), button:has-text("Sign In")', {
      timeout: 10000,
    });
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    try {
      const loginResponse = await loginResponsePromise;
      if (loginResponse.ok()) {
        const data = await loginResponse.json();
        authToken = data.access_token || data.token;
      }
    } catch {
      console.log('Could not capture auth token from network');
    }

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Brief hydration buffer
  });

  test.afterAll(async () => {
    if (createdReadingIds.length > 0 && authToken) {
      const apiContext = await request.newContext();

      console.log(`Cleaning up ${createdReadingIds.length} created readings...`);

      for (const id of createdReadingIds) {
        try {
          const response = await apiContext.delete(`${BACKEND_URL}/api/v1/readings/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });

          if (response.ok()) {
            console.log(`Deleted reading ${id}`);
          } else {
            console.warn(`Failed to delete reading ${id}: ${response.status()}`);
          }
        } catch (e) {
          console.error(`Error deleting reading ${id}`, e);
        }
      }

      await apiContext.dispose();
    }
  });

  test('create reading with Heroku backend', async ({ page }) => {
    console.log('Creating reading with Heroku backend...');

    // Navigate to readings
    await page.waitForSelector('[data-testid="tab-readings"], ion-tab-button[tab="readings"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
    await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 15000 });

    // Wait for page to stabilize after navigation
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Wait for page-specific content (add button) instead of generic ion-content
    const addButton = page.locator('ion-button:has-text("Agregar"), ion-button:has-text("Add")');
    await expect(addButton.first()).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('ion-button:has-text("Agregar"), ion-button:has-text("Add")', {
      timeout: 10000,
    });
    await addButton.first().click();

    // Wait for modal to appear and stabilize
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Wait for add reading form input to be ready
    const glucoseInput = page.locator('ion-input input').first();
    await expect(glucoseInput).toBeVisible({ timeout: 15000 });

    // Generate unique reading value
    const testValue = Math.floor(Math.random() * 50) + 100; // 100-150

    // Fill glucose value
    await page.waitForSelector('ion-input input', { timeout: 10000 });
    await glucoseInput.fill(testValue.toString());

    // Setup network interception to capture the created reading ID
    const createResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/v1/readings') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    // Save
    const saveButton = page.locator('ion-button:has-text("Guardar"), ion-button:has-text("Save")');
    await page.waitForSelector('ion-button:has-text("Guardar"), ion-button:has-text("Save")', {
      timeout: 10000,
    });
    await saveButton.first().click();

    // Capture ID
    try {
      const response = await createResponsePromise;
      if (response.ok()) {
        const data = await response.json();
        if (data && data.id) {
          createdReadingIds.push(data.id);
          console.log(`Captured created reading ID: ${data.id}`);
        }
      }
    } catch {
      console.warn('Failed to capture create response');
    }

    // Wait for navigation back to readings list
    await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Verify reading appears in list
    await expect(page.locator('body')).toContainText(testValue.toString(), { timeout: 15000 });

    console.log(`✅ Reading created: ${testValue} mg/dL`);
  });

  test('list readings from Heroku backend', async ({ page }) => {
    console.log('Listing readings from Heroku backend...');

    // Navigate to readings
    await page.waitForSelector('[data-testid="tab-readings"], ion-tab-button[tab="readings"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
    await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 15000 });

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Should show either readings, add button, or page title
    const hasReadings = await page
      .locator('ion-card, .reading-item, .stat-card')
      .isVisible({ timeout: 15000 })
      .catch(() => false);
    const hasAddButton = await page
      .locator('ion-button:has-text("Agregar"), ion-button:has-text("Add")')
      .isVisible({ timeout: 15000 })
      .catch(() => false);
    const hasPageTitle = await page
      .locator('text=/Mostrando|Lecturas|Readings/i')
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    // At least one of these should be visible
    expect(
      hasReadings || hasAddButton || hasPageTitle,
      'Readings page should show readings, add button, or page title'
    ).toBeTruthy();

    if (hasReadings) {
      // Verify reading cards have required data
      const firstCard = page.locator('ion-card, .reading-item').first();
      await expect(firstCard).toBeVisible({ timeout: 15000 });

      // Should contain glucose value
      const cardText = await firstCard.textContent();
      expect(cardText).toMatch(/\d+/); // At least one number

      console.log('✅ Readings list loaded from Heroku');
    } else {
      console.log('ℹ️  No readings found (empty state)');
    }
  });

  test('readings sync with Heroku after refresh', async ({ page }) => {
    console.log('Testing readings sync with Heroku...');

    // Navigate to readings
    await page.waitForSelector('[data-testid="tab-readings"], ion-tab-button[tab="readings"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
    await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 15000 });

    // Wait for initial load
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Count readings before
    const readingsCountBefore = await page.locator('ion-card, .reading-item').count();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer
    await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 15000 });

    // Count readings after
    const readingsCountAfter = await page.locator('ion-card, .reading-item').count();

    // Should have same count (data persisted on backend)
    expect(readingsCountAfter).toBe(readingsCountBefore);

    console.log(`✅ Readings synced: ${readingsCountAfter} readings`);
  });

  test('readings display with correct format', async ({ page }) => {
    console.log('Verifying readings display format...');

    // Navigate to readings
    await page.waitForSelector('[data-testid="tab-readings"], ion-tab-button[tab="readings"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
    await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 15000 });

    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    const readingsExist = await page
      .locator('ion-card, .reading-item')
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (readingsExist) {
      const firstReading = page.locator('ion-card, .reading-item').first();
      await expect(firstReading).toBeVisible({ timeout: 15000 });

      // Should show glucose value with unit
      const text = await firstReading.textContent();

      // Should contain number
      expect(text).toMatch(/\d+/);

      // Should contain mg/dL unit
      expect(text).toMatch(/mg\/dL/i);

      console.log('✅ Readings display format correct');
    } else {
      console.log('ℹ️  No readings to verify format');
    }
  });

  test('dashboard shows readings statistics from Heroku', async ({ page }) => {
    console.log('Verifying dashboard statistics from Heroku...');

    // Go to dashboard
    await page.waitForSelector('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]');
    await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });

    // Wait for stats to load
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Should show some statistics
    const statsExist = await page
      .locator('ion-card, .stat-card')
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (statsExist) {
      const statsCard = page.locator('ion-card, .stat-card').first();
      await expect(statsCard).toBeVisible({ timeout: 15000 });

      // Dashboard should show glucose data
      const dashboardText = await page.locator('ion-content').textContent();

      // Should contain some glucose-related content
      const hasGlucoseData = dashboardText?.includes('mg/dL') || /\d+/.test(dashboardText || '');

      expect(
        hasGlucoseData,
        'Reading card should display glucose value with unit (mg/dL or mmol/L)'
      ).toBeTruthy();

      console.log('✅ Dashboard statistics loaded from Heroku');
    } else {
      console.log('ℹ️  Dashboard statistics not available');
    }
  });

  test('edit reading with Heroku backend', async ({ page }) => {
    // 1. Create a reading to edit first
    const initialValue = '150';
    await createReading(page, initialValue);

    // 2. Click on the reading to edit
    await page.getByText(`${initialValue} mg/dL`).click();

    // 3. Edit the value
    const editedValue = '165';
    await page.getByTestId('glucose-input').fill(editedValue);
    await page.getByTestId('save-reading-btn').click();

    // 4. Verify the new value is displayed
    await expect(page.getByText(`${editedValue} mg/dL`)).toBeVisible();
    await expect(page.getByText(`${initialValue} mg/dL`)).not.toBeVisible();
  });

  async function createReading(page, value) {
    await page.getByTestId('fab-button').click();
    await page.getByTestId('glucose-input').fill(value);
    await page.getByTestId('save-reading-btn').click();
    await expect(page.getByText(`${value} mg/dL`)).toBeVisible();
  }

  test('delete reading with Heroku backend', async ({ page }) => {
    // 1. Create a reading to delete
    const valueToDelete = '180';
    await createReading(page, valueToDelete);

    // 2. Swipe to reveal delete button and click it
    const readingItem = page.getByText(`${valueToDelete} mg/dL`);

    // Simulate swipe gesture using touchscreen
    const boundingBox = await readingItem.boundingBox();
    if (boundingBox) {
      const startX = boundingBox.x + boundingBox.width * 0.8;
      const startY = boundingBox.y + boundingBox.height / 2;
      const endX = boundingBox.x + boundingBox.width * 0.2;
      const endY = startY;
      await page.touchscreen.swipe(startX, startY, endX, endY, { steps: 10 });
    }

    await page.getByTestId('delete-reading-btn').click();

    // 3. Confirm deletion in the dialog
    await page.getByTestId('confirm-delete-btn').click();

    // 4. Verify the reading is removed
    await expect(page.getByText(`${valueToDelete} mg/dL`)).not.toBeVisible();
  });

  test('pull-to-refresh should reload readings', async ({ page }) => {
    await page.goto('/tabs/readings');

    // Simulate pull-to-refresh
    await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      if (content) {
        content.scrollToPoint(0, -100, 500);
      }
    });

    // Check if the refresher is visible
    const refresher = page.locator('ion-refresher-content');
    await expect(refresher).toBeVisible();

    // Wait for the refresh to complete
    await expect(refresher).not.toBeVisible({ timeout: 15000 });

    // We can't easily verify new data is loaded without mocking,
    // but we can at least ensure the page doesn't crash.
    await expect(page.locator('ion-list')).toBeVisible();
  });

  test('should show validation error for empty glucose reading', async ({ page }) => {
    await page.getByTestId('fab-button').click();
    await page.getByTestId('save-reading-btn').click();
    await expect(page.getByTestId('validation-error')).toHaveText(
      'El valor de glucosa es requerido'
    );
  });

  test('should show validation error for non-numeric glucose reading', async ({ page }) => {
    await page.getByTestId('fab-button').click();
    await page.getByTestId('glucose-input').fill('abc');
    await page.getByTestId('save-reading-btn').click();
    await expect(page.getByTestId('validation-error')).toHaveText(
      'El valor de glucosa debe ser un número'
    );
  });
});

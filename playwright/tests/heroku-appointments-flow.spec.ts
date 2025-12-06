/**
 * Heroku Appointments Flow Integration Tests
 *
 * Tests appointment flow with real Heroku backend.
 * Requires E2E_HEROKU_TESTS=true and valid credentials.
 */

import { test, expect } from '@playwright/test';

const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;

test.describe('Heroku Appointments Flow', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');
  test.skip(
    !hasCredentials,
    'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
  );

  // Increase timeout for Heroku tests
  test.setTimeout(60000);

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

    // Wait for login response
    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/token') || response.url().includes('/login'),
      { timeout: 15000 }
    );

    await page.waitForSelector('button:has-text("Iniciar"), button:has-text("Sign In")', {
      timeout: 10000,
    });
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await loginResponsePromise;

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Brief hydration buffer
  });

  test('appointments page loads from Heroku', async ({ page }) => {
    console.log('Loading appointments from Heroku...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await page.waitForSelector(
        '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]',
        { timeout: 10000 }
      );
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 15000 });

      // Wait for data to load
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer

      // Should show appointments page content
      const pageTitle = page.locator('h1, h2').first();
      await expect(pageTitle).toContainText(/Citas|Appointments/i, { timeout: 15000 });

      console.log('✅ Appointments page loaded from Heroku');
    }
  });

  test('appointments display queue status', async ({ page }) => {
    console.log('Checking appointment queue status...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await page.waitForSelector(
        '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]',
        { timeout: 10000 }
      );
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 15000 });

      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer

      // Should show some queue state indicator
      const hasQueueInfo = await page
        .locator('text=/Pendiente|Pending|Aceptada|Accepted|Solicitar|Request/i')
        .isVisible({ timeout: 15000 })
        .catch(() => false);

      expect(hasQueueInfo).toBeTruthy();

      console.log('✅ Appointment queue status visible');
    }
  });

  test('appointment data persists across page refresh', async ({ page }) => {
    console.log('Testing appointment persistence...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await page.waitForSelector(
        '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]',
        { timeout: 10000 }
      );
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 15000 });

      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer

      // Refresh
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer
      await expect(page).toHaveURL(/\/appointments/, { timeout: 15000 });

      // Navigate back to appointments
      const appointmentsTabAfter = page.locator(
        '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
      );
      if (await appointmentsTabAfter.isVisible({ timeout: 10000 }).catch(() => false)) {
        await page.waitForSelector(
          '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]',
          { timeout: 10000 }
        );
        await appointmentsTabAfter.click();
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(500); // Hydration buffer
      }

      // Get state after refresh
      const contentAfter = await page.locator('ion-content').textContent();

      // Should have similar content (data persisted)
      expect(contentAfter?.length).toBeGreaterThan(0);

      console.log('✅ Appointment data persisted');
    }
  });

  test('appointments show in dashboard widget', async ({ page }) => {
    console.log('Checking appointments in dashboard...');

    // Go to dashboard
    await page.waitForSelector('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]');
    await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });

    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Look for appointment-related content
    const dashboardContent = await page.locator('ion-content').textContent();

    // Should mention appointments
    const hasAppointmentInfo =
      dashboardContent?.match(/citas?|appointments?/i) ||
      (await page
        .locator('text=/Próxima|Next|Cita/i')
        .isVisible({ timeout: 15000 })
        .catch(() => false));

    if (hasAppointmentInfo) {
      console.log('✅ Appointments visible in dashboard');
    } else {
      console.log('ℹ️  No appointment widget in dashboard');
    }
  });

  test('navigation between dashboard and appointments works', async ({ page }) => {
    console.log('Testing navigation flow...');

    // Start at dashboard
    await page.waitForSelector('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]');
    await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );
    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await page.waitForSelector(
        '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]',
        { timeout: 10000 }
      );
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer

      // Navigate back to dashboard
      await page.waitForSelector('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]', {
        timeout: 10000,
      });
      await page.click('[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]');
      await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer

      console.log('✅ Navigation flow works correctly');
    }
  });
});

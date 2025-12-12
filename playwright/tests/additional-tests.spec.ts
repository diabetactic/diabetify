/**
 * Additional E2E Tests for Diabetactic
 *
 * This file contains tests for features that are not covered in other spec files.
 * - Appointment Resolution Form Validation
 * - Tidepool Integration
 * - Data Sync Edge Cases
 * - Visual Regression Setup
 */

import { test, expect } from '@playwright/test';
import { acceptNextAppointment, resetQueue, denyNextAppointment } from '../helpers';

// Test user credentials (Heroku backend)
const TEST_USER = process.env.E2E_TEST_USER_DNI ?? '2001';
const TEST_PASS = process.env.E2E_TEST_USER_PASSWORD ?? 'playwright_test';

test.describe('Additional E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    const emailInput = page
      .locator('input[placeholder*="DNI"], input[placeholder*="email"]')
      .first();
    const passwordInput = page
      .locator('input[placeholder*="contraseña"], input[type="password"]')
      .first();
    await emailInput.fill(TEST_USER);
    await passwordInput.fill(TEST_PASS);
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForURL(/\/(tabs|dashboard)/, { timeout: 20000 });
  });

  test.describe('Appointment Resolution Form Validation', () => {
    // Before each test in this suite, reset the queue to ensure a clean state
    test.beforeEach(async () => {
      await resetQueue();
    });

    async function createAndAcceptAppointment(page) {
      // Navigate to Appointments
      await page.locator('[data-testid="tab-appointments"]').click();
      await page.waitForURL(/\/appointments/, { timeout: 10000 });

      // Request Appointment
      const requestButton = page.locator('[data-testid="request-appointment-button"]');

      // Handle dialog that may appear on click
      page.on('dialog', async dialog => await dialog.accept());
      await requestButton.click();
      await page.waitForResponse(response => response.url().includes('/submit') && response.status() === 200);

      // Accept via backoffice API
      const accepted = await acceptNextAppointment();
      expect(accepted).toBeTruthy();

      // Refresh UI to see the change
      await page.reload();

      // Click the button to create the appointment form
      const createBtn = page.locator('[data-testid="create-appointment-button"]');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();

      // Wait for create form to load
      await page.waitForURL(/\/create/, { timeout: 10000 });
    }

    test('should show an error if the objective is empty', async ({ page }) => {
      await createAndAcceptAppointment(page);

      // Try to submit without filling the objective
      const submitButton = page.locator('[data-testid="save-appointment-button"]');
      await submitButton.click();

      // Check for an error message related to the objective field
      const errorMessage = page.locator('[data-testid="objective-error-message"]');
      await expect(errorMessage).toBeVisible();
    });

    test('should show an error if the objective is not a number', async ({ page }) => {
        await createAndAcceptAppointment(page);

        // Fill the objective with invalid text
        const glucoseInput = page.locator('[data-testid="glucose-objective-input"] input');
        await glucoseInput.fill('invalid-text');

        // Try to submit
        const submitButton = page.locator('[data-testid="save-appointment-button"]');
        await submitButton.click();

        // Check for an error message
        const errorMessage = page.locator('[data-testid="objective-number-error-message"]');
        await expect(errorMessage).toBeVisible();
      });

    test('denial flow should show denied status and allow re-request', async ({ page }) => {
      // Create a pending appointment
      await page.locator('[data-testid="tab-appointments"]').click();
      await page.waitForURL(/\/appointments/, { timeout: 10000 });
      const requestButton = page.locator('[data-testid="request-appointment-button"]');
      page.on('dialog', async dialog => await dialog.accept());
      await requestButton.click();
      await page.waitForResponse(response => response.url().includes('/submit') && response.status() === 200);

      // Deny via backoffice API
      const denied = await denyNextAppointment();
      expect(denied).toBeTruthy();

      // Refresh UI to see the change
      await page.reload();

      // Verify DENIED state
      const deniedBadge = page.locator('[data-testid="appointment-status-denied"]');
      await expect(deniedBadge).toBeVisible();

      // Verify that the user can request a new appointment
      await expect(requestButton).toBeVisible();
    });

    test('should allow final submission and display in history', async ({ page }) => {
      await createAndAcceptAppointment(page);

      // Fill the form and submit
      await page.locator('[data-testid="glucose-objective-input"] input').fill('150');
      await page.locator('[data-testid="save-appointment-button"]').click();

      // Verify that the appointment is in the history
      await page.waitForURL(/\/appointments/, { timeout: 10000 });
      const historyItem = page.locator('[data-testid="appointment-history-item"]');
      await expect(historyItem).toBeVisible();
    });
  });

  test.describe('Tidepool Integration', () => {
    test('should open the Tidepool info modal', async ({ page }) => {
      // Navigate to the Profile page
      await page.locator('[data-testid="tab-profile"]').click();
      await page.waitForURL(/\/profile/, { timeout: 10000 });

      // Click the Tidepool info button
      const tidepoolInfoButton = page.locator('ion-button[data-testid="tidepool-info-button"]');
      await tidepoolInfoButton.click();

      // Verify that the modal is open
      const modal = page.locator('ion-modal[data-testid="tidepool-info-modal"]');
      await expect(modal).toBeVisible();
    });

    test('should display the Tidepool user ID in the profile', async ({ page }) => {
      // Navigate to the Profile page
      await page.locator('[data-testid="tab-profile"]').click();
      await page.waitForURL(/\/profile/, { timeout: 10000 });

      // Verify that the Tidepool user ID is displayed
      const tidepoolUserId = page.locator('[data-testid="tidepool-user-id"]');
      await expect(tidepoolUserId).toBeVisible();
    });

    test('should display the Tidepool connection status indicator', async ({ page }) => {
      // Navigate to the Profile page
      await page.locator('[data-testid="tab-profile"]').click();
      await page.waitForURL(/\/profile/, { timeout: 10000 });

      // Verify that the Tidepool connection status indicator is displayed
      const tidepoolStatusIndicator = page.locator('[data-testid="tidepool-status-indicator"]');
      await expect(tidepoolStatusIndicator).toBeVisible();
    });
  });

  test.describe('Data Sync Edge Cases', () => {
    test('sync status indicator should be accurate', async ({ page, context }) => {
      // 1. Verify online status
      const onlineIndicator = page.locator('[data-testid="sync-indicator-online"]');
      await expect(onlineIndicator).toBeVisible({ timeout: 10000 });

      // 2. Go offline and verify status
      await context.setOffline(true);
      const offlineIndicator = page.locator('[data-testid="sync-indicator-offline"]');
      await expect(offlineIndicator).toBeVisible();

      // 3. Make a change and verify pending status
      // (This assumes adding a reading is an offline-capable action)
      // Navigate to readings and add a new one
      await page.locator('[data-testid="tab-readings"]').click();
      await page.waitForURL(/\/readings/, { timeout: 10000 });
      await page.locator('[data-testid="add-reading-fab"]').click();
      await page.waitForURL(/\/create/, { timeout: 5000 });
      await page.locator('[data-testid="reading-value-input"] input').fill('123');
      await page.locator('[data-testid="save-reading-button"]').click();
      await page.waitForURL(/\/readings/, { timeout: 5000 });

      const pendingIndicator = page.locator('[data-testid="sync-indicator-pending"]');
      await expect(pendingIndicator).toBeVisible();

      // 4. Go back online and verify sync completes
      await context.setOffline(false);

      // The indicator might briefly show a "syncing" state before returning to "online"
      const syncingIndicator = page.locator('ion-icon[data-testid="sync-indicator-syncing"]');
      await expect(syncingIndicator.or(onlineIndicator)).toBeVisible();

      // Eventually, it should be back to online
      await expect(onlineIndicator).toBeVisible({ timeout: 15000 });
    });

    test('should handle concurrent offline changes', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);

      // Add a reading
      await page.locator('[data-testid="tab-readings"]').click();
      await page.waitForURL(/\/readings/, { timeout: 10000 });
      await page.locator('[data-testid="add-reading-fab"]').click();
      await page.waitForURL(/\/create/, { timeout: 5000 });
      await page.locator('[data-testid="reading-value-input"] input').fill('100');
      await page.locator('[data-testid="save-reading-button"]').click();
      await page.waitForURL(/\/readings/, { timeout: 5000 });

      // Add another reading
      await page.locator('[data-testid="add-reading-fab"]').click();
      await page.waitForURL(/\/create/, { timeout: 5000 });
      await page.locator('[data-testid="reading-value-input"] input').fill('200');
      await page.locator('[data-testid="save-reading-button"]').click();
      await page.waitForURL(/\/readings/, { timeout: 5000 });

      // Go back online
      await context.setOffline(false);

      // Verify that both readings are synced
      await expect(page.locator('text=100')).toBeVisible();
      await expect(page.locator('text=200')).toBeVisible();
    });
  });

  test.describe('Visual Regression', () => {
    test('Dashboard should match the baseline snapshot', async ({ page }) => {
      await page.goto('/tabs/dashboard');
      // Wait for any animations to complete
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('dashboard.png');
    });
  });
});

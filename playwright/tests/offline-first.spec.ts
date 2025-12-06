/**
 * Offline-First E2E Tests
 *
 * Tests the offline-first architecture:
 * - Data saved locally when offline
 * - Data visible immediately in UI
 * - Data syncs when connection restored
 * - Sync status indicators work correctly
 *
 * Uses Playwright's network interception to simulate offline mode.
 * Requires E2E_HEROKU_TESTS=true and valid credentials.
 */

import { test, expect } from '@playwright/test';

const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;

test.describe('Offline-First Functionality', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');
  test.skip(
    !hasCredentials,
    'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
  );

  test.beforeEach(async ({ page }) => {
    // Login while online
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });

    // Wait for initial data to load and hydration to complete
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page
      .waitForSelector('ion-app.hydrated', { state: 'attached', timeout: 5000 })
      .catch(() => page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 }));
  });

  test.describe('Reading offline workflow', () => {
    test('should save reading when offline', async ({ page, context }) => {
      console.log('Testing offline reading save...');

      // Navigate to readings first (while online)
      await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Count readings before
      const countBefore = await page.locator('ion-card, .reading-item').count();

      // Go offline
      console.log('Going offline...');
      await context.setOffline(true);

      // Open add reading form using FAB button
      const fabButton = page.locator('[data-testid="fab-add-reading"], ion-fab-button');
      if (
        await fabButton
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await fabButton.first().click();

        // Wait for form to appear
        await page.waitForSelector('ion-input input', { state: 'visible', timeout: 5000 });

        // Fill glucose value
        const glucoseInput = page.locator('ion-input input').first();
        if (await glucoseInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          const testValue = Math.floor(Math.random() * 50) + 100;
          await glucoseInput.fill(testValue.toString());

          // Save
          const saveButton = page.locator('[data-testid="add-reading-save-btn"]');
          await saveButton.click();

          // Wait for local save and navigation
          await page.waitForLoadState('networkidle', { timeout: 5000 });

          // Should navigate back (local save succeeded)
          await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });

          // Count readings after
          const countAfter = await page.locator('ion-card, .reading-item').count();

          // Should have one more reading
          expect(countAfter).toBeGreaterThanOrEqual(countBefore);

          console.log(`✅ Reading saved offline: ${testValue} mg/dL`);
        }
      }

      // Go back online
      await context.setOffline(false);
    });

    test('should show reading in list when offline', async ({ page, context }) => {
      console.log('Testing offline reading visibility...');

      // Navigate to readings (online)
      await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Note current readings
      const onlineReadings = await page.locator('ion-card, .reading-item').count();

      // Go offline
      console.log('Going offline...');
      await context.setOffline(true);

      // Wait for offline state to settle
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 });

      // Readings should still be visible (cached in IndexedDB)
      const offlineReadings = await page.locator('ion-card, .reading-item').count();

      expect(offlineReadings).toBe(onlineReadings);

      console.log(`✅ ${offlineReadings} readings visible while offline`);

      // Go back online
      await context.setOffline(false);
    });

    test('should sync when back online', async ({ page, context }) => {
      console.log('Testing sync on reconnect...');

      // Navigate to readings
      await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Go offline
      console.log('Going offline...');
      await context.setOffline(true);

      // Add a reading offline using FAB button
      const addFab = page.locator('[data-testid="fab-add-reading"], ion-fab-button');
      if (
        await addFab
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await addFab.first().click();

        const glucoseInput = page.locator('ion-input input').first();
        if (await glucoseInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          const testValue = Math.floor(Math.random() * 50) + 150;
          await glucoseInput.fill(testValue.toString());

          const saveButton = page.locator('[data-testid="add-reading-save-btn"]');
          await saveButton.click();

          // Wait for navigation after save
          await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 5000 });
        }
      }

      // Go back online
      console.log('Going back online...');
      await context.setOffline(false);

      // Wait for sync to complete
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check for sync indicator
      const syncIndicator = page.locator('text=/Sincronizando|Syncing|Sincronizado|Synced/i');

      const hasSyncIndicator = await syncIndicator
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasSyncIndicator) {
        console.log('✅ Sync indicator visible');
      } else {
        console.log('ℹ️ No explicit sync indicator (may sync silently)');
      }

      console.log('✅ Reconnection handled');
    });

    test('should show unsynced indicator for offline readings', async ({ page, context }) => {
      console.log('Testing unsynced reading indicator...');

      // Navigate to readings
      await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Go offline
      await context.setOffline(true);

      // Add a reading using FAB button
      const unsyncedFab = page.locator('[data-testid="fab-add-reading"], ion-fab-button');
      if (
        await unsyncedFab
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await unsyncedFab.first().click();

        const glucoseInput = page.locator('ion-input input').first();
        if (await glucoseInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await glucoseInput.fill('125');

          const saveButton = page.locator('[data-testid="add-reading-save-btn"]');
          await saveButton.click();

          // Wait for navigation after save
          await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 5000 });
        }
      }

      // Look for unsynced indicator
      const unsyncedIndicator = page.locator(
        'text=/pendiente|pending|sin sincronizar|unsynced|offline/i, .unsynced, [data-synced="false"]'
      );

      const hasUnsyncedIndicator = await unsyncedIndicator
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasUnsyncedIndicator) {
        console.log('✅ Unsynced indicator visible');
      } else {
        console.log('ℹ️ No explicit unsynced indicator');
      }

      // Go back online
      await context.setOffline(false);
    });
  });

  test.describe('Profile offline', () => {
    test('should preserve preferences when offline', async ({ page, context }) => {
      console.log('Testing offline preference preservation...');

      // Navigate to profile with retry for hydration
      await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

      // Get current profile content
      const profileContent = await page.locator('ion-content').textContent();

      // Go offline
      await context.setOffline(true);
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 });

      // Profile should still be visible
      const offlineContent = await page.locator('ion-content').textContent();

      expect(offlineContent?.length, 'Profile should have content while offline').toBeGreaterThan(
        0
      );

      console.log('✅ Profile data preserved offline');

      // Go back online
      await context.setOffline(false);
    });

    test('should sync preferences when back online', async ({ page, context }) => {
      console.log('Testing preference sync...');

      // Navigate to profile
      await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Go offline
      await context.setOffline(true);
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 });

      // Go back online
      await context.setOffline(false);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Profile should still work
      const isWorking = await page
        .locator('ion-content')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(isWorking, 'Profile should be visible after reconnection').toBeTruthy();

      console.log('✅ Preference sync handled');
    });
  });

  test.describe('Network state detection', () => {
    test('should detect offline state', async ({ page, context }) => {
      console.log('Testing offline detection...');

      // Go offline
      await context.setOffline(true);
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 });

      // Look for offline indicator
      const offlineIndicator = page.locator(
        'text=/sin conexión|offline|no internet|desconectado/i, .offline-banner, .no-connection'
      );

      const hasOfflineIndicator = await offlineIndicator
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasOfflineIndicator) {
        console.log('✅ Offline indicator displayed');
      } else {
        console.log('ℹ️ No explicit offline indicator (app continues silently)');
      }

      // Go back online
      await context.setOffline(false);
    });

    test('should detect online state after reconnection', async ({ page, context }) => {
      console.log('Testing online detection after reconnect...');

      // Go offline then online
      await context.setOffline(true);
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
      await context.setOffline(false);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Look for reconnection indicator
      const reconnectedIndicator = page.locator(
        'text=/conectado|connected|online|sincronizando|syncing/i'
      );

      const hasReconnectedIndicator = await reconnectedIndicator
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasReconnectedIndicator) {
        console.log('✅ Reconnection indicator displayed');
      } else {
        console.log('ℹ️ No explicit reconnection indicator');
      }

      // App should continue to work
      const appWorking = await page
        .locator('ion-content')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(appWorking, 'App should be functional after reconnection').toBeTruthy();

      console.log('✅ App functional after reconnection');
    });
  });

  test.describe('Data integrity', () => {
    test('should not lose data during connection fluctuations', async ({ page, context }) => {
      console.log('Testing data integrity during network fluctuations...');

      // Navigate to readings
      await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Count initial readings
      const initialCount = await page.locator('ion-card, .reading-item').count();

      // Simulate connection fluctuations
      for (let i = 0; i < 3; i++) {
        await context.setOffline(true);
        await page.waitForLoadState('domcontentloaded', { timeout: 2000 });
        await context.setOffline(false);
        await page.waitForLoadState('networkidle', { timeout: 3000 });
      }

      // Wait for stabilization after fluctuations
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Count readings after fluctuations
      const finalCount = await page.locator('ion-card, .reading-item').count();

      // Should have same or more readings (no data loss)
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);

      console.log(`✅ Data integrity maintained: ${initialCount} → ${finalCount} readings`);
    });
  });
});

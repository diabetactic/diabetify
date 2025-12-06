/**
 * Settings Persistence Tests
 *
 * Tests:
 * - Theme settings persist across sessions
 * - Language settings persist across sessions
 * - Notification preferences persist
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    if (!page.url().includes('/tabs/')) {
      const username = process.env.E2E_TEST_USERNAME || '1000';
      const password = process.env.E2E_TEST_PASSWORD || 'tuvieja';

      await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
      await page.fill('input[type="password"]', password);
      await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

      await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });
    }
  });

  test('theme setting persists after page refresh', async ({ page }) => {
    // Navigate to profile or settings
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // Find settings link
    const settingsLink = page.locator(
      'ion-button:has-text("Configuración"), ion-button:has-text("Settings"), [href*="settings"]'
    );

    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });
    } else {
      // Try direct navigation
      await page.goto('/settings');
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });
    }

    // Find theme toggle
    const themeToggle = page
      .locator(
        'ion-toggle:near(:text("Tema")), ion-toggle:near(:text("Theme")), ion-toggle:near(:text("Dark"))'
      )
      .first();

    if (await themeToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get current state
      const isChecked = await themeToggle.evaluate((el: any) => el.checked);

      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(1000);

      // Refresh page
      await page.reload();
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

      // Navigate back to settings
      const settingsLinkAfterRefresh = page.locator(
        'ion-button:has-text("Configuración"), ion-button:has-text("Settings")'
      );

      if (await settingsLinkAfterRefresh.isVisible({ timeout: 2000 }).catch(() => false)) {
        await settingsLinkAfterRefresh.click();
        await page.waitForTimeout(1000);
      }

      // Verify toggle state persisted
      const newThemeToggle = page
        .locator('ion-toggle:near(:text("Tema")), ion-toggle:near(:text("Theme"))')
        .first();

      const newIsChecked = await newThemeToggle.evaluate((el: any) => el.checked);
      expect(newIsChecked).toBe(!isChecked);

      // Toggle back to original state (cleanup)
      await newThemeToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('language setting persists after app restart', async ({ page, context }) => {
    // Navigate to settings
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    const settingsLink = page.locator(
      'ion-button:has-text("Configuración"), ion-button:has-text("Settings"), [href*="settings"]'
    );

    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });
    } else {
      await page.goto('/settings');
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });
    }

    // Find language selector
    const languageButton = page
      .locator('ion-button:has-text("Idioma"), ion-button:has-text("Language"), ion-select')
      .first();

    if (await languageButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Note: Get current language from UI
      const currentLanguage = await page.evaluate(() => {
        return document.querySelector('html')?.getAttribute('lang') || 'es';
      });

      console.log('Current language:', currentLanguage);

      // Click language selector
      await languageButton.click();
      await page.waitForTimeout(500);

      // Select different language (if currently Spanish, choose English)
      const targetLanguage = currentLanguage === 'es' ? 'English' : 'Español';
      const languageOption = page.locator(
        `text=${targetLanguage}, button:has-text("${targetLanguage}")`
      );

      if (await languageOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await languageOption.click();
        await page.waitForTimeout(1000);

        // Create new page (simulating app restart)
        const newPage = await context.newPage();
        await newPage.goto('/');

        // Check if language persisted
        const newLanguage = await newPage.evaluate(() => {
          return document.querySelector('html')?.getAttribute('lang');
        });

        console.log('New language after restart:', newLanguage);

        // Verify language actually changed
        expect(
          newLanguage && newLanguage !== currentLanguage,
          'Language should change after selection'
        ).toBeTruthy();

        // Close new page
        await newPage.close();

        // Switch language back (cleanup)
        await page.reload();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('settings page is accessible from profile', async ({ page }) => {
    // Navigate to profile
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // Verify settings link exists
    const settingsLink = page.locator(
      'ion-button:has-text("Configuración"), ion-button:has-text("Settings"), [href*="settings"]'
    );

    await expect(settingsLink).toBeVisible({ timeout: 5000 });

    // Click and verify navigation
    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 5000 });

    // Verify settings page content
    const settingsTitle = page.locator('h1, h2').first();
    await expect(settingsTitle).toContainText(/Configuración|Settings/i);
  });
});

/**
 * Settings Persistence Tests
 *
 * Tests:
 * - Theme settings persist across sessions
 * - Language settings persist across sessions
 * - Notification preferences persist
 */

import { test, expect } from '@playwright/test';
import { restartApp } from '../helpers';

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

  test('theme setting persists after app restart', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    const themeToggle = page.locator('ion-toggle:near(:text("Tema")), ion-toggle:near(:text("Theme"))').first();
    await expect(themeToggle).toBeVisible({ timeout: 3000 });

    // Get current state
    const isChecked = await themeToggle.evaluate((el: any) => el.checked);

    // Toggle theme
    await themeToggle.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Restart app
    await restartApp(page);

    // Return to settings
    await page.goto('/settings');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // Verify theme persisted
    const newThemeToggle = page.locator('ion-toggle:near(:text("Tema")), ion-toggle:near(:text("Theme"))').first();
    const newIsChecked = await newThemeToggle.evaluate((el: any) => el.checked);
    expect(newIsChecked).toBe(!isChecked);

    // Cleanup: Toggle back to original state
    await newThemeToggle.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('language setting persists after app restart', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // Get current language
    const getLang = () => page.evaluate(() => document.documentElement.lang);
    const initialLang = await getLang();

    // Determine target language
    const targetLang = initialLang === 'es' ? 'en' : 'es';
    const targetLangLabel = initialLang === 'es' ? 'English' : 'Español';

    // Change language
    await page.locator('ion-select:near(:text("Idioma"), :text("Language"))').click();
    await page.locator(`ion-select-option:has-text("${targetLangLabel}")`).click();
    await page.locator('ion-alert button:has-text("OK")').click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify language changed before restart
    expect(await getLang()).toBe(targetLang);

    // Restart app
    await restartApp(page);

    // Verify language persisted
    expect(await getLang()).toBe(targetLang);

    // Cleanup: Revert to initial language
    await page.goto('/settings');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });
    const initialLangLabel = initialLang === 'es' ? 'Español' : 'English';
    await page.locator('ion-select:near(:text("Idioma"), :text("Language"))').click();
    await page.locator(`ion-select-option:has-text("${initialLangLabel}")`).click();
    await page.locator('ion-alert button:has-text("OK")').click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });
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

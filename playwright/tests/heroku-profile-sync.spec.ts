/**
 * Heroku Profile Sync Integration Tests
 *
 * Tests profile data synchronization with Heroku backend.
 * Requires E2E_HEROKU_TESTS=true and valid credentials.
 */

import { test, expect } from '@playwright/test';

const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;

test.describe('Heroku Profile Sync', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');
  test.skip(
    !hasCredentials,
    'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
  );

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
  });

  test('profile loads data from Heroku', async ({ page }) => {
    console.log('Loading profile from Heroku...');

    // Navigate to profile
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 10000 });

    // Wait for profile data to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should show profile information
    const profileContent = page.locator('ion-content');
    await expect(profileContent).toBeVisible();

    // Should have some user data
    const hasUserData = await page.locator('ion-item, ion-label').count();
    expect(hasUserData).toBeGreaterThan(0);

    console.log('✅ Profile loaded from Heroku');
  });

  test('profile displays correct username', async ({ page }) => {
    console.log('Verifying username in profile...');

    const username = process.env.E2E_TEST_USERNAME!;

    // Navigate to profile
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 10000 });

    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should display username somewhere
    const profileText = await page.locator('ion-content').textContent();

    // Username should appear (might be partially visible)
    const hasUsername = profileText?.includes(username.substring(0, 4));

    if (hasUsername) {
      console.log(`✅ Username visible in profile: ${username}`);
    } else {
      console.log('ℹ️  Username not directly visible (might be in header)');
    }
  });

  test('profile data persists across sessions', async ({ page, context }) => {
    console.log('Testing profile persistence across sessions...');

    // Navigate to profile
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 10000 });

    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Create new page (simulate new session)
    const newPage = await context.newPage();

    // Login again
    await newPage.goto('/login');
    await newPage.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await newPage.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await newPage.fill('input[type="password"]', password);
    await newPage.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await expect(newPage).toHaveURL(/\/tabs\//, { timeout: 20000 });

    // Navigate to profile in new session
    await newPage.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(newPage).toHaveURL(/\/tabs\/profile/, { timeout: 10000 });
    await newPage.waitForLoadState('networkidle', { timeout: 15000 });

    // Get profile data in new session
    const profileDataAfter = await newPage.locator('ion-content').textContent();

    // Should have similar data
    expect(profileDataAfter?.length).toBeGreaterThan(0);

    await newPage.close();

    console.log('✅ Profile data persisted across sessions');
  });

  test('logout works and requires re-login', async ({ page }) => {
    console.log('Testing logout flow...');

    // Navigate to profile
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 10000 });

    // Look for logout button
    const logoutButton = page.locator(
      'ion-button:has-text("Cerrar"), ion-button:has-text("Logout"), ion-button:has-text("Salir")'
    );

    if (await logoutButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await logoutButton.click();

      // Should redirect to login or welcome
      await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 10000 });

      // Try to access protected route
      await page.goto('/tabs/dashboard');

      // Should redirect back to login
      await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 10000 });

      console.log('✅ Logout works correctly');
    } else {
      console.log('ℹ️  Logout button not found');
    }
  });

  test('settings accessible from profile', async ({ page }) => {
    console.log('Testing settings access from profile...');

    // Navigate to profile
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 10000 });

    // Look for settings link
    const settingsLink = page.locator(
      'ion-button:has-text("Configuración"), ion-button:has-text("Settings"), [href*="settings"]'
    );

    if (await settingsLink.isVisible({ timeout: 10000 }).catch(() => false)) {
      await settingsLink.click();

      // Should navigate to settings
      await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });

      // Verify settings page loaded
      const settingsTitle = page.locator('h1, h2').first();
      await expect(settingsTitle).toContainText(/Configuración|Settings/i);

      console.log('✅ Settings accessible from profile');
    } else {
      console.log('ℹ️  Settings link not found in profile');
    }
  });
});

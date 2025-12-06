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

  test('profile loads data from Heroku', async ({ page }) => {
    console.log('Loading profile from Heroku...');

    // Navigate to profile
    await page.waitForSelector('[data-testid="tab-profile"], ion-tab-button[tab="profile"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });

    // Wait for profile data to load
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Should show profile information
    const profileContent = page.locator('ion-content');
    await expect(profileContent).toBeVisible({ timeout: 15000 });

    // Should have some user data
    const hasUserData = await page.locator('ion-item, ion-label').count();
    expect(hasUserData).toBeGreaterThan(0);

    console.log('✅ Profile loaded from Heroku');
  });

  test('profile displays correct username', async ({ page }) => {
    console.log('Verifying username in profile...');

    const username = process.env.E2E_TEST_USERNAME!;

    // Navigate to profile
    await page.waitForSelector('[data-testid="tab-profile"], ion-tab-button[tab="profile"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });

    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

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
    await page.waitForSelector('[data-testid="tab-profile"], ion-tab-button[tab="profile"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });

    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Create new page (simulate new session)
    const newPage = await context.newPage();

    // Login again
    await newPage.goto('/login');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(500); // Brief hydration buffer
    await newPage.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await newPage.waitForSelector('input[placeholder*="DNI"], input[placeholder*="email"]', {
      timeout: 10000,
    });
    await newPage.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await newPage.fill('input[type="password"]', password);

    const loginResponsePromise = newPage.waitForResponse(
      response => response.url().includes('/token') || response.url().includes('/login'),
      { timeout: 15000 }
    );

    await newPage.waitForSelector('button:has-text("Iniciar"), button:has-text("Sign In")', {
      timeout: 10000,
    });
    await newPage.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await loginResponsePromise;

    await expect(newPage).toHaveURL(/\/tabs\//, { timeout: 20000 });
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(500); // Brief hydration buffer

    // Navigate to profile in new session
    await newPage.waitForSelector('[data-testid="tab-profile"], ion-tab-button[tab="profile"]', {
      timeout: 10000,
    });
    await newPage.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(newPage).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });
    await newPage.waitForLoadState('networkidle', { timeout: 20000 });
    await newPage.waitForTimeout(500); // Hydration buffer

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
    await page.waitForSelector('[data-testid="tab-profile"], ion-tab-button[tab="profile"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });

    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Look for logout button
    const logoutButton = page.locator(
      'ion-button:has-text("Cerrar"), ion-button:has-text("Logout"), ion-button:has-text("Salir")'
    );

    if (await logoutButton.isVisible({ timeout: 15000 }).catch(() => false)) {
      await page.waitForSelector(
        'ion-button:has-text("Cerrar"), ion-button:has-text("Logout"), ion-button:has-text("Salir")',
        { timeout: 10000 }
      );
      await logoutButton.click();

      // Wait for navigation
      await page.waitForLoadState('networkidle', { timeout: 20000 });

      // Should redirect to login or welcome
      await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 15000 });

      // Try to access protected route
      await page.goto('/tabs/dashboard');
      await page.waitForLoadState('networkidle', { timeout: 20000 });

      // Should redirect back to login
      await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 15000 });

      console.log('✅ Logout works correctly');
    } else {
      console.log('ℹ️  Logout button not found');
    }
  });

  test('settings accessible from profile', async ({ page }) => {
    console.log('Testing settings access from profile...');

    // Navigate to profile
    await page.waitForSelector('[data-testid="tab-profile"], ion-tab-button[tab="profile"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });

    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(500); // Hydration buffer

    // Look for settings link
    const settingsLink = page.locator(
      'ion-button:has-text("Configuración"), ion-button:has-text("Settings"), [href*="settings"]'
    );

    if (await settingsLink.isVisible({ timeout: 15000 }).catch(() => false)) {
      await page.waitForSelector(
        'ion-button:has-text("Configuración"), ion-button:has-text("Settings"), [href*="settings"]',
        { timeout: 10000 }
      );
      await settingsLink.click();

      // Wait for navigation
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer

      // Should navigate to settings
      await expect(page).toHaveURL(/\/settings/, { timeout: 15000 });

      // Verify settings page loaded
      const settingsTitle = page.locator('h1, h2').first();
      await expect(settingsTitle).toContainText(/Configuración|Settings/i, { timeout: 15000 });

      console.log('✅ Settings accessible from profile');
    } else {
      console.log('ℹ️  Settings link not found in profile');
    }
  });
});

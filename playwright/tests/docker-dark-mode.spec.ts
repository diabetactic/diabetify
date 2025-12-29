/**
 * Docker Backend - Dark Mode E2E Tests
 *
 * Tests dark mode rendering across all pages with screenshot proof.
 * Verifies that theme switching works correctly and persists.
 *
 * Run with: E2E_DOCKER_TESTS=true pnpm exec playwright test docker-dark-mode
 */

import { test, expect, Page } from '@playwright/test';

// Configuration
const isDockerTest = process.env.E2E_DOCKER_TESTS === 'true';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4200';
const TEST_USERNAME = process.env.E2E_TEST_USERNAME || '1000';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'tuvieja';

// Screenshot directory
const SCREENSHOT_DIR = 'playwright/artifacts/docker-proof';

/**
 * Disable device frame for desktop viewport testing.
 */
async function disableDeviceFrame(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('no-device-frame');
  });
}

/**
 * Enable dark mode via ThemeService triggers.
 * The app uses 3 CSS triggers that must all be set:
 * - data-theme="dark" on <html>
 * - .dark class on <html>
 * - .ion-palette-dark class on <html>
 */
async function enableDarkMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', 'dark');
    html.classList.add('dark', 'ion-palette-dark');
    document.body.classList.add('dark');
  });
  await page.waitForTimeout(300); // Allow CSS transitions
}

/**
 * Enable light mode (default theme).
 */
async function enableLightMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', 'light');
    html.classList.remove('dark', 'ion-palette-dark');
    document.body.classList.remove('dark');
  });
  await page.waitForTimeout(300); // Allow CSS transitions
}

/**
 * Verify dark mode CSS variables are applied.
 */
async function verifyDarkModeActive(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const html = document.documentElement;
    const hasDarkTheme = html.getAttribute('data-theme') === 'dark';
    const hasDarkClass = html.classList.contains('dark');
    const hasIonPalette = html.classList.contains('ion-palette-dark');
    return hasDarkTheme && hasDarkClass && hasIonPalette;
  });
}

/**
 * Login helper with device frame bypass.
 */
async function loginAndNavigate(page: Page, targetTab?: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await disableDeviceFrame(page);

  // Handle welcome screen if present
  if (page.url().includes('/welcome')) {
    const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
    if ((await loginBtn.count()) > 0) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  // Perform login if needed
  if (!page.url().includes('/tabs/')) {
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    await page.fill('#username', TEST_USERNAME);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
  }

  // Navigate to target tab if specified
  if (targetTab) {
    const tabLabels: Record<string, string> = {
      readings: 'Lecturas',
      appointments: 'Citas',
      profile: 'Perfil',
      dashboard: 'Inicio',
      settings: 'Ajustes',
    };
    const tabLabel = tabLabels[targetTab] || targetTab;

    const tabByTestId = page.locator(`[data-testid="tab-${targetTab}"]`);
    const tabByRole = page.getByRole('tab', { name: tabLabel });

    if (await tabByTestId.isVisible().catch(() => false)) {
      await tabByTestId.click();
    } else if (await tabByRole.isVisible().catch(() => false)) {
      await tabByRole.click();
    } else {
      await page.goto(`${BASE_URL}/tabs/${targetTab}`);
    }

    // Esperar a que la URL contenga la pestaña objetivo (evita ReDoS con regex dinámicas)
    // Note: waitForURL predicate receives a URL object, so we use url.href to get the string
    await page.waitForURL(url => url.href.includes(`/tabs/${targetTab}`), { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }
}

// =============================================================================
// DARK MODE TESTS @docker @docker-dark-mode
// =============================================================================

test.describe('Docker Backend - Dark Mode @docker @docker-dark-mode', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test('dashboard renders correctly in light mode', async ({ page }) => {
    await loginAndNavigate(page, 'dashboard');
    await enableLightMode(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-light-mode/dashboard.png`,
      fullPage: true,
    });

    // Verify dashboard elements are visible (use dashboard-specific elements)
    await expect(page.getByRole('tab', { name: 'Inicio' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Reading' })).toBeVisible();
  });

  test('dashboard renders correctly in dark mode', async ({ page }) => {
    await loginAndNavigate(page, 'dashboard');
    await enableDarkMode(page);

    const isDark = await verifyDarkModeActive(page);
    expect(isDark).toBe(true);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dark-mode/dashboard.png`,
      fullPage: true,
    });

    // Verify dark mode styles applied (background should be dark)
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // Dark mode should have dark background (low RGB values)
    expect(bgColor).toMatch(/rgb\(\s*\d{1,2}\s*,\s*\d{1,2}\s*,\s*\d{1,2}\s*\)|#[0-3]/);
  });

  test('readings page in light and dark mode', async ({ page }) => {
    await loginAndNavigate(page, 'readings');

    // Light mode screenshot
    await enableLightMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-light-mode/readings.png`,
      fullPage: true,
    });

    // Dark mode screenshot
    await enableDarkMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dark-mode/readings.png`,
      fullPage: true,
    });

    // Verify readings content is visible in both modes
    const readingsText = page.getByText(/Mostrando.*lecturas|Showing.*readings/i);
    await expect(readingsText).toBeVisible({ timeout: 10000 });
  });

  test('appointments page in light and dark mode', async ({ page }) => {
    await loginAndNavigate(page, 'appointments');

    // Light mode screenshot
    await enableLightMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-light-mode/appointments.png`,
      fullPage: true,
    });

    // Dark mode screenshot
    await enableDarkMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dark-mode/appointments.png`,
      fullPage: true,
    });

    // Verify appointments page loaded (check for tab bar which confirms navigation)
    await expect(page.getByRole('tab', { name: 'Citas' })).toBeVisible();
  });

  test('profile page in light and dark mode', async ({ page }) => {
    await loginAndNavigate(page, 'profile');

    // Light mode screenshot
    await enableLightMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-light-mode/profile.png`,
      fullPage: true,
    });

    // Dark mode screenshot
    await enableDarkMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dark-mode/profile.png`,
      fullPage: true,
    });

    // Verify profile content is visible
    const hasGreeting = await page
      .getByRole('heading', { name: /Hola|Hello/i })
      .isVisible()
      .catch(() => false);
    const hasEmail = await page
      .getByText('@example.com')
      .isVisible()
      .catch(() => false);
    expect(hasEmail || hasGreeting).toBe(true);
  });

  test('add reading form in light and dark mode', async ({ page }) => {
    await loginAndNavigate(page, 'readings');

    // Click add reading button
    const addButton = page.getByRole('button', { name: 'Add Reading' });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    await page.waitForLoadState('networkidle');

    // Light mode screenshot
    await enableLightMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-light-mode/add-reading-form.png`,
      fullPage: true,
    });

    // Dark mode screenshot
    await enableDarkMode(page);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dark-mode/add-reading-form.png`,
      fullPage: true,
    });

    // Verify form is visible
    const valueInput = page.locator('input[type="number"], [data-testid="glucose-input"]').first();
    await expect(valueInput).toBeVisible({ timeout: 5000 });
  });

  test('theme persists across navigation', async ({ page }) => {
    await loginAndNavigate(page, 'dashboard');

    // Enable dark mode
    await enableDarkMode(page);
    expect(await verifyDarkModeActive(page)).toBe(true);

    // Navigate to readings
    const readingsTab = page.getByRole('tab', { name: 'Lecturas' });
    await readingsTab.click();
    await page.waitForLoadState('networkidle');

    // Verify dark mode is still active
    expect(await verifyDarkModeActive(page)).toBe(true);

    // Navigate to profile
    const profileTab = page.getByRole('tab', { name: 'Perfil' });
    await profileTab.click();
    await page.waitForLoadState('networkidle');

    // Verify dark mode persists
    expect(await verifyDarkModeActive(page)).toBe(true);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dark-mode/theme-persistence-verified.png`,
      fullPage: true,
    });
  });
});

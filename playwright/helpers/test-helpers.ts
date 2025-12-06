/**
 * Playwright Test Helpers for Diabetactic E2E Tests
 *
 * Shared utilities to reduce code duplication and improve test reliability.
 */

import { Page, expect } from '@playwright/test';

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Login helper - handles the complete login flow with proper waits
 */
export async function loginUser(page: Page, credentials?: LoginCredentials): Promise<void> {
  const username = credentials?.username || process.env.E2E_TEST_USERNAME || '1000';
  const password = credentials?.password || process.env.E2E_TEST_PASSWORD || 'tuvieja';

  // Navigate to login if not already there
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  // Wait for login form with retry for hydration
  await page.waitForSelector('form', { state: 'visible', timeout: 15000 });

  // If already logged in, skip
  if (page.url().includes('/tabs/')) {
    return;
  }

  // Fill credentials using more reliable selectors
  await page.fill(
    'input[placeholder*="DNI"], input[placeholder*="email"], input[type="text"]',
    username
  );
  await page.fill('input[type="password"]', password);

  // Submit form
  await page.click('button:has-text("Iniciar"), button:has-text("Sign In"), button[type="submit"]');

  // Wait for successful navigation
  await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });

  // Wait for Ionic hydration
  await waitForIonicHydration(page);
}

/**
 * Wait for Ionic components to fully hydrate
 */
export async function waitForIonicHydration(page: Page, timeout = 5000): Promise<void> {
  try {
    // Wait for ion-app to be hydrated
    await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout });
  } catch {
    // Fallback: wait for any ion-content to be visible
    await page.waitForSelector('ion-content', { state: 'visible', timeout });
  }
}

/**
 * Navigate to a tab with proper waits
 */
export async function navigateToTab(
  page: Page,
  tabName: 'dashboard' | 'readings' | 'appointments' | 'profile'
): Promise<void> {
  // Click tab button
  const tabButton = page.locator(
    `[data-testid="tab-${tabName}"], ion-tab-button[tab="${tabName}"]`
  );
  await tabButton.click();

  // Wait for URL change
  await expect(page).toHaveURL(new RegExp(`/${tabName}`), { timeout: 10000 });

  // Wait for content to load
  await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

  // Additional wait for data loading
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

/**
 * Wait for element with retry logic
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' } = {}
): Promise<void> {
  const { timeout = 10000, state = 'visible' } = options;

  await page.waitForSelector(selector, { state, timeout });
}

/**
 * Fill Ionic input (handles shadow DOM and native input)
 */
export async function fillIonicInput(page: Page, selector: string, value: string): Promise<void> {
  // Ionic inputs have a nested native input
  const input = page.locator(`${selector} input`).first();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill(value);
}

/**
 * Click Ionic button with retry
 */
export async function clickIonicButton(page: Page, text: string): Promise<void> {
  const button = page.locator(`ion-button:has-text("${text}"), button:has-text("${text}")`).first();
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click();
}

/**
 * Wait for navigation with timeout
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: RegExp | string,
  timeout = 10000
): Promise<void> {
  await expect(page).toHaveURL(urlPattern, { timeout });
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout = 3000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take screenshot with consistent naming
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  directory = 'playwright/artifacts'
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${directory}/${name}-${timestamp}.png`;
  await page.screenshot({ path, fullPage: true });
}

/**
 * Handle Ionic alert/dialog
 */
export async function handleIonicAlert(
  page: Page,
  action: 'accept' | 'dismiss' = 'accept'
): Promise<void> {
  // Set up dialog handler
  page.on('dialog', async dialog => {
    if (action === 'accept') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
}

/**
 * Wait for network idle with retry
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Fallback: just wait for domcontentloaded
    await page.waitForLoadState('domcontentloaded', { timeout });
  }
}

/**
 * Get text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string | null> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 3000 });
    return await element.textContent();
  } catch {
    return null;
  }
}

/**
 * Check if logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  return page.url().includes('/tabs/');
}

/**
 * Logout user
 */
export async function logoutUser(page: Page): Promise<void> {
  // Navigate to profile
  await navigateToTab(page, 'profile');

  // Look for logout button
  const logoutButton = page
    .locator(
      'ion-button:has-text("Cerrar"), ion-button:has-text("Logout"), ion-button:has-text("Salir")'
    )
    .first();

  if (await elementExists(page, logoutButton.toString())) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 10000 });
  }
}

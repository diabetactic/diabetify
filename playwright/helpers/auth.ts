/**
 * Authentication Helper for Playwright Tests
 *
 * Provides reusable login functions to reduce code duplication
 * across Heroku integration tests.
 */

import { Page, expect } from '@playwright/test';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginOptions {
  timeout?: number;
  waitForHydration?: boolean;
}

/**
 * Wait for Ionic app to hydrate after navigation
 * Replaces hardcoded waitForTimeout(500) with proper hydration check
 */
export async function waitForIonicHydration(page: Page, timeout = 10000): Promise<void> {
  try {
    // Wait for ion-app to be hydrated
    await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout });
  } catch {
    // Fallback: wait for ion-content to be visible
    await page.waitForSelector('ion-content', { state: 'visible', timeout });
  }
}

/**
 * Login to Heroku backend via UI
 *
 * @param page - Playwright Page object
 * @param credentials - Username and password (defaults to env vars)
 * @param options - Timeout and hydration settings
 *
 * @example
 * await loginToHeroku(page);
 * await loginToHeroku(page, { username: 'test@example.com', password: 'pass' });
 */
export async function loginToHeroku(
  page: Page,
  credentials?: LoginCredentials,
  options: LoginOptions = {}
): Promise<void> {
  const { timeout = 20000, waitForHydration = true } = options;

  const username = credentials?.username || process.env.E2E_TEST_USERNAME;
  const password = credentials?.password || process.env.E2E_TEST_PASSWORD;

  if (!username || !password) {
    throw new Error('Login credentials not provided (E2E_TEST_USERNAME, E2E_TEST_PASSWORD)');
  }

  // Navigate to login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  if (waitForHydration) {
    await waitForIonicHydration(page);
  }

  // Wait for form to be visible
  await page.waitForSelector('form', { state: 'visible', timeout });

  // Fill credentials
  await page.waitForSelector('input[placeholder*="DNI"], input[placeholder*="email"]', {
    timeout,
  });
  await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
  await page.fill('input[type="password"]', password);

  // Submit form with race-condition-safe approach
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/token') || r.url().includes('/login'), {
      timeout: 15000,
    }),
    page.click('button:has-text("Iniciar"), button:has-text("Sign In")'),
  ]);

  // Wait for successful navigation
  await expect(page).toHaveURL(/\/tabs\//, { timeout });
  await page.waitForLoadState('networkidle');

  if (waitForHydration) {
    await waitForIonicHydration(page);
  }
}

/**
 * Login to Heroku backend and extract auth token
 *
 * @param page - Playwright Page object
 * @param credentials - Username and password
 * @returns Auth token string
 *
 * @example
 * const token = await loginAndGetToken(page);
 * // Use token for API requests
 */
export async function loginAndGetToken(
  page: Page,
  credentials?: LoginCredentials
): Promise<string> {
  const username = credentials?.username || process.env.E2E_TEST_USERNAME;
  const password = credentials?.password || process.env.E2E_TEST_PASSWORD;

  if (!username || !password) {
    throw new Error('Login credentials not provided (E2E_TEST_USERNAME, E2E_TEST_PASSWORD)');
  }

  // Navigate to login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await waitForIonicHydration(page);

  await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

  await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
  await page.fill('input[type="password"]', password);

  // Capture token from response
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/token') || r.url().includes('/login'), {
      timeout: 15000,
    }),
    page.click('button:has-text("Iniciar"), button:has-text("Sign In")'),
  ]);

  // Extract token from response
  let token = '';
  try {
    if (response.ok()) {
      const data = await response.json();
      token = data.access_token || data.token || '';
    }
  } catch (error) {
    console.error('Failed to extract auth token from login response', error);
  }

  // Wait for navigation
  await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
  await page.waitForLoadState('networkidle');

  if (!token) {
    throw new Error('Failed to obtain auth token from login response');
  }

  return token;
}

/**
 * Check if user is already logged in
 *
 * @param page - Playwright Page object
 * @returns true if on /tabs/* route, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  return page.url().includes('/tabs/');
}

/**
 * Logout from the application
 *
 * @param page - Playwright Page object
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to profile
  await page.click('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
  await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Click logout button
  const logoutButton = page.locator(
    'ion-button:has-text("Cerrar"), ion-button:has-text("Logout"), ion-button:has-text("Salir")'
  );

  if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 15000 });
  } else {
    throw new Error('Logout button not found');
  }
}

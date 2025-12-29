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
 * Get default password based on environment mode.
 * Mock mode uses demo123, real backend uses tuvieja.
 */
function getDefaultPassword(): string {
  if (process.env.E2E_TEST_PASSWORD) {
    return process.env.E2E_TEST_PASSWORD;
  }
  // Mock mode uses demo123, real backend uses tuvieja
  const isMockMode = process.env.E2E_MOCK_MODE === 'true';
  return isMockMode ? 'demo123' : 'tuvieja';
}

/**
 * Login helper - handles the complete login flow with proper waits
 */
export async function loginUser(page: Page, credentials?: LoginCredentials): Promise<void> {
  const username = credentials?.username || process.env.E2E_TEST_USERNAME || '1000';
  const password = credentials?.password || getDefaultPassword();

  // Navigate to login if not already there
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // If already logged in, skip
  if (page.url().includes('/tabs/')) {
    return;
  }

  // Wait for login form with retry for hydration
  await page.waitForSelector('[data-testid="login-username-input"]', {
    state: 'visible',
    timeout: 15000,
  });

  // Fill credentials using data-testid selectors (most reliable)
  await page.fill('[data-testid="login-username-input"]', username);
  await page.fill('[data-testid="login-password-input"]', password);

  // Submit form using data-testid
  await page.click('[data-testid="login-submit-btn"]');

  // Wait for successful navigation to dashboard
  await expect(page).toHaveURL(/\/tabs\//, { timeout: 30000 });

  // Set a complete profile to bypass onboarding guard
  await completeOnboarding(page);

  // Reload the page to ensure the app recognizes the new profile
  await page.reload();

  // Wait for Ionic hydration after reload
  await waitForIonicHydration(page);
}

/**
 * Wait for Ionic components to fully hydrate
 */
export async function waitForIonicHydration(page: Page, timeout = 10000): Promise<void> {
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

  // Wait for the tab button to have tab-selected class (Ionic uses this instead of aria-selected)
  await expect(tabButton).toHaveClass(/tab-selected/, { timeout: 5000 });

  // Wait for a VISIBLE ion-content (not hidden ones from other tabs)
  // Ionic hides inactive tab content but keeps them in DOM
  await page.waitForFunction(
    () => {
      const contents = document.querySelectorAll('ion-content.hydrated');
      return Array.from(contents).some(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    },
    { timeout: 10000 }
  );

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
 * Clears existing value first and validates the final value
 */
export async function fillIonicInput(page: Page, selector: string, value: string): Promise<void> {
  // Ionic inputs have a nested native input
  const input = page.locator(`${selector} input`).first();
  await input.waitFor({ state: 'visible', timeout: 5000 });

  // Clear existing value first
  await input.clear();

  // Fill with new value
  await input.fill(value);

  // Validate the value was set correctly
  const actualValue = await input.inputValue();
  if (actualValue !== value) {
    throw new Error(`Failed to set input value. Expected: "${value}", but got: "${actualValue}"`);
  }
}

/**
 * Click Ionic button with retry
 * Checks enabled state before clicking to prevent interaction with disabled buttons
 */
export async function clickIonicButton(page: Page, text: string): Promise<void> {
  const button = page.locator(`ion-button:has-text("${text}"), button:has-text("${text}")`).first();
  await button.waitFor({ state: 'visible', timeout: 5000 });

  // Check if button is enabled
  const isDisabled = await button.isDisabled();
  if (isDisabled) {
    throw new Error(`Button "${text}" is disabled and cannot be clicked`);
  }

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
 * Programmatically set a complete user profile in localStorage.
 * This ensures the OnboardingGuard allows navigation.
 */
export async function completeOnboarding(page: Page, isMockMode = false): Promise<void> {
  // A complete user profile object that satisfies the OnboardingGuard
  const userProfile = {
    id: 'user_12345',
    name: 'E2E Test User',
    email: 'e2e@test.com',
    age: 30,
    accountState: 'ACTIVE',
    dateOfBirth: '1993-01-01',
    tidepoolConnection: { connected: false },
    preferences: {
      useDarkTheme: false,
      language: 'en',
      notifications: {
        glucoseReadings: { enabled: true, interval: 15 },
        appointmentReminders: { enabled: true, reminderLeadTime: 60 },
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    diagnosisDate: '2020-01-01',
    diabetesType: 'TYPE_1',
    hasCompletedOnboarding: true, // This is the crucial flag
  };

  // Set the profile in localStorage
  await page.evaluate(
    profile => {
      localStorage.setItem('diabetactic_user_profile', JSON.stringify(profile));
      localStorage.setItem('diabetactic_schema_version', '1');
    },
    userProfile
  );
}

/**
 * Logout user
 */
export async function logoutUser(page: Page): Promise<void> {
  // Navigate to profile
  await navigateToTab(page, 'profile');

  // Look for logout button - use isVisible instead of broken elementExists pattern
  const logoutButton = page
    .locator(
      'ion-button:has-text("Cerrar"), ion-button:has-text("Logout"), ion-button:has-text("Salir")'
    )
    .first();

  if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 10000 });
  }
}

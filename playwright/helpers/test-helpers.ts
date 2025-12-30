/**
 * Playwright Test Helpers for Diabetactic E2E Tests
 *
 * Shared utilities to reduce code duplication and improve test reliability.
 * Optimized for Ionic/Capacitor apps with shadow DOM and hydration handling.
 */

import { Page, expect } from '@playwright/test';

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * User profile interface matching the app's schema.
 * Keeps type safety to catch schema drifts early.
 * NOTE: accountState uses lowercase to match the app's actual values.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  accountState: 'active' | 'pending' | 'disabled'; // Lowercase to match app
  dateOfBirth: string;
  tidepoolConnection: { connected: boolean };
  preferences: {
    useDarkTheme?: boolean;
    language?: string;
    notifications?: {
      glucoseReadings?: { enabled: boolean; interval: number };
      appointmentReminders?: { enabled: boolean; reminderLeadTime: number };
    };
  };
  createdAt: string;
  updatedAt: string;
  diagnosisDate: string;
  diabetesType: 'TYPE_1' | 'TYPE_2' | 'GESTATIONAL' | 'OTHER';
  hasCompletedOnboarding: boolean;
}

/**
 * Helper to scroll Ionic ion-content and click an element using direct JavaScript
 *
 * Ionic's Shadow DOM scrolling requires special handling - standard Playwright
 * methods like scrollIntoViewIfNeeded() don't work properly with ion-content.
 * This uses direct JS evaluation to:
 * 1. Find the ion-content parent
 * 2. Scroll its internal shadow DOM scroll container
 * 3. Click the button via JS to bypass visibility checks
 *
 * @param page - Playwright page
 * @param selector - CSS selector of element to click
 */
export async function scrollAndClickIonElement(page: Page, selector: string): Promise<void> {
  // Use direct JavaScript to scroll the ion-content and click the button
  const result = await page.evaluate(sel => {
    const button = document.querySelector(sel) as HTMLElement;
    if (!button) {
      return { success: false, message: 'Element not found' };
    }

    try {
      // Find the ion-content parent
      let current = button.parentElement;
      let ionContent = null;
      while (current) {
        if (current.tagName === 'ION-CONTENT') {
          ionContent = current as any;
          break;
        }
        current = current.parentElement;
      }

      if (ionContent) {
        // Access the internal scroll container in the shadow DOM
        const shadowRoot = ionContent.shadowRoot;
        if (shadowRoot) {
          const scrollElement = shadowRoot.querySelector('.inner-scroll') as HTMLElement;
          if (scrollElement) {
            // Calculate the position of the button relative to the scroll container
            let offsetTop = 0;
            let el = button as HTMLElement;
            while (el && el !== ionContent) {
              offsetTop += el.offsetTop;
              el = el.parentElement as HTMLElement;
            }

            // Scroll to position the button in the middle of the visible area
            const scrollTop = offsetTop - scrollElement.clientHeight / 2 + button.offsetHeight / 2;
            scrollElement.scrollTop = Math.max(0, scrollTop);

            // Wait a tiny bit for scroll to settle
            return { success: true, scrolled: true };
          }
        }
      }

      // If no ion-content, just ensure button is visible
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return { success: true, scrolled: false };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  }, selector);

  if (!result.success) {
    console.warn('Scroll helper warning:', result.message);
  }

  // Wait for scroll animation to complete
  await page.waitForTimeout(300);

  // Now click using JavaScript directly to bypass Playwright's visibility checks
  await page.evaluate(sel => {
    const button = document.querySelector(sel) as HTMLButtonElement;
    if (button) {
      button.click();
    }
  }, selector);
}

/**
 * CRITICAL: locator.isVisible({ timeout }) does NOT wait - timeout is ignored!
 * This helper properly waits for visibility with a timeout.
 * @see https://playwright.dev/docs/api/class-locator#locator-is-visible
 */
export async function isVisibleSoon(
  locator: import('@playwright/test').Locator,
  timeout = 3000
): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
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
    // In SPA/static-serve runs, waiting for the full "load" event can hang (fonts, service worker, long polling).
    // We only need the router + Ionic hydration + login form to be ready.
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }

  // Wait for Ionic to hydrate (more reliable than networkidle for SPA apps).
  await waitForIonicHydration(page, 15000);

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

  // Dismiss any onboarding overlays that might still appear
  await dismissOnboardingOverlay(page);
}

/**
 * Wait for Ionic components to fully hydrate.
 * Also disables the mobile preview frame on desktop to give tests full viewport access.
 */
export async function waitForIonicHydration(page: Page, timeout = 10000): Promise<void> {
  // Disable the mobile preview frame on desktop for full viewport access
  // This prevents click interception and modal positioning issues
  await page.evaluate(() => {
    document.documentElement.classList.add('no-device-frame');
  });

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
 * Uses Ionic's .ion-page-hidden class to detect active content.
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

  // Wait for the tab button to have tab-selected class
  await expect(tabButton).toHaveClass(/tab-selected/, { timeout: 5000 });

  // Wait for this tab's content to be visible.
  // In Ionic tabs, previous pages may remain mounted, so avoid strict "single ion-content" assertions.
  await expect(page.locator(`app-${tabName} ion-content`).first()).toBeVisible({ timeout: 10000 });

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
 * Uses force:true to bypass Ionic overlay checks.
 */
export async function fillIonicInput(page: Page, selector: string, value: string): Promise<void> {
  // Target the native input directly inside the shadow/light DOM
  const input = page.locator(selector).locator('input').first();

  // .fill() automatically focuses and clears. force:true helps with Ionic overlays
  await input.fill(value, { force: true });
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
 * Check if element exists INSTANTLY (no timeout wait).
 * Use waitForElementPresence() if you need to wait up to X seconds.
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).first().isVisible();
}

/**
 * Wait for element to appear with timeout, returns true if found.
 * Unlike elementExists(), this blocks until element appears or timeout.
 */
export async function waitForElementPresence(
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
 * Handle native browser dialog (window.alert)
 * IMPORTANT: Use page.once() to prevent listener stacking on multiple calls
 */
export async function handleNativeDialog(
  page: Page,
  action: 'accept' | 'dismiss' = 'accept'
): Promise<void> {
  // Use page.once() to prevent listener stacking - each call registers ONE handler
  page.once('dialog', async dialog => {
    if (action === 'accept') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
}

/**
 * Handle Ionic <ion-alert> component (DOM-based, not native dialog).
 * Call this when an ion-alert is visible and needs to be dismissed.
 */
export async function handleIonicAlert(
  page: Page,
  action: 'confirm' | 'cancel' = 'confirm'
): Promise<void> {
  const alert = page.locator('ion-alert');
  if (await alert.isVisible()) {
    const btnText =
      action === 'confirm'
        ? /OK|Accept|Yes|Sí|Aceptar|Confirmar/i
        : /Cancel|No|Close|Cancelar|Cerrar/i;
    await alert.locator('button', { hasText: btnText }).click();
    await alert.waitFor({ state: 'detached', timeout: 3000 });
  }
}

/**
 * Handle Ionic <ion-action-sheet> component.
 */
export async function handleIonicActionSheet(
  page: Page,
  buttonText: string | RegExp
): Promise<void> {
  const actionSheet = page.locator('ion-action-sheet');
  if (await actionSheet.isVisible()) {
    await actionSheet.locator('button', { hasText: buttonText }).click();
    await actionSheet.waitFor({ state: 'detached', timeout: 3000 });
  }
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
 * This ensures the OnboardingGuard allows navigation and dismisses coach overlays.
 * Uses typed UserProfile interface for schema safety.
 *
 * IMPORTANT: Capacitor Preferences uses 'CapacitorStorage.' prefix on web.
 * We set BOTH raw keys and Capacitor prefixed keys for compatibility.
 */
export async function completeOnboarding(page: Page): Promise<void> {
  // Typed profile matching app's schema - catches drifts early
  const userProfile: UserProfile = {
    id: 'user_12345',
    name: 'E2E Test User',
    email: 'e2e@test.com',
    age: 30,
    accountState: 'active',
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
    hasCompletedOnboarding: true, // Crucial for OnboardingGuard
  };

  const profileJson = JSON.stringify(userProfile);
  const tooltipsJson = JSON.stringify({
    dashboard: true,
    readings: true,
    bolus: true,
    appointments: true,
    profile: true,
    fab: true,
    quickActions: true,
  });

  // Set profile and ALL onboarding flags in localStorage
  // Use BOTH raw keys and Capacitor-prefixed keys for compatibility
  await page.evaluate(
    ({ profileJson, tooltipsJson }) => {
      // Raw keys (for direct access)
      localStorage.setItem('diabetactic_user_profile', profileJson);
      localStorage.setItem('diabetactic_schema_version', '1');
      localStorage.setItem('diabetactic_onboarding_completed', 'true');
      localStorage.setItem('diabetactic_coach_dismissed', 'true');
      localStorage.setItem('diabetactic_tooltips_seen', tooltipsJson);
      localStorage.setItem('diabetactic_tutorial_completed', 'true');
      localStorage.setItem('diabetactic_first_login_completed', 'true');

      // Capacitor Preferences keys (used by ProfileService on web)
      localStorage.setItem('CapacitorStorage.diabetactic_user_profile', profileJson);
      localStorage.setItem('CapacitorStorage.diabetactic_schema_version', '1');
      localStorage.setItem('CapacitorStorage.diabetactic_onboarding_completed', 'true');
      localStorage.setItem('CapacitorStorage.diabetactic_coach_dismissed', 'true');
      localStorage.setItem('CapacitorStorage.diabetactic_tooltips_seen', tooltipsJson);
    },
    { profileJson, tooltipsJson }
  );
}

/**
 * Dismiss any visible onboarding/coach overlay that might block interactions.
 * Call this before interacting with elements that might be covered.
 */
export async function dismissOnboardingOverlay(page: Page): Promise<void> {
  // Check for coach/onboarding overlay and dismiss it
  const overlaySelectors = [
    '.onboarding-overlay',
    '.coach-overlay',
    '.tooltip-overlay',
    '[class*="onboarding"]',
    '[class*="coach"]',
    '.intro-overlay',
    '[data-testid="onboarding-dismiss"]',
  ];

  for (const selector of overlaySelectors) {
    const overlay = page.locator(selector).first();
    if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
      // Try clicking dismiss/close button
      const dismissBtn = overlay.locator(
        'button, [aria-label*="close"], [aria-label*="dismiss"], .close-btn'
      );
      if (
        await dismissBtn
          .first()
          .isVisible({ timeout: 300 })
          .catch(() => false)
      ) {
        await dismissBtn
          .first()
          .click()
          .catch(() => {});
        await page.waitForTimeout(200);
      } else {
        // Try clicking outside or pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }
  }

  // Also dismiss via JavaScript if overlays persist
  await page.evaluate(() => {
    // Remove any overlay elements
    document
      .querySelectorAll('[class*="onboarding"], [class*="coach"], [class*="overlay"]')
      .forEach(el => {
        if (el.classList.contains('onboarding') || el.classList.contains('coach')) {
          (el as HTMLElement).style.display = 'none';
        }
      });
  });
}

/**
 * Navigate to Bolus Calculator using the most reliable method.
 * CRITICAL: We must NOT use page.goto() as it causes a full reload
 * and guards fail before Capacitor initializes.
 *
 * Uses Playwright's native click() which properly triggers Angular events.
 */
export async function navigateToBolusCalculator(page: Page): Promise<void> {
  // First ensure we're on the dashboard
  if (!page.url().includes('/dashboard')) {
    throw new Error('navigateToBolusCalculator must be called from the dashboard page');
  }

  // Wait for dashboard to be fully loaded (not just hydration but actual content)
  await waitForIonicHydration(page);

  // Wait for the loading state to finish (dashboard shows skeleton while loading)
  // The quick actions button appears after loading
  const quickActionsBtn = page.getByTestId('quick-bolus-calculator');
  await quickActionsBtn.waitFor({ state: 'visible', timeout: 15000 });

  // Strategy 1: Click the quick actions button using page.evaluate
  // CRITICAL: Use page.evaluate() to call element.click() directly because:
  // 1. A mascot/coach overlay may visually cover the button
  // 2. dispatchEvent('click') may have timing issues with Angular
  // 3. element.click() triggers the native click event that Angular handles reliably
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="quick-bolus-calculator"]') as HTMLElement;
    if (button) {
      button.click();
    }
  });

  // Wait for navigation
  try {
    await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 8000 });
    return;
  } catch {
    // Quick actions click didn't navigate, try FAB button
  }

  // Strategy 2: Click the FAB button
  // The FAB has data-testid="fab-bolus-calculator" on ion-fab-button
  const fabButton = page.getByTestId('fab-bolus-calculator');
  const fabVisible = await isVisibleSoon(fabButton, 3000);

  if (fabVisible) {
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="fab-bolus-calculator"]') as HTMLElement;
      if (button) {
        button.click();
      }
    });
    try {
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 5000 });
      return;
    } catch {
      // FAB click didn't navigate, try next strategy
    }
  }

  // Strategy 3: Use Angular router directly via NgZone
  // This works because we inject into Angular's zone properly
  const routerNavigated = await page.evaluate(async () => {
    const appRef = (
      window as unknown as {
        ng?: { getComponent: (el: Element) => unknown };
      }
    ).ng;

    if (!appRef) return false;

    const dashboardEl = document.querySelector('app-dashboard');
    if (dashboardEl) {
      const component = appRef.getComponent(dashboardEl) as {
        openBolusCalculator?: () => void;
      };

      if (component?.openBolusCalculator) {
        component.openBolusCalculator();
        return true;
      }
    }

    return false;
  });

  if (routerNavigated) {
    // Give Angular time to complete the navigation
    await page.waitForTimeout(1000);
    if (page.url().includes('/bolus-calculator')) {
      return;
    }
  }

  // Final verification - if we're still not on bolus calculator, fail with helpful message
  await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });
}

/**
 * Wait for bolus calculator page to be fully loaded and interactive.
 */
export async function waitForBolusCalculatorReady(page: Page): Promise<void> {
  await waitForIonicHydration(page);
  // Wait for the main form elements
  await page.waitForSelector(
    '[data-testid="current-glucose-input"], ion-input[formControlName="currentGlucose"]',
    {
      state: 'visible',
      timeout: 10000,
    }
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

/**
 * Navigation Helper for Playwright Tests
 *
 * Provides reusable navigation functions with proper wait strategies
 */

import { Page, expect } from '@playwright/test';
import { waitForIonicHydration } from './auth';

export type TabName = 'dashboard' | 'readings' | 'appointments' | 'profile';

/**
 * Navigate to a specific tab in the main app
 *
 * @param page - Playwright Page object
 * @param tab - Tab name to navigate to
 * @param timeout - Maximum time to wait for navigation
 *
 * @example
 * await navigateToTab(page, 'readings');
 */
export async function navigateToTab(page: Page, tab: TabName, timeout = 15000): Promise<void> {
  // Click tab button
  await page.click(`[data-testid="tab-${tab}"], ion-tab-button[tab="${tab}"]`);

  // Wait for URL change
  const expectedUrl = tab === 'appointments' ? /\/appointments/ : new RegExp(`/tabs/${tab}`);
  await expect(page).toHaveURL(expectedUrl, { timeout });

  // Wait for page to stabilize
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await waitForIonicHydration(page);
}

/**
 * Navigate to a page and wait for it to load completely
 *
 * @param page - Playwright Page object
 * @param path - Path to navigate to (e.g., '/login', '/settings')
 * @param options - Navigation options
 */
export async function navigateAndWait(
  page: Page,
  path: string,
  options?: { waitForSelector?: string; timeout?: number }
): Promise<void> {
  const { waitForSelector, timeout = 15000 } = options || {};

  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout });
  await waitForIonicHydration(page);

  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { state: 'visible', timeout });
  }
}

/**
 * Open the "Add Reading" modal from various entry points
 *
 * @param page - Playwright Page object
 * @param from - Where to open from ('fab' | 'button')
 */
export async function openAddReadingModal(
  page: Page,
  from: 'fab' | 'button' = 'button'
): Promise<void> {
  if (from === 'fab') {
    // Click FAB button
    const fabButton = page.locator('[data-testid="fab-add-reading"], ion-fab-button');
    await fabButton.first().click();
  } else {
    // Click "Add" button in readings list
    const addButton = page.locator('ion-button:has-text("Agregar"), ion-button:has-text("Add")');
    await addButton.first().click();
  }

  // Wait for modal to appear
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await waitForIonicHydration(page);

  // Wait for form to be ready
  const glucoseInput = page.locator('ion-input input').first();
  await expect(glucoseInput).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate back using browser back button
 *
 * @param page - Playwright Page object
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack();
  await page.waitForLoadState('networkidle');
  await waitForIonicHydration(page);
}

/**
 * Refresh the current page
 *
 * @param page - Playwright Page object
 */
export async function refreshPage(page: Page): Promise<void> {
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await waitForIonicHydration(page);
}

/**
 * Check if a specific tab is currently active
 *
 * @param page - Playwright Page object
 * @param tab - Tab name to check
 * @returns true if tab is active, false otherwise
 */
export async function isTabActive(page: Page, tab: TabName): Promise<boolean> {
  const tabButton = page.locator(`[data-testid="tab-${tab}"], ion-tab-button[tab="${tab}"]`);

  try {
    const ariaSelected = await tabButton.getAttribute('aria-selected');
    const hasSelectedClass = await tabButton.evaluate(
      el => el.classList.contains('tab-selected') || el.classList.contains('ion-selected')
    );

    return ariaSelected === 'true' || hasSelectedClass;
  } catch {
    return false;
  }
}

/**
 * Wait for a specific route to load
 *
 * @param page - Playwright Page object
 * @param route - Route pattern (regex or string)
 * @param timeout - Maximum time to wait
 */
export async function waitForRoute(
  page: Page,
  route: string | RegExp,
  timeout = 15000
): Promise<void> {
  await expect(page).toHaveURL(route, { timeout });
  await page.waitForLoadState('networkidle');
  await waitForIonicHydration(page);
}

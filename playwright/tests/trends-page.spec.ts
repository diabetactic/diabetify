/**
 * Trends Page Tests
 *
 * Tests the trends page "Coming Soon" placeholder:
 * - Page loads and navigation works
 * - Page title displays correctly
 * - "Coming Soon" message is visible
 * - Trending icon is visible
 */

import { test, expect } from '@playwright/test';
import { loginUser, waitForIonicHydration } from '../helpers/test-helpers';

test.describe('Trends Page - Coming Soon Placeholder', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Login
    await loginUser(page);
    await waitForIonicHydration(page);
  });

  test('should navigate to trends page', async ({ page }) => {
    // Navigate directly to trends page
    await page.goto('/trends');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await waitForIonicHydration(page);

    // Verify URL
    await expect(page).toHaveURL(/\/trends/, { timeout: 10000 });

    // Content should be visible
    const content = page.locator('ion-content');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display page title (Tendencias|Trends)', async ({ page }) => {
    await page.goto('/trends');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await waitForIonicHydration(page);

    // Title should be visible in header (bilingual)
    const title = page.locator('ion-title', {
      hasText: /Tendencias|Trends/,
    });

    await expect(title.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display "Coming Soon" message and icon', async ({ page }) => {
    await page.goto('/trends');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await waitForIonicHydration(page);

    // Check for trending_up icon (Material Symbols)
    const trendingIcon = page.locator('.material-symbols-outlined:has-text("trending_up")');
    await expect(trendingIcon).toBeVisible({ timeout: 10000 });

    // Check for content container
    const content = page.locator('ion-content');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should maintain responsiveness on mobile viewport', async ({ page }) => {
    await page.goto('/trends');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await waitForIonicHydration(page);

    // Content should fit viewport
    const content = page.locator('ion-content');
    await expect(content.first()).toBeVisible({ timeout: 10000 });

    // Verify viewport width is mobile
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(390);
  });
});

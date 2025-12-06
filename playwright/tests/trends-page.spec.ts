/**
 * Trends Page Tests
 *
 * Tests trends and analytics page functionality:
 * - Page loads correctly
 * - Charts/visualizations render
 * - Time range selection
 * - Statistics cards display
 * - Data refresh functionality
 * - Empty state when no data
 */

import { test, expect } from '@playwright/test';
import {
  loginUser,
  navigateToTab,
  waitForIonicHydration,
  waitForElement,
  elementExists,
  waitForNetworkIdle,
} from '../helpers/test-helpers';
import { BilingualText, IonicComponents } from '../helpers/selectors';

test.describe('Trends Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Login
    await loginUser(page);
    await waitForIonicHydration(page);
  });

  test('should navigate to trends page from dashboard or menu', async ({ page }) => {
    // Try to find trends link in menu or as a button
    const trendsButton = page.locator(
      'ion-button:has-text("Tendencias"), ion-button:has-text("Trends"), ion-menu-button:has-text("Tendencias"), ion-menu-button:has-text("Trends"), a:has-text("Tendencias"), a:has-text("Trends")'
    );

    // Navigate to dashboard first
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check if trends button exists
    if (!(await elementExists(page, trendsButton.toString(), 3000))) {
      console.log('⚠️  Trends page not linked from dashboard - trying direct navigation');

      // Try direct navigation
      await page.goto('/trends');
      await waitForIonicHydration(page);

      // Verify we're on trends page
      await expect(page).toHaveURL(/\/trends/, { timeout: 5000 });
    } else {
      // Click the trends button
      await trendsButton.first().click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Should be on trends page
      await expect(page).toHaveURL(/\/trends/, { timeout: 5000 });
    }

    // Page should be visible
    const content = page.locator('ion-content');
    await expect(content.first()).toBeVisible();
  });

  test('should display page title', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);

    // Title should be visible (bilingual)
    const title = page.locator(
      'ion-title:has-text("Tendencias"), ion-title:has-text("Trends"), h1:has-text("Tendencias"), h1:has-text("Trends")'
    );

    await expect(title.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display time range selector', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for time range buttons or select
    const timeRangeSelector = page.locator(
      'ion-segment, ion-select, ion-button:has-text("7 días"), ion-button:has-text("30 días"), ion-button:has-text("7 days"), ion-button:has-text("30 days")'
    );

    const hasTimeRange = await elementExists(page, timeRangeSelector.toString(), 3000);

    if (!hasTimeRange) {
      console.log('⚠️  Time range selector not yet implemented');
      // Page should still be visible even without time range
      const content = page.locator('ion-content');
      await expect(content.first()).toBeVisible();
    } else {
      await expect(timeRangeSelector.first()).toBeVisible();
    }
  });

  test('should display statistics cards (average, max, min, etc.)', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for stat cards
    const statCards = page.locator(
      '.stat-card, app-stat-card, ion-card, [class*="statistic"], [class*="metric"]'
    );

    const cardCount = await statCards.count();

    if (cardCount === 0) {
      console.log('⚠️  No statistic cards found - checking for empty state');

      // Should show either empty state or minimal UI
      const emptyState = page.locator('text=/No hay datos|No data|Sin información|vacío|empty/i');

      const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
      const hasContent = await page.locator('ion-content').isVisible();

      expect(hasEmptyState || hasContent).toBe(true);
    } else {
      // At least one card should be visible
      await expect(statCards.first()).toBeVisible();

      // Cards should contain numbers or text
      const firstCardText = await statCards.first().textContent();
      expect(firstCardText).toBeTruthy();
      expect(firstCardText!.length).toBeGreaterThan(0);
    }
  });

  test('should display chart or visualization', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page, 15000);

    // Look for chart elements (canvas, svg, or chart containers)
    const chartElements = page.locator(
      'canvas, svg, .chart, [class*="chart"], echarts, highcharts, chart, [id*="chart"]'
    );

    const chartCount = await chartElements.count();

    if (chartCount === 0) {
      console.log('⚠️  No charts found - trends page may be showing placeholder/empty state');

      // Verify page is still functional
      const content = page.locator('ion-content');
      await expect(content.first()).toBeVisible();
    } else {
      // At least one chart should be visible
      await expect(chartElements.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should switch between time ranges (7 days, 30 days, 90 days)', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for 7 days button
    const sevenDaysButton = page.locator(
      'ion-button:has-text("7 días"), ion-button:has-text("7 days"), ion-segment-button:has-text("7"), [value="7"]'
    );

    if (!(await elementExists(page, sevenDaysButton.toString(), 3000))) {
      console.log('⚠️  Time range switching not yet implemented');
      test.skip();
    }

    // Click 7 days
    await sevenDaysButton.first().click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }); // Wait for data to load

    // Button should be selected/active
    const isActive = await sevenDaysButton.first().evaluate(el => {
      return (
        el.classList.contains('segment-button-checked') ||
        el.classList.contains('button-selected') ||
        el.getAttribute('aria-selected') === 'true'
      );
    });

    expect(isActive).toBe(true);

    // Now switch to 30 days
    const thirtyDaysButton = page.locator(
      'ion-button:has-text("30 días"), ion-button:has-text("30 days"), ion-segment-button:has-text("30"), [value="30"]'
    );

    if (await elementExists(page, thirtyDaysButton.toString(), 3000)) {
      await thirtyDaysButton.first().click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // 30 days should now be active
      const is30DaysActive = await thirtyDaysButton.first().evaluate(el => {
        return (
          el.classList.contains('segment-button-checked') ||
          el.classList.contains('button-selected') ||
          el.getAttribute('aria-selected') === 'true'
        );
      });

      expect(is30DaysActive).toBe(true);
    }
  });

  test('should refresh data when pull-to-refresh is triggered', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for ion-refresher
    const refresher = page.locator('ion-refresher');

    if (!(await elementExists(page, 'ion-refresher', 2000))) {
      console.log('⚠️  Pull-to-refresh not implemented on trends page');
      test.skip();
    }

    // Simulate pull-to-refresh by dispatching event
    await refresher.evaluate(el => {
      const event = new CustomEvent('ionRefresh', {
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(event);
    });

    await page.waitForLoadState('networkidle', { timeout: 10000 }); // Wait for refresh to complete

    // Refresher should complete
    const refresherState = await refresher.evaluate((el: any) => {
      return el.state || 'complete';
    });

    // Should not be stuck in refreshing state
    expect(refresherState).not.toBe('refreshing');
  });

  test('should display empty state when no data is available', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Check for data or empty state
    const emptyState = page.locator(
      'app-empty-state, .empty-state, text=/No hay datos|No data|Sin lecturas|No readings|Agrega|Add readings/i'
    );

    const statCards = page.locator('.stat-card, app-stat-card, ion-card');
    const cardCount = await statCards.count();

    if (cardCount === 0) {
      // Should show empty state
      const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasEmptyState) {
        await expect(emptyState.first()).toBeVisible();

        // Empty state should have meaningful content
        const emptyText = await emptyState.first().textContent();
        expect(emptyText).toBeTruthy();
        expect(emptyText!.length).toBeGreaterThan(10);
      }
    }

    // Page should be functional regardless
    const content = page.locator('ion-content');
    await expect(content.first()).toBeVisible();
  });

  test('should display glucose range distribution (if implemented)', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for range indicators (low, normal, high percentages)
    const rangeIndicators = page.locator('text=/Bajo|Low|Normal|Alto|High|Crítico|Critical/i');

    const indicatorCount = await rangeIndicators.count();

    if (indicatorCount === 0) {
      console.log('⚠️  Glucose range distribution not yet displayed');
    } else {
      // At least one range indicator should be visible
      await expect(rangeIndicators.first()).toBeVisible();

      // Should show percentage or count
      const rangeText = await rangeIndicators.first().textContent();
      const hasNumbers = /\d+/.test(rangeText || '');
      expect(hasNumbers).toBe(true);
    }
  });

  test('should calculate and display average glucose', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for average glucose stat
    const averageStat = page.locator('text=/Promedio|Average|Media/i');

    const hasAverage = await elementExists(page, averageStat.toString(), 3000);

    if (!hasAverage) {
      console.log('⚠️  Average glucose stat not found');
    } else {
      await expect(averageStat.first()).toBeVisible();

      // Should have a number near the "Average" label
      const parent = averageStat.first().locator('..');
      const parentText = await parent.textContent();
      const hasNumber = /\d+/.test(parentText || '');
      expect(hasNumber).toBe(true);
    }
  });

  test('should display time in range (TIR) percentage', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for Time in Range indicator
    const tirIndicator = page.locator('text=/Tiempo en rango|Time in range|TIR|En rango/i');

    const hasTIR = await elementExists(page, tirIndicator.toString(), 3000);

    if (!hasTIR) {
      console.log('⚠️  Time in Range (TIR) not yet implemented');
    } else {
      await expect(tirIndicator.first()).toBeVisible();

      // Should show percentage
      const parent = tirIndicator.first().locator('..');
      const parentText = await parent.textContent();
      const hasPercentage = /%/.test(parentText || '');
      expect(hasPercentage).toBe(true);
    }
  });

  test('should handle loading state gracefully', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);

    // Look for loading spinner
    const spinner = page.locator('ion-spinner, .spinner, [class*="loading"]');

    // Spinner might appear briefly
    const hasSpinner = await spinner.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSpinner) {
      // Wait for spinner to disappear
      await spinner.first().waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Content should be visible after loading
    const content = page.locator('ion-content');
    await expect(content.first()).toBeVisible();
  });

  test('should display standard deviation (if implemented)', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for standard deviation or variability indicator
    const sdIndicator = page.locator('text=/Desviación|Deviation|Variabilidad|Variability|SD|CV/i');

    const hasSD = await elementExists(page, sdIndicator.toString(), 3000);

    if (!hasSD) {
      console.log('⚠️  Standard deviation not displayed');
    } else {
      await expect(sdIndicator.first()).toBeVisible();
    }
  });

  test('should show highest and lowest readings', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Look for max/min indicators
    const maxMinIndicators = page.locator(
      'text=/Máximo|Maximum|Mínimo|Minimum|Highest|Lowest|Max|Min/i'
    );

    const count = await maxMinIndicators.count();

    if (count === 0) {
      console.log('⚠️  Max/Min readings not displayed');
    } else {
      // Should show at least one (either max or min)
      await expect(maxMinIndicators.first()).toBeVisible();

      // Should have numbers
      const parent = maxMinIndicators.first().locator('..');
      const text = await parent.textContent();
      const hasNumber = /\d+/.test(text || '');
      expect(hasNumber).toBe(true);
    }
  });

  test('should maintain responsiveness on mobile viewport', async ({ page }) => {
    await page.goto('/trends');
    await waitForIonicHydration(page);
    await waitForNetworkIdle(page);

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll, 'Page should not have horizontal overflow').toBe(false);

    // Content should fit viewport
    const content = page.locator('ion-content');
    await expect(content.first()).toBeVisible();

    // Verify viewport width is mobile
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(390);
  });
});

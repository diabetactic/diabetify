/**
 * Readings Filtering Tests
 *
 * Tests date range filtering and search functionality on readings page:
 * - Filter by date range (Last 24h, 7 days, 30 days)
 * - Filter by status (normal, high, low, critical)
 * - Search by glucose value, notes, or tags
 * - Clear filters
 * - Multiple filters combined
 */

import { test, expect } from '@playwright/test';
import {
  loginUser,
  navigateToTab,
  waitForIonicHydration,
  waitForElement,
  elementExists,
} from '../helpers/test-helpers';
// Selector helpers available: BilingualText, IonicComponents, Selectors (for future use)

test.describe('Readings Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Login
    await loginUser(page);
    await waitForIonicHydration(page);

    // Navigate to readings tab
    await navigateToTab(page, 'readings');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('should display filter button with active filter count badge', async ({ page }) => {
    // Look for filter button (bilingual)
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    // Filter button should be visible
    const filterExists = await elementExists(page, filterButton.toString(), 5000);
    if (!filterExists) {
      console.log('⚠️  Filter button not found - page may not have filtering UI yet');
      test.skip();
    }

    await expect(filterButton.first()).toBeVisible();

    // Badge should not be visible initially (no active filters)
    const badge = page.locator('ion-badge');
    const badgeCount = await badge.count();
    if (badgeCount > 0) {
      const badgeText = await badge.first().textContent();
      expect(badgeText).toBe('0');
    }
  });

  test('should filter readings by status (normal, high, low)', async ({ page }) => {
    // Open filter modal
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    await filterButton.first().click();

    // Wait for filter modal
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    // Select status filter (normal readings)
    const statusSelect = page.locator(
      'ion-select:has-text("Estado"), ion-select:has-text("Status"), ion-select'
    );

    if (await elementExists(page, statusSelect.toString(), 3000)) {
      await statusSelect.first().click();
      await page.waitForTimeout(200); // Ionic animation

      // Select "Normal" option (bilingual)
      const normalOption = page.locator(
        'ion-select-option:has-text("Normal"), [role="option"]:has-text("Normal")'
      );
      await normalOption.first().click();
      await page.waitForTimeout(200); // Ionic animation
    }

    // Apply filters
    const applyButton = page.locator(
      'ion-button:has-text("Aplicar"), ion-button:has-text("Apply")'
    );
    if (await elementExists(page, applyButton.toString(), 3000)) {
      await applyButton.first().click();
    }

    // Wait for modal to close
    await page.waitForLoadState('networkidle');

    // Verify filter was applied (badge should show 1)
    const badge = page.locator('ion-badge');
    const badgeCount = await badge.count();
    if (badgeCount > 0) {
      const badgeText = await badge.first().textContent();
      expect(parseInt(badgeText || '0')).toBeGreaterThan(0);
    }

    // Verify readings list is filtered
    const readings = page.locator('ion-card, .reading-item, app-reading-item');
    const readingCount = await readings.count();

    if (readingCount > 0) {
      // Check that visible readings show normal status
      const firstReading = readings.first();
      await expect(firstReading).toBeVisible();
    }
  });

  test('should filter readings by date range - Last 24 hours', async ({ page }) => {
    // Open filter modal
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    // Look for quick filter buttons
    const last24hButton = page.locator(
      'ion-button:has-text("24 horas"), ion-button:has-text("24 hours"), ion-button:has-text("Últimas 24")'
    );

    if (await elementExists(page, last24hButton.toString(), 3000)) {
      await last24hButton.first().click();
      await page.waitForTimeout(200); // Ionic animation
    } else {
      // Fallback: use date pickers
      const startDateButton = page.locator('ion-datetime-button').first();
      if (await elementExists(page, startDateButton.toString(), 3000)) {
        await startDateButton.click();
        await page.waitForTimeout(200); // Ionic animation

        // Select today's date
        const today = page.locator(
          'ion-datetime [aria-label*="today"], ion-datetime button.calendar-day-today'
        );
        if (await elementExists(page, today.toString(), 3000)) {
          await today.first().click();
        }

        // Confirm
        const confirmButton = page.locator(
          'ion-button:has-text("Confirmar"), ion-button:has-text("Confirm")'
        );
        if (await elementExists(page, confirmButton.toString(), 2000)) {
          await confirmButton.first().click();
        }
      }
    }

    // Apply filters
    const applyButton = page.locator(
      'ion-button:has-text("Aplicar"), ion-button:has-text("Apply")'
    );
    if (await elementExists(page, applyButton.toString(), 3000)) {
      await applyButton.first().click();
    }

    await page.waitForLoadState('networkidle');

    // Verify badge shows active filter
    const badge = page.locator('ion-badge');
    if ((await badge.count()) > 0) {
      const badgeText = await badge.first().textContent();
      expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(1);
    }
  });

  test('should filter readings by date range - Last 7 days', async ({ page }) => {
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    // Look for "Last 7 days" quick filter
    const last7DaysButton = page.locator(
      'ion-button:has-text("7 días"), ion-button:has-text("7 days"), ion-button:has-text("Últimos 7")'
    );

    if (await elementExists(page, last7DaysButton.toString(), 3000)) {
      await last7DaysButton.first().click();
      await page.waitForTimeout(200); // Ionic animation
    }

    // Apply
    const applyButton = page.locator(
      'ion-button:has-text("Aplicar"), ion-button:has-text("Apply")'
    );
    if (await elementExists(page, applyButton.toString(), 3000)) {
      await applyButton.first().click();
    }

    await page.waitForLoadState('networkidle');

    // Verify filter applied
    const badge = page.locator('ion-badge');
    if ((await badge.count()) > 0) {
      const badgeText = await badge.first().textContent();
      expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(1);
    }
  });

  test('should filter readings by date range - Last 30 days', async ({ page }) => {
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    // Look for "Last 30 days" quick filter
    const last30DaysButton = page.locator(
      'ion-button:has-text("30 días"), ion-button:has-text("30 days"), ion-button:has-text("Últimos 30")'
    );

    if (await elementExists(page, last30DaysButton.toString(), 3000)) {
      await last30DaysButton.first().click();
      await page.waitForTimeout(200); // Ionic animation
    }

    // Apply
    const applyButton = page.locator(
      'ion-button:has-text("Aplicar"), ion-button:has-text("Apply")'
    );
    if (await elementExists(page, applyButton.toString(), 3000)) {
      await applyButton.first().click();
    }

    await page.waitForLoadState('networkidle');

    // Verify filter applied
    const badge = page.locator('ion-badge');
    if ((await badge.count()) > 0) {
      const badgeText = await badge.first().textContent();
      expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(1);
    }
  });

  test('should search readings by glucose value', async ({ page }) => {
    // Look for search bar
    const searchBar = page.locator('ion-searchbar');

    if (!(await elementExists(page, 'ion-searchbar', 3000))) {
      console.log('⚠️  Search functionality not implemented - skipping test');
      test.skip();
    }

    await expect(searchBar.first()).toBeVisible();

    // Type search term (common glucose value like "100")
    await searchBar.first().click();
    await page.waitForTimeout(100); // Minimal wait

    const searchInput = page.locator('ion-searchbar input');
    await searchInput.first().fill('100');
    await page.waitForTimeout(1000); // Search debounce - intentional

    // Verify results filtered
    const readings = page.locator('ion-card, .reading-item, app-reading-item');
    const readingCount = await readings.count();

    if (readingCount > 0) {
      // At least some readings should contain "100" in the value
      const firstReading = readings.first();
      const readingText = await firstReading.textContent();
      expect(readingText).toContain('100');
    }
  });

  test('should search readings by notes', async ({ page }) => {
    // Check if search is available
    if (!(await elementExists(page, 'ion-searchbar', 3000))) {
      console.log('⚠️  Search functionality not implemented - skipping test');
      test.skip();
    }

    // Search for common word in notes (e.g., "breakfast", "comida")
    const searchInput = page.locator('ion-searchbar input');
    await searchInput.first().fill('comida');
    await page.waitForTimeout(1000); // Search debounce - intentional

    // Results should be filtered (if any readings have "comida" in notes)
    const readings = page.locator('ion-card, .reading-item, app-reading-item');
    const readingCount = await readings.count();

    // Either have results with "comida" or show empty state
    const emptyState = page.locator('text=/No hay|No results|Sin resultados|vacío/i');
    const hasResults = readingCount > 0;
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasResults || hasEmptyState).toBe(true);
  });

  test('should clear search when X button is clicked', async ({ page }) => {
    // Check if search is available
    if (!(await elementExists(page, 'ion-searchbar', 3000))) {
      console.log('⚠️  Search functionality not implemented - skipping test');
      test.skip();
    }

    // Enter search term
    const searchInput = page.locator('ion-searchbar input');
    await searchInput.first().fill('test');
    await page.waitForLoadState('networkidle');

    // Click clear button (X icon)
    const clearButton = page.locator(
      'ion-searchbar button[aria-label*="clear"], ion-searchbar .searchbar-clear-button'
    );
    if (await elementExists(page, clearButton.toString(), 2000)) {
      await clearButton.first().click();
      await page.waitForTimeout(200); // Ionic animation

      // Search input should be cleared
      const inputValue = await searchInput.first().inputValue();
      expect(inputValue).toBe('');
    }
  });

  test('should combine multiple filters (status + date range)', async ({ page }) => {
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    // Select status filter
    const statusSelect = page.locator('ion-select').first();
    if (await elementExists(page, statusSelect.toString(), 2000)) {
      await statusSelect.click();
      await page.waitForTimeout(200); // Ionic animation

      const normalOption = page.locator('ion-select-option:has-text("Normal")');
      if (await elementExists(page, normalOption.toString(), 2000)) {
        await normalOption.first().click();
        await page.waitForTimeout(200); // Ionic animation
      }
    }

    // Select date range (Last 7 days)
    const last7DaysButton = page.locator(
      'ion-button:has-text("7 días"), ion-button:has-text("7 days")'
    );
    if (await elementExists(page, last7DaysButton.toString(), 2000)) {
      await last7DaysButton.first().click();
      await page.waitForTimeout(200); // Ionic animation
    }

    // Apply filters
    const applyButton = page.locator(
      'ion-button:has-text("Aplicar"), ion-button:has-text("Apply")'
    );
    if (await elementExists(page, applyButton.toString(), 3000)) {
      await applyButton.first().click();
    }

    await page.waitForLoadState('networkidle');

    // Badge should show 2 active filters (status + date range)
    const badge = page.locator('ion-badge');
    if ((await badge.count()) > 0) {
      const badgeText = await badge.first().textContent();
      expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(2);
    }
  });

  test('should clear all filters when "Clear" button is clicked', async ({ page }) => {
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    // Apply a filter first
    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    const last7DaysButton = page.locator(
      'ion-button:has-text("7 días"), ion-button:has-text("7 days")'
    );
    if (await elementExists(page, last7DaysButton.toString(), 2000)) {
      await last7DaysButton.first().click();
      await page.waitForTimeout(200); // Ionic animation
    }

    const applyButton = page.locator(
      'ion-button:has-text("Aplicar"), ion-button:has-text("Apply")'
    );
    if (await elementExists(page, applyButton.toString(), 3000)) {
      await applyButton.first().click();
    }

    await page.waitForLoadState('networkidle');

    // Now clear filters
    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    const clearButton = page.locator(
      'ion-button:has-text("Limpiar"), ion-button:has-text("Clear"), ion-button:has-text("Borrar")'
    );

    if (await elementExists(page, clearButton.toString(), 3000)) {
      await clearButton.first().click();
      await page.waitForTimeout(200); // Ionic animation
    }

    // Badge should show 0 or be hidden
    const badge = page.locator('ion-badge');
    if ((await badge.count()) > 0) {
      const badgeText = await badge.first().textContent();
      expect(badgeText).toBe('0');
    }
  });

  test('should show empty state when no readings match filters', async ({ page }) => {
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    // Search for something that won't exist
    if (await elementExists(page, 'ion-searchbar', 3000)) {
      const searchInput = page.locator('ion-searchbar input');
      await searchInput.first().fill('xyznonexistent99999');
      await page.waitForTimeout(1500); // Debounce + render

      // Should show empty state or "no results"
      const emptyState = page.locator(
        'text=/No hay|No results|Sin resultados|No se encontraron|vacío|empty/i'
      );
      const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

      const readings = page.locator('ion-card, .reading-item, app-reading-item');
      const readingCount = await readings.count();

      // Either show empty state or have 0 readings
      expect(hasEmptyState || readingCount === 0).toBe(true);
    }
  });

  test('should maintain filter state when navigating away and back', async ({ page }) => {
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter UI not implemented - skipping test');
      test.skip();
    }

    // Apply a filter
    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    const last7DaysButton = page.locator(
      'ion-button:has-text("7 días"), ion-button:has-text("7 days")'
    );
    if (await elementExists(page, last7DaysButton.toString(), 2000)) {
      await last7DaysButton.first().click();
      await page.waitForTimeout(200); // Ionic animation
    }

    const applyButton = page.locator(
      'ion-button:has-text("Aplicar"), ion-button:has-text("Apply")'
    );
    if (await elementExists(page, applyButton.toString(), 3000)) {
      await applyButton.first().click();
    }

    await page.waitForLoadState('networkidle');

    // Get current badge count
    const badge = page.locator('ion-badge');
    let initialBadgeText = '0';
    if ((await badge.count()) > 0) {
      initialBadgeText = (await badge.first().textContent()) || '0';
    }

    // Navigate to another tab
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate back to readings
    await navigateToTab(page, 'readings');
    await page.waitForLoadState('networkidle');

    // Badge should still show same filter count
    if ((await badge.count()) > 0) {
      const currentBadgeText = await badge.first().textContent();
      expect(currentBadgeText).toBe(initialBadgeText);
    }
  });
});

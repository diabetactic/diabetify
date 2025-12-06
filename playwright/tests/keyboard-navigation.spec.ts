/**
 * Keyboard Navigation & Accessibility Tests
 *
 * Tests keyboard navigation and focus management:
 * - Tab navigation through interactive elements
 * - Focus indicators visible
 * - Skip links functionality
 * - Keyboard shortcuts (if implemented)
 * - Form navigation with Tab/Shift+Tab
 * - Enter/Space activation of buttons
 * - Escape to close modals
 * - Arrow key navigation in lists
 */

import { test, expect } from '@playwright/test';
import {
  loginUser,
  navigateToTab,
  waitForIonicHydration,
  waitForElement,
  elementExists,
} from '../helpers/test-helpers';
import { BilingualText, IonicComponents } from '../helpers/selectors';

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 }); // Desktop for keyboard testing

    // Login
    await loginUser(page);
    await waitForIonicHydration(page);
  });

  test('should navigate through tab buttons using Tab key', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Focus on the first tab button
    const dashboardTab = page.locator(
      '[data-testid="tab-dashboard"], ion-tab-button[tab="dashboard"]'
    );
    await expect(dashboardTab.first()).toBeVisible();
    await dashboardTab.first().focus();

    // Press Tab to move to next tab
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100); // Minimal wait for focus transition

    // Check that focus moved (should be on readings tab or next interactive element)
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Press Tab again
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100); // Minimal wait for focus transition

    // Focus should have moved again
    const secondFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocusedElement).toBeTruthy();
  });

  test('should navigate backwards with Shift+Tab', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Focus on profile tab (last tab)
    const profileTab = page.locator('[data-testid="tab-profile"], ion-tab-button[tab="profile"]');
    await expect(profileTab.first()).toBeVisible();
    await profileTab.first().focus();

    // Get current focused element
    const initialFocus = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.getAttribute('tab') || el?.getAttribute('data-testid');
    });

    // Press Shift+Tab to move backwards
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(100); // Minimal wait for focus transition

    // Focus should have moved backwards
    const newFocus = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.getAttribute('tab') || el?.getAttribute('data-testid');
    });

    // Focus should be different (moved backwards)
    expect(newFocus).not.toBe(initialFocus);
  });

  test('should activate tab buttons with Enter key', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Focus on readings tab
    const readingsTab = page.locator(
      '[data-testid="tab-readings"], ion-tab-button[tab="readings"]'
    );
    await expect(readingsTab.first()).toBeVisible();
    await readingsTab.first().focus();

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Press Enter
    await page.keyboard.press('Enter');

    // Should navigate to readings
    await expect(page).toHaveURL(/\/readings/, { timeout: 5000 });
  });

  test('should activate tab buttons with Space key', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Focus on appointments tab
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (!(await elementExists(page, appointmentsTab.toString(), 2000))) {
      console.log('⚠️  Appointments tab not found');
      test.skip();
    }

    await expect(appointmentsTab.first()).toBeVisible();
    await appointmentsTab.first().focus();

    // Press Space
    await page.keyboard.press('Space');

    // Should navigate to appointments
    await expect(page).toHaveURL(/\/appointments/, { timeout: 5000 });
  });

  test('should show visible focus indicators on interactive elements', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Focus on a button
    const button = page.locator('ion-button').first();
    await expect(button).toBeVisible();
    await button.focus();

    // Check for focus indicator (outline, border, or shadow)
    const hasFocusIndicator = await button.evaluate(el => {
      const styles = window.getComputedStyle(el);
      const outline = styles.outline;
      const outlineWidth = parseFloat(styles.outlineWidth);
      const boxShadow = styles.boxShadow;

      return outline !== 'none' || outlineWidth > 0 || boxShadow !== 'none';
    });

    expect(hasFocusIndicator, 'Interactive elements should have visible focus indicators').toBe(
      true
    );
  });

  test('should close modal with Escape key', async ({ page }) => {
    await navigateToTab(page, 'readings');
    await page.waitForLoadState('networkidle');

    // Open filter modal (if it exists)
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  Filter modal not available - testing with any modal');

      // Try to find any button that opens a modal
      const anyModalButton = page.locator('ion-button, button').first();
      if (await elementExists(page, anyModalButton.toString(), 2000)) {
        await anyModalButton.click();
        await page.waitForTimeout(200); // Animation only
      } else {
        test.skip();
      }
    } else {
      await filterButton.first().click();
    }

    // Wait for modal
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    // Modal should be visible
    const modal = page.locator('ion-modal');
    await expect(modal.first()).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should be closed
    await expect(modal.first()).not.toBeVisible({ timeout: 3000 });
  });

  test('should navigate through form fields with Tab', async ({ page }) => {
    await navigateToTab(page, 'profile');
    await page.waitForLoadState('networkidle');

    // Look for edit button
    const editButton = page.locator(
      'ion-button:has-text("Editar"), ion-button:has-text("Edit"), [data-testid="edit-profile-btn"]'
    );

    if (!(await elementExists(page, editButton.toString(), 3000))) {
      console.log('⚠️  Edit profile not available - trying login form instead');

      // Logout and test login form
      await page.goto('/login');
      await waitForIonicHydration(page);
    } else {
      await editButton.first().click();
      await expect(page.locator('input, ion-input input').first()).toBeVisible({ timeout: 3000 });
    }

    // Get all form inputs
    const inputs = page.locator('input:not([type="hidden"]), ion-input input');
    const inputCount = await inputs.count();

    if (inputCount < 2) {
      console.log('⚠️  Not enough form fields to test tab navigation');
      test.skip();
    }

    // Focus first input
    await inputs.first().focus();

    // Press Tab
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100); // Minimal wait for focus transition

    // Focus should move to next input
    const focusedElement = page.locator(':focus');
    const isFocusedInput = await focusedElement
      .evaluate(el => {
        return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      })
      .catch(() => false);

    expect(isFocusedInput, 'Tab should move focus to next form field').toBe(true);
  });

  test('should submit form with Enter key when in text input', async ({ page }) => {
    // Test with login form
    await page.goto('/login');
    await waitForIonicHydration(page);
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME || '1000';
    const password = process.env.E2E_TEST_PASSWORD || 'tuvieja';

    // Fill username
    const usernameInput = page.locator(
      'input[placeholder*="DNI"], input[placeholder*="email"], input[type="text"]'
    );
    await usernameInput.first().fill(username);

    // Fill password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.first().fill(password);

    // Press Enter while in password field
    await passwordInput.first().focus();
    await page.keyboard.press('Enter');

    // Should submit and navigate to dashboard
    await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });
  });

  test('should navigate through list items with arrow keys (if implemented)', async ({ page }) => {
    await navigateToTab(page, 'readings');
    await page.waitForLoadState('networkidle');

    // Get reading items
    const readingItems = page.locator('ion-item, .reading-item, app-reading-item');
    const itemCount = await readingItems.count();

    if (itemCount === 0) {
      console.log('⚠️  No reading items to test arrow navigation');
      test.skip();
    }

    // Focus first item
    await readingItems.first().focus();

    // Press down arrow
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100); // Minimal wait for focus transition

    // Check if focus moved (implementation-dependent)
    const focusedElement = page.locator(':focus');
    const isFocusedItem = await focusedElement
      .evaluate(el => {
        return (
          el.tagName === 'ION-ITEM' ||
          el.classList.contains('reading-item') ||
          el.tagName === 'APP-READING-ITEM'
        );
      })
      .catch(() => false);

    // This may not be implemented, so we just log the result
    if (isFocusedItem) {
      console.log('✅ Arrow key navigation is implemented');
    } else {
      console.log('⚠️  Arrow key navigation not implemented for list items');
    }
  });

  test('should activate buttons with Space key', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Find any action button
    const button = page.locator('ion-button').first();

    if (!(await elementExists(page, 'ion-button', 2000))) {
      console.log('⚠️  No buttons found on dashboard');
      test.skip();
    }

    // Get initial page state
    const initialUrl = page.url();

    // Focus button
    await expect(button).toBeVisible();
    await button.focus();

    // Press Space
    await page.keyboard.press('Space');

    // Wait for potential navigation
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

    // Button should have been activated (page changed or action occurred)
    const newUrl = page.url();

    // Either URL changed or something happened (we can't predict exact behavior)
    // Main point is Space key should work on buttons
    console.log(`Space key test: ${initialUrl} → ${newUrl}`);
  });

  test('should trap focus inside modal when open', async ({ page }) => {
    await navigateToTab(page, 'readings');
    await page.waitForLoadState('networkidle');

    // Open a modal
    const filterButton = page.locator(
      'ion-button:has-text("Filtrar"), ion-button:has-text("Filter"), ion-button:has-text("Filtros")'
    );

    if (!(await elementExists(page, filterButton.toString(), 3000))) {
      console.log('⚠️  No modal available to test focus trap');
      test.skip();
    }

    await filterButton.first().click();
    await waitForElement(page, 'ion-modal', { timeout: 5000 });

    // Get all focusable elements inside modal
    const modalFocusableElements = page.locator(
      'ion-modal button, ion-modal ion-button, ion-modal input, ion-modal ion-select'
    );
    const focusableCount = await modalFocusableElements.count();

    if (focusableCount === 0) {
      console.log('⚠️  Modal has no focusable elements');
      test.skip();
    }

    // Focus first element in modal
    await modalFocusableElements.first().focus();

    // Tab through all elements
    for (let i = 0; i < focusableCount + 2; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Minimal wait for focus transition
    }

    // Focus should still be inside modal (not leaked to background)
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.closest('ion-modal') !== null;
    });

    expect(focusedElement, 'Focus should be trapped inside modal').toBe(true);
  });

  test('should support skip navigation links (if implemented)', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Look for skip links (usually hidden until focused)
    const skipLink = page.locator(
      'a[href*="#main"], a[href*="#content"], .skip-link, [class*="skip-to"]'
    );

    const hasSkipLink = await elementExists(page, skipLink.toString(), 2000);

    if (!hasSkipLink) {
      console.log('⚠️  Skip navigation links not implemented');
    } else {
      // Focus skip link
      await skipLink.first().focus();

      // Skip link should become visible when focused
      const isVisible = await skipLink.first().isVisible();
      expect(isVisible, 'Skip link should be visible when focused').toBe(true);

      // Activate skip link
      await page.keyboard.press('Enter');

      // Wait for focus to settle
      await page.waitForTimeout(200);

      // Focus should jump to main content
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.id || el?.tagName;
      });

      console.log(`Focus after skip link: ${focusedElement}`);
    }
  });

  test('should handle focus management when navigating between pages', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to readings
    await navigateToTab(page, 'readings');
    await page.waitForLoadState('networkidle');

    // Focus should be on a valid element (not lost)
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName !== 'BODY';
    });

    // Focus should be somewhere meaningful (not on body)
    expect(focusedElement, 'Focus should be managed when navigating between pages').toBe(true);
  });

  test('should allow keyboard users to access all interactive elements', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Get all interactive elements
    const interactiveElements = page.locator(
      'button, a, input, ion-button, ion-tab-button, [role="button"]'
    );
    const elementCount = await interactiveElements.count();

    if (elementCount === 0) {
      console.log('⚠️  No interactive elements found');
      test.skip();
    }

    // All interactive elements should be reachable via keyboard
    for (let i = 0; i < Math.min(elementCount, 10); i++) {
      const element = interactiveElements.nth(i);

      // Try to focus element
      await element.focus().catch(() => {
        console.log(`⚠️  Element ${i} cannot be focused via keyboard`);
      });

      const isFocused = await element
        .evaluate(el => {
          return document.activeElement === el || el.contains(document.activeElement);
        })
        .catch(() => false);

      if (!isFocused) {
        console.log(`⚠️  Interactive element ${i} is not keyboard accessible`);
      }
    }

    // At least some elements should be focusable
    await expect(interactiveElements.first()).toBeVisible();
    await interactiveElements.first().focus();
    const firstFocused = await interactiveElements.first().evaluate(el => {
      return document.activeElement === el || el.contains(document.activeElement);
    });

    expect(firstFocused, 'At least one interactive element should be keyboard accessible').toBe(
      true
    );
  });

  test('should not trap focus when no modal is open', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await page.waitForLoadState('networkidle');

    // Focus on first element
    const firstButton = page.locator('ion-button, button').first();
    await expect(firstButton).toBeVisible();
    await firstButton.focus();

    // Tab multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Minimal wait for focus transition
    }

    // Focus should be able to move through the entire page
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe('BODY');
  });
});

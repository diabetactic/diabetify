/**
 * Basic Navigation E2E Tests
 * Tests core app navigation and page loading
 */

import { test, expect } from '@playwright/test';
import {
  createProfileSeed,
  PROFILE_STORAGE_KEY,
  SCHEMA_STORAGE_KEY,
} from '../config/profileSeed';

test.describe('Basic App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test profile with active account
    const profile = createProfileSeed({
      accountState: 'active',
      hasCompletedOnboarding: true,
    });

    await page.addInitScript(
      ({ profileData, profileKey, schemaKey }) => {
        localStorage.setItem(profileKey, JSON.stringify(profileData));
        localStorage.setItem(schemaKey, '1');
      },
      { profileData: profile, profileKey: PROFILE_STORAGE_KEY, schemaKey: SCHEMA_STORAGE_KEY }
    );
  });

  test('should load the app and display dashboard', async ({ page }) => {
    await page.goto('/');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 10000 });

    // Check that the page title exists
    const title = page.locator('ion-title');
    await expect(title).toBeVisible();
  });

  test('should navigate between all main tabs', async ({ page }) => {
    await page.goto('/tabs/dashboard');

    // Verify dashboard loads
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-title')).toBeVisible();

    // Navigate to readings
    const readingsTab = page.getByRole('tab', { name: /readings/i });
    await readingsTab.click();
    await expect(page).toHaveURL(/\/tabs\/readings/);
    await expect(page.locator('ion-title')).toBeVisible();

    // Navigate to appointments
    const appointmentsTab = page.getByRole('tab', { name: /appointments/i });
    await appointmentsTab.click();
    await expect(page).toHaveURL(/\/tabs\/appointments/);
    await expect(page.locator('ion-title')).toBeVisible();

    // Navigate to profile
    const profileTab = page.getByRole('tab', { name: /profile/i });
    await profileTab.click();
    await expect(page).toHaveURL(/\/tabs\/profile/);
    await expect(page.locator('ion-title')).toBeVisible();

    // Navigate back to dashboard
    const dashboardTab = page.getByRole('tab', { name: /dashboard/i });
    await dashboardTab.click();
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
  });

  test('should display user profile information', async ({ page }) => {
    await page.goto('/tabs/profile');

    // Wait for profile page to load
    await expect(page.locator('ion-title')).toBeVisible();

    // Check that profile content is visible
    const profileContent = page.locator('ion-content');
    await expect(profileContent).toBeVisible();

    // Look for profile-related text (name, age, etc.)
    const pageContent = await page.content();
    expect(pageContent).toContain('Test User');
  });

  test('should show appointments page', async ({ page }) => {
    await page.goto('/tabs/appointments');

    // Wait for appointments page to load
    await expect(page.locator('ion-title')).toBeVisible();

    // Content should be visible
    const content = page.locator('ion-content');
    await expect(content).toBeVisible();
  });

  test('should handle page refresh without errors', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page.locator('ion-title')).toBeVisible();

    // Reload the page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-title')).toBeVisible();
  });

  test('should not have console errors on initial load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/tabs/dashboard');
    await expect(page.locator('ion-title')).toBeVisible();

    // Filter out known acceptable errors (like network timeouts in dev)
    const criticalErrors = errors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('favicon') &&
      !err.toLowerCase().includes('network')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

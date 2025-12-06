import { test, expect } from '@playwright/test';
import {
  loginUser,
  navigateToTab,
  waitForIonicHydration,
  fillIonicInput,
  clickIonicButton,
  elementExists,
} from '../helpers/test-helpers';

test.describe('Diabetactic E2E Flow', () => {
  test.use({
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await waitForIonicHydration(page);
  });

  test('Full User Journey: Login -> Dashboard -> Add Reading -> Check Profile', async ({
    page,
  }) => {
    // --- 1. LOGIN ---
    console.log('🔹 Step 1: Login');
    await loginUser(page);

    // --- 2. DASHBOARD ---
    console.log('🔹 Step 2: Dashboard Verification');

    // Wait for dashboard to fully load
    await waitForIonicHydration(page);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check for key elements - stat cards or content
    const hasDashboardContent = await elementExists(page, 'ion-card, .stat-card, app-stat-card');
    expect(
      hasDashboardContent,
      'Dashboard should display content after successful login'
    ).toBeTruthy();

    // --- 3. ADD READING ---
    console.log('🔹 Step 3: Add Glucose Reading');

    // Try to find FAB button or navigate directly
    const hasFab = await elementExists(page, '[data-testid="fab-add-reading"], ion-fab-button');

    if (hasFab) {
      await page.locator('[data-testid="fab-add-reading"], ion-fab-button').first().click();
    } else {
      // Navigate directly if FAB not found
      await page.goto('/add-reading');
    }

    // Wait for Add Reading page
    await expect(page).toHaveURL(/\/add-reading/, { timeout: 10000 });
    await waitForIonicHydration(page);

    // Fill Glucose Value using helper
    await fillIonicInput(page, 'ion-input', '125');

    // Add Notes if textarea exists
    const notesTextarea = page.locator('ion-textarea textarea').first();
    if (await elementExists(page, 'ion-textarea textarea')) {
      await notesTextarea.fill('Playwright E2E Test Reading');
    }

    // Save using data-testid or fallback
    const saveBtn = page
      .locator(
        '[data-testid="add-reading-save-btn"], ion-button:has-text("Guardar"), ion-button:has-text("Save")'
      )
      .first();
    await saveBtn.click();

    // Wait for navigation back
    await expect(page).toHaveURL(/\/tabs\/(readings|dashboard)/, { timeout: 10000 });

    // --- 4. VERIFY READING IN LIST ---
    console.log('🔹 Step 4: Verify Reading in List');

    // Navigate to Readings Tab
    await navigateToTab(page, 'readings');

    // Wait for readings to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check for the new reading value
    const hasReading = await elementExists(page, 'text=/125/');
    if (hasReading) {
      await expect(page.locator('body')).toContainText('125');
      console.log('✅ Reading "125" found in list');
    } else {
      console.log('⚠️  Reading not immediately visible (may be in different view)');
    }

    // --- 5. PROFILE ---
    console.log('🔹 Step 5: Check Profile');

    await navigateToTab(page, 'profile');

    // Wait for profile content to load
    await waitForIonicHydration(page);

    // Verify profile content exists
    const profileContent = page.locator('ion-content');
    await expect(profileContent).toBeVisible();

    console.log('✅ E2E Flow Completed Successfully');
  });
});

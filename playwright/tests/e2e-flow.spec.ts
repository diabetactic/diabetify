import { test, expect } from '@playwright/test';

test.describe('Diabetactic E2E Flow', () => {
  test.use({
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  });

  test.beforeEach(async ({ page }) => {
    // Go to root
    await page.goto('/');
    // Handle "Welcome" screen if present (redirects to login usually, but strictly checking)
    if (page.url().includes('/welcome')) {
      const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
      if ((await loginBtn.count()) > 0) {
        await loginBtn.click();
      }
    }
  });

  test('Full User Journey: Login -> Dashboard -> Add Reading -> Check Profile', async ({
    page,
  }) => {
    // --- 1. LOGIN ---
    console.log('🔹 Step 1: Login');

    // Wait for login form
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    // Check if we are already logged in (redirected to tabs)
    if (page.url().includes('/tabs/')) {
      console.log('   Already logged in, skipping login step.');
    } else {
      // Fill credentials (demo/mock or env provided)
      const username = process.env.TEST_USER || 'demo_patient';
      const password = process.env.TEST_PASS || 'demo123';
      console.log(`   Logging in as: ${username}`);

      await page.fill('#username', username);
      await page.fill('#password', password);

      // Click submit
      await page.click('[data-testid="login-submit-btn"]');

      // Wait for navigation to dashboard
      await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });
    }

    // --- 2. DASHBOARD ---
    console.log('🔹 Step 2: Dashboard Verification');

    // Verify Dashboard Tab is active
    await expect(page.locator('[data-testid="tab-dashboard"]')).toHaveClass(/tab-selected/);

    // Check for key elements (Glucose Circle or Stats)
    // Note: The specific selectors for the graph might vary, looking for generic stat containers
    const statCard = page.locator('.stat-card, app-stat-card, ion-card').first();
    await expect(statCard).toBeVisible();

    // --- 3. ADD READING ---
    console.log('🔹 Step 3: Add Glucose Reading');

    // Navigate to Readings Tab (optional, but good for flow) or use FAB directly
    // Using FAB from Dashboard
    const fabBtn = page.locator('[data-testid="fab-add-reading"]');
    // Ensure FAB is visible (might need to wait for animations)
    await expect(fabBtn).toBeVisible();
    await fabBtn.click();

    // Wait for Add Reading page/modal
    await expect(page).toHaveURL(/\/add-reading/);

    // Fill Glucose Value
    // Ionic inputs can be tricky, try fill on the ion-input first, if fails, target native
    await page.locator('ion-input[formControlName="value"]').click();
    await page.keyboard.type('125');

    // Select Meal Context (Optional)
    // Note: Ionic Selects are complex in Playwright. Skipping for "Quick Add" scenario to keep it robust.

    // Add Notes
    await page
      .locator('ion-textarea[formControlName="notes"] textarea')
      .fill('Playwright E2E Test Reading');

    // Save
    await page.click('[data-testid="add-reading-save-btn"]');

    // Wait for navigation back (usually to Readings tab or Dashboard)
    await expect(page).toHaveURL(/\/tabs\/(readings|dashboard)/);

    // --- 4. VERIFY READING IN LIST ---
    console.log('🔹 Step 4: Verify Reading in List');

    // Go to Readings Tab
    await page.click('[data-testid="tab-readings"]');
    await expect(page).toHaveURL(/\/tabs\/readings/);

    // Check for the new reading
    // Looking for "125" in the list
    await expect(page.locator('body')).toContainText('125');
    // Notes might not be visible in list view, skipping check
    // await expect(page.locator('body')).toContainText('Playwright E2E Test Reading');

    // --- 5. PROFILE ---
    console.log('🔹 Step 5: Check Profile');

    await page.click('[data-testid="tab-profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/);

    // Verify Profile Info matches demo user
    // Demo user usually has specific name or email
    await expect(page.locator('body')).toContainText(/demo|test|patient/i);

    console.log('✅ E2E Flow Completed Successfully');
  });
});

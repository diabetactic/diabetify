import { test, expect } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';
import { TabsPage } from '../../pages/tabs.page';

test.describe('Navigation Smoke Tests @smoke @docker', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test('should load dashboard after login', async ({ page }) => {
    const tabs = new TabsPage(page);
    await page.goto('/tabs/dashboard');
    await tabs.waitForHydration();

    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('should navigate to readings tab', async ({ page }) => {
    const tabs = new TabsPage(page);
    await page.goto('/tabs/dashboard');
    await tabs.waitForHydration();

    await tabs.gotoReadings();
  });

  test('should navigate to appointments tab', async ({ page }) => {
    const tabs = new TabsPage(page);
    await page.goto('/tabs/dashboard');
    await tabs.waitForHydration();

    await tabs.gotoAppointments();
  });

  test('should navigate to profile tab', async ({ page }) => {
    const tabs = new TabsPage(page);
    await page.goto('/tabs/dashboard');
    await tabs.waitForHydration();

    const profileTab = tabs.getTabButton('profile');
    await profileTab.waitFor({ state: 'visible', timeout: 5000 });

    await Promise.all([
      page.waitForURL(/\/tabs\/profile/, { timeout: 15000 }),
      profileTab.click({ timeout: 5000 }),
    ]);
    await expect(page.locator('[data-testid="profile-greeting"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show all four tab buttons', async ({ page }) => {
    const tabs = new TabsPage(page);
    await page.goto('/tabs/dashboard');
    await tabs.waitForHydration();

    await expect(tabs.getTabButton('dashboard')).toBeVisible();
    await expect(tabs.getTabButton('readings')).toBeVisible();
    await expect(tabs.getTabButton('appointments')).toBeVisible();
    await expect(tabs.getTabButton('profile')).toBeVisible();
  });
});

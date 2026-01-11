import { test, expect } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

test.describe('Navigation Smoke Tests @smoke @docker', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test('should load dashboard after login', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await page.waitForSelector('ion-app.hydrated', { timeout: 10000 });

    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('should navigate to readings tab', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await page.waitForSelector('ion-app.hydrated', { timeout: 10000 });

    await page.click('ion-tab-button[tab="readings"]');
    await expect(page).toHaveURL(/\/tabs\/readings/);
  });

  test('should navigate to appointments tab', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await page.waitForSelector('ion-app.hydrated', { timeout: 10000 });

    await page.click('ion-tab-button[tab="appointments"]');
    await expect(page).toHaveURL(/\/tabs\/appointments/);
  });

  test('should navigate to profile tab', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await page.waitForSelector('ion-app.hydrated', { timeout: 10000 });

    await page.click('ion-tab-button[tab="profile"]');
    await expect(page).toHaveURL(/\/tabs\/profile/);
  });

  test('should show all four tab buttons', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await page.waitForSelector('ion-app.hydrated', { timeout: 10000 });

    await expect(page.locator('ion-tab-button[tab="dashboard"]')).toBeVisible();
    await expect(page.locator('ion-tab-button[tab="readings"]')).toBeVisible();
    await expect(page.locator('ion-tab-button[tab="appointments"]')).toBeVisible();
    await expect(page.locator('ion-tab-button[tab="profile"]')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import {
  createProfileSeed,
  PROFILE_STORAGE_KEY,
  SCHEMA_STORAGE_KEY,
} from '../config/profileSeed';

test.describe('App Smoke', () => {
  test.beforeEach(async ({ page }) => {
    const profile = createProfileSeed();

    await page.addInitScript(
      ({ profileData, profileKey, schemaKey }) => {
        localStorage.setItem(profileKey, JSON.stringify(profileData));
        localStorage.setItem(schemaKey, '1');
      },
      { profileData: profile, profileKey: PROFILE_STORAGE_KEY, schemaKey: SCHEMA_STORAGE_KEY }
    );
  });

  test('loads dashboard and navigates between primary tabs', async ({ page }) => {
    await page.goto('/tabs/dashboard');

    await expect(page).toHaveURL(/\/tabs\/dashboard$/);

    const title = page.locator('ion-title');
    await expect(title).toContainText(/dashboard/i);

    await page.getByRole('tab', { name: /readings/i }).click();
    await expect(page).toHaveURL(/\/tabs\/readings$/);

    await page.getByRole('tab', { name: /profile/i }).click();
    await expect(page).toHaveURL(/\/tabs\/profile$/);

    await page.getByRole('tab', { name: /appointments/i }).click();
    await expect(page).toHaveURL(/\/tabs\/appointments$/);
  });
});

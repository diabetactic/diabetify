import { test, expect } from '@playwright/test';
import { createProfileSeed, PROFILE_STORAGE_KEY, SCHEMA_STORAGE_KEY } from '../config/profileSeed';

test.describe('Profile Theme Preferences', () => {
  test.beforeEach(async ({ page }) => {
    const profile = createProfileSeed({
      preferences: {
        themeMode: 'light',
      },
    });

    await page.addInitScript(
      ({ profileData, profileKey, schemaKey }) => {
        localStorage.setItem(profileKey, JSON.stringify(profileData));
        localStorage.setItem(schemaKey, '1');
      },
      { profileData: profile, profileKey: PROFILE_STORAGE_KEY, schemaKey: SCHEMA_STORAGE_KEY }
    );
  });

  test('changing the theme updates body classes and persists preference', async ({ page }) => {
    await page.goto('/tabs/profile');

    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toHaveClass(/light-theme/);

    await page.evaluate(() => {
      const select = document.querySelector('ion-select[aria-label="Theme"]') as any;
      if (!select) throw new Error('Theme select not found');
      select.value = 'dark';
      select.dispatchEvent(
        new CustomEvent('ionChange', {
          detail: { value: 'dark' },
          bubbles: true,
        })
      );
    });

    await page.waitForFunction(() => document.body.classList.contains('dark-theme'));

    await page.waitForFunction(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return parsed.preferences?.themeMode === 'dark';
      } catch {
        return false;
      }
    }, PROFILE_STORAGE_KEY);

    const storedProfileRaw = await page.evaluate(
      key => localStorage.getItem(key),
      PROFILE_STORAGE_KEY
    );
    const storedProfile = storedProfileRaw ? JSON.parse(storedProfileRaw) : null;
    expect(storedProfile?.preferences?.themeMode).toBe('dark');
  });
});

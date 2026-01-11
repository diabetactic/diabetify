/**
 * Authentication Setup - Runs ONCE before all tests
 * Saves authenticated state to reuse across all test files
 *
 * This dramatically speeds up tests by avoiding repeated login flows
 */

import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './storage-paths';
import { PRIMARY_USER, isMockMode } from '../config/test-config';

setup('authenticate', async ({ page }) => {
  const username = process.env['E2E_TEST_USERNAME'] || PRIMARY_USER.dni;
  const password =
    process.env['E2E_TEST_PASSWORD'] || (isMockMode ? 'demo123' : PRIMARY_USER.password);

  // Navigate to login
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('ion-app', { state: 'attached', timeout: 15000 });

  // Fill credentials
  await page.fill('[data-testid="login-username-input"]', username);
  await page.fill('[data-testid="login-password-input"]', password);
  await page.click('[data-testid="login-submit-btn"]');

  // Wait for successful navigation
  await expect(page).toHaveURL(/\/tabs\//, { timeout: 30000 });

  // Set complete profile to bypass onboarding
  // IMPORTANT: Use BOTH raw keys and Capacitor-prefixed keys for compatibility
  await page.evaluate(() => {
    const userProfile = {
      id: 'user_12345',
      name: 'E2E Test User',
      email: 'e2e@test.com',
      age: 30,
      accountState: 'active',
      dateOfBirth: '1993-01-01',
      tidepoolConnection: { connected: false },
      preferences: { useDarkTheme: false, language: 'en' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diagnosisDate: '2020-01-01',
      diabetesType: 'type1',
      hasCompletedOnboarding: true,
    };
    const profileJson = JSON.stringify(userProfile);
    const tooltipsJson = JSON.stringify({
      dashboard: true,
      readings: true,
      bolus: true,
      appointments: true,
      profile: true,
      fab: true,
      quickActions: true,
    });

    // Raw keys
    localStorage.setItem('diabetactic_user_profile', profileJson);
    localStorage.setItem('diabetactic_schema_version', '1');
    localStorage.setItem('diabetactic_onboarding_completed', 'true');
    localStorage.setItem('diabetactic_coach_dismissed', 'true');
    localStorage.setItem('diabetactic_tutorial_completed', 'true');
    localStorage.setItem('diabetactic_first_login_completed', 'true');
    localStorage.setItem('diabetactic_tooltips_seen', tooltipsJson);

    // Capacitor Preferences keys (used by ProfileService on web)
    localStorage.setItem('CapacitorStorage.diabetactic_user_profile', profileJson);
    localStorage.setItem('CapacitorStorage.diabetactic_schema_version', '1');
    localStorage.setItem('CapacitorStorage.diabetactic_onboarding_completed', 'true');
    localStorage.setItem('CapacitorStorage.diabetactic_coach_dismissed', 'true');
    localStorage.setItem('CapacitorStorage.diabetactic_tooltips_seen', tooltipsJson);
  });

  // Reload to apply settings
  await page.reload();
  await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: 10000 });

  // Save storage state for reuse
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});

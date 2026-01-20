/**
 * Authentication Setup - Runs ONCE before all tests
 * Saves authenticated state to reuse across all test files
 *
 * This dramatically speeds up tests by avoiding repeated login flows
 * Also seeds sample readings so dashboard/trends have data to display
 */

import { test as setup, expect, request } from '@playwright/test';
import { STORAGE_STATE_PATH } from './storage-paths';
import { PRIMARY_USER, API_URL } from '../config/test-config';
import { ApiClient } from '../helpers/api/client';

setup('authenticate', async ({ page }) => {
  const username = process.env['E2E_TEST_USERNAME'] || PRIMARY_USER.dni;
  const password = process.env['E2E_TEST_PASSWORD'] || PRIMARY_USER.password;

  // Navigate to login
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('ion-app', { state: 'attached', timeout: 15000 });

  // Fill credentials
  await page.fill('[data-testid="login-username-input"]', username);
  await page.fill('[data-testid="login-password-input"]', password);
  await page.click('[data-testid="login-submit-btn"]');

  // Wait for successful navigation
  await expect(page).toHaveURL(/\/tabs\//, { timeout: 30000 });

  // Capture auth token from the logged-in state and ensure it's stored in all formats
  // SecureStorage on web may use different key prefixes than Capacitor Preferences
  const authToken = await page.evaluate(() => {
    // Find the access token from any of the possible storage formats
    const possibleKeys = [
      'capacitor-storage_local_access_token',
      'CapacitorStorage.local_access_token',
      'local_access_token',
    ];
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        // Strip outer quotes if present (SecureStorage double-quotes the value)
        return value.replace(/^"|"$/g, '');
      }
    }
    return null;
  });

  // Set complete profile and ensure auth token is in all required formats
  await page.evaluate(
    ({ token }) => {
      const userProfile = {
        id: 'user_12345',
        name: 'E2E Test User',
        email: 'e2e@test.com',
        age: 30,
        accountState: 'active',
        dateOfBirth: '1993-01-01',
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

      // Auth token: store in ALL formats for SecureStorage compatibility
      // SecureStorage on web falls back to Preferences which uses CapacitorStorage. prefix
      // But the aparajita plugin may use capacitor-storage_ prefix
      if (token) {
        const tokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        // SecureStorage aparajita format (stores with double-quoted JSON)
        localStorage.setItem('capacitor-storage_local_access_token', JSON.stringify(token));

        // Capacitor Preferences format
        localStorage.setItem('CapacitorStorage.local_access_token', token);
        localStorage.setItem('CapacitorStorage.local_token_expires', String(tokenExpires));

        // Raw format (just in case)
        localStorage.setItem('local_access_token', token);
        localStorage.setItem('local_token_expires', String(tokenExpires));
      }
    },
    { token: authToken }
  );

  // Reload to apply settings
  await page.reload();
  await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: 10000 });

  // Save storage state for reuse
  await page.context().storageState({ path: STORAGE_STATE_PATH });

  // Brief pause to ensure storage state file is fully written before parallel workers read it
  await page.waitForTimeout(200);

  // Seed sample readings via API so dashboard/trends have data to display
  if (authToken) {
    try {
      const apiContext = await request.newContext();
      const apiClient = new ApiClient(apiContext, API_URL);
      apiClient.setToken(authToken);

      const sampleReadings = [
        { value: 95, type: 'DESAYUNO' },
        { value: 142, type: 'ALMUERZO' },
        { value: 88, type: 'CENA' },
        { value: 120, type: 'OTRO' },
        { value: 110, type: 'DESAYUNO' },
      ];

      for (const reading of sampleReadings) {
        await apiClient.createReading(reading.value, reading.type, 'E2E test data');
      }

      await apiContext.dispose();
    } catch (e) {
      console.log('Note: Could not seed sample readings:', e);
    }
  }
});

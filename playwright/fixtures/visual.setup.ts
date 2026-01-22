import { test as setup, expect, request } from '@playwright/test';
import { execSync } from 'child_process';
import { PRIMARY_USER, API_URL } from '../config/test-config';
import { ApiClient } from '../helpers/api/client';
import { STORAGE_STATE_PATH } from './storage-paths';

setup('reseed for visual tests', async ({ browser }) => {
  const dockerDir = `${__dirname}/../../docker`;

  execSync('./seed-test-data.sh full', {
    cwd: dockerDir,
    stdio: 'inherit',
    timeout: 60000,
  });

  const apiContext = await request.newContext();
  const apiClient = new ApiClient(apiContext, API_URL);

  const tokenResponse = await apiContext.post(`${API_URL}/token`, {
    form: {
      username: PRIMARY_USER.dni,
      password: PRIMARY_USER.password,
    },
  });

  if (tokenResponse.ok()) {
    const tokenData = await tokenResponse.json();
    apiClient.setToken(tokenData.access_token);

    const readings = await apiClient.getReadings();
    console.log(`Visual setup: ${readings.length} readings after reseed`);
  }

  await apiContext.dispose();

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('ion-app', { state: 'attached', timeout: 15000 });

  await page.fill('[data-testid="login-username-input"]', PRIMARY_USER.dni);
  await page.fill('[data-testid="login-password-input"]', PRIMARY_USER.password);
  await page.click('[data-testid="login-submit-btn"]');

  await expect(page).toHaveURL(/\/tabs\//, { timeout: 30000 });

  await page.evaluate(() => {
    const tooltipsJson = JSON.stringify({
      dashboard: true,
      readings: true,
      bolus: true,
      appointments: true,
      profile: true,
      fab: true,
      quickActions: true,
    });
    localStorage.setItem('diabetactic_coach_dismissed', 'true');
    localStorage.setItem('diabetactic_tutorial_completed', 'true');
    localStorage.setItem('diabetactic_first_login_completed', 'true');
    localStorage.setItem('diabetactic_tooltips_seen', tooltipsJson);
    localStorage.setItem('CapacitorStorage.diabetactic_coach_dismissed', 'true');
    localStorage.setItem('CapacitorStorage.diabetactic_tooltips_seen', tooltipsJson);
  });

  await page.context().storageState({ path: STORAGE_STATE_PATH });

  await page.close();
  await context.close();
});

/**
 * Heroku-backed E2E Smoke Tests (@heroku)
 *
 * These tests:
 *  - use the local Angular dev server for the UI
 *  - override API base URL to point to the deployed Heroku gateway
 *  - log in using HEROKU_TEST_USER / HEROKU_TEST_PASS
 *  - verify a few core screens load correctly with the real backend
 *
 * Run with:
 *  HEROKU_TEST_USER=... HEROKU_TEST_PASS=... npm run test:e2e:heroku
 */

import { test, expect } from '@playwright/test';

const HEROKU_API_BASE_URL =
  process.env.HEROKU_API_BASE_URL ||
  'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';

async function configureHerokuBackend(page: import('@playwright/test').Page) {
  await page.addInitScript(value => {
    (window as any).__DIABETIFY_API_BASE_URL = value;
  }, HEROKU_API_BASE_URL);
}

async function loginWithHerokuUser(page: import('@playwright/test').Page) {
  const dni = process.env.HEROKU_TEST_USER;
  const pass = process.env.HEROKU_TEST_PASS;

  if (!dni || !pass) {
    throw new Error('HEROKU_TEST_USER / HEROKU_TEST_PASS must be set for @heroku tests');
  }

  await page.goto('/login');

  // Adjust selectors if your login form uses different names/ids
  await page.fill('input[name="dni"]', dni);
  await page.fill('input[name="password"]', pass);
  await page.click('button[type="submit"]');

  // Expect redirect to dashboard
  await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });
}

test.describe('@heroku Heroku-backed smoke flows', () => {
  test.beforeEach(async ({ page }) => {
    await configureHerokuBackend(page);
  });

  test('login and load dashboard with Heroku backend', async ({ page }) => {
    await loginWithHerokuUser(page);

    // Basic smoke: dashboard visible, title present
    const title = page.locator('ion-title');
    await expect(title).toBeVisible();

    // Optional: ensure no critical console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
  });

  test('navigate to appointments tab (Heroku backend)', async ({ page }) => {
    await loginWithHerokuUser(page);

    // Navigate to appointments tab
    const appointmentsTab = page.getByRole('tab', { name: /appointments/i });
    await appointmentsTab.click();
    await expect(page).toHaveURL(/\/tabs\/appointments/);

    const content = page.locator('ion-content');
    await expect(content).toBeVisible();
  });

  test('navigate to readings tab (Heroku backend)', async ({ page }) => {
    await loginWithHerokuUser(page);

    // Navigate to readings tab
    const readingsTab = page.getByRole('tab', { name: /readings/i });
    await readingsTab.click();
    await expect(page).toHaveURL(/\/tabs\/readings/);

    const content = page.locator('ion-content');
    await expect(content).toBeVisible();
  });
});


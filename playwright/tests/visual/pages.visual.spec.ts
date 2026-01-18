import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

const screenshotOptions = {
  maxDiffPixelRatio: 0.05,
  threshold: 0.3,
  animations: 'disabled' as const,
};

async function prepareForScreenshot(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.addStyleTag({
    content: `
      [data-testid="timestamp"], .timestamp, .time-ago,
      [data-testid="current-date"], [data-testid="current-time"],
      ion-spinner, .loading-indicator, .loading, .loading-spinner,
      [data-testid="appointment-id"], .appointment-id { visibility: hidden !important; }
      *, *::before, *::after { 
        animation-duration: 0s !important; 
        transition-duration: 0s !important; 
      }
    `,
  });
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font readiness errors in test environment
      }
    }
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
}

test.describe('Visual Regression - Pages @visual @docker', () => {
  test.skip(!isDockerMode, 'Visual tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('dashboard page', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
    await page.waitForSelector('[data-testid="stats-container"]', {
      state: 'visible',
      timeout: 30000,
    });
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('dashboard.png', screenshotOptions);
  });

  test('readings page - empty or list', async ({ page, pages }) => {
    await page.goto('/tabs/readings');
    await pages.readingsPage.waitForHydration();
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('readings-page.png', screenshotOptions);
  });

  test('add reading form', async ({ page, pages }) => {
    await page.goto('/add-reading');
    await pages.addReadingPage.waitForHydration();
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('add-reading-form.png', screenshotOptions);
  });

  test('appointments page', async ({ page, pages }) => {
    await page.goto('/tabs/appointments');
    await pages.appointmentsPage.waitForHydration();
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('appointments-page.png', screenshotOptions);
  });

  test('profile page', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('profile-page.png', screenshotOptions);
  });

  test('settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('settings-page.png', screenshotOptions);
  });
});

test.describe('Visual Regression - Auth Pages @visual @docker', () => {
  test.skip(!isDockerMode, 'Visual tests require Docker backend');

  test('login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('login-page.png', screenshotOptions);
  });

  test('welcome page', async ({ page }) => {
    await page.goto('/welcome');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('welcome-page.png', screenshotOptions);
  });
});

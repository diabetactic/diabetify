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
      [data-testid="current-date"], [data-testid="current-time"] { visibility: hidden !important; }
      *, *::before, *::after { 
        animation-duration: 0s !important; 
        transition-duration: 0s !important; 
      }
    `,
  });
  await page.waitForTimeout(300);
}

test.describe('Visual Regression - Pages @visual @docker', () => {
  test.skip(!isDockerMode, 'Visual tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('dashboard page', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
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
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    await page.click('[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]');
    await pages.appointmentsPage.waitForHydration();
    await page.waitForTimeout(1500);

    await page.addStyleTag({
      content: `
        .alert, .alert-error, .alert-warning, .alert-info,
        app-toast-queue, .toast-container, ion-toast,
        [role="alert"] { display: none !important; }
      `,
    });
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('appointments-page.png', screenshotOptions);
  });

  test('profile page', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('profile-page.png', screenshotOptions);
  });

  test('profile with preferences', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();

    const preferencesSection = page.locator('[data-testid="advanced-settings-btn"]');
    await preferencesSection.scrollIntoViewIfNeeded();
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('profile-preferences.png', screenshotOptions);
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

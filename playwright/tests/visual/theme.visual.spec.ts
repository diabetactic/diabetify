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
      [data-testid="timestamp"], .timestamp, .time-ago { visibility: hidden !important; }
      *, *::before, *::after { 
        animation-duration: 0s !important; 
        transition-duration: 0s !important; 
      }
    `,
  });
  await page.waitForTimeout(300);
}

async function setTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  await page.evaluate(t => {
    document.documentElement.setAttribute('data-theme', t);
    document.body.classList.toggle('dark', t === 'dark');
  }, theme);
  await page.waitForTimeout(200);
}

test.describe('Visual Regression - Dark Theme @visual @docker', () => {
  test.skip(!isDockerMode, 'Visual tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('dashboard - dark theme', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('dashboard-dark.png', screenshotOptions);
  });

  test('readings - dark theme', async ({ page, pages }) => {
    await page.goto('/tabs/readings');
    await pages.readingsPage.waitForHydration();
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('readings-dark.png', screenshotOptions);
  });

  test('profile - dark theme', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('profile-dark.png', screenshotOptions);
  });

  test('login - dark theme', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('login-dark.png', screenshotOptions);
  });
});

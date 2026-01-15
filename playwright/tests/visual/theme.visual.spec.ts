import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

const screenshotOptions = {
  maxDiffPixelRatio: 0.1,
  threshold: 0.4,
  animations: 'disabled' as const,
};

const permissiveOptionsForDynamicContent = {
  maxDiffPixelRatio: 0.15,
  threshold: 0.4,
  animations: 'disabled' as const,
};

async function prepareForScreenshot(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.addStyleTag({
    content: `
      /* Hide dynamic timestamps */
      [data-testid="timestamp"], .timestamp, .time-ago { visibility: hidden !important; }
      
      /* Hide dynamic reading values and counts */
      [data-testid="reading-value"], [data-testid="reading-count"],
      [data-testid="stats-value"], [data-testid="readings-count"] { 
        visibility: hidden !important; 
      }
      
      /* Disable animations */
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

async function setTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  const isDark = theme === 'dark';

  await page.evaluate(dark => {
    const html = document.documentElement;
    const body = document.body;

    html.setAttribute('data-theme', dark ? 'dark' : 'diabetactic');

    html.classList.remove('dark', 'light', 'ion-palette-dark');
    body.classList.remove('dark', 'light');

    if (dark) {
      html.classList.add('dark', 'ion-palette-dark');
      body.classList.add('dark');
    } else {
      html.classList.add('light');
      body.classList.add('light');
    }

    document.body.style.display = 'none';
    void document.body.offsetHeight;
    document.body.style.display = '';
    void document.body.offsetHeight;
  }, isDark);

  await page.waitForFunction(
    ({ dark }) => {
      const html = document.documentElement;
      const body = document.body;
      const expectedTheme = dark ? 'dark' : 'diabetactic';
      const themeMatches = html.getAttribute('data-theme') === expectedTheme;
      const classMatches = dark
        ? html.classList.contains('ion-palette-dark') && body.classList.contains('dark')
        : html.classList.contains('light') && body.classList.contains('light');
      return themeMatches && classMatches;
    },
    { dark: isDark }
  );

  await page.evaluate(dark => {
    const html = document.documentElement;
    if (dark && !html.classList.contains('ion-palette-dark')) {
      html.classList.add('dark', 'ion-palette-dark');
      document.body.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    }
  }, isDark);

  await page.waitForFunction(
    ({ dark }) => {
      const html = document.documentElement;
      if (!dark) {
        return true;
      }
      return (
        html.classList.contains('ion-palette-dark') && html.getAttribute('data-theme') === 'dark'
      );
    },
    { dark: isDark }
  );
}

test.describe('Visual Regression - Dark Theme @visual @docker', () => {
  test.skip(!isDockerMode, 'Visual tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('dashboard - dark theme', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
    await page.waitForSelector('[data-testid="stats-container"]', {
      state: 'visible',
      timeout: 15000,
    });
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('dashboard-dark.png', screenshotOptions);
  });

  test('readings - dark theme', async ({ page, pages }) => {
    await page.goto('/tabs/readings');
    await pages.readingsPage.waitForHydration();
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    const dynamicElements = [
      page.locator('[data-testid="readings-list"]'),
      page.locator('[data-testid="readings-empty"]'),
      page.locator('app-readings-stats'),
    ];

    await expect(page).toHaveScreenshot('readings-dark.png', {
      ...permissiveOptionsForDynamicContent,
      mask: dynamicElements,
    });
  });

  test('profile - dark theme', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    const dynamicElements = [
      page.locator('.profile-header'),
      page.locator('[data-testid="user-info"]'),
    ];

    await expect(page).toHaveScreenshot('profile-dark.png', {
      ...permissiveOptionsForDynamicContent,
      mask: dynamicElements,
    });
  });
});

test.describe('Visual Regression - Dark Theme Auth @visual @docker', () => {
  test.skip(!isDockerMode, 'Visual tests require Docker backend');

  test('login - dark theme', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    await setTheme(page, 'dark');
    await prepareForScreenshot(page);

    await expect(page).toHaveScreenshot('login-dark.png', screenshotOptions);
  });
});

/**
 * Visual Regression Tests for Diabetactic
 *
 * These tests capture screenshots of key pages and compare them against baseline images.
 * Run with: npx playwright test visual-regression --update-snapshots (to create baselines)
 * Run with: npx playwright test visual-regression (to compare against baselines)
 */
import { test, expect } from '@playwright/test';

// Test credentials - should be moved to .env.test in production
const TEST_USER = {
  username: process.env.E2E_TEST_USERNAME || '12345678A',
  password: process.env.E2E_TEST_PASSWORD || 'test123',
};

test.describe('Visual Regression - Web & Mobile', () => {
  test.describe('Authentication Pages', () => {
    test('welcome page', async ({ page }) => {
      await page.goto('/welcome');
      await page.waitForLoadState('networkidle');

      // Wait for animations to complete
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('welcome-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Main App Pages (Authenticated)', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill login form
      await page.locator('ion-input[formControlName="username"] input').fill(TEST_USER.username);
      await page.locator('ion-input[formControlName="password"] input').fill(TEST_USER.password);

      // Submit and wait for navigation
      await page.locator('ion-button[type="submit"]').click();

      // Wait for dashboard to load
      await page.waitForURL('**/tabs/dashboard', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    });

    test('dashboard page', async ({ page }) => {
      await page.waitForTimeout(1000); // Wait for data to load
      await expect(page).toHaveScreenshot('dashboard-page.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          // Mask dynamic content that changes
          page.locator('.stat-value'),
          page.locator('.time-ago'),
          page.locator('[data-testid="current-date"]'),
        ],
      });
    });

    test('readings page', async ({ page }) => {
      await page.goto('/tabs/readings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('readings-page.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('.reading-time'), page.locator('.time-ago')],
      });
    });

    test('appointments page', async ({ page }) => {
      await page.goto('/tabs/appointments');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('appointments-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('profile page', async ({ page }) => {
      await page.goto('/tabs/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('profile-page.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('.member-since'), page.locator('[data-testid="user-email"]')],
      });
    });

    test('settings page', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('settings-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('tips page', async ({ page }) => {
      await page.goto('/tips');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('tips-page.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Forms & Modals', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.locator('ion-input[formControlName="username"] input').fill(TEST_USER.username);
      await page.locator('ion-input[formControlName="password"] input').fill(TEST_USER.password);
      await page.locator('ion-button[type="submit"]').click();
      await page.waitForURL('**/tabs/dashboard', { timeout: 15000 });
    });

    test('add reading form', async ({ page }) => {
      await page.goto('/add-reading');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('add-reading-form.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('bolus calculator', async ({ page }) => {
      await page.goto('/bolus-calculator');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('bolus-calculator.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Dark Mode', () => {
    test.beforeEach(async ({ page }) => {
      // Set dark mode preference
      await page.emulateMedia({ colorScheme: 'dark' });
    });

    test('welcome page - dark mode', async ({ page }) => {
      await page.goto('/welcome');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('welcome-page-dark.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('login page - dark mode', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-page-dark.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('dashboard page - dark mode', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.locator('ion-input[formControlName="username"] input').fill(TEST_USER.username);
      await page.locator('ion-input[formControlName="password"] input').fill(TEST_USER.password);
      await page.locator('ion-button[type="submit"]').click();
      await page.waitForURL('**/tabs/dashboard', { timeout: 15000 });
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('dashboard-page-dark.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('.stat-value'), page.locator('.time-ago')],
      });
    });
  });

  test.describe('Component Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.locator('ion-input[formControlName="username"] input').fill(TEST_USER.username);
      await page.locator('ion-input[formControlName="password"] input').fill(TEST_USER.password);
      await page.locator('ion-button[type="submit"]').click();
      await page.waitForURL('**/tabs/dashboard', { timeout: 15000 });
    });

    test('tab bar component', async ({ page }) => {
      const tabBar = page.locator('ion-tab-bar');
      await expect(tabBar).toHaveScreenshot('tab-bar.png', {
        animations: 'disabled',
      });
    });

    test('stat cards on dashboard', async ({ page }) => {
      await page.waitForTimeout(1000);
      const statsSection = page.locator('.stats-grid, .stat-cards').first();
      if (await statsSection.isVisible()) {
        await expect(statsSection).toHaveScreenshot('stat-cards.png', {
          animations: 'disabled',
        });
      }
    });

    test('header toolbar', async ({ page }) => {
      const header = page.locator('ion-header').first();
      await expect(header).toHaveScreenshot('header-toolbar.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Error States', () => {
    test('empty readings state', async ({ page }) => {
      // Navigate to readings without data
      await page.goto('/tabs/readings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const emptyState = page.locator('.empty-state');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toHaveScreenshot('empty-readings-state.png', {
          animations: 'disabled',
        });
      }
    });

    test('network error state', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);
      await page.goto('/tabs/dashboard');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('offline-state.png', {
        fullPage: true,
        animations: 'disabled',
      });

      // Restore online
      await page.context().setOffline(false);
    });
  });
});

test.describe('Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'mobile-sm', width: 320, height: 568 },
    { name: 'mobile-md', width: 375, height: 667 },
    { name: 'mobile-lg', width: 414, height: 896 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ];

  for (const { name, width, height } of breakpoints) {
    test(`welcome page at ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/welcome');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`welcome-${name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
});

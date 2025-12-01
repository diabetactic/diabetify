import { test, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'playwright', 'screenshots');

interface ScreenResult {
  name: string;
  status: 'success' | 'failed';
  screenshot: string;
  errors: string[];
  mockDataLoaded: boolean;
  url: string;
}

test.describe('Screen Navigation Test - All 12 Screens', () => {
  const results: ScreenResult[] = [];
  let page: Page;

  test.beforeAll(async () => {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
  });

  async function captureScreen(
    screenName: string,
    url: string,
    verifyElement?: string
  ): Promise<ScreenResult> {
    const result: ScreenResult = {
      name: screenName,
      status: 'success',
      screenshot: '',
      errors: [],
      mockDataLoaded: false,
      url: url,
    };

    try {
      // Wait for page to be ready
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await page.waitForTimeout(1000); // Extra wait for Angular rendering

      // Check for "No data" or empty states
      const bodyText = await page.textContent('body');
      result.mockDataLoaded =
        !bodyText?.includes('No data') && !bodyText?.includes('No appointments');

      // Verify element if provided
      if (verifyElement) {
        await page.waitForSelector(verifyElement, { timeout: 5000 });
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `${screenName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;

      console.log(`✅ ${screenName}: Success`);
    } catch (error) {
      result.status = 'failed';
      result.errors.push(error instanceof Error ? error.message : String(error));
      console.log(`❌ ${screenName}: Failed - ${result.errors[0]}`);
    }

    results.push(result);
    return result;
  }

  test('1. Welcome/Landing Page', async () => {
    await page.goto('/');
    await captureScreen('01-welcome', '/', 'ion-content');
  });

  test('2. Complete Onboarding - Click Get Started or Login', async () => {
    await page.goto('/');

    // Try to find and click "Get Started" or "Login" button
    try {
      const getStartedButton = page
        .locator(
          'button:has-text("Get Started"), a:has-text("Get Started"), ion-button:has-text("Get Started")'
        )
        .first();
      if (await getStartedButton.isVisible({ timeout: 2000 })) {
        await getStartedButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Try login button
      try {
        const loginButton = page
          .locator(
            'button:has-text("Login"), a:has-text("Login"), ion-button:has-text("Login"), [routerLink="/login"]'
          )
          .first();
        if (await loginButton.isVisible({ timeout: 2000 })) {
          await loginButton.click();
          await page.waitForTimeout(1000);
        }
      } catch {
        console.log('No onboarding/login button found, proceeding...');
      }
    }

    await captureScreen('02-after-onboarding', page.url(), 'ion-content');
  });

  test('3. Dashboard Tab', async () => {
    await page.goto('/tabs/dashboard');
    await captureScreen('03-dashboard', '/tabs/dashboard', 'ion-content');
  });

  test('4. Readings Tab', async () => {
    await page.goto('/tabs/readings');
    await captureScreen('04-readings', '/tabs/readings', 'ion-content');
  });

  test('5. Appointments Tab', async () => {
    await page.goto('/tabs/appointments');
    await captureScreen('05-appointments', '/tabs/appointments', 'ion-content');
  });

  test('6. Trends Tab', async () => {
    await page.goto('/tabs/trends');
    await captureScreen('06-trends', '/tabs/trends', 'ion-content');
  });

  test('7. Profile Tab', async () => {
    await page.goto('/tabs/profile');
    await captureScreen('07-profile', '/tabs/profile', 'ion-content');
  });

  test('8. Settings Page', async () => {
    // Navigate from profile
    await page.goto('/tabs/profile');
    await page.waitForTimeout(1000);

    // Try to click settings
    try {
      const settingsButton = page
        .locator(
          'ion-button:has-text("Settings"), button:has-text("Settings"), [routerLink="/settings"]'
        )
        .first();
      if (await settingsButton.isVisible({ timeout: 2000 })) {
        await settingsButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Direct navigation if button not found
      await page.goto('/settings');
    }

    await captureScreen('08-settings', page.url(), 'ion-content');
  });

  test('9. Advanced Settings', async () => {
    await page.goto('/settings');
    await page.waitForTimeout(1000);

    // Try to click advanced settings
    try {
      const advancedButton = page
        .locator('ion-item:has-text("Advanced"), [routerLink*="advanced"]')
        .first();
      if (await advancedButton.isVisible({ timeout: 2000 })) {
        await advancedButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Direct navigation if button not found
      await page.goto('/settings/advanced');
    }

    await captureScreen('09-advanced-settings', page.url(), 'ion-content');
  });

  test('10. Add Reading Page', async () => {
    // Try from dashboard first
    await page.goto('/tabs/dashboard');
    await page.waitForTimeout(1000);

    try {
      const addButton = page
        .locator('ion-fab-button, [routerLink*="add-reading"], button:has-text("Add")')
        .first();
      if (await addButton.isVisible({ timeout: 2000 })) {
        await addButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Direct navigation if button not found
      await page.goto('/add-reading');
    }

    await captureScreen('10-add-reading', page.url(), 'ion-content');
  });

  test('11. Dashboard Detail', async () => {
    await page.goto('/tabs/dashboard');
    await page.waitForTimeout(1000);

    // Try to click detail view
    try {
      const detailButton = page
        .locator(
          'ion-button:has-text("Detail"), ion-button:has-text("View"), [routerLink*="dashboard-detail"]'
        )
        .first();
      if (await detailButton.isVisible({ timeout: 2000 })) {
        await detailButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Direct navigation if button not found
      await page.goto('/dashboard-detail');
    }

    await captureScreen('11-dashboard-detail', page.url(), 'ion-content');
  });

  test('12. Appointment Detail', async () => {
    await page.goto('/tabs/appointments');
    await page.waitForTimeout(1000);

    // Try to click first appointment
    try {
      const firstAppointment = page.locator('ion-item').first();
      if (await firstAppointment.isVisible({ timeout: 2000 })) {
        await firstAppointment.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Try direct navigation
      await page.goto('/appointments/detail/1');
    }

    await captureScreen('12-appointment-detail', page.url(), 'ion-content');
  });

  test.afterAll(async () => {
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      totalScreens: results.length,
      successCount: results.filter(r => r.status === 'success').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      screens: results,
    };

    const reportPath = path.join(SCREENSHOT_DIR, 'navigation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== SCREEN NAVIGATION REPORT ===');
    console.log(`Total Screens: ${report.totalScreens}`);
    console.log(`Success: ${report.successCount}`);
    console.log(`Failed: ${report.failedCount}`);
    console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`Report saved to: ${reportPath}`);

    results.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      const mockData = result.mockDataLoaded ? '📊' : '⚠️';
      console.log(`${status} ${mockData} ${result.name} (${result.url})`);
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
    });
  });
});

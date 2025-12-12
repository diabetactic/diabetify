import { test, expect, chromium, Browser, Page } from '@playwright/test';

const CDP_URL = 'http://localhost:9222';
const APP_PACKAGE = 'io.diabetactic.app';

test.describe('Android WebView E2E Tests', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    // Connect to the Android WebView via CDP
    browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0];
    page = context.pages()[0];
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('should connect to the WebView and navigate the app', async () => {
    // Verify that the page is attached
    expect(page).toBeDefined();

    // Check the package name to ensure we are in the correct app
    const packageName = await page.evaluate(() => {
      return (window as any).Capacitor?.getAppInfo()?.id;
    });
    expect(packageName).toBe(APP_PACKAGE);

    // Perform a basic navigation test
    await page.waitForSelector('ion-tab-button[tab="home"]');
    await page.click('ion-tab-button[tab="home"]');
    await expect(page.locator('app-home')).toBeVisible();
  });
});

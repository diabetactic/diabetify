import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

const PORT = Number(process.env.E2E_PORT ?? 4200);
const HOST = process.env.E2E_HOST ?? 'localhost';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://${HOST}:${PORT}`;
const LOCAL_CHROMIUM = '/usr/bin/chromium';
const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined);

/**
 * Mobile-first Playwright configuration for Diabetactic.
 * This is a MOBILE APP - mobile viewport is the primary testing target.
 *
 * Reports: HTML reports with screenshots saved to playwright/artifacts.
 * Screenshots: Saved to playwright/artifacts (only on failure).
 */
export default defineConfig({
  testDir: './playwright/tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
  fullyParallel: true,
  workers: process.env.CI ? 4 : 6,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  outputDir: 'playwright/artifacts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Default to mobile viewport (iPhone 14 dimensions)
    viewport: { width: 390, height: 844 },
    // Mobile-friendly settings
    hasTouch: true,
    isMobile: true,
    // Faster animations for tests
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    // PRIMARY: Mobile Web (Android/iOS simulation via Pixel 5)
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          executablePath: chromiumExecutable,
        },
      },
    },

    // SECONDARY: Desktop Web (for responsive design testing)
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          executablePath: chromiumExecutable,
        },
      },
    },
    // NOTE: For Android native testing:
    // 1. Install Playwright Android: npm i -D @playwright/android
    // 2. Connect Android device/emulator
    // 3. Set E2E_ANDROID=true environment variable
    // 4. Tests will run on real Android WebView
    // Example: E2E_ANDROID=true npm run test:e2e
  ],
  webServer: process.env.E2E_SKIP_SERVER
    ? undefined
    : {
        command: `npm run start -- --port=${PORT} --configuration development`,
        url: `${BASE_URL}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});

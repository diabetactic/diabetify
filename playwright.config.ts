import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4200);
const HOST = process.env.E2E_HOST ?? 'localhost';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://${HOST}:${PORT}`;

/**
 * Mobile-first Playwright configuration for Diabetactic.
 * This is a MOBILE APP - mobile viewport is the primary testing target.
 *
 * Reports: HTML reports with screenshots auto-open after tests.
 * Screenshots: Saved to playwright/screenshots on failure and on success.
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
    ['html', { outputFolder: 'playwright-report', open: 'always' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  outputDir: 'playwright/screenshots',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'on',
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
    // PRIMARY: Chromium mobile (Android/iOS simulation)
    {
      name: 'chromium',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
        },
      },
    },
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

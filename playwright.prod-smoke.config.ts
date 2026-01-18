import { defineConfig } from '@playwright/test';
import { existsSync } from 'fs';

const PORT = Number(process.env.PROD_SMOKE_PORT ?? 4173);
const HOST = process.env.PROD_SMOKE_HOST ?? '127.0.0.1';
const BASE_URL = process.env.PROD_SMOKE_BASE_URL ?? `http://${HOST}:${PORT}`;

// Prefer Google Chrome stable, fallback to Chromium (matches main config approach)
const CHROME_EXECUTABLE = '/usr/bin/google-chrome-stable';
const LOCAL_CHROMIUM = '/usr/bin/chromium';
const browserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync(CHROME_EXECUTABLE) ? CHROME_EXECUTABLE : undefined) ||
  (existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined);

export default defineConfig({
  testDir: './playwright/prod-smoke',
  outputDir: 'playwright/artifacts-prod-smoke',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: process.env.CI
    ? ([
        ['github'],
        ['list'],
        ['html', { outputFolder: 'playwright-report-prod-smoke', open: 'never' }],
        ['json', { outputFile: 'playwright-report-prod-smoke/results.json' }],
      ] as const)
    : [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: browserExecutable,
      headless: process.env.HEADLESS !== 'false',
    },
  },
  webServer: {
    command: `PORT=${PORT} API_GATEWAY_URL=http://127.0.0.1:9 LOG_API_REQUESTS=false node server/heroku-web-server.js`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

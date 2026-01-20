import { defineConfig } from '@playwright/test';
import { existsSync } from 'fs';

/**
 * Optimized Mobile-first Playwright configuration for Diabetactic.
 * Primary focus: High reliability in CI and representative mobile device coverage.
 */

// Configuration constants
const PORT = Number(process.env.E2E_PORT ?? 4200);
const HOST = process.env.E2E_HOST ?? 'localhost';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://${HOST}:${PORT}`;

// Browser executable resolution
// Prefer Google Chrome stable, fallback to Chromium
const CHROME_EXECUTABLE = '/usr/bin/google-chrome-stable';
const LOCAL_CHROMIUM = '/usr/bin/chromium';
const browserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync(CHROME_EXECUTABLE) ? CHROME_EXECUTABLE : undefined) ||
  (existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined);

// E2E tests always run against Docker backend
// Set E2E_DOCKER_TESTS=true to ensure proper backend configuration
if (process.env.E2E_DOCKER_TESTS == null) {
  process.env.E2E_DOCKER_TESTS = 'true';
}

/**
 * Device viewport dimensions:
 *
 * Mobile (iPhone 14/15 standard):
 * - Width: 390px (below Tailwind 'sm' breakpoint of 640px)
 * - Height: 844px (realistic for modals, popovers, keyboards)
 *
 * Desktop (standard HD):
 * - Width: 1280px (at Tailwind 'xl' breakpoint)
 * - Height: 800px (comfortable for visual regression tests)
 */
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

export default defineConfig({
  testDir: './playwright/tests',

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Run tests in files in parallel for faster execution */
  fullyParallel: true,

  /* Retries for flake mitigation (CI: 2, local: 1 for hydration flakiness) */
  retries: process.env.CI ? 2 : 1,

  /* Worker management: Use full power on CI, 50% locally to avoid resource contention */
  workers: process.env.CI ? '100%' : '50%',

  /* Maximum time one test can run for */
  timeout: process.env.CI ? 60_000 : 30_000,

  /* Reporter configuration: Always produce HTML + JSON with attachments */
  reporter: [
    ...(process.env.CI ? ([['github']] as const) : []),
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  /* Directory for screenshots, videos, and trace files */
  outputDir: 'playwright/artifacts',

  /* Snapshot path template for visual regression testing */
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}',

  /* Global expect settings */
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.04, // 4% tolerance for font rendering differences between OSs
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  /* Global execution settings */
  use: {
    baseURL: BASE_URL,

    /* Performance and reliability timeouts */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    /* Debugging artifacts: retain on failure to avoid trace file conflicts in parallel runs */
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',

    /* Primary target: Mobile-first viewport (iPhone 14/15 standard) */
    viewport: MOBILE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
  },

  /*
   * Projects define different browser/device combinations for cross-device testing.
   *
   * OPTIMIZED CONFIGURATION (reduced from 804 → 228 tests):
   * - Setup: Authentication setup (runs once, saves state)
   * - Primary: mobile-chromium (iPhone 14/15 dimensions) - runs ALL tests (~201 tests)
   * - Secondary: desktop-chromium - ONLY visual regression tests (~27 tests)
   *
   * This reduces test execution time by ~71% while maintaining coverage:
   * ✓ Mobile-first testing (primary use case)
   * ✓ Desktop responsive design verification (visual regression only)
   * ✓ Cross-browser testing deferred to CI (if needed)
   *
   * Full matrix (mobile-safari, mobile-samsung) can be enabled via CI environment.
   */
  projects: [
    // Auth setup project - runs ONCE before all other projects
    {
      name: 'setup',
      testDir: './playwright/fixtures',
      testMatch: /auth\.setup\.ts/,
      use: {
        browserName: 'chromium',
        viewport: MOBILE_VIEWPORT,
        launchOptions: {
          executablePath: browserExecutable,
          headless: process.env.HEADLESS !== 'false',
        },
      },
    },

    // Visual setup - reseeds database for deterministic visual test data
    // Runs after functional tests pollute data, before visual tests capture screenshots
    {
      name: 'visual-setup',
      testDir: './playwright/fixtures',
      testMatch: /visual\.setup\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chromium-functional',
      dependencies: ['setup'],
      testIgnore: '**/visual/**/*.spec.ts', // Visual tests run in dedicated project
      use: {
        browserName: 'chromium',
        viewport: MOBILE_VIEWPORT,
        deviceScaleFactor: 3, // iPhone 14/15 retina
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        launchOptions: {
          executablePath: browserExecutable,
          headless: process.env.HEADLESS !== 'false', // Set HEADLESS=false to see browser
        },
      },
    },
    {
      name: 'mobile-chromium',
      dependencies: ['visual-setup'],
      testMatch: '**/visual/**/*.spec.ts',
      use: {
        browserName: 'chromium',
        viewport: MOBILE_VIEWPORT,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        launchOptions: {
          executablePath: browserExecutable,
          headless: process.env.HEADLESS !== 'false',
        },
      },
    },
    {
      name: 'desktop-chromium',
      dependencies: ['visual-setup'],
      testMatch: '**/visual/**/*.spec.ts', // Only run desktop for visual tests
      use: {
        browserName: 'chromium',
        viewport: DESKTOP_VIEWPORT,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        launchOptions: {
          executablePath: browserExecutable,
          headless: process.env.HEADLESS !== 'false', // Set HEADLESS=false to see browser
        },
      },
    },
  ],

  /* Automated web server lifecycle management */
  webServer: process.env.E2E_SKIP_SERVER
    ? undefined
    : {
        command:
          process.env.E2E_DOCKER_TESTS === 'true'
            ? `npx ng serve --configuration local --proxy-config proxy.conf.local.json --port ${PORT} --host ${HOST}`
            : `npx ng serve --configuration development --port ${PORT} --host ${HOST}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});

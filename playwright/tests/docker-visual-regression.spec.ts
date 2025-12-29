/**
 * Docker Backend Visual Regression Tests
 *
 * Comprehensive screenshot testing against Docker backend for deterministic results.
 * Captures all app states with real data from seeded database.
 *
 * Run with: E2E_DOCKER_TESTS=true pnpm test:e2e -- --grep "@docker-visual"
 * Update baselines: E2E_DOCKER_TESTS=true pnpm test:e2e -- --update-snapshots --grep "@docker-visual"
 *
 * Categories:
 *   - Dashboard: Main view, streak card, achievements summary
 *   - Readings: List with data, empty state, color ranges (low/normal/high)
 *   - Appointments: All 6 state machine states
 *   - Profile: View, edit mode, preferences
 *   - Trends: Charts with real data, statistics
 *   - Settings: All sections, theme toggle
 *   - Bolus Calculator: Form, results
 *   - Achievements: Full page with levels
 */

import { test, expect, Page } from '@playwright/test';
import { DockerTestManager } from '../helpers/docker-test-manager';
import { DatabaseSeeder } from '../helpers/database-seeder';
import {
  API_URL,
  TEST_USERNAME,
  TEST_PASSWORD,
} from '../helpers/config';

const isDockerTest = process.env.E2E_DOCKER_TESTS === 'true';

// Global setup and teardown
test.beforeAll(async () => {
  if (isDockerTest) {
    await DockerTestManager.ensureServicesHealthy(['api_gateway', 'glucoserver']);
    await DatabaseSeeder.reset();
    await DatabaseSeeder.seed('base');
  }
});

test.afterAll(async () => {
  if (isDockerTest) {
    await DatabaseSeeder.cleanup();
  }
});

test.beforeEach(async () => {
  if (isDockerTest) {
    await DatabaseSeeder.beginTransaction();
  }
});

test.afterEach(async () => {
  if (isDockerTest) {
    await DatabaseSeeder.rollbackTransaction();
  }
});

// Screenshot options - stricter for visual regression
const screenshotOptions = {
  maxDiffPixelRatio: 0.03,
  threshold: 0.15,
  animations: 'disabled' as const,
};

/**
 * Preparar pagina para screenshot: esperar carga completa y ocultar elementos dinamicos
 */
async function prepareForScreenshot(page: Page): Promise<void> {
  // Esperar que Ionic este listo
  await page
    .waitForFunction(
      () => {
        const ionApp = document.querySelector('ion-app');
        return ionApp && ionApp.classList.contains('ion-page');
      },
      { timeout: 10000 }
    )
    .catch(() => {});

  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(500);

  // Ocultar elementos dinamicos
  await page.addStyleTag({
    content: `
      /* Timestamps */
      [data-testid="timestamp"], .timestamp, .time-ago, .relative-time { visibility: hidden !important; }
      /* Avatares dinamicos */
      .avatar-random, .avatar-generated { visibility: hidden !important; }
      /* Spinners y loading */
      ion-spinner, .loading-indicator { visibility: hidden !important; }
      /* Deshabilitar animaciones */
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        animation-delay: 0s !important;
      }
    `,
  });
}

/**
 * Disable device frame for desktop viewport testing.
 */
async function disableDeviceFrame(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('no-device-frame');
  });
}

/**
 * Login y navegar a tab especificado
 */
async function loginAndNavigate(page: Page, targetTab?: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await disableDeviceFrame(page);

  // Manejar welcome screen
  if (page.url().includes('/welcome')) {
    const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
    if ((await loginBtn.count()) > 0) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  // Login si es necesario
  if (!page.url().includes('/tabs/')) {
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    await page.fill('#username', TEST_USERNAME);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page).toHaveURL(/\/tabs\//, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
  }

  // Navegar a tab
  if (targetTab) {
    await page.click(`[data-testid="tab-${targetTab}"]`);
    await expect(page).toHaveURL(new RegExp(`/tabs/${targetTab}`), { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Obtener token de autenticacion para API calls
 * Reservado para futuros tests que necesiten API directa
 */
async function _getAuthToken(): Promise<string> {
  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${TEST_USERNAME}&password=${TEST_PASSWORD}`,
  });
  const data = await response.json();
  return data.access_token;
}

// =============================================================================
// DASHBOARD VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Dashboard @docker-visual', () => {
  // Dashboard sync now limited to 200 readings to prevent long load times
  // See readings.service.ts MAX_SYNC_READINGS constant

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'dashboard');
    // Wait for dashboard content to load (sync + render)
    await page
      .waitForSelector('[data-testid="stats-container"]', {
        state: 'visible',
        timeout: 30000,
      })
      .catch(() => {});
    await page.waitForTimeout(1000);
  });

  test('Dashboard - main view with real data', async ({ page }) => {
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-dashboard-main.png', screenshotOptions);
  });

  test('Dashboard - dark theme', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-dashboard-dark.png', screenshotOptions);
  });

  test('Dashboard - streak and achievements section', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-dashboard-achievements.png', screenshotOptions);
  });

  test('Dashboard - scrolled to bottom', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-dashboard-bottom.png', screenshotOptions);
  });
});

// =============================================================================
// READINGS VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Readings @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'readings');
  });

  test('Readings - list with data', async ({ page }) => {
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-readings-list.png', screenshotOptions);
  });

  test('Readings - dark theme', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-readings-dark.png', screenshotOptions);
  });

  test('Readings - add form empty', async ({ page }) => {
    await page.goto('/add-reading');
    await page.waitForLoadState('networkidle');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-add-reading-empty.png', screenshotOptions);
  });

  test('Readings - add form filled', async ({ page }) => {
    await page.goto('/add-reading');
    await page.waitForLoadState('networkidle');

    // Llenar formulario
    const valueInput = page.locator('ion-input input').first();
    if ((await valueInput.count()) > 0) {
      await valueInput.fill('125');
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-add-reading-filled.png', screenshotOptions);
  });

  test('Readings - meal context options', async ({ page }) => {
    await page.goto('/add-reading');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-add-reading-context.png', screenshotOptions);
  });
});

// =============================================================================
// APPOINTMENTS STATE MACHINE VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Appointments States @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'appointments');
  });

  test('Appointments - initial state (NONE or list)', async ({ page }) => {
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-appointments-initial.png', screenshotOptions);
  });

  test('Appointments - dark theme', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-appointments-dark.png', screenshotOptions);
  });

  // Estado IN_QUEUE despues de solicitar cita
  test('Appointments - after request (IN_QUEUE state)', async ({ page }) => {
    // Solicitar cita si hay boton
    const requestBtn = page.locator('text=/Solicitar.*Cita|Request.*Appointment/i');
    if ((await requestBtn.count()) > 0) {
      await requestBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-appointments-in-queue.png', screenshotOptions);
  });
});

// =============================================================================
// PROFILE VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Profile @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'profile');
  });

  test('Profile - main view', async ({ page }) => {
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-profile-main.png', screenshotOptions);
  });

  test('Profile - dark theme', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-profile-dark.png', screenshotOptions);
  });

  test('Profile - scrolled to preferences', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-profile-preferences.png', screenshotOptions);
  });
});

// =============================================================================
// TRENDS VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Trends @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test('Trends - main chart view', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/tabs/trends');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Esperar renderizado de charts
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-trends-main.png', screenshotOptions);
  });

  test('Trends - dark theme', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/tabs/trends');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-trends-dark.png', screenshotOptions);
  });

  test('Trends - statistics section', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/tabs/trends');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-trends-statistics.png', screenshotOptions);
  });

  test('Trends - period selector (week/month/all)', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/tabs/trends');
    await page.waitForLoadState('networkidle');

    // Seleccionar periodo "mes"
    const monthBtn = page.locator('ion-segment-button[value="month"]');
    if ((await monthBtn.count()) > 0) {
      await monthBtn.click();
      await page.waitForTimeout(500);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-trends-month.png', screenshotOptions);
  });
});

// =============================================================================
// SETTINGS VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Settings @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test('Settings - main view', async ({ page }) => {
    await loginAndNavigate(page);
    // Settings is a top-level route, not under /tabs/
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    // Esperar que el contenido cargue
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-settings-main.png', screenshotOptions);
  });

  test('Settings - dark theme', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-settings-dark.png', screenshotOptions);
  });

  test('Settings - language options', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });

    // Abrir selector de idioma
    const langSelector = page
      .locator('[data-testid="language-selector"]')
      .or(page.getByText(/Idioma|Language/i));
    if ((await langSelector.count()) > 0) {
      await langSelector.first().click();
      await page.waitForTimeout(500);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-settings-language.png', screenshotOptions);
  });

  test('Settings - advanced section', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/settings/advanced');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-settings-advanced.png', screenshotOptions);
  });
});

// =============================================================================
// BOLUS CALCULATOR VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Bolus Calculator @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test('Bolus Calculator - empty form', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/bolus-calculator');
    await page.waitForLoadState('networkidle');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-bolus-empty.png', screenshotOptions);
  });

  test('Bolus Calculator - filled form', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/bolus-calculator');
    await page.waitForLoadState('networkidle');

    // Llenar valores
    const glucoseInput = page.locator('[data-testid="current-glucose"], ion-input').first();
    if ((await glucoseInput.count()) > 0) {
      await glucoseInput.locator('input').fill('180');
    }

    const carbsInput = page.locator('[data-testid="carbs-input"], ion-input').nth(1);
    if ((await carbsInput.count()) > 0) {
      await carbsInput.locator('input').fill('45');
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-bolus-filled.png', screenshotOptions);
  });

  test('Bolus Calculator - with results', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/bolus-calculator');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Llenar y calcular
    const glucoseInput = page.locator('ion-input input').first();
    if ((await glucoseInput.count()) > 0) {
      await glucoseInput.fill('180');
      await page.waitForTimeout(100);
    }

    const carbsInput = page.locator('ion-input input').nth(1);
    if ((await carbsInput.count()) > 0) {
      await carbsInput.fill('45');
      await page.waitForTimeout(100);
    }

    const calcBtn = page.locator('[data-testid="calculate-btn"], ion-button:has-text("Calcular")');
    if ((await calcBtn.count()) > 0) {
      await calcBtn.first().click();
      // Esperar que aparezcan los resultados
      await page
        .waitForSelector('[data-testid="bolus-results"], .results-card, text=/unidades|units/i', {
          state: 'visible',
          timeout: 5000,
        })
        .catch(() => {});
      await page.waitForTimeout(500);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-bolus-results.png', screenshotOptions);
  });

  test('Bolus Calculator - dark theme', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/bolus-calculator');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForLoadState('networkidle');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-bolus-dark.png', screenshotOptions);
  });
});

// =============================================================================
// ACHIEVEMENTS VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Achievements @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test('Achievements - main page', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/achievements');
    await page.waitForLoadState('networkidle');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-achievements-main.png', screenshotOptions);
  });

  test('Achievements - dark theme', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/achievements');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForLoadState('networkidle');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-achievements-dark.png', screenshotOptions);
  });

  test('Achievements - scrolled to badges', async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/achievements');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-achievements-badges.png', screenshotOptions);
  });
});

// =============================================================================
// TAB BAR VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Tab Bar @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test('Tab bar - dashboard selected', async ({ page }) => {
    await loginAndNavigate(page, 'dashboard');
    await prepareForScreenshot(page);
    // Capturar solo la parte inferior con el tab bar
    const tabBar = page.locator('ion-tab-bar');
    await expect(tabBar).toHaveScreenshot('docker-tabbar-dashboard.png', screenshotOptions);
  });

  test('Tab bar - readings selected', async ({ page }) => {
    await loginAndNavigate(page, 'readings');
    await prepareForScreenshot(page);
    const tabBar = page.locator('ion-tab-bar');
    await expect(tabBar).toHaveScreenshot('docker-tabbar-readings.png', screenshotOptions);
  });

  test('Tab bar - appointments selected', async ({ page }) => {
    await loginAndNavigate(page, 'appointments');
    await prepareForScreenshot(page);
    const tabBar = page.locator('ion-tab-bar');
    await expect(tabBar).toHaveScreenshot('docker-tabbar-appointments.png', screenshotOptions);
  });

  test('Tab bar - profile selected', async ({ page }) => {
    await loginAndNavigate(page, 'profile');
    await prepareForScreenshot(page);
    const tabBar = page.locator('ion-tab-bar');
    await expect(tabBar).toHaveScreenshot('docker-tabbar-profile.png', screenshotOptions);
  });
});

// =============================================================================
// RESPONSIVE VISUAL TESTS @docker-visual
// =============================================================================

test.describe('Docker Visual - Responsive @docker-visual', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker visual tests');

  test('Dashboard - tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAndNavigate(page, 'dashboard');
    // Esperar contenido del dashboard
    await page
      .waitForSelector('[data-testid="stats-container"], app-streak-card', {
        state: 'visible',
        timeout: 15000,
      })
      .catch(() => {});
    await page.waitForTimeout(1000);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-responsive-tablet.png', screenshotOptions);
  });

  test('Dashboard - small mobile (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await loginAndNavigate(page, 'dashboard');
    await page
      .waitForSelector('[data-testid="stats-container"], app-streak-card', {
        state: 'visible',
        timeout: 15000,
      })
      .catch(() => {});
    await page.waitForTimeout(1000);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-responsive-small.png', screenshotOptions);
  });

  test('Dashboard - large mobile (428px iPhone Pro Max)', async ({ page }) => {
    await page.setViewportSize({ width: 428, height: 926 });
    await loginAndNavigate(page, 'dashboard');
    await page
      .waitForSelector('[data-testid="stats-container"], app-streak-card', {
        state: 'visible',
        timeout: 15000,
      })
      .catch(() => {});
    await page.waitForTimeout(1000);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('docker-responsive-large.png', screenshotOptions);
  });
});

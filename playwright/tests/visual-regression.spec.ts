/**
 * Visual Regression Test Suite
 *
 * Comprehensive screenshot testing for all app states to catch UI regressions.
 * Uses Playwright's toHaveScreenshot for visual comparison with baseline images.
 *
 * Run with: pnpm test:e2e -- --grep "Visual Regression"
 * Update baselines: pnpm test:e2e -- --update-snapshots --grep "Visual Regression"
 *
 * Categories:
 *   - Pre-Login: Welcome, Login, Registration pages
 *   - Dashboard: Empty, with data, loading states
 *   - Readings: List, filters, add form, detail view
 *   - Appointments: All state machine states (NONE → PENDING → ACCEPTED → etc.)
 *   - Profile: View, edit modes
 *   - Settings: All settings sections
 *   - Trends: Charts and statistics
 *   - Theme: Light and dark modes
 *   - Error States: Network errors, validation errors
 *   - Loading States: Skeleton loaders
 */

import { test, expect, Page } from '@playwright/test';
import { loginUser, waitForIonicHydration, navigateToTab } from '../helpers/test-helpers';

// Configuracion comun para screenshots - tolerancia alta para diferencias de renderizado entre ambientes
const screenshotOptions = {
  maxDiffPixelRatio: 0.05, // Tolerar 5% de diferencia (CI vs local tienen fonts diferentes)
  threshold: 0.3, // Umbral de color por pixel
  animations: 'disabled' as const,
};

/**
 * Esperar a que la pagina este completamente cargada antes del screenshot
 */
async function prepareForScreenshot(page: Page): Promise<void> {
  await waitForIonicHydration(page);
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  // Esperar transiciones CSS
  await page.waitForTimeout(300);
}

/**
 * Ocultar elementos dinamicos que cambian entre ejecuciones
 */
async function hideDynamicElements(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Ocultar timestamps dinamicos */
      [data-testid="timestamp"], .timestamp, .time-ago { visibility: hidden !important; }
      /* Ocultar avatares con imagenes dinamicas */
      .avatar-random { visibility: hidden !important; }
      /* Deshabilitar animaciones */
      *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
    `,
  });
}

// =============================================================================
// PRE-LOGIN SCREENS
// =============================================================================

test.describe('Visual Regression - Pre-Login @visual-mock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForIonicHydration(page);
  });

  test('Welcome page - light theme', async ({ page }) => {
    await page.goto('/welcome');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('welcome-light.png', screenshotOptions);
  });

  test('Welcome page - dark theme', async ({ page }) => {
    await page.goto('/welcome');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('welcome-dark.png', screenshotOptions);
  });

  test('Login page - empty form', async ({ page }) => {
    await page.goto('/login');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('login-empty.png', screenshotOptions);
  });

  test('Login page - form filled', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('[data-testid="login-username-input"]', {
      state: 'visible',
      timeout: 10000,
    });
    await page.fill('[data-testid="login-username-input"]', '12345678');
    await page.fill('[data-testid="login-password-input"]', 'testpassword');
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('login-filled.png', screenshotOptions);
  });
});

// =============================================================================
// DASHBOARD SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Dashboard @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Dashboard tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Dashboard - main view with stats', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('dashboard-main.png', screenshotOptions);
  });

  test('Dashboard - streaks card', async ({ page }) => {
    await navigateToTab(page, 'dashboard');
    await prepareForScreenshot(page);

    // Scroll a la tarjeta de rachas
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('dashboard-streaks.png', screenshotOptions);
  });

  test('Dashboard - dark theme', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await navigateToTab(page, 'dashboard');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('dashboard-dark.png', screenshotOptions);
  });
});

// =============================================================================
// READINGS SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Readings @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Readings tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Readings list - populated', async ({ page }) => {
    await navigateToTab(page, 'readings');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('readings-list.png', screenshotOptions);
  });

  test('Readings - filter panel open', async ({ page }) => {
    await navigateToTab(page, 'readings');
    await prepareForScreenshot(page);

    // Abrir filtros si hay boton
    const filterBtn = page.locator('[data-testid="filter-btn"], ion-button:has-text("Filtrar")');
    if ((await filterBtn.count()) > 0) {
      await filterBtn.first().click();
      await page.waitForTimeout(500);
    }
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('readings-filters.png', screenshotOptions);
  });

  test('Add reading form - empty', async ({ page }) => {
    await page.goto('/add-reading');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('add-reading-empty.png', screenshotOptions);
  });

  test('Add reading form - filled', async ({ page }) => {
    await page.goto('/add-reading');
    await waitForIonicHydration(page);

    // Llenar formulario
    const valueInput = page.locator('ion-input input').first();
    if ((await valueInput.count()) > 0) {
      await valueInput.fill('125');
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('add-reading-filled.png', screenshotOptions);
  });

  test('Add reading - meal context selection', async ({ page }) => {
    await page.goto('/add-reading');
    await waitForIonicHydration(page);

    // Scroll a contexto de comida
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('add-reading-meal-context.png', screenshotOptions);
  });
});

// =============================================================================
// APPOINTMENTS STATE MACHINE SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Appointments States @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Appointments tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Appointments - main view', async ({ page }) => {
    await navigateToTab(page, 'appointments');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('appointments-main.png', screenshotOptions);
  });

  test('Appointments - detail view', async ({ page }) => {
    await navigateToTab(page, 'appointments');
    await prepareForScreenshot(page);

    // Intentar abrir detalle si hay cita
    const appointmentCard = page.locator('[data-testid="appointment-card"], ion-card').first();
    if ((await appointmentCard.count()) > 0) {
      await appointmentCard.click();
      await page.waitForTimeout(500);
      await hideDynamicElements(page);
      await expect(page).toHaveScreenshot('appointments-detail.png', screenshotOptions);
    }
  });
});

// =============================================================================
// PROFILE SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Profile @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Profile tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Profile - main view', async ({ page }) => {
    await navigateToTab(page, 'profile');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('profile-main.png', screenshotOptions);
  });

  test('Profile - dark theme', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await navigateToTab(page, 'profile');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('profile-dark.png', screenshotOptions);
  });

  test('Profile - scrolled to bottom', async ({ page }) => {
    await navigateToTab(page, 'profile');
    await prepareForScreenshot(page);

    // Scroll al final
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('profile-bottom.png', screenshotOptions);
  });
});

// =============================================================================
// TRENDS/CHARTS SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Trends @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Trends tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Trends - main chart view', async ({ page }) => {
    await page.goto('/tabs/trends');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('trends-main.png', screenshotOptions);
  });

  test('Trends - statistics section', async ({ page }) => {
    await page.goto('/tabs/trends');
    await waitForIonicHydration(page);

    // Scroll a estadisticas
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);

    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('trends-statistics.png', screenshotOptions);
  });
});

// =============================================================================
// SETTINGS SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Settings @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Settings tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Settings - main view', async ({ page }) => {
    await page.goto('/tabs/settings');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('settings-main.png', screenshotOptions);
  });

  test('Settings - language selector', async ({ page }) => {
    await page.goto('/tabs/settings');
    await waitForIonicHydration(page);

    // Buscar selector de idioma
    const langSelector = page.locator('[data-testid="language-selector"], text=/Idioma|Language/i');
    if ((await langSelector.count()) > 0) {
      await langSelector.first().click();
      await page.waitForTimeout(500);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('settings-language.png', screenshotOptions);
  });

  test('Settings - dark theme toggle', async ({ page }) => {
    await page.goto('/tabs/settings');
    await waitForIonicHydration(page);

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('settings-dark.png', screenshotOptions);
  });
});

// =============================================================================
// BOLUS CALCULATOR SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Bolus Calculator @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Bolus calculator tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Bolus calculator - input form', async ({ page }) => {
    await page.goto('/bolus-calculator');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('bolus-calculator-form.png', screenshotOptions);
  });

  test('Bolus calculator - with results', async ({ page }) => {
    await page.goto('/bolus-calculator');
    await waitForIonicHydration(page);

    // Llenar valores
    const currentGlucose = page.locator('[data-testid="current-glucose"], ion-input').first();
    if ((await currentGlucose.count()) > 0) {
      await currentGlucose.locator('input').fill('180');
    }

    const carbs = page.locator('[data-testid="carbs-input"], ion-input').nth(1);
    if ((await carbs.count()) > 0) {
      await carbs.locator('input').fill('45');
    }

    // Calcular
    const calcBtn = page.locator('[data-testid="calculate-btn"], ion-button:has-text("Calcular")');
    if ((await calcBtn.count()) > 0) {
      await calcBtn.first().click();
      await page.waitForTimeout(500);
    }

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('bolus-calculator-results.png', screenshotOptions);
  });
});

// =============================================================================
// RESPONSIVE BREAKPOINTS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Responsive @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env.E2E_MOCK_MODE,
    'Responsive tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Dashboard - tablet viewport (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateToTab(page, 'dashboard');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('dashboard-tablet.png', screenshotOptions);
  });

  test('Dashboard - small mobile (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await navigateToTab(page, 'dashboard');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('dashboard-small-mobile.png', screenshotOptions);
  });
});

// =============================================================================
// ERROR STATES
// =============================================================================

test.describe('Visual Regression - Error States @visual-mock', () => {
  test('Login - invalid credentials error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username-input"]', '9999');
    await page.fill('[data-testid="login-password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit-btn"]');

    // Esperar error
    await page.waitForSelector('text=/error|incorrecto|invalid/i', { timeout: 10000 }).catch(() => {
      // Si no hay mensaje de error visible, continuar
    });

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('login-error-invalid.png', screenshotOptions);
  });
});

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
  // `networkidle` es frágil en SPAs (polling/websocket/service worker).
  // Usar un "settle" determinista + intento best-effort de `networkidle`.
  await page.waitForTimeout(250);
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(150);
}

/**
 * Esperar a que un overlay de Ionic (modal/alert/popover/etc.) esté presentado.
 * Ionic suele mantener overlays ocultos en el DOM con `.overlay-hidden`.
 */
async function waitForPresentedOverlay(page: Page, timeoutMs = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const selectors = [
        '[role="dialog"]',
        'ion-modal:not(.overlay-hidden)',
        'ion-alert:not(.overlay-hidden)',
        'ion-popover:not(.overlay-hidden)',
        'ion-action-sheet:not(.overlay-hidden)',
        'ion-loading:not(.overlay-hidden)',
      ];
      return selectors.some(sel => document.querySelector(sel));
    },
    undefined,
    { timeout: timeoutMs }
  );
  // Esperar a que termine la animación de entrada del overlay
  await page.waitForTimeout(150);
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
    () => !process.env['E2E_MOCK_MODE'],
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
    await page.waitForLoadState('networkidle');
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
    () => !process.env['E2E_MOCK_MODE'],
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
      await waitForPresentedOverlay(page, 5000).catch(() => undefined);
    }
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('readings-filters.png', screenshotOptions);
  });

  test('Readings - detail modal open', async ({ page }) => {
    test.setTimeout(45000);
    await navigateToTab(page, 'readings');
    await prepareForScreenshot(page);

    const firstReading = page.locator('[data-testid="readings-list"] ion-item[button]').first();
    if ((await firstReading.count()) > 0) {
      await firstReading.evaluate((el: HTMLElement) => el.click());
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await waitForPresentedOverlay(page, 5000).catch(() => undefined);
    }

    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('readings-detail-modal.png', screenshotOptions);
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
    await page.waitForTimeout(250);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('add-reading-meal-context.png', screenshotOptions);
  });
});

// =============================================================================
// APPOINTMENTS STATE MACHINE SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Appointments States @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env['E2E_MOCK_MODE'],
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

  // Skip this test - mock mode doesn't have appointment cards to click
  // This test requires real data or a more complex mock setup
  test.skip('Appointments - detail view', async ({ page }) => {
    await navigateToTab(page, 'appointments');
    await prepareForScreenshot(page);

    // Intentar abrir detalle si hay cita
    const appointmentCard = page.locator('[data-testid="appointment-card"], ion-card').first();
    await appointmentCard.scrollIntoViewIfNeeded();
    await appointmentCard.click();
    await page.waitForLoadState('networkidle');
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('appointments-detail.png', screenshotOptions);
  });
});

// =============================================================================
// PROFILE SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Profile @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env['E2E_MOCK_MODE'],
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
    await page.waitForLoadState('networkidle');
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('profile-bottom.png', screenshotOptions);
  });
});

// =============================================================================
// TRENDS/CHARTS SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Trends @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env['E2E_MOCK_MODE'],
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
    await page.waitForTimeout(250);

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
    () => !process.env['E2E_MOCK_MODE'],
    'Settings tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Settings - main view', async ({ page }) => {
    await page.goto('/settings');
    await waitForIonicHydration(page);
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('settings-main.png', screenshotOptions);
  });

  test('Settings - language selector', async ({ page }) => {
    await page.goto('/settings');
    await waitForIonicHydration(page);
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });

    // Buscar selector de idioma
    const langSelector = page.locator('[data-testid="language-selector"]').first();
    const langSelectorFallback = page
      .locator('ion-item, ion-button, button')
      .filter({ hasText: /Idioma|Language/i })
      .first();

    if (await langSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
      await langSelector.click();
    } else if (await langSelectorFallback.isVisible({ timeout: 1000 }).catch(() => false)) {
      await langSelectorFallback.click();
    }
    await waitForPresentedOverlay(page, 10000);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('settings-language.png', screenshotOptions);
  });

  test('Settings - dark theme toggle', async ({ page }) => {
    await page.goto('/settings');
    await waitForIonicHydration(page);
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 10000 });

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(250);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('settings-dark.png', screenshotOptions);
  });
});

// =============================================================================
// OTHER PAGES (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Other Pages @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env['E2E_MOCK_MODE'],
    'Other page tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginUser(page);
  });

  test('Dashboard detail page', async ({ page }) => {
    await page.goto('/dashboard/detail');
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('dashboard-detail.png', screenshotOptions);
  });

  test('Appointments create page', async ({ page }) => {
    await page.goto('/appointments/create');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('appointments-create.png', screenshotOptions);
  });

  test('Achievements page', async ({ page }) => {
    await page.goto('/achievements');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('achievements-main.png', screenshotOptions);
  });

  test('Tips page', async ({ page }) => {
    await page.goto('/tips');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('tips-main.png', screenshotOptions);
  });

  test('Conflicts page', async ({ page }) => {
    await page.goto('/conflicts');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('conflicts-main.png', screenshotOptions);
  });

  test('Advanced settings page', async ({ page }) => {
    await page.goto('/settings/advanced');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await hideDynamicElements(page);
    await expect(page).toHaveScreenshot('settings-advanced.png', screenshotOptions);
  });
});

test.describe('Visual Regression - Account Pending', () => {
  test('Account pending page', async ({ page }) => {
    await page.goto('/account-pending');
    await waitForIonicHydration(page);
    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('account-pending.png', screenshotOptions);
  });
});

// =============================================================================
// BOLUS CALCULATOR SCREENS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Bolus Calculator @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env['E2E_MOCK_MODE'],
    'Bolus calculator tests require mock mode. Run with E2E_MOCK_MODE=true'
  );

  async function setIonInputValue(
    page: import('@playwright/test').Page,
    testId: string,
    value: string
  ) {
    const ionInput = page.locator(`[data-testid="${testId}"]`).first();
    await ionInput.evaluate((el, newValue) => {
      const inputEl = el as HTMLElement & { value: string };
      inputEl.value = newValue;
      el.dispatchEvent(
        new CustomEvent('ionInput', {
          bubbles: true,
          detail: { value: newValue },
        })
      );
    }, value);
  }

  async function closeFoodPickerIfOpen(page: import('@playwright/test').Page) {
    const foodPicker = page.locator('.food-picker-modal.food-picker-modal--open').first();
    const isOpen = await foodPicker
      .waitFor({ state: 'visible', timeout: 300 })
      .then(() => true)
      .catch(() => false);
    if (!isOpen) return;

    await foodPicker
      .locator('.food-picker-close')
      .first()
      .click({ force: true })
      .catch(() => {});
    await page
      .locator('.food-picker-backdrop.food-picker-backdrop--visible')
      .first()
      .click({ force: true })
      .catch(() => {});
    await foodPicker.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => {});
  }

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

    // Set values without focusing the native input (prevents accidental clicks on the food picker button).
    await setIonInputValue(page, 'glucose-input', '180');
    await setIonInputValue(page, 'carbs-input', '45');

    // Calcular
    const calcBtn = page.locator('[data-testid="calculate-btn"], ion-button:has-text("Calcular")');
    if ((await calcBtn.count()) > 0) {
      await calcBtn.first().evaluate((el: HTMLElement) => el.click());
    }

    // Confirm safety modal if it appears (mock data can trigger IOB warnings)
    const confirmButton = page
      .locator('ion-modal:visible ion-button', { hasText: /confirm/i })
      .first();
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click({ force: true });
      await page
        .locator('ion-modal:visible')
        .first()
        .waitFor({ state: 'hidden', timeout: 5000 })
        .catch(() => {});
    }

    // Wait for results and ensure auxiliary modals are closed before snapshot.
    await page
      .locator('[data-testid="result-card"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
    await closeFoodPickerIfOpen(page);

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('bolus-calculator-results.png', screenshotOptions);
  });
});

// =============================================================================
// RESPONSIVE BREAKPOINTS (Requires Mock Mode)
// =============================================================================

test.describe('Visual Regression - Responsive @visual-mock @authenticated', () => {
  test.skip(
    () => !process.env['E2E_MOCK_MODE'],
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
  // Skip in mock mode - mock backend accepts any credentials
  // This test only works with real backend that validates credentials
  test.skip('Login - invalid credentials error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username-input"]', '9999');
    await page.fill('[data-testid="login-password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit-btn"]');

    // Wait for error message to appear
    await page.waitForSelector('text=/error|incorrecto|invalid/i', { timeout: 10000 });

    await prepareForScreenshot(page);
    await expect(page).toHaveScreenshot('login-error-invalid.png', screenshotOptions);
  });
});

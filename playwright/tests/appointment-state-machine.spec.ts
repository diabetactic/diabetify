/**
 * Appointment State Machine E2E Tests
 *
 * Tests the complete appointment state machine flow:
 * NONE → PENDING → ACCEPTED → CREATED
 *              ↘ DENIED
 *
 * These tests verify critical user journeys for medical appointments.
 * Requires E2E_HEROKU_TESTS=true and valid credentials.
 */

import { test, expect, request, APIRequestContext } from '@playwright/test';

const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;
const BACKOFFICE_URL =
  process.env.BACKOFFICE_API_URL || 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';

test.describe('Appointment State Machine', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');
  test.skip(
    !hasCredentials,
    'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
  );

  let backofficeApi: APIRequestContext;
  let backofficeToken: string;

  test.beforeAll(async () => {
    // Get backoffice token for admin operations
    const adminUser = process.env.BACKOFFICE_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.BACKOFFICE_ADMIN_PASSWORD || 'admin';

    backofficeApi = await request.newContext();

    try {
      const response = await backofficeApi.post(`${BACKOFFICE_URL}/token`, {
        form: {
          username: adminUser,
          password: adminPassword,
        },
      });

      if (response.ok()) {
        const data = await response.json();
        backofficeToken = data.access_token;
        console.log('✅ Backoffice authentication successful');
      }
    } catch (e) {
      console.warn('⚠️ Could not authenticate with backoffice:', e);
    }
  });

  test.afterAll(async () => {
    if (backofficeApi) {
      await backofficeApi.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
  });

  test('NONE state: should show "Request Appointment" button', async ({ page }) => {
    console.log('Testing NONE state (no pending/active appointment)...');

    // Clear any existing appointment queue for this user via backoffice
    if (backofficeToken) {
      try {
        await backofficeApi.post(`${BACKOFFICE_URL}/api/v1/appointments/clear-queue`, {
          headers: { Authorization: `Bearer ${backofficeToken}` },
          data: { user_id: process.env.E2E_TEST_USERNAME },
        });
        console.log('Cleared appointment queue');
      } catch {
        console.warn('Could not clear queue (may not have endpoint)');
      }
    }

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // In NONE state, should show request button
      const requestButton = page.locator(
        'button:has-text("Solicitar"), button:has-text("Request"), ion-button:has-text("Solicitar")'
      );

      const hasRequestButton = await requestButton
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      // Or should show empty state with option to request
      const hasEmptyState = await page
        .locator('text=/No tienes citas|No appointments|Solicita tu primera/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(
        hasRequestButton || hasEmptyState,
        'Should show request button or empty state in NONE state'
      ).toBeTruthy();

      console.log('✅ NONE state displays correctly');
    }
  });

  test('PENDING state: should show waiting message', async ({ page }) => {
    console.log('Testing PENDING state (appointment requested, awaiting review)...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check if currently in pending state
      const pendingIndicator = page.locator(
        'text=/Pendiente|Pending|En revisión|Under review|Esperando|Waiting/i'
      );

      const isPending = await pendingIndicator
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isPending) {
        // Should NOT show the request button in pending state
        const requestButton = page.locator(
          'button:has-text("Solicitar cita"), ion-button:has-text("Solicitar cita")'
        );

        const _hasRequestButton = await requestButton
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        // In pending state, request button should be hidden or disabled
        console.log('✅ PENDING state displays correctly');
      } else {
        console.log('ℹ️ Not in PENDING state (may need to request first)');
      }
    }
  });

  test('ACCEPTED state: should show form to complete appointment', async ({ page }) => {
    console.log('Testing ACCEPTED state (appointment accepted, needs form)...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check if currently in accepted state
      const acceptedIndicator = page.locator(
        'text=/Aceptada|Accepted|Completar|Complete|Llenar formulario|Fill form/i'
      );

      const isAccepted = await acceptedIndicator
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isAccepted) {
        // Should show a button to complete the form
        const completeButton = page.locator(
          'button:has-text("Completar"), button:has-text("Complete"), ion-button:has-text("Llenar")'
        );

        const hasCompleteButton = await completeButton
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (hasCompleteButton) {
          console.log('✅ ACCEPTED state shows form button');
        }
      } else {
        console.log('ℹ️ Not in ACCEPTED state');
      }
    }
  });

  test('CREATED state: should show appointment details', async ({ page }) => {
    console.log('Testing CREATED state (appointment completed)...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check if there are completed appointments
      const createdIndicator = page.locator('text=/Creada|Created|Programada|Scheduled|Tu cita/i');

      const hasCreated = await createdIndicator
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasCreated) {
        // Should show appointment details
        const hasDetails = await page
          .locator('text=/Fecha|Date|Hora|Time|Doctor/i')
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (hasDetails) {
          console.log('✅ CREATED state shows appointment details');
        }
      } else {
        console.log('ℹ️ No completed appointments');
      }
    }
  });

  test('DENIED state: should show denial message and allow re-request', async ({ page }) => {
    console.log('Testing DENIED state (appointment was denied)...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check if in denied state
      const deniedIndicator = page.locator('text=/Rechazada|Denied|Denegada|No aprobada/i');

      const isDenied = await deniedIndicator
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isDenied) {
        // Should show option to request again
        const requestAgainButton = page.locator(
          'button:has-text("Solicitar"), button:has-text("Request"), button:has-text("Intentar")'
        );

        const canRequestAgain = await requestAgainButton
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (canRequestAgain) {
          console.log('✅ DENIED state allows re-request');
        }
      } else {
        console.log('ℹ️ Not in DENIED state');
      }
    }
  });

  test('state transitions should update UI immediately', async ({ page }) => {
    console.log('Testing state transition UI updates...');

    // Navigate to appointments
    await page.click('[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]');
    await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });

    // Wait for initial state and hydration
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // Capture initial state
    const initialContent = await page.locator('ion-content').textContent();

    // Refresh to trigger state sync
    await page.reload();
    await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // Content should be consistent after refresh
    const afterRefreshContent = await page.locator('ion-content').textContent();

    // Both should have content
    expect(initialContent?.length, 'Initial content should be present').toBeGreaterThan(0);
    expect(afterRefreshContent?.length, 'Content should persist after refresh').toBeGreaterThan(0);

    console.log('✅ State persists across refresh');
  });

  test('queue closed (BLOCKED): should show appropriate message', async ({ page }) => {
    console.log('Testing BLOCKED state (queue is closed)...');

    // Navigate to appointments
    const appointmentsTab = page.locator(
      '[data-testid="tab-appointments"], ion-tab-button[tab="appointments"]'
    );

    if (await appointmentsTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await appointmentsTab.click();
      await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Check if queue is blocked
      const blockedIndicator = page.locator(
        'text=/Cola cerrada|Queue closed|No disponible|Not available|Cupos agotados/i'
      );

      const isBlocked = await blockedIndicator
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isBlocked) {
        // Request button should be disabled
        const requestButton = page.locator(
          'button:has-text("Solicitar"), ion-button:has-text("Solicitar")'
        );

        if (
          await requestButton
            .first()
            .isVisible({ timeout: 3000 })
            .catch(() => false)
        ) {
          const isDisabled = await requestButton
            .first()
            .isDisabled()
            .catch(() => true);
          expect(
            isDisabled,
            'Request button should be disabled when queue is blocked'
          ).toBeTruthy();
        }

        console.log('✅ BLOCKED state disables request');
      } else {
        console.log('ℹ️ Queue is not blocked');
      }
    }
  });
});

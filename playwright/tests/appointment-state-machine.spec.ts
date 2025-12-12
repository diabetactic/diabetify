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

import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  resetQueue,
  acceptNextAppointment,
  denyNextAppointment,
} from '../helpers/backoffice-api';

const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;
const SCREENSHOT_DIR = 'playwright/artifacts/screenshots';

test.describe('Appointment State Machine', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');
  test.skip(
    !hasCredentials,
    'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
  );

  let backofficeToken: string;

  test.beforeAll(async () => {
    try {
      backofficeToken = await getAdminToken();
      console.log('✅ Backoffice authentication successful');
    } catch (e) {
      console.warn('⚠️ Could not authenticate with backoffice:', e);
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

  test('full flow: NONE → PENDING → ACCEPTED → CREATED', async ({ page }) => {
    // Ensure the user starts in a clean state
    await resetQueue(backofficeToken);
    console.log('Queue reset for user');

    // 1. ========= NONE: Verify initial state and request appointment =========
    console.log('STEP 1: Verifying NONE state and requesting appointment...');
    await page.goto('/tabs/appointments');
    await page.waitForLoadState('networkidle');

    const requestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar Cita")'
    );
    await expect(requestButton.first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/state-none.png` });

    page.on('dialog', dialog => dialog.accept());
    await requestButton.first().click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Appointment requested.');

    // 2. ========= PENDING: Verify pending state =========
    console.log('STEP 2: Verifying PENDING state...');
    const pendingBadge = page.locator(
      '.badge-warning:has-text("Pendiente"), .badge-warning:has-text("Pending")'
    );
    await expect(pendingBadge).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/state-pending.png` });
    console.log('✅ UI updated to PENDING.');

    // 3. ========= ACCEPTED: Admin accepts, verify UI update =========
    console.log('STEP 3: Admin accepting appointment and verifying ACCEPTED state...');
    const accepted = await acceptNextAppointment(backofficeToken);
    expect(accepted, 'Admin failed to accept appointment via API').toBe(true);
    console.log('✅ Appointment accepted via API.');

    // Refresh UI to reflect the change
    await page.reload();
    await page.waitForLoadState('networkidle');

    const createAppointmentButton = page.locator(
      'ion-button:has-text("AGREGAR NUEVA CITA"), ion-button:has-text("Crear Cita")'
    );
    await expect(createAppointmentButton.first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/state-accepted.png` });
    console.log('✅ UI updated to ACCEPTED.');

    // 4. ========= CREATED: Fill form and create appointment =========
    console.log('STEP 4: Filling form and creating appointment...');
    await createAppointmentButton.first().click();
    await page.waitForURL(/\/create/, { timeout: 10000 });

    // Fill the form (simple example)
    await page.locator('ion-input[formcontrolname="glucose_objective"]').fill('120');
    await page.locator('ion-input[formcontrolname="carbohydrate_ratio"]').fill('10');

    const saveButton = page.locator('ion-button:has-text("Guardar")');
    await saveButton.click();
    await page.waitForURL(/\/appointments/, { timeout: 10000 });
    console.log('✅ Appointment form submitted.');

    // Verify the final state
    const createdAppointment = page.locator('ion-card.appointment-card:has-text("ACTUAL")');
    await expect(createdAppointment).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/state-created.png` });
    console.log('✅ UI updated to CREATED. Flow complete!');
  });

  test('denied flow: NONE → PENDING → DENIED', async ({ page }) => {
    // Ensure the user starts in a clean state
    await resetQueue(backofficeToken);

    // 1. Request appointment
    await page.goto('/tabs/appointments');
    await page.waitForLoadState('networkidle');
    const requestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar Cita")'
    );
    await expect(requestButton.first()).toBeVisible();
    page.on('dialog', dialog => dialog.accept());
    await requestButton.first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.badge-warning')).toBeVisible(); // Now in PENDING

    // 2. Admin denies appointment
    const denied = await denyNextAppointment(backofficeToken);
    expect(denied, 'Admin failed to deny appointment via API').toBe(true);

    // 3. Verify UI updates to DENIED state
    await page.reload();
    await page.waitForLoadState('networkidle');
    const deniedBadge = page.locator(
      '.badge-error:has-text("Rechazada"), .badge-error:has-text("Denied")'
    );
    await expect(deniedBadge).toBeVisible({ timeout: 10000 });

    // After being denied, the user should be able to request a new appointment
    await expect(requestButton.first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/state-denied.png` });
    console.log('✅ Denied flow verified.');
  });
});

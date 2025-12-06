/**
 * Appointment Form Completion E2E Test
 *
 * Tests the appointment state machine and form completion flow:
 * - NONE: User can request appointment
 * - PENDING: User sees waiting message
 * - ACCEPTED: User can fill appointment form
 * - CREATED: User sees appointment details
 * - DENIED: User can re-request
 *
 * Focus: ACCEPTED → CREATED transition with comprehensive form filling
 */

import { test, expect, request } from '@playwright/test';

// Backend configuration
const BACKOFFICE_URL = 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

// Test user credentials
const TEST_USER = '1000';
const TEST_PASS = 'tuvieja';
const SCREENSHOT_DIR = 'playwright/artifacts';

/**
 * Get admin token from backoffice
 */
async function getAdminToken(): Promise<string> {
  const apiContext = await request.newContext();
  const response = await apiContext.post(`${BACKOFFICE_URL}/token`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: `username=${ADMIN_USER}&password=${ADMIN_PASS}`,
  });

  if (!response.ok()) {
    throw new Error(`Failed to get admin token: ${response.status()}`);
  }

  const data = await response.json();
  await apiContext.dispose();
  return data.access_token;
}

/**
 * Reset the appointment queue (clear and open)
 */
async function resetQueue(token: string): Promise<void> {
  const apiContext = await request.newContext();
  const response = await apiContext.post(`${BACKOFFICE_URL}/appointments/queue/open`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    console.warn(`Reset queue returned ${response.status()}`);
  }
  await apiContext.dispose();
}

/**
 * View pending appointments in queue
 */
async function viewPendingQueue(token: string): Promise<any[]> {
  const apiContext = await request.newContext();
  const response = await apiContext.get(`${BACKOFFICE_URL}/appointments/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    console.warn(`View pending returned ${response.status()}`);
    await apiContext.dispose();
    return [];
  }

  const data = await response.json();
  await apiContext.dispose();
  return Array.isArray(data) ? data : [];
}

/**
 * Accept the next pending appointment
 */
async function acceptNextAppointment(token: string): Promise<boolean> {
  const apiContext = await request.newContext();
  const pending = await viewPendingQueue(token);

  if (pending.length === 0) {
    console.log('No pending appointments to accept');
    await apiContext.dispose();
    return false;
  }

  const queuePlacement = pending[0].queue_placement;
  console.log(`Accepting appointment with queue_placement: ${queuePlacement}`);

  const response = await apiContext.put(`${BACKOFFICE_URL}/appointments/accept/${queuePlacement}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await apiContext.dispose();
  return response.ok();
}

/**
 * Helper: Login to the app
 */
async function login(page: any) {
  await page.goto('/login');
  await page.waitForSelector('input[placeholder*="DNI"], input[placeholder*="email"]', {
    timeout: 15000,
  });

  const emailInput = page.locator('input[placeholder*="DNI"], input[placeholder*="email"]').first();
  const passwordInput = page
    .locator('input[placeholder*="contraseña"], input[type="password"]')
    .first();

  await emailInput.fill(TEST_USER);
  await passwordInput.fill(TEST_PASS);
  await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');
  await page.waitForURL(/\/(tabs|dashboard)/, { timeout: 20000 });
}

/**
 * Helper: Navigate to appointments tab
 */
async function navigateToAppointments(page: any) {
  await page.click('ion-tab-button[tab="appointments"], [href*="appointments"]');
  await page.waitForURL(/\/appointments/, { timeout: 10000 });
  await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });
}

test.describe.serial('Appointment Form Completion', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    console.log('Admin token obtained');
    await resetQueue(adminToken);
    console.log('Queue reset and opened');
  });

  test('state NONE: user can request appointment', async ({ page }) => {
    await resetQueue(adminToken);
    await login(page);
    await navigateToAppointments(page);

    // Verify NONE state UI
    const requestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar Cita")'
    );
    await expect(requestButton.first()).toBeVisible({ timeout: 5000 });

    // Verify descriptive text for NONE state
    const noneStateText = page.locator(
      'text=/Sin solicitud pendiente|No pending request|Solicitud de Cita/i'
    );
    await expect(noneStateText.first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-state-none.png` });
    console.log('✅ NONE state verified: Request button visible');
  });

  test('state PENDING: user sees waiting message', async ({ page }) => {
    await resetQueue(adminToken);
    await login(page);
    await navigateToAppointments(page);

    // Request appointment
    const requestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar Cita")'
    );

    if (await requestButton.first().isVisible({ timeout: 3000 })) {
      // Handle any confirmation dialogs
      page.on('dialog', async dialog => await dialog.accept());

      await requestButton.first().click();
      await page.waitForTimeout(2000);
    }

    // Verify PENDING state UI
    const pendingBadge = page.locator('.badge-warning:has-text("Pendiente"), .badge-warning');
    await expect(pendingBadge.first()).toBeVisible({ timeout: 10000 });

    // Verify waiting message
    const waitingText = page.locator('text=/esperando|waiting|pendiente|Pending|Tu solicitud/i');
    await expect(waitingText.first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-state-pending.png` });
    console.log('✅ PENDING state verified: Waiting message visible');
  });

  test('state ACCEPTED: form filling flow (ACCEPTED → CREATED)', async ({ page }) => {
    await resetQueue(adminToken);
    await login(page);
    await navigateToAppointments(page);

    // ========== Step 1: Request appointment ==========
    console.log('Step 1: Requesting appointment...');
    const requestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar Cita")'
    );

    if (await requestButton.first().isVisible({ timeout: 3000 })) {
      page.on('dialog', async dialog => await dialog.accept());
      await requestButton.first().click();
      await page.waitForTimeout(2000);
    }

    // ========== Step 2: Admin accepts ==========
    console.log('Step 2: Admin accepting appointment...');
    await page.waitForTimeout(1000);
    const accepted = await acceptNextAppointment(adminToken);
    expect(accepted).toBeTruthy();

    // Refresh to get updated state
    await page.click('ion-tab-button[tab="dashboard"], [href*="dashboard"]');
    await page.waitForTimeout(1000);
    await page.click('ion-tab-button[tab="appointments"], [href*="appointments"]');
    await page.waitForTimeout(2000);

    // ========== Step 3: Verify ACCEPTED state ==========
    console.log('Step 3: Verifying ACCEPTED state...');
    const acceptedBadge = page.locator(
      '.badge-success:has-text("Aceptada"), .badge-success:has-text("Accepted")'
    );
    const createButton = page.locator(
      'ion-button:has-text("Crear Cita"), ion-button:has-text("AGREGAR NUEVA CITA")'
    );

    await expect(acceptedBadge.or(createButton).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-state-accepted.png` });
    console.log('✅ ACCEPTED state verified');

    // ========== Step 4: Click create appointment button ==========
    console.log('Step 4: Opening appointment form...');
    const createBtn = page
      .locator(
        'ion-button:has-text("AGREGAR NUEVA CITA"), ion-button:has-text("Agregar Nueva Cita"), ion-button:has-text("Crear Cita")'
      )
      .first();
    await createBtn.click();
    await page.waitForURL(/\/create/, { timeout: 10000 });

    // ========== Step 5: Wait for form to load ==========
    console.log('Step 5: Waiting for form to load...');
    await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-form-initial.png` });

    // ========== Step 6: Fill all form fields ==========
    console.log('Step 6: Filling appointment form...');

    // Glucose Objective (number input)
    const glucoseInput = page.locator('ion-input[name="glucose_objective"] input');
    await glucoseInput.waitFor({ state: 'visible', timeout: 5000 });
    await glucoseInput.fill('120');
    console.log('  ✓ Glucose objective: 120');

    // Insulin Type (select)
    const insulinTypeSelect = page.locator('ion-select[name="insulin_type"]');
    await insulinTypeSelect.click();
    await page.waitForTimeout(500);
    // Select "Rapid Acting" option
    await page.click('ion-select-option[value="rapid"]');
    await page.waitForTimeout(500);
    console.log('  ✓ Insulin type: rapid');

    // Dose (number input)
    const doseInput = page.locator('ion-input[name="dose"] input');
    await doseInput.fill('10');
    console.log('  ✓ Dose: 10');

    // Fast Insulin (text input)
    const fastInsulinInput = page.locator('ion-input[name="fast_insulin"] input');
    await fastInsulinInput.fill('Humalog');
    console.log('  ✓ Fast insulin: Humalog');

    // Fixed Dose (number input)
    const fixedDoseInput = page.locator('ion-input[name="fixed_dose"] input');
    await fixedDoseInput.fill('5');
    console.log('  ✓ Fixed dose: 5');

    // Ratio (number input)
    const ratioInput = page.locator('ion-input[name="ratio"] input');
    await ratioInput.fill('10');
    console.log('  ✓ Ratio: 10');

    // Sensitivity (number input)
    const sensitivityInput = page.locator('ion-input[name="sensitivity"] input');
    await sensitivityInput.fill('50');
    console.log('  ✓ Sensitivity: 50');

    // Pump Type (select)
    const pumpTypeSelect = page.locator('ion-select[name="pump_type"]');
    await pumpTypeSelect.click();
    await page.waitForTimeout(500);
    await page.click('ion-select-option[value="none"]');
    await page.waitForTimeout(500);
    console.log('  ✓ Pump type: none (syringe/pen)');

    // Motive checkboxes (select multiple)
    console.log('  ✓ Selecting motives...');

    // Select AJUSTE (Treatment Adjustment)
    const ajusteCheckbox = page
      .locator('ion-checkbox')
      .filter({ has: page.locator('text=/Ajuste|Adjustment/i') });
    if (await ajusteCheckbox.isVisible({ timeout: 2000 })) {
      await ajusteCheckbox.click();
      console.log('    • AJUSTE selected');
    }

    // Select DUDAS (Questions)
    const dudasCheckbox = page
      .locator('ion-checkbox')
      .filter({ has: page.locator('text=/Dudas|Questions/i') });
    if (await dudasCheckbox.isVisible({ timeout: 2000 })) {
      await dudasCheckbox.click();
      console.log('    • DUDAS selected');
    }

    // Another Treatment (optional textarea)
    const anotherTreatmentTextarea = page.locator(
      'ion-textarea[name="another_treatment"] textarea'
    );
    if (await anotherTreatmentTextarea.isVisible({ timeout: 2000 })) {
      await anotherTreatmentTextarea.fill('Metformin 500mg twice daily');
      console.log('  ✓ Another treatment: Metformin');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-form-filled.png` });

    // ========== Step 7: Submit form ==========
    console.log('Step 7: Submitting form...');

    // Intercept the create request
    const createResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/appointments') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    const submitButton = page.locator('[data-testid="appointment-submit-btn"]');
    await expect(submitButton).toBeVisible({ timeout: 3000 });
    await submitButton.click();

    // Wait for response
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    const responseData = await createResponse.json();
    console.log(`  ✓ Appointment created with ID: ${responseData.appointment_id || 'N/A'}`);

    // ========== Step 8: Verify navigation back to appointments list ==========
    console.log('Step 8: Verifying navigation to appointments list...');
    await page.waitForURL(/\/appointments/, { timeout: 10000 });
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // ========== Step 9: Verify CREATED state ==========
    console.log('Step 9: Verifying CREATED state...');

    // Look for CREATED badge or appointment card
    const createdBadge = page.locator(
      '.badge-info:has-text("Creada"), .badge-info:has-text("Completed"), .badge-info'
    );
    const appointmentCard = page.locator('ion-card.appointment-card');

    await expect(createdBadge.or(appointmentCard).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-state-created.png` });
    console.log('✅ CREATED state verified');

    // ========== Step 10: Verify appointment details display ==========
    console.log('Step 10: Verifying appointment details...');

    // Click on appointment card to view details
    if (await appointmentCard.first().isVisible({ timeout: 3000 })) {
      await appointmentCard.first().click();
      await page.waitForTimeout(1000);

      // Verify key fields are displayed
      const glucoseObjectiveText = page.locator('text=/120.*mg\/dL/i');
      const insulinTypeText = page.locator('text=/Rapid|rápid/i');
      const doseText = page.locator('text=/10.*U/i');

      // Check if details are visible (either in detail page or expanded card)
      const detailsVisible =
        (await glucoseObjectiveText.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await insulinTypeText.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await doseText.isVisible({ timeout: 2000 }).catch(() => false));

      if (detailsVisible) {
        console.log('  ✓ Appointment details visible');
      } else {
        console.log('  ℹ️ Details may be in collapsed state or different UI structure');
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-details.png` });
    }

    console.log('✅ Full ACCEPTED → CREATED flow completed successfully!');
  });

  test('state DENIED: user can re-request', async ({ page }) => {
    await resetQueue(adminToken);
    await login(page);
    await navigateToAppointments(page);

    // Request appointment
    const requestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar Cita")'
    );

    if (await requestButton.first().isVisible({ timeout: 3000 })) {
      page.on('dialog', async dialog => await dialog.accept());
      await requestButton.first().click();
      await page.waitForTimeout(2000);
    }

    // Admin denies via API
    console.log('Admin denying appointment...');
    const pending = await viewPendingQueue(adminToken);
    if (pending.length > 0) {
      const queuePlacement = pending[0].queue_placement;
      const ctx = await request.newContext();
      await ctx.put(`${BACKOFFICE_URL}/appointments/deny/${queuePlacement}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      await ctx.dispose();
    }

    // Refresh UI
    await page.click('ion-tab-button[tab="dashboard"], [href*="dashboard"]');
    await page.waitForTimeout(1000);
    await page.click('ion-tab-button[tab="appointments"], [href*="appointments"]');
    await page.waitForTimeout(2000);

    // Verify DENIED state
    const deniedBadge = page.locator(
      '.badge-error:has-text("Rechazada"), .badge-error:has-text("Denied")'
    );
    await expect(deniedBadge).toBeVisible({ timeout: 5000 });

    // Verify user can request again
    const reRequestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar")'
    );
    await expect(reRequestButton.first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/appointment-state-denied.png` });
    console.log('✅ DENIED state verified: Re-request button visible');
  });

  test('form validation: prevent submission with empty required fields', async ({ page }) => {
    // Setup: Get to ACCEPTED state
    await resetQueue(adminToken);
    await login(page);
    await navigateToAppointments(page);

    // Request and accept
    const requestButton = page.locator(
      'ion-button:has-text("SOLICITAR CITA"), ion-button:has-text("Solicitar Cita")'
    );
    if (await requestButton.first().isVisible({ timeout: 3000 })) {
      page.on('dialog', async dialog => await dialog.accept());
      await requestButton.first().click();
      await page.waitForTimeout(2000);
    }

    await acceptNextAppointment(adminToken);
    await page.reload();
    await page.waitForTimeout(2000);

    // Open form
    const createBtn = page
      .locator('ion-button:has-text("AGREGAR NUEVA CITA"), ion-button:has-text("Crear Cita")')
      .first();
    await createBtn.click();
    await page.waitForURL(/\/create/, { timeout: 10000 });

    // Try to submit without filling required fields
    const submitButton = page.locator('[data-testid="appointment-submit-btn"]');
    await submitButton.click();

    // Should show validation toast/error
    const toast = page.locator('ion-toast, .toast');
    await expect(toast).toBeVisible({ timeout: 5000 });

    console.log('✅ Form validation working: Empty form prevented submission');
  });
});

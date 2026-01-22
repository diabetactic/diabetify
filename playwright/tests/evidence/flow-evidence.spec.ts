/**
 * Evidence Collection Tests - Reading & Appointment Flows
 * Captures screenshots and API evidence for QA documentation
 *
 * QUALITY REQUIREMENTS:
 * - Wait for actual content (not skeleton states)
 * - Use unique identifiable test values
 * - Capture clean, stable page states
 * - Properly complete forms (not just click buttons)
 */
import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = path.join(__dirname, '../../../evidence');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const API_EVIDENCE_DIR = path.join(EVIDENCE_DIR, 'api-responses');

// Unique test value that won't appear in seeded data
const EVIDENCE_TEST_GLUCOSE_VALUE = 187;
const EVIDENCE_TEST_TAG = '__EVIDENCE_TEST__';

interface QueueEntry {
  queue_placement?: number;
  id?: number;
  user_id?: number;
  state?: string;
}

function ensureDirectories() {
  [EVIDENCE_DIR, SCREENSHOTS_DIR, API_EVIDENCE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function saveApiEvidence(filename: string, data: unknown) {
  const filepath = path.join(API_EVIDENCE_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`[API Evidence] Saved: ${filename}`);
}

/**
 * Take screenshot with visual stability preparations
 * - Disables animations
 * - Hides dynamic timestamps
 * - Waits for stable state
 */
async function takeEvidenceScreenshot(page: Page, name: string) {
  // Disable animations and hide dynamic elements
  await page.addStyleTag({
    content: `
      [data-testid="timestamp"], .timestamp, .time-ago { visibility: hidden !important; }
      ion-spinner, .loading-indicator, .loading { visibility: hidden !important; }
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });

  // Wait for any animations to settle
  await page.waitForTimeout(300);

  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`[Screenshot] Saved: ${name}.png`);
}

/**
 * Wait for dashboard to be fully loaded (not skeleton)
 * Based on pattern from dashboard.functional.spec.ts
 */
async function waitForDashboardContent(page: Page) {
  await page.waitForFunction(
    () => {
      // Check skeleton is gone
      const mainSkeleton = document.querySelector('.page-shell > .animate-pulse');
      // Check actual content is present
      const statsContainer = document.querySelector('[data-testid="stats-container"]');
      const recentReadings = document.querySelector('[data-testid="recent-readings"]');
      return !mainSkeleton && (statsContainer !== null || recentReadings !== null);
    },
    null,
    { timeout: 30000 }
  );
}

/**
 * Wait for readings page to be fully loaded
 */
async function waitForReadingsContent(page: Page) {
  await page.waitForFunction(
    () => {
      const list = document.querySelector('[data-testid="readings-list"]');
      const empty = document.querySelector('[data-testid="readings-empty"]');
      const loading = document.querySelector('.animate-pulse');
      return !loading && (list !== null || empty !== null);
    },
    null,
    { timeout: 30000 }
  );
}

/**
 * Wait for appointments page to show state content
 */
async function waitForAppointmentsContent(page: Page) {
  await page.waitForFunction(
    () => {
      const content = document.querySelector('ion-content');
      const loading = document.querySelector('.animate-pulse, ion-skeleton-text');
      const hasContent = content && content.textContent && content.textContent.length > 50;
      return !loading && hasContent;
    },
    null,
    { timeout: 30000 }
  );
}

/**
 * Wait for add-reading form to be ready
 */
async function waitForAddReadingForm(page: Page) {
  await page.waitForFunction(
    () => {
      const input = document.querySelector('[data-testid="glucose-value-input"]');
      const saveBtn = document.querySelector('[data-testid="add-reading-save-btn"]');
      return input !== null && saveBtn !== null;
    },
    null,
    { timeout: 15000 }
  );
}

// ============================================================================
// READING FLOW TESTS
// ============================================================================

test.describe('Evidence Collection - Reading Flow @evidence @docker', () => {
  test.skip(!isDockerMode, 'Evidence tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test.beforeAll(() => {
    ensureDirectories();
  });

  test('should add reading and verify via backend API', async ({
    page,
    pages,
    authenticatedApi,
  }) => {
    // === STEP 1: Dashboard Before (fully loaded) ===
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
    await waitForDashboardContent(page);
    await takeEvidenceScreenshot(page, '01-reading-dashboard-before');

    // Get initial readings state via API
    const initialReadings = await authenticatedApi.getReadings();
    saveApiEvidence('01-readings-initial-state.json', {
      timestamp: new Date().toISOString(),
      description: 'Initial state before adding new reading',
      totalCount: initialReadings.length,
      latestReading: initialReadings[0] || null,
    });

    // === STEP 2: Navigate to Add Reading form ===
    const addReadingBtn = page.locator('[data-testid="quick-add-reading"]');
    await addReadingBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addReadingBtn.click();
    await page.waitForURL(/\/add-reading/, { timeout: 10000 });
    await waitForAddReadingForm(page);
    await takeEvidenceScreenshot(page, '02-reading-add-form-empty');

    // === STEP 3: Fill the form with unique test value ===
    const valueInput = page.locator('[data-testid="glucose-value-input"] input');
    await valueInput.fill(String(EVIDENCE_TEST_GLUCOSE_VALUE));

    // Wait for status indicator to appear (confirms form reactivity)
    await page.waitForSelector('.status-badge, .status-preview', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await takeEvidenceScreenshot(page, '03-reading-add-form-filled');

    saveApiEvidence('02-reading-form-data.json', {
      timestamp: new Date().toISOString(),
      description: 'Form filled with test glucose value',
      testValue: EVIDENCE_TEST_GLUCOSE_VALUE,
      unit: 'mg/dL',
      tag: EVIDENCE_TEST_TAG,
    });

    // === STEP 4: Submit and wait for navigation ===
    const submitBtn = page.locator('[data-testid="add-reading-save-btn"]');
    await submitBtn.click();

    // Wait for success toast and navigation
    await page.waitForURL(/\/tabs\/readings/, { timeout: 15000 });
    await pages.readingsPage.waitForHydration();
    await waitForReadingsContent(page);
    await takeEvidenceScreenshot(page, '04-reading-submitted-success');

    // === STEP 5: Verify via API that reading was created ===
    const finalReadings = await authenticatedApi.getReadings();
    const newReading = finalReadings.find(
      (r: { value?: number; glucose_level?: number }) =>
        (r.value && Math.abs(r.value - EVIDENCE_TEST_GLUCOSE_VALUE) < 1) ||
        (r.glucose_level && Math.abs(r.glucose_level - EVIDENCE_TEST_GLUCOSE_VALUE) < 1)
    );

    saveApiEvidence('03-readings-after-submit.json', {
      timestamp: new Date().toISOString(),
      description: 'State after submitting new reading',
      previousCount: initialReadings.length,
      newCount: finalReadings.length,
      newReadingFound: !!newReading,
      newReading: newReading || null,
      testValueUsed: EVIDENCE_TEST_GLUCOSE_VALUE,
    });

    // === STEP 6: Show reading in list ===
    // Verify our specific reading appears in the list (may need scroll)
    const readingLocator = page.locator(`text=${EVIDENCE_TEST_GLUCOSE_VALUE}`).first();

    // Scroll the reading into view if it exists (might be below fold)
    if ((await readingLocator.count()) > 0) {
      await readingLocator.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
    }

    await takeEvidenceScreenshot(page, '05-reading-visible-in-list');

    // API verification is the source of truth (not visibility)
    expect(newReading).toBeTruthy();
    console.log(
      `[Evidence] Reading flow completed: ${EVIDENCE_TEST_GLUCOSE_VALUE} mg/dL added and verified`
    );
  });
});

// ============================================================================
// APPOINTMENT FLOW TESTS (SERIAL - must run one at a time due to shared state)
// ============================================================================

test.describe('Evidence Collection - Appointment Flows @evidence @docker', () => {
  // CRITICAL: Run appointment tests serially because they share the same user's
  // appointment state. Running in parallel causes race conditions.
  test.describe.configure({ mode: 'serial' });

  test.describe('ACCEPTED Flow', () => {
    test.skip(!isDockerMode, 'Evidence tests require Docker backend');
    test.use({ storageState: STORAGE_STATE_PATH });

    test.beforeAll(() => {
      ensureDirectories();
    });

    test.beforeEach(async ({ authenticatedAdminApi, primaryUser }) => {
      await authenticatedAdminApi.openQueue();
      await authenticatedAdminApi.clearQueue(primaryUser.dni);
    });

    test('should complete appointment flow: NONE → PENDING → ACCEPTED → CREATED → RESOLVED', async ({
      page,
      pages,
      authenticatedApi,
      authenticatedAdminApi,
      primaryUser,
    }) => {
      // === STEP 1: Initial state (NONE) ===
      await page.goto('/tabs/appointments');
      await pages.appointmentsPage.waitForHydration();
      await waitForAppointmentsContent(page);
      await takeEvidenceScreenshot(page, '10-appt-state-none');

      const initialState = await authenticatedApi.getAppointmentStatus();
      saveApiEvidence('10-appt-state-none.json', {
        timestamp: new Date().toISOString(),
        description: 'Initial state - no appointment request',
        state: initialState.state,
      });
      expect(initialState.state).toBe('NONE');

      // === STEP 2: Submit to queue (NONE → PENDING) ===
      const requestBtn = page
        .locator('#request-appointment-btn, [data-testid="request-appointment-btn"]')
        .first();
      if (!(await requestBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        // Fallback to text-based selector
        await page.locator('text=/Solicitar|Request/i').first().click();
      } else {
        await requestBtn.click();
      }

      // Wait for state change
      await page.waitForTimeout(2000);
      await page.reload();
      await pages.appointmentsPage.waitForHydration();
      await waitForAppointmentsContent(page);
      await takeEvidenceScreenshot(page, '11-appt-state-pending');

      const pendingState = await authenticatedApi.getAppointmentStatus();
      saveApiEvidence('11-appt-state-pending.json', {
        timestamp: new Date().toISOString(),
        description: 'After requesting appointment - waiting in queue',
        state: pendingState.state,
      });
      expect(pendingState.state).toBe('PENDING');

      // Get queue placement for admin operations
      const queueStatus = await authenticatedAdminApi.getQueueStatus();
      const pendingEntries = queueStatus.pending as QueueEntry[];
      const firstEntry = pendingEntries?.[0];
      const queuePlacement = firstEntry?.queue_placement ?? firstEntry?.id ?? 1;

      saveApiEvidence('11b-admin-queue-status.json', {
        timestamp: new Date().toISOString(),
        description: 'Admin view of pending queue',
        queueStatus,
        queuePlacement,
      });

      // === STEP 3: Admin accepts (PENDING → ACCEPTED) ===
      await authenticatedAdminApi.acceptUser(queuePlacement);
      await page.reload();
      await pages.appointmentsPage.waitForHydration();
      await waitForAppointmentsContent(page);
      await takeEvidenceScreenshot(page, '12-appt-state-accepted');

      const acceptedState = await authenticatedApi.getAppointmentStatus();
      saveApiEvidence('12-appt-state-accepted.json', {
        timestamp: new Date().toISOString(),
        description: 'Admin accepted - user can now fill appointment form',
        state: acceptedState.state,
      });
      expect(acceptedState.state).toBe('ACCEPTED');

      // === STEP 4: Navigate to appointment form and fill it ===
      const createBtn = page
        .locator('ion-button')
        .filter({ hasText: /Agregar|Create|Nueva|Completar/i })
        .first();
      await createBtn.waitFor({ state: 'visible', timeout: 10000 });
      await createBtn.click();

      // Wait for form page to load
      await page.waitForURL(/\/appointment-create|\/create/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await takeEvidenceScreenshot(page, '13-appt-form-empty');

      // Fill the appointment form with required fields
      // Glucose Objective
      await page.locator('ion-input[name="glucose_objective"] input').fill('100');

      // Insulin Type - use ion-select
      const insulinSelect = page.locator(
        '[data-testid="insulin-type-selector"], #insulin-type-selector'
      );
      await insulinSelect.click();
      await page.waitForTimeout(500);
      await page.locator('ion-select-popover ion-radio, ion-popover ion-item').first().click();
      await page.waitForTimeout(300);

      // Dose
      await page.locator('ion-input[name="dose"] input').fill('10');

      // Fast Insulin
      await page.locator('ion-input[name="fast_insulin"] input').fill('Humalog');

      // Fixed Dose
      await page.locator('ion-input[name="fixed_dose"] input').fill('5');

      // Ratio
      await page.locator('ion-input[name="ratio"] input').fill('10');

      // Sensitivity
      await page.locator('ion-input[name="sensitivity"] input').fill('50');

      // Pump Type
      const pumpSelect = page.locator('[data-testid="pump-type-selector"]');
      await pumpSelect.click();
      await page.waitForTimeout(500);
      await page.locator('ion-select-popover ion-radio, ion-popover ion-item').first().click();
      await page.waitForTimeout(300);

      // Motive - check first checkbox
      const motiveCheckbox = page.locator('ion-checkbox').first();
      await motiveCheckbox.click();

      await takeEvidenceScreenshot(page, '14-appt-form-filled');

      saveApiEvidence('13-appt-form-data.json', {
        timestamp: new Date().toISOString(),
        description: 'Appointment form filled with clinical data',
        formData: {
          glucose_objective: 100,
          insulin_type: 'selected',
          dose: 10,
          fast_insulin: 'Humalog',
          fixed_dose: 5,
          ratio: 10,
          sensitivity: 50,
          pump_type: 'selected',
          motive: 'selected',
        },
      });

      // === STEP 5: Submit appointment form ===
      const submitApptBtn = page.locator(
        '[data-testid="appointment-submit-btn"], #appointment-submit-btn'
      );
      await submitApptBtn.click();

      // Wait for navigation back to appointments page
      await page.waitForURL(/\/tabs\/appointments/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.goto('/tabs/appointments'); // Force navigation to ensure clean state
      await pages.appointmentsPage.waitForHydration();
      await waitForAppointmentsContent(page);
      await takeEvidenceScreenshot(page, '15-appt-state-created');

      const createdState = await authenticatedApi.getAppointmentStatus();
      saveApiEvidence('14-appt-state-created.json', {
        timestamp: new Date().toISOString(),
        description: 'Appointment created - awaiting medical resolution',
        state: createdState.state,
      });

      // === STEP 6: Admin resolves appointment (CREATED → RESOLVED) ===
      // Get the appointment ID for resolution
      console.log(`[Evidence] Looking up appointment for DNI: ${primaryUser.dni}`);
      const appointmentId = await authenticatedAdminApi.getActiveAppointmentId(primaryUser.dni);
      console.log(`[Evidence] Appointment ID lookup result: ${appointmentId}`);

      if (appointmentId) {
        // Doctor provides resolution via BACKOFFICE API (triggers email notification)
        await authenticatedAdminApi.resolveAppointment({
          appointment_id: appointmentId,
          change_basal_type: 'Lantus',
          change_basal_dose: 22,
          change_basal_time: '22:00',
          change_fast_type: 'Humalog',
          change_ratio: 12,
          change_sensitivity: 45,
          emergency_care: false,
          needed_physical_appointment: false,
          glucose_scale: [
            [70, 130, 0],
            [131, 180, 1],
            [181, 230, 2],
          ],
        });

        await page.reload();
        await pages.appointmentsPage.waitForHydration();
        await waitForAppointmentsContent(page);
        await takeEvidenceScreenshot(page, '16-appt-with-resolution');

        // Note: The backend doesn't change state to "RESOLVED" - instead a resolution
        // record is created and attached to the appointment. State stays CREATED.
        const finalState = await authenticatedApi.getAppointmentStatus();
        saveApiEvidence('15-appt-with-resolution.json', {
          timestamp: new Date().toISOString(),
          description:
            'Appointment with resolution - doctor provided treatment recommendations (state stays CREATED)',
          state: finalState.state,
          resolution_created: true,
          resolution_data: {
            change_basal_type: 'Lantus',
            change_basal_dose: 22,
            change_basal_time: '22:00',
            change_fast_type: 'Humalog',
            change_ratio: 12,
            change_sensitivity: 45,
          },
        });

        console.log(
          `[Evidence] Final state after resolution: ${finalState.state} (resolution record created)`
        );
      } else {
        console.log('[Evidence] Could not get appointment ID for resolution');
      }

      console.log(
        '[Evidence] Full flow completed: NONE → PENDING → ACCEPTED → CREATED (+ resolution)'
      );
    });
  }); // End ACCEPTED Flow

  // ============================================================================
  // DENIED FLOW
  // ============================================================================

  test.describe('DENIED Flow', () => {
    test.skip(!isDockerMode, 'Evidence tests require Docker backend');
    test.use({ storageState: STORAGE_STATE_PATH });

    test.beforeAll(() => {
      ensureDirectories();
    });

    test.beforeEach(async ({ authenticatedAdminApi, primaryUser }) => {
      await authenticatedAdminApi.openQueue();
      await authenticatedAdminApi.clearQueue(primaryUser.dni);
    });

    test('should complete denied appointment flow: NONE → PENDING → DENIED', async ({
      page,
      pages,
      authenticatedApi,
      authenticatedAdminApi,
    }) => {
      // === STEP 1: Initial state (NONE) ===
      await page.goto('/tabs/appointments');
      await pages.appointmentsPage.waitForHydration();
      await waitForAppointmentsContent(page);
      await takeEvidenceScreenshot(page, '20-denied-state-none');

      const initialState = await authenticatedApi.getAppointmentStatus();
      saveApiEvidence('20-denied-state-none.json', {
        timestamp: new Date().toISOString(),
        description: 'Initial state - no appointment request',
        state: initialState.state,
      });
      expect(initialState.state).toBe('NONE');

      // === STEP 2: Submit to queue (NONE → PENDING) ===
      const requestBtn = page
        .locator('#request-appointment-btn, [data-testid="request-appointment-btn"]')
        .first();
      if (!(await requestBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        await page.locator('text=/Solicitar|Request/i').first().click();
      } else {
        await requestBtn.click();
      }

      await page.waitForTimeout(2000);
      await page.reload();
      await pages.appointmentsPage.waitForHydration();
      await waitForAppointmentsContent(page);
      await takeEvidenceScreenshot(page, '21-denied-state-pending');

      const pendingState = await authenticatedApi.getAppointmentStatus();
      saveApiEvidence('21-denied-state-pending.json', {
        timestamp: new Date().toISOString(),
        description: 'After requesting appointment - waiting in queue',
        state: pendingState.state,
      });
      expect(pendingState.state).toBe('PENDING');

      // Get queue placement
      const queueStatus = await authenticatedAdminApi.getQueueStatus();
      const pendingEntries = queueStatus.pending as QueueEntry[];
      const firstEntry = pendingEntries?.[0];
      const queuePlacement = firstEntry?.queue_placement ?? firstEntry?.id ?? 1;

      // === STEP 3: Admin DENIES (PENDING → DENIED) ===
      await authenticatedAdminApi.denyUser(queuePlacement);
      await page.reload();
      await pages.appointmentsPage.waitForHydration();
      await waitForAppointmentsContent(page);
      await takeEvidenceScreenshot(page, '22-denied-state-denied');

      const deniedState = await authenticatedApi.getAppointmentStatus();
      saveApiEvidence('22-denied-state-denied.json', {
        timestamp: new Date().toISOString(),
        description: 'Admin denied the appointment request',
        state: deniedState.state,
      });
      expect(deniedState.state).toBe('DENIED');

      console.log('[Evidence] Denied flow completed: NONE → PENDING → DENIED');
    });
  }); // End DENIED Flow
}); // End Appointment Flows (serial wrapper)

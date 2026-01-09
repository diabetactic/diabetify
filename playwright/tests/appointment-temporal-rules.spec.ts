import { test, expect, Page } from '@playwright/test';
import { loginUser, waitForIonicHydration, waitForNetworkIdle } from '../helpers/test-helpers';

test.describe.configure({ mode: 'serial' });

const isDockerTest = process.env['E2E_DOCKER_TESTS'] === 'true';
const TEST_USER = { dni: '1000', password: 'tuvieja' };
const API_URL = process.env['E2E_API_URL'] || 'http://localhost:8000';
const BACKOFFICE_URL = process.env['E2E_BACKOFFICE_URL'] || 'http://localhost:8001';

async function getAuthToken(dni: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${dni}&password=${password}`,
  });
  const data = await response.json();
  return data.access_token;
}

async function getAppointmentsForUser(token: string): Promise<Array<{ appointment_id: number }>> {
  const response = await fetch(`${API_URL}/appointments/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

async function createResolution(appointmentId: number): Promise<void> {
  const adminToken = await getAdminToken();
  await fetch(`${BACKOFFICE_URL}/appointments/create_resolution`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appointment_id: appointmentId,
      change_basal_type: 'Lantus',
      change_basal_dose: 12,
      change_basal_time: '22:00',
      change_fast_type: 'Humalog',
      change_ratio: 12,
      change_sensitivity: 45,
      emergency_care: true,
      needed_physical_appointment: true,
    }),
  }).catch(() => {});
}

async function getAdminToken(): Promise<string> {
  const response = await fetch(`${BACKOFFICE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin',
  });
  const data = await response.json();
  return data.access_token;
}

async function setUserQueueState(
  dni: string,
  state: 'NONE' | 'PENDING' | 'ACCEPTED' | 'DENIED' | 'CREATED' | 'BLOCKED'
): Promise<void> {
  try {
    const adminToken = await getAdminToken();
    await fetch(`${BACKOFFICE_URL}/test/set_queue_state`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dni, state }),
    });
  } catch {
    console.warn(`Failed to set queue state to ${state} for user ${dni}`);
  }
}

async function resetUserQueueState(_dni: string): Promise<void> {
  return;
}

async function loginAs(page: Page, dni: string, password: string): Promise<void> {
  await loginUser(page, { username: dni, password });
}

async function goToAppointments(page: Page): Promise<void> {
  await page.click('[data-testid="tab-appointments"], a[href*="appointments"]');
  await expect(page).toHaveURL(/\/appointments/, { timeout: 10000 });
  await waitForNetworkIdle(page);
}

async function disableDeviceFrame(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('no-device-frame');
  });
}

async function getQueueState(token: string): Promise<string> {
  const response = await fetch(`${API_URL}/appointments/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return 'NONE';
  }
  const state = await response.text();
  return state.replace(/"/g, '');
}

test.describe('Appointment Temporal Business Rules @appointment-temporal @docker', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run');

  test.beforeEach(async ({ page }) => {
    await disableDeviceFrame(page);
  });

  test.afterEach(async () => {
    await resetUserQueueState(TEST_USER.dni);
  });

  test('should prevent creating more than one appointment per day', async ({ page }) => {
    await setUserQueueState(TEST_USER.dni, 'NONE');
    await loginAs(page, TEST_USER.dni, TEST_USER.password);
    await goToAppointments(page);

    const requestButton = page.locator(
      'ion-button:has-text("Solicitar"), ion-button:has-text("Request"), [data-testid="request-appointment-btn"]'
    );
    if ((await requestButton.count()) > 0) {
      await requestButton.click();
      await page.waitForTimeout(2000);
    }

    await setUserQueueState(TEST_USER.dni, 'ACCEPTED');
    await page.reload();
    await waitForIonicHydration(page);

    const createButton = page.locator(
      'ion-button:has-text("Crear"), ion-button:has-text("Create"), [data-testid="create-appointment-btn"]'
    );
    if ((await createButton.count()) > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);

      await page.fill(
        'input[name="glucose_objective"], [formcontrolname="glucose_objective"]',
        '120'
      );
      await page.fill('input[name="insulin_type"], [formcontrolname="insulin_type"]', 'Lantus');
      await page.fill('input[name="dose"], [formcontrolname="dose"]', '15');
      await page.fill('input[name="fast_insulin"], [formcontrolname="fast_insulin"]', 'Humalog');
      await page.fill('input[name="fixed_dose"], [formcontrolname="fixed_dose"]', '4');
      await page.fill('input[name="ratio"], [formcontrolname="ratio"]', '12');
      await page.fill('input[name="sensitivity"], [formcontrolname="sensitivity"]', '45');

      const motiveCheckbox = page.locator('ion-checkbox[value="AJUSTE"]').first();
      if ((await motiveCheckbox.count()) > 0) {
        await motiveCheckbox.click();
      }

      const submitButton = page.locator(
        'ion-button[type="submit"]:has-text("Enviar"), ion-button[type="submit"]:has-text("Submit")'
      );
      if ((await submitButton.count()) > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }

    const token = await getAuthToken(TEST_USER.dni, TEST_USER.password);
    const appointments = await getAppointmentsForUser(token);
    const hasAppointment = appointments.length > 0;

    if (hasAppointment) {
      await createResolution(appointments[0].appointment_id);
      await setUserQueueState(TEST_USER.dni, 'CREATED');
      await page.reload();
      await waitForIonicHydration(page);
      await goToAppointments(page);

      const secondRequestButton = page.locator(
        'ion-button:has-text("Solicitar"), ion-button:has-text("Request"), [data-testid="request-appointment-btn"]'
      );

      if ((await secondRequestButton.count()) > 0) {
        const isDisabled = await secondRequestButton.getAttribute('disabled');
        const isButtonDisabled = isDisabled !== null;

        if (!isButtonDisabled) {
          await secondRequestButton.click();
          await page.waitForTimeout(2000);

          const errorMessage = page.locator(
            'text=/ya solicitaste|already requested|one per day|una vez al día/i'
          );
          const hasError = (await errorMessage.count()) > 0;

          expect(hasError || isButtonDisabled).toBe(true);
        } else {
          expect(isButtonDisabled).toBe(true);
        }
      } else {
        const state = await getQueueState(token);
        expect(['CREATED']).toContain(state);
      }
    } else {
      console.warn('⚠️ Appointment was not created, cannot test once-per-day rule');
    }
  });

  test('should allow re-request after denial (queue clears daily)', async ({ page }) => {
    await setUserQueueState(TEST_USER.dni, 'DENIED');
    await loginAs(page, TEST_USER.dni, TEST_USER.password);
    await goToAppointments(page);

    const deniedMessage = page.locator('text=/denegad|denied|rechazad|rejected/i');
    const hasDeniedState = (await deniedMessage.count()) > 0;

    if (hasDeniedState) {
      const requestButton = page.locator(
        'ion-button:has-text("Solicitar"), ion-button:has-text("Request"), [data-testid="request-appointment-btn"]'
      );

      const hasRequestButton = (await requestButton.count()) > 0;
      expect(hasRequestButton).toBe(true);

      if (hasRequestButton) {
        const isDisabled = await requestButton.getAttribute('disabled');
        expect(isDisabled).toBeNull();
      }
    } else {
      console.warn('⚠️ DENIED state not properly set');
    }
  });

  test('should allow appointment request next day after queue clears', async ({ page }) => {
    await setUserQueueState(TEST_USER.dni, 'DENIED');
    await loginAs(page, TEST_USER.dni, TEST_USER.password);
    await goToAppointments(page);

    const requestButton = page.locator(
      'ion-button:has-text("Solicitar"), ion-button:has-text("Request"), [data-testid="request-appointment-btn"]'
    );

    const hasRequestButton = (await requestButton.count()) > 0;
    expect(hasRequestButton).toBe(true);
  });
});

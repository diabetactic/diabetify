import { test, expect, Page } from '@playwright/test';
import { loginUser, waitForNetworkIdle } from '../helpers/test-helpers';

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
  test.skip(
    true,
    'SKIPPED: Requires backend test endpoint /test/set_queue_state which is not implemented in current Docker setup'
  );
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run');

  test.beforeEach(async ({ page }) => {
    await disableDeviceFrame(page);
  });

  test.afterEach(async () => {
    await resetUserQueueState(TEST_USER.dni);
  });

  test('should prevent creating more than one appointment per day', async ({ page }) => {
    await setUserQueueState(TEST_USER.dni, 'CREATED');

    await loginAs(page, TEST_USER.dni, TEST_USER.password);
    await goToAppointments(page);

    const requestButton = page.locator('#request-appointment-btn');
    const requestButtonCount = await requestButton.count();

    expect(requestButtonCount).toBe(0);

    const createButton = page.locator('#create-appointment-btn');
    const isDisabled = await createButton.getAttribute('disabled');
    expect(isDisabled).not.toBeNull();

    const token = await getAuthToken(TEST_USER.dni, TEST_USER.password);
    const state = await getQueueState(token);
    expect(state).toBe('CREATED');
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

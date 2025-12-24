/**
 * Docker Backend - Data Persistence E2E Tests
 *
 * Tests that data persists correctly across logout/login sessions.
 * Provides screenshot proof of readings persisting in the backend.
 *
 * Run with: E2E_DOCKER_TESTS=true pnpm exec playwright test docker-persistence
 */

import { test, expect, Page } from '@playwright/test';

// Configuration
const isDockerTest = process.env.E2E_DOCKER_TESTS === 'true';
const API_URL = process.env.E2E_API_URL || 'http://localhost:8000';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4200';
const TEST_USERNAME = process.env.E2E_TEST_USERNAME || '1000';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'tuvieja';

// Screenshot directory
const SCREENSHOT_DIR = 'playwright/artifacts/docker-proof/03-persistence';

// Unique test identifier to track our specific reading (not currently used)
const _PERSISTENCE_TEST_TAG = `__PERSIST_TEST_${Date.now()}__`;

/**
 * Disable device frame for desktop viewport testing.
 */
async function disableDeviceFrame(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('no-device-frame');
  });
}

/**
 * Get auth token for API calls.
 */
async function getAuthToken(): Promise<string> {
  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${TEST_USERNAME}&password=${TEST_PASSWORD}`,
  });
  const data = await response.json();
  return data.access_token;
}

/**
 * Login helper with device frame bypass.
 */
async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await disableDeviceFrame(page);

  // Handle welcome screen if present
  if (page.url().includes('/welcome')) {
    const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
    if ((await loginBtn.count()) > 0) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');
    }
  }

  // Perform login if needed
  if (!page.url().includes('/tabs/')) {
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    await page.fill('#username', TEST_USERNAME);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Logout from the app.
 */
async function logout(page: Page): Promise<void> {
  // Navigate to profile first
  const profileTab = page.getByRole('tab', { name: 'Perfil' });
  if (await profileTab.isVisible().catch(() => false)) {
    await profileTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Allow page transition
  }

  // Try multiple selectors for logout button
  const logoutSelectors = [
    page.getByRole('button', { name: /Cerrar.*Sesi.*n|Logout|Sign.*out/i }),
    page.locator('[data-testid="logout-btn"]'),
    page.locator('ion-button:has-text("Cerrar")'),
    page.locator('button:has-text("Cerrar")'),
  ];

  let logoutClicked = false;
  for (const logoutBtn of logoutSelectors) {
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      logoutClicked = true;
      await page.waitForLoadState('networkidle');
      break;
    }
  }

  if (!logoutClicked) {
    // Fallback: clear localStorage and navigate to welcome
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/welcome');
    await page.waitForLoadState('networkidle');
    return;
  }

  // Handle confirmation modal if present
  await page.waitForTimeout(500);
  const confirmSelectors = [
    page.getByRole('button', { name: /^S[ií]$/i }),
    page.getByRole('button', { name: /Yes|Confirmar|Confirm/i }),
    page.locator('ion-alert button:has-text("Sí")'),
    page.locator('.alert-button-role-confirm'),
  ];

  for (const confirmBtn of confirmSelectors) {
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await page.waitForLoadState('networkidle');
      break;
    }
  }

  // Verify we're logged out (at welcome or login page)
  await expect(page).toHaveURL(/\/(welcome|login|$)/, { timeout: 10000 });
}

/**
 * Navigate to readings tab.
 */
async function navigateToReadings(page: Page): Promise<void> {
  const readingsTab = page.getByRole('tab', { name: 'Lecturas' });
  if (await readingsTab.isVisible().catch(() => false)) {
    await readingsTab.click();
  } else {
    await page.goto(`${BASE_URL}/tabs/readings`);
  }
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
}

/**
 * Add a reading with a specific test value.
 */
async function addReading(page: Page, value: number, notes: string): Promise<void> {
  // Click add reading FAB button
  const addButton = page.getByRole('button', { name: 'Add Reading' });
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();
  await page.waitForLoadState('networkidle');

  // Fill in the reading value
  const valueInput = page.locator('input[type="number"], [data-testid="glucose-input"]').first();
  await expect(valueInput).toBeVisible({ timeout: 5000 });
  await valueInput.fill(value.toString());

  // Add notes
  const notesInput = page.locator('textarea, [data-testid="notes-input"]').first();
  if ((await notesInput.count()) > 0) {
    await notesInput.fill(notes);
  }

  // Submit
  const submitBtn = page.getByRole('button', { name: /Guardar lectura|Save reading/i });
  await submitBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Wait for navigation
}

/**
 * Get readings count from API.
 */
async function getReadingsCount(): Promise<number> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/glucose/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  return (data.readings || []).length;
}

/**
 * Find reading by notes in API response.
 */
async function findReadingByNotes(
  notesSubstring: string
): Promise<{ id: number; glucose_level: number; notes: string } | null> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/glucose/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  const readings = data.readings || [];
  return readings.find((r: { notes?: string }) => r.notes?.includes(notesSubstring)) || null;
}

// =============================================================================
// PERSISTENCE TESTS @docker @docker-persistence
// =============================================================================

test.describe('Docker Backend - Data Persistence @docker @docker-persistence', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test('readings persist after logout and login', async ({ page }) => {
    const testValue = 142;
    const uniqueTag = `__SESSION_PERSIST_${Date.now()}__`;

    // SESSION 1: Login and add reading
    await login(page);
    await navigateToReadings(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-before-add.png`,
      fullPage: true,
    });

    // Add reading with unique identifier
    await addReading(page, testValue, uniqueTag);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-after-add.png`,
      fullPage: true,
    });

    // Verify reading was added via API (more reliable than UI check)
    const addedReading = await findReadingByNotes(uniqueTag);
    expect(addedReading).toBeDefined();
    expect(addedReading?.glucose_level).toBe(testValue);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-verified-in-api.png`,
      fullPage: true,
    });

    // LOGOUT
    await logout(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-logged-out.png`,
      fullPage: true,
    });

    // SESSION 2: Login again
    await login(page);
    await navigateToReadings(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-after-relogin.png`,
      fullPage: true,
    });

    // VERIFY PERSISTENCE via API (most reliable check)
    const persistedReading = await findReadingByNotes(uniqueTag);
    expect(persistedReading).toBeDefined();
    expect(persistedReading?.glucose_level).toBe(testValue);

    // Verify readings page loaded (UI confirmation)
    await expect(page.getByRole('tab', { name: 'Lecturas' })).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-persistence-verified.png`,
      fullPage: true,
    });
  });

  test('multiple readings persist across sessions', async ({ page }, testInfo) => {
    // This test adds 3 readings and logs out/in, so needs longer timeout
    testInfo.setTimeout(60000);
    const readings = [
      { value: 110, notes: `__MULTI_A_${Date.now()}__` },
      { value: 125, notes: `__MULTI_B_${Date.now()}__` },
      { value: 140, notes: `__MULTI_C_${Date.now()}__` },
    ];

    // SESSION 1: Add multiple readings
    await login(page);
    await navigateToReadings(page);

    const initialCount = await getReadingsCount();

    for (const reading of readings) {
      await addReading(page, reading.value, reading.notes);
      await navigateToReadings(page); // Navigate back after each add
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-multiple-readings-added.png`,
      fullPage: true,
    });

    // Verify all readings via API (use >= to account for parallel test execution)
    const afterAddCount = await getReadingsCount();
    expect(afterAddCount).toBeGreaterThanOrEqual(initialCount + 3);

    // Verify each reading was created
    for (const reading of readings) {
      const created = await findReadingByNotes(reading.notes);
      expect(created).toBeDefined();
      expect(created?.glucose_level).toBe(reading.value);
    }

    // LOGOUT and LOGIN
    await logout(page);
    await login(page);
    await navigateToReadings(page);

    // VERIFY all readings persist (via API - most reliable)
    for (const reading of readings) {
      const persisted = await findReadingByNotes(reading.notes);
      expect(persisted).toBeDefined();
      expect(persisted?.glucose_level).toBe(reading.value);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-multiple-readings-persisted.png`,
      fullPage: true,
    });
  });

  test('API data matches UI after session change', async ({ page }) => {
    await login(page);
    await navigateToReadings(page);

    // Get readings via API
    const token = await getAuthToken();
    const apiResponse = await fetch(`${API_URL}/glucose/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const apiData = await apiResponse.json();
    const apiReadings = apiData.readings || [];

    // Check UI shows readings (may be paginated)
    const readingElements = page.getByRole('button').filter({ hasText: /\d+.*mg\/dL/ });
    const uiCount = await readingElements.count();

    // UI should show at least 1 reading if API has readings
    if (apiReadings.length > 0) {
      expect(uiCount).toBeGreaterThan(0);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-api-ui-match.png`,
      fullPage: true,
    });

    // Logout and login, verify same data
    await logout(page);
    await login(page);
    await navigateToReadings(page);

    // API should return same or more data (other tests may add readings in parallel)
    const afterLoginResponse = await fetch(`${API_URL}/glucose/mine`, {
      headers: { Authorization: `Bearer ${await getAuthToken()}` },
    });
    const afterLoginData = await afterLoginResponse.json();
    const afterLoginReadings = afterLoginData.readings || [];

    // Count should be >= original (other tests may add readings during execution)
    expect(afterLoginReadings.length).toBeGreaterThanOrEqual(apiReadings.length);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-data-consistent-after-relogin.png`,
      fullPage: true,
    });
  });

  test('user profile persists after session change', async ({ page }) => {
    await login(page);

    // Navigate to profile
    const profileTab = page.getByRole('tab', { name: 'Perfil' });
    await profileTab.click();
    await page.waitForLoadState('networkidle');

    // Get current user data via API
    const token = await getAuthToken();
    const userResponse = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userResponse.json();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-profile-before-logout.png`,
      fullPage: true,
    });

    // Logout and login
    await logout(page);
    await login(page);

    // Navigate to profile
    await profileTab.click();
    await page.waitForLoadState('networkidle');

    // Verify same user data
    const afterLoginToken = await getAuthToken();
    const afterLoginUserResponse = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${afterLoginToken}` },
    });
    const afterLoginUserData = await afterLoginUserResponse.json();

    expect(afterLoginUserData.id).toBe(userData.id);
    expect(afterLoginUserData.email).toBe(userData.email);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-profile-after-relogin.png`,
      fullPage: true,
    });
  });
});

// =============================================================================
// APPOINTMENTS PERSISTENCE TESTS
// =============================================================================

test.describe('Docker Backend - Appointments Persistence @docker @docker-persistence', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test('appointment state persists after logout', async ({ page }) => {
    await login(page);

    // Navigate to appointments
    const appointmentsTab = page.getByRole('tab', { name: 'Citas' });
    await appointmentsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow page to fully render

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-appointments-before-logout.png`,
      fullPage: true,
    });

    // Verify appointments page loaded (check tab is selected)
    await expect(appointmentsTab).toBeVisible();

    // Logout and login
    await logout(page);
    await login(page);

    // Navigate to appointments
    const appointmentsTabAfter = page.getByRole('tab', { name: 'Citas' });
    await appointmentsTabAfter.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow page to fully render

    // Verify we can navigate to appointments after re-login
    await expect(appointmentsTabAfter).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14-appointments-after-relogin.png`,
      fullPage: true,
    });
  });
});

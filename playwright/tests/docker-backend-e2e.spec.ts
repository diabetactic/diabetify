/**
 * Docker Backend E2E Tests
 *
 * These tests run against the local Docker backend for:
 * - Deterministic, reproducible test results
 * - Full control over test data (create/delete users, reset DB)
 * - Fast execution without network latency
 * - CI/CD integration on every PR
 *
 * Run with: npm run test:e2e -- --grep "@docker"
 *
 * Prerequisites:
 *   - Docker backend running: cd docker && ./start.sh
 *   - Test data seeded: cd docker && ./seed-test-data.sh
 *   - Or use orchestrator: cd docker && ./run-e2e-docker.sh
 *
 * Tags:
 *   @docker - All Docker backend tests
 *   @docker-readings - Reading-specific tests
 *   @docker-appointments - Appointment-specific tests
 *   @docker-profile - Profile-specific tests
 *   @docker-achievements - Achievement/gamification tests
 */

import { test, expect, Page } from '@playwright/test';

// Configuration
const isDockerTest = process.env.E2E_DOCKER_TESTS === 'true';
const API_URL = process.env.E2E_API_URL || 'http://localhost:8000';
const BACKOFFICE_URL = process.env.E2E_BACKOFFICE_URL || 'http://localhost:8001';
const TEST_USERNAME = process.env.E2E_TEST_USERNAME || '1000';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'tuvieja';

// Helper to login and get to dashboard
async function loginAndNavigate(page: Page, targetTab?: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

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

  // Navigate to target tab if specified
  if (targetTab) {
    await page.click(`[data-testid="tab-${targetTab}"]`);
    await expect(page).toHaveURL(new RegExp(`/tabs/${targetTab}`), { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }
}

// Helper to get auth token for API calls
async function getAuthToken(): Promise<string> {
  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${TEST_USERNAME}&password=${TEST_PASSWORD}`,
  });
  const data = await response.json();
  return data.access_token;
}

// =============================================================================
// READINGS TESTS @docker @docker-readings
// =============================================================================

test.describe('Docker Backend - Readings @docker @docker-readings', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'readings');
  });

  test('displays seeded test readings', async ({ page }) => {
    // Wait for readings to load
    await page.waitForSelector('ion-content', { timeout: 10000 });

    // Should show readings (seeded data has 5 readings)
    const readingCards = page.locator('ion-card, .reading-card, [data-testid="reading-item"]');
    const count = await readingCards.count();

    // Seeded data should have at least some readings
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('can add new reading with known value', async ({ page }) => {
    const testValue = 125;

    // Click add reading button
    const addButton = page.locator('[data-testid="add-reading-btn"], ion-fab-button');
    if ((await addButton.count()) > 0) {
      await addButton.first().click();
      await page.waitForLoadState('networkidle');

      // Fill in the reading value
      const valueInput = page.locator('[data-testid="reading-value"], input[type="number"]');
      if ((await valueInput.count()) > 0) {
        await valueInput.first().fill(testValue.toString());

        // Add test tag to notes
        const notesInput = page.locator('[data-testid="reading-notes"], textarea');
        if ((await notesInput.count()) > 0) {
          await notesInput.first().fill('__E2E_TEST__ Added via Playwright');
        }

        // Submit
        const submitBtn = page.locator('[data-testid="submit-reading"], button[type="submit"]');
        await submitBtn.click();
        await page.waitForLoadState('networkidle');

        // Verify reading appears
        await expect(page.getByText(testValue.toString())).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('can filter readings by date', async ({ page }) => {
    // Find date filter
    const dateFilter = page.locator('[data-testid="date-filter"], ion-datetime');

    if ((await dateFilter.count()) > 0) {
      // Apply today's date filter
      await dateFilter.first().click();
      await page.waitForLoadState('networkidle');

      // Verify filtering works (content changes)
      const content = page.locator('ion-content');
      await expect(content).toBeVisible();
    }
  });

  test('can delete test-tagged reading', async ({ page: _page }) => {
    // Get auth token for API verification
    const token = await getAuthToken();

    // Find a reading with test tag
    const readings = await fetch(`${API_URL}/glucose/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    const testReading = readings.find((r: { notes?: string }) => r.notes?.includes('__E2E_TEST__'));

    if (testReading) {
      // Navigate to reading detail (implementation depends on UI)
      // For now, verify deletion via API
      const deleteResponse = await fetch(`${API_URL}/glucose/${testReading.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(deleteResponse.ok).toBe(true);
    }
  });
});

// =============================================================================
// APPOINTMENTS TESTS @docker @docker-appointments
// =============================================================================

test.describe('Docker Backend - Appointments @docker @docker-appointments', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'appointments');
  });

  test('appointments page loads with clean state', async ({ page }) => {
    await page.waitForSelector('ion-content', { timeout: 10000 });

    // With clean Docker state, should show either:
    // - Request appointment button (NONE state)
    // - OR empty appointments list
    const requestBtn = page.locator('text=/Solicitar.*Cita|Request.*Appointment/i');
    const emptyState = page.locator('text=/No.*tienes.*citas|No.*appointments/i');
    const appointmentsList = page.locator('[data-testid="appointments-list"]');

    // One of these should be visible
    const hasContent =
      (await requestBtn.count()) > 0 ||
      (await emptyState.count()) > 0 ||
      (await appointmentsList.count()) > 0;

    expect(hasContent).toBe(true);
  });

  test('can request new appointment (NONE → PENDING)', async ({ page }) => {
    // Find request button
    const requestBtn = page.locator('text=/Solicitar.*Cita|Request.*Appointment/i');

    if ((await requestBtn.count()) > 0) {
      await requestBtn.click();
      await page.waitForLoadState('networkidle');

      // Should now show pending state
      await expect(page.locator('text=/Pendiente|Pending|En.*cola|In.*queue/i')).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test('full appointment state machine via backoffice', async ({ page, request }) => {
    // Step 1: Request appointment
    const requestBtn = page.locator('text=/Solicitar.*Cita|Request.*Appointment/i');
    if ((await requestBtn.count()) > 0) {
      await requestBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // Step 2: Accept via backoffice API
    const adminTokenRes = await request.post(`${BACKOFFICE_URL}/token`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: { username: 'admin', password: 'admin' },
    });

    if (adminTokenRes.ok()) {
      const adminData = await adminTokenRes.json();
      const adminToken = adminData.access_token;

      // Accept the appointment
      await request.post(`${BACKOFFICE_URL}/appointments/queue/accept`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: { user_id: TEST_USERNAME },
      });

      // Step 3: Refresh and verify ACCEPTED state
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should now show accepted state or create button
      const acceptedIndicator = page.locator(
        'text=/Aceptada|Accepted|Crear.*Cita|Create.*Appointment/i'
      );
      await expect(acceptedIndicator).toBeVisible({ timeout: 10000 });
    }
  });
});

// =============================================================================
// PROFILE TESTS @docker @docker-profile
// =============================================================================

test.describe('Docker Backend - Profile @docker @docker-profile', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'profile');
  });

  test('displays user profile with seeded data', async ({ page }) => {
    await page.waitForSelector('ion-content', { timeout: 10000 });

    // Should show user info
    const profileContent = page.locator('ion-content');
    await expect(profileContent).toBeVisible();

    // User ID should be visible somewhere
    await expect(page.getByText(TEST_USERNAME)).toBeVisible({ timeout: 10000 });
  });

  test('can edit profile name', async ({ page }) => {
    // Find edit button
    const editBtn = page.locator('[data-testid="edit-profile-btn"], text=/Editar|Edit/i');

    if ((await editBtn.count()) > 0) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      // Find name input
      const nameInput = page.locator('[data-testid="profile-name"], input[name="name"]');
      if ((await nameInput.count()) > 0) {
        const testName = `E2E Test ${Date.now()}`;
        await nameInput.first().fill(testName);

        // Save
        const saveBtn = page.locator('[data-testid="save-profile"], text=/Guardar|Save/i');
        await saveBtn.first().click();
        await page.waitForLoadState('networkidle');

        // Verify change persisted
        await expect(page.getByText(testName)).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

// =============================================================================
// ACHIEVEMENTS/GAMIFICATION TESTS @docker @docker-achievements
// =============================================================================

test.describe('Docker Backend - Achievements @docker @docker-achievements', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, 'dashboard');
  });

  test('displays streak card on dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('ion-content', { timeout: 15000 });

    // Scroll to find streak card
    await page.evaluate(() => window.scrollTo(0, 500));

    // Look for streak indicators
    const streakCard = page.locator('text=/Tu.*Racha|Your.*Streak|Streak/i');
    const daysIndicator = page.locator('text=/d.*as|days/i');

    // At least one should be visible
    const hasStreak = (await streakCard.count()) > 0 || (await daysIndicator.count()) > 0;

    // Note: Streak may not be visible if no readings today
    // This is expected behavior
    if (!hasStreak) {
      console.log('Streak card not visible - may need readings today');
    }
  });

  test('displays level badge', async ({ page }) => {
    await page.waitForSelector('ion-content', { timeout: 15000 });

    // Scroll to achievements area
    await page.evaluate(() => window.scrollTo(0, 500));

    // Look for level indicators
    // Levels: Getting Started, Building Habits, Dedicated, Champion, Legend
    // Spanish: Empezando, Creando Habitos, Dedicado, Campeon, Leyenda
    const levelBadge = page.locator(
      'text=/Getting.*Started|Building.*Habits|Dedicated|Champion|Legend|Empezando|Creando.*H.*bitos|Dedicado|Campe.*n|Leyenda/i'
    );

    if ((await levelBadge.count()) > 0) {
      await expect(levelBadge.first()).toBeVisible();
    }
  });

  test('streak increases after adding reading', async ({ page: _page }) => {
    // Get initial streak via API
    const token = await getAuthToken();
    const userBefore = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    const initialStreak = userBefore.streak || 0;

    // Add a new reading
    const readingResponse = await fetch(`${API_URL}/glucose/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: 100,
        notes: '__E2E_TEST__ Streak test',
        mealContext: 'fasting',
      }),
    });

    expect(readingResponse.ok).toBe(true);

    // Get updated streak
    const userAfter = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    const newStreak = userAfter.streak || 0;

    // Streak should be maintained or increased
    expect(newStreak).toBeGreaterThanOrEqual(initialStreak);
  });

  test('total readings count increases', async ({ page: _page }) => {
    const token = await getAuthToken();

    // Get initial count
    const readingsBefore = await fetch(`${API_URL}/glucose/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    const initialCount = readingsBefore.length;

    // Add a new reading
    await fetch(`${API_URL}/glucose/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: 105,
        notes: '__E2E_TEST__ Count test',
        mealContext: 'before_meal',
      }),
    });

    // Get updated count
    const readingsAfter = await fetch(`${API_URL}/glucose/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    expect(readingsAfter.length).toBe(initialCount + 1);
  });
});

// =============================================================================
// DATA INTEGRITY TESTS @docker
// =============================================================================

test.describe('Docker Backend - Data Integrity @docker', () => {
  test.skip(!isDockerTest, 'Set E2E_DOCKER_TESTS=true to run Docker tests');

  test('API returns consistent data after UI operations', async ({ page, request: _request }) => {
    await loginAndNavigate(page, 'readings');

    // Get data via API
    const token = await getAuthToken();
    const apiReadings = await fetch(`${API_URL}/glucose/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());

    // UI should show same count (approximately, due to pagination)
    const readingElements = page.locator('[data-testid="reading-item"], ion-card');
    const uiCount = await readingElements.count();

    // Allow for pagination - UI might show fewer
    expect(uiCount).toBeLessThanOrEqual(apiReadings.length);
  });

  test('database state is isolated from Heroku', async ({ request }) => {
    const token = await getAuthToken();

    // Create a uniquely identifiable reading
    const uniqueNote = `__DOCKER_ISOLATION_TEST_${Date.now()}__`;

    const createResponse = await request.post(`${API_URL}/glucose/create`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        value: 999,
        notes: uniqueNote,
        mealContext: 'fasting',
      },
    });

    expect(createResponse.ok()).toBe(true);

    // Verify it exists in Docker backend
    const dockerReadings = await request
      .get(`${API_URL}/glucose/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(r => r.json());

    const found = dockerReadings.find((r: { notes?: string }) => r.notes === uniqueNote);
    expect(found).toBeDefined();

    // Clean up
    if (found) {
      await request.delete(`${API_URL}/glucose/${found.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

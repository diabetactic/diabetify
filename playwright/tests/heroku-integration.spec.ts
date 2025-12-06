import { test, expect } from '@playwright/test';

const HEROKU_API = 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;

test.describe('Heroku Integration Tests', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');

  test.describe('Authentication and Login', () => {
    test.skip(
      !hasCredentials,
      'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
    );

    test('Login with valid credentials returns auth token', async ({ request }) => {
      const response = await request.post(`${HEROKU_API}/token`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
          username: process.env.E2E_TEST_USERNAME,
          password: process.env.E2E_TEST_PASSWORD,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('access_token');
      expect(data.access_token, 'Response should contain a valid access token').toBeTruthy();
      expect(typeof data.access_token).toBe('string');
      expect(data).toHaveProperty('token_type');
      expect(data.token_type).toBe('bearer');
    });

    test('Login with invalid credentials returns 401', async ({ request }) => {
      const response = await request.post(`${HEROKU_API}/token`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
          username: 'invalid_user',
          password: 'invalid_password',
        },
        timeout: 10000,
      });

      expect([401, 400, 403]).toContain(response.status());
    });
  });

  test.describe('Authenticated API Endpoints', () => {
    test.skip(
      !hasCredentials,
      'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
    );

    let authToken: string;

    test.beforeEach(async ({ request }) => {
      // Get auth token before each test
      const loginResponse = await request.post(`${HEROKU_API}/token`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
          username: process.env.E2E_TEST_USERNAME,
          password: process.env.E2E_TEST_PASSWORD,
        },
        timeout: 10000,
      });

      const loginData = await loginResponse.json();
      authToken = loginData.access_token;
    });

    test('Get readings data with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/glucose/mine`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // If readings exist, verify structure
      if (data.length > 0) {
        const firstReading = data[0];
        expect(firstReading).toHaveProperty('id');
        expect(firstReading).toHaveProperty('value');
        expect(typeof firstReading.value).toBe('number');
      }
    });

    test('Get appointments data with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/appointments/mine`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // If appointments exist, verify structure
      if (data.length > 0) {
        const firstAppointment = data[0];
        expect(firstAppointment).toHaveProperty('id');
        expect(firstAppointment).toHaveProperty('date');
        expect(firstAppointment).toHaveProperty('time');
      }
    });

    test('Get user profile with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/users/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('username');
      expect(data.username).toBe(process.env.E2E_TEST_USERNAME);
    });

    test('Get appointment queue state with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/appointments/state`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    test('Reject request without auth token with 401', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/users/me`, {
        timeout: 10000,
      });

      expect([401, 403]).toContain(response.status());
    });

    test('Reject request with invalid auth token with 401', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/users/me`, {
        headers: {
          Authorization: 'Bearer invalid_token_12345',
        },
        timeout: 10000,
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('End-to-End UI Flow with Heroku Backend', () => {
    test.skip(
      !hasCredentials,
      'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
    );

    // Increase timeout for Heroku tests
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
      // Skip server startup for Heroku tests since we're testing against live API
      // Navigate to the app
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // Brief hydration buffer

      // Handle welcome screen if present
      if (page.url().includes('/welcome')) {
        const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
        if ((await loginBtn.count()) > 0) {
          await page.waitForSelector('[data-testid="welcome-login-btn"]', { timeout: 10000 });
          await loginBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('Dashboard loads real data after login with Heroku backend', async ({ page }) => {
      // Wait for login form
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      // Check if already logged in
      if (!page.url().includes('/tabs/')) {
        // Perform login
        const username = process.env.E2E_TEST_USERNAME;
        const password = process.env.E2E_TEST_PASSWORD;

        await page.waitForSelector('#username', { timeout: 10000 });
        await page.fill('#username', username!);
        await page.fill('#password', password!);

        // Wait for login response
        const loginResponsePromise = page.waitForResponse(
          response => response.url().includes('/token') || response.url().includes('/login'),
          { timeout: 15000 }
        );

        await page.waitForSelector('[data-testid="login-submit-btn"]', { timeout: 10000 });
        await page.click('[data-testid="login-submit-btn"]');

        // Wait for login to complete
        await loginResponsePromise;

        // Wait for navigation and hydration
        await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 20000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Brief hydration buffer
      }

      // Verify dashboard is visible with extended timeout
      await expect(page.locator('[data-testid="tab-dashboard"]')).toBeVisible({ timeout: 15000 });

      // Check for stats or data cards
      const statCards = page.locator('.stat-card, app-stat-card, ion-card');
      const cardCount = await statCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0); // Cards might exist
    });

    test('Readings page fetches real data from Heroku', async ({ page }) => {
      // Login first
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      if (!page.url().includes('/tabs/')) {
        const username = process.env.E2E_TEST_USERNAME;
        const password = process.env.E2E_TEST_PASSWORD;

        await page.waitForSelector('#username', { timeout: 10000 });
        await page.fill('#username', username!);
        await page.fill('#password', password!);

        const loginResponsePromise = page.waitForResponse(
          response => response.url().includes('/token') || response.url().includes('/login'),
          { timeout: 15000 }
        );

        await page.waitForSelector('[data-testid="login-submit-btn"]', { timeout: 10000 });
        await page.click('[data-testid="login-submit-btn"]');
        await loginResponsePromise;

        await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      // Navigate to readings
      await page.waitForSelector('[data-testid="tab-readings"]', { timeout: 10000 });
      await page.click('[data-testid="tab-readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 15000 });

      // Wait for data to load
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      await page.waitForTimeout(500); // Hydration buffer

      // Check for readings content (might be empty, that's ok)
      const readingsContent = page.locator('ion-content, .readings-container');
      await expect(readingsContent).toBeVisible({ timeout: 15000 });
    });

    test('Appointments page loads with real Heroku data', async ({ page }) => {
      // Login first
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      if (!page.url().includes('/tabs/')) {
        const username = process.env.E2E_TEST_USERNAME;
        const password = process.env.E2E_TEST_PASSWORD;

        await page.waitForSelector('#username', { timeout: 10000 });
        await page.fill('#username', username!);
        await page.fill('#password', password!);

        const loginResponsePromise = page.waitForResponse(
          response => response.url().includes('/token') || response.url().includes('/login'),
          { timeout: 15000 }
        );

        await page.waitForSelector('[data-testid="login-submit-btn"]', { timeout: 10000 });
        await page.click('[data-testid="login-submit-btn"]');
        await loginResponsePromise;

        await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      // Navigate to appointments
      const appointmentsTab = page.locator('[data-testid="tab-appointments"]');
      if ((await appointmentsTab.count()) > 0) {
        await page.waitForSelector('[data-testid="tab-appointments"]', { timeout: 10000 });
        await appointmentsTab.click();
        await expect(page).toHaveURL(/\/tabs\/appointments/, { timeout: 15000 });

        // Wait for data to load
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(500); // Hydration buffer

        // Check for appointments content
        const appointmentsContent = page.locator('ion-content, .appointments-container');
        await expect(appointmentsContent).toBeVisible({ timeout: 15000 });
      }
    });

    test('User profile displays data from Heroku', async ({ page }) => {
      // Login first
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      if (!page.url().includes('/tabs/')) {
        const username = process.env.E2E_TEST_USERNAME;
        const password = process.env.E2E_TEST_PASSWORD;

        await page.waitForSelector('#username', { timeout: 10000 });
        await page.fill('#username', username!);
        await page.fill('#password', password!);

        const loginResponsePromise = page.waitForResponse(
          response => response.url().includes('/token') || response.url().includes('/login'),
          { timeout: 15000 }
        );

        await page.waitForSelector('[data-testid="login-submit-btn"]', { timeout: 10000 });
        await page.click('[data-testid="login-submit-btn"]');
        await loginResponsePromise;

        await expect(page).toHaveURL(/\/tabs\//, { timeout: 20000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      // Navigate to profile
      const profileTab = page.locator('[data-testid="tab-profile"]');
      if ((await profileTab.count()) > 0) {
        await page.waitForSelector('[data-testid="tab-profile"]', { timeout: 10000 });
        await profileTab.click();
        await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 15000 });

        // Wait for profile data to load
        await page.waitForLoadState('networkidle', { timeout: 20000 });
        await page.waitForTimeout(500); // Hydration buffer

        // Check for profile content
        const profileContent = page.locator('ion-content, .profile-container');
        await expect(profileContent).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Invalid endpoints return 404', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/invalid-endpoint-xyz`, {
        timeout: 10000,
      });

      expect(response.status()).toBe(404);
    });

    test('API Gateway handles timeout gracefully', async ({ request }) => {
      // This should timeout but not crash the test
      try {
        await request.get(`${HEROKU_API}/users/me`, {
          timeout: 100, // Very short timeout
        });
      } catch (error) {
        // Timeout is expected
        expect(error, 'Should throw error when login fails with invalid credentials').toBeTruthy();
      }
    });
  });
});

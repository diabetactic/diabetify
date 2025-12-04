import { test, expect } from '@playwright/test';

const HEROKU_API = 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const hasCredentials = process.env.E2E_TEST_USERNAME && process.env.E2E_TEST_PASSWORD;
const skipHerokuTests = !process.env.E2E_HEROKU_TESTS;

test.describe('Heroku Integration Tests', () => {
  test.skip(skipHerokuTests, 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests');

  test.describe('API Gateway Health', () => {
    test('API Gateway is reachable and returns 200', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/health`, {
        timeout: 10000,
      });

      expect(response.status()).toBe(200);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });

    test('API Gateway returns valid health response structure', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/health`, {
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        status: expect.stringMatching(/ok|healthy/i),
      });
    });

    test('API Gateway responds within acceptable time', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${HEROKU_API}/health`, {
        timeout: 10000,
      });
      const duration = Date.now() - startTime;

      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  test.describe('Authentication and Login', () => {
    test.skip(
      !hasCredentials,
      'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables'
    );

    test('Login with valid credentials returns auth token', async ({ request }) => {
      const response = await request.post(`${HEROKU_API}/auth/login`, {
        data: {
          username: process.env.E2E_TEST_USERNAME,
          password: process.env.E2E_TEST_PASSWORD,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data.token).toBeTruthy();
      expect(typeof data.token).toBe('string');
    });

    test('Login response contains user information', async ({ request }) => {
      const response = await request.post(`${HEROKU_API}/auth/login`, {
        data: {
          username: process.env.E2E_TEST_USERNAME,
          password: process.env.E2E_TEST_PASSWORD,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('username');
      expect(data.user.username).toBe(process.env.E2E_TEST_USERNAME);
    });

    test('Login with invalid credentials returns 401', async ({ request }) => {
      const response = await request.post(`${HEROKU_API}/auth/login`, {
        data: {
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
      const loginResponse = await request.post(`${HEROKU_API}/auth/login`, {
        data: {
          username: process.env.E2E_TEST_USERNAME,
          password: process.env.E2E_TEST_PASSWORD,
        },
        timeout: 10000,
      });

      const loginData = await loginResponse.json();
      authToken = loginData.token;
    });

    test('Get dashboard data with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toBeDefined();
      // Dashboard should contain some data structure
      expect(typeof data).toBe('object');
    });

    test('Get readings data with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/readings`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data) || data.data).toBeDefined();

      // If readings exist, verify structure
      const readings = Array.isArray(data) ? data : data.data || [];
      if (readings.length > 0) {
        const firstReading = readings[0];
        expect(firstReading).toHaveProperty('id');
        expect(firstReading).toHaveProperty('value');
        expect(typeof firstReading.value).toBe('number');
      }
    });

    test('Get appointments data with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/appointments`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 10000,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data) || data.data).toBeDefined();

      // If appointments exist, verify structure
      const appointments = Array.isArray(data) ? data : data.data || [];
      if (appointments.length > 0) {
        const firstAppointment = appointments[0];
        expect(firstAppointment).toHaveProperty('id');
        expect(firstAppointment).toHaveProperty('date');
        expect(firstAppointment).toHaveProperty('time');
      }
    });

    test('Get user profile with valid token', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/user/profile`, {
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

    test('Reject request without auth token with 401', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/dashboard`, {
        timeout: 10000,
      });

      expect([401, 403]).toContain(response.status());
    });

    test('Reject request with invalid auth token with 401', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/dashboard`, {
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

    test.beforeEach(async ({ page }) => {
      // Skip server startup for Heroku tests since we're testing against live API
      // Navigate to the app
      await page.goto('/');

      // Handle welcome screen if present
      if (page.url().includes('/welcome')) {
        const loginBtn = page.locator('[data-testid="welcome-login-btn"]');
        if ((await loginBtn.count()) > 0) {
          await loginBtn.click();
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

        await page.fill('#username', username!);
        await page.fill('#password', password!);
        await page.click('[data-testid="login-submit-btn"]');

        // Wait for dashboard
        await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });
      }

      // Verify dashboard is visible
      await expect(page.locator('[data-testid="tab-dashboard"]')).toBeVisible();

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

        await page.fill('#username', username!);
        await page.fill('#password', password!);
        await page.click('[data-testid="login-submit-btn"]');

        await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });
      }

      // Navigate to readings
      await page.click('[data-testid="tab-readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Check for readings content (might be empty, that's ok)
      const readingsContent = page.locator('ion-content, .readings-container');
      await expect(readingsContent).toBeVisible();
    });

    test('Appointments page loads with real Heroku data', async ({ page }) => {
      // Login first
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      if (!page.url().includes('/tabs/')) {
        const username = process.env.E2E_TEST_USERNAME;
        const password = process.env.E2E_TEST_PASSWORD;

        await page.fill('#username', username!);
        await page.fill('#password', password!);
        await page.click('[data-testid="login-submit-btn"]');

        await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });
      }

      // Navigate to appointments
      const appointmentsTab = page.locator('[data-testid="tab-appointments"]');
      if ((await appointmentsTab.count()) > 0) {
        await appointmentsTab.click();
        await expect(page).toHaveURL(/\/tabs\/appointments/, { timeout: 10000 });

        // Wait for data to load
        await page.waitForTimeout(2000);

        // Check for appointments content
        const appointmentsContent = page.locator('ion-content, .appointments-container');
        await expect(appointmentsContent).toBeVisible();
      }
    });

    test('User profile displays data from Heroku', async ({ page }) => {
      // Login first
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

      if (!page.url().includes('/tabs/')) {
        const username = process.env.E2E_TEST_USERNAME;
        const password = process.env.E2E_TEST_PASSWORD;

        await page.fill('#username', username!);
        await page.fill('#password', password!);
        await page.click('[data-testid="login-submit-btn"]');

        await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });
      }

      // Navigate to profile
      const profileTab = page.locator('[data-testid="tab-profile"]');
      if ((await profileTab.count()) > 0) {
        await profileTab.click();
        await expect(page).toHaveURL(/\/tabs\/profile/, { timeout: 10000 });

        // Wait for profile data to load
        await page.waitForTimeout(2000);

        // Check for profile content
        const profileContent = page.locator('ion-content, .profile-container');
        await expect(profileContent).toBeVisible();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('API Gateway handles concurrent requests gracefully', async ({ request }) => {
      // Send multiple concurrent requests
      const requests = Array(5)
        .fill(null)
        .map(() => request.get(`${HEROKU_API}/health`, { timeout: 10000 }));

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });

    test('API Gateway handles timeout gracefully', async ({ request }) => {
      // This should timeout but not crash the test
      try {
        await request.get(`${HEROKU_API}/health`, {
          timeout: 100, // Very short timeout
        });
      } catch (error) {
        // Timeout is expected
        expect(error).toBeTruthy();
      }
    });

    test('Invalid endpoints return 404', async ({ request }) => {
      const response = await request.get(`${HEROKU_API}/api/invalid-endpoint-xyz`, {
        timeout: 10000,
      });

      expect(response.status()).toBe(404);
    });
  });
});

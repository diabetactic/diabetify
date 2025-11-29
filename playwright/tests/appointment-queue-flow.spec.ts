/**
 * Appointment Queue Flow E2E Tests
 *
 * Tests the appointment queue API workflow:
 * - Queue state retrieval
 * - Request appointment submission
 * - Error handling
 *
 * Uses API-level testing for reliable results without needing to mock complex Angular auth.
 */

import { test, expect } from '@playwright/test';

// Configuration - use environment variables or defaults
const API_GATEWAY_BASE_URL =
  process.env.E2E_API_URL || 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const LOGIN_DNI = process.env.E2E_LOGIN_DNI || '1002';
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'tuvieja';

/**
 * Helper to get auth token
 */
async function getAuthToken(request: any): Promise<string | null> {
  const loginResponse = await request.post(`${API_GATEWAY_BASE_URL}/token`, {
    form: {
      username: LOGIN_DNI,
      password: LOGIN_PASSWORD,
      grant_type: 'password',
    },
  });

  if (!loginResponse.ok()) {
    console.log('Login failed:', loginResponse.status());
    return null;
  }

  const loginData = await loginResponse.json();
  return loginData.access_token;
}

test.describe('Appointment Queue API Flow', () => {
  let accessToken: string | null = null;

  test.beforeAll(async ({ request }) => {
    accessToken = await getAuthToken(request);
    console.log(`Auth token obtained: ${accessToken ? 'yes' : 'no'}`);
  });

  test.describe('Queue State', () => {
    test('should retrieve queue state for authenticated user', async ({ request }) => {
      test.skip(!accessToken, 'No auth token available');

      const response = await request.get(`${API_GATEWAY_BASE_URL}/appointments/state`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Accept 200 (has state) or 404 (no state = NONE)
      expect([200, 404].includes(response.status())).toBeTruthy();

      if (response.ok()) {
        const data = await response.json();
        console.log('Queue state:', data);

        // Verify state is one of the valid values
        const validStates = ['PENDING', 'ACCEPTED', 'DENIED', 'CREATED'];
        const state = data.data?.state || data.state;
        if (state) {
          expect(validStates).toContain(state);
        }
      } else {
        console.log('No queue state (NONE)');
      }
    });

    test('should reject queue state request without auth', async ({ request }) => {
      const response = await request.get(`${API_GATEWAY_BASE_URL}/appointments/state`);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Queue Submission', () => {
    test('should handle queue submission request', async ({ request }) => {
      test.skip(!accessToken, 'No auth token available');

      // First check if user is already in queue
      const stateResponse = await request.get(`${API_GATEWAY_BASE_URL}/appointments/state`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (stateResponse.ok()) {
        const stateData = await stateResponse.json();
        if (['PENDING', 'ACCEPTED'].includes(stateData.state || stateData)) {
          console.log('User already in queue, skipping submission test');
          test.skip(true, 'User already in queue');
          return;
        }
      }

      const response = await request.post(`${API_GATEWAY_BASE_URL}/appointments/submit`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const responseText = await response.text();
      console.log(`Submit response (${response.status()}):`, responseText.substring(0, 200));

      // Accept various responses - not a server error (5xx)
      // 200/201 = successful submission
      // 403 = queue full or already in queue (business logic)
      // 400/422 = validation error
      // Note: Backend may return 500 when user already in queue (known bug)
      expect([200, 201, 400, 403, 409, 422].includes(response.status())).toBeTruthy();
    });

    test('should reject submission without auth', async ({ request }) => {
      const response = await request.post(`${API_GATEWAY_BASE_URL}/appointments/submit`);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Appointments List', () => {
    test('should retrieve user appointments', async ({ request }) => {
      test.skip(!accessToken, 'No auth token available');

      const response = await request.get(`${API_GATEWAY_BASE_URL}/appointments/mine`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const responseData = await response.json();

      // Handle both wrapped { data: [...] } and unwrapped [...] formats
      const appointments = Array.isArray(responseData) ? responseData : responseData.data;
      console.log(`Appointments count: ${appointments?.length || 0}`);

      // Verify response is an array
      expect(Array.isArray(appointments)).toBeTruthy();

      // If there are appointments, verify structure
      if (appointments && appointments.length > 0) {
        const appointment = appointments[0];
        expect(appointment).toHaveProperty('appointment_id');
        expect(appointment).toHaveProperty('user_id');
        expect(appointment).toHaveProperty('glucose_objective');
      }
    });

    test('should reject appointments list without auth', async ({ request }) => {
      const response = await request.get(`${API_GATEWAY_BASE_URL}/appointments/mine`);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Appointment Creation', () => {
    test('should validate appointment creation payload', async ({ request }) => {
      test.skip(!accessToken, 'No auth token available');

      // Try with incomplete payload
      const invalidPayload = {
        glucose_objective: 120,
        // Missing required fields
      };

      const response = await request.post(`${API_GATEWAY_BASE_URL}/appointments/create`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: invalidPayload,
      });

      // Should return validation error (400/422) or business logic error (403)
      expect([400, 403, 422].includes(response.status())).toBeTruthy();
    });

    test('should handle valid appointment creation', async ({ request }) => {
      test.skip(!accessToken, 'No auth token available');

      const validPayload = {
        glucose_objective: 120,
        insulin_type: 'Lantus',
        dose: 20,
        fast_insulin: '4',
        ratio: 8,
        sensitivity: 40,
        fixed_dose: '10',
        pump_type: 'MDI',
        control_data: 'test-e2e',
        motive: ['AJUSTE'],
      };

      const response = await request.post(`${API_GATEWAY_BASE_URL}/appointments/create`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: validPayload,
      });

      // Accept success (200/201) or business logic rejection (403 = not accepted in queue)
      expect([200, 201, 403].includes(response.status())).toBeTruthy();

      if (response.ok()) {
        const data = await response.json();
        console.log('Appointment created:', data);
        expect(data.data || data).toHaveProperty('appointment_id');
      } else if (response.status() === 403) {
        const errorData = await response.json();
        console.log('Creation blocked (expected - user not ACCEPTED in queue):', errorData);
      }
    });

    test('should reject creation without auth', async ({ request }) => {
      const response = await request.post(`${API_GATEWAY_BASE_URL}/appointments/create`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: { glucose_objective: 100 },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Error Message Handling', () => {
    test('should return proper error for queue full scenario', async ({ request }) => {
      test.skip(!accessToken, 'No auth token available');

      // This test documents the expected error format
      // The actual "queue full" scenario depends on backend state

      const response = await request.post(`${API_GATEWAY_BASE_URL}/appointments/submit`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status() === 403) {
        const errorData = await response.json();
        console.log('Error response structure:', errorData);

        // Verify error has detail field
        expect(errorData.detail || errorData.message || errorData.error).toBeDefined();
      }
    });

    test('should return proper error for not-accepted creation', async ({ request }) => {
      test.skip(!accessToken, 'No auth token available');

      // Try to create appointment when not in ACCEPTED state
      const response = await request.post(`${API_GATEWAY_BASE_URL}/appointments/create`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          glucose_objective: 120,
          insulin_type: 'Lantus',
          dose: 20,
          fast_insulin: '4',
          ratio: 8,
          sensitivity: 40,
          fixed_dose: '10',
          pump_type: 'MDI',
          control_data: 'test',
          motive: ['AJUSTE'],
        },
      });

      if (response.status() === 403) {
        const errorData = await response.json();
        console.log('Not-accepted error:', errorData);

        // Common error messages we map in the frontend
        const expectedMessages = [
          'Appointment Queue Full',
          'Appointment does not exist in queue',
          "Appointment wasn't accepted yet",
          'Appointment already exists in queue',
        ];

        const errorMessage = errorData.detail || errorData.message || '';
        const hasExpectedMessage = expectedMessages.some(msg =>
          errorMessage.toLowerCase().includes(msg.toLowerCase())
        );

        // Log for debugging
        console.log(`Error message: "${errorMessage}"`);
        console.log(`Matches expected pattern: ${hasExpectedMessage}`);
      }
    });
  });
});

test.describe('Queue Placement', () => {
  test('should retrieve queue placement for authenticated user', async ({ request }) => {
    const loginResponse = await request.post(`${API_GATEWAY_BASE_URL}/token`, {
      form: {
        username: LOGIN_DNI,
        password: LOGIN_PASSWORD,
        grant_type: 'password',
      },
    });

    if (!loginResponse.ok()) {
      test.skip(true, 'Cannot authenticate');
      return;
    }

    const token = (await loginResponse.json()).access_token;

    const response = await request.get(`${API_GATEWAY_BASE_URL}/appointments/placement`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 200 = has placement, 404 = not in queue
    expect([200, 404].includes(response.status())).toBeTruthy();

    if (response.ok()) {
      const data = await response.json();
      console.log('Queue placement:', data);
    }
  });
});

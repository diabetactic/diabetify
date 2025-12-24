/**
 * Backend Integration Tests - Appointments & Auth
 */

import {
  setupBackendIntegrationTests,
  teardownBackendIntegrationTests,
  authenticatedGet,
  TEST_USER,
  HEALTH_ENDPOINTS,
  SERVICE_URLS,
  isBackendAvailable,
} from '../../helpers/backend-services.helper';

// Check backend availability before running any tests
const runTests = async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    return false;
  }
  return true;
};

// Use conditional describe to skip entire suite if backend unavailable
let shouldRun = false;

beforeAll(async () => {
  shouldRun = await runTests();
}, 10000);

// Helper to create conditional tests
const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Backend Integration - Appointments & Auth', () => {
  let authToken: string;

  beforeAll(async () => {
    if (!shouldRun) {
      return;
    }
    authToken = await setupBackendIntegrationTests();
  }, 60000);

  afterAll(() => {
    if (shouldRun) {
      teardownBackendIntegrationTests();
    }
  });

  describe('Health Checks', () => {
    conditionalIt('should verify API Gateway is healthy', async () => {
      // API Gateway exposes /docs endpoint which returns HTML/JSON for Swagger
      const response = await fetch(HEALTH_ENDPOINTS.apiGateway);
      expect(response.ok).toBe(true);
    });

    conditionalIt('should verify API Gateway proxies microservices correctly', async () => {
      // Verify the API Gateway correctly proxies to the backend services
      // by checking endpoints that require service communication
      const endpoints = [
        { name: 'Token endpoint', url: `${SERVICE_URLS.apiGateway}/token`, method: 'OPTIONS' },
        { name: 'Users endpoint', url: `${SERVICE_URLS.apiGateway}/users/me`, method: 'OPTIONS' },
        {
          name: 'Glucose endpoint',
          url: `${SERVICE_URLS.apiGateway}/glucose/mine`,
          method: 'OPTIONS',
        },
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint.url, { method: endpoint.method });
        // OPTIONS should return 200 or 204 if endpoint exists
        // May return 405 if method not allowed but endpoint exists
        if (![200, 204, 405].includes(response.status)) {
          throw new Error(`${endpoint.name} should be reachable but returned ${response.status}`);
        }
      }
    });
  });

  describe('Authentication', () => {
    conditionalIt('should have valid JWT token', async () => {
      expect(authToken).toBeTruthy();
      expect(authToken.split('.').length).toBe(3);
    });

    conditionalIt('should reject requests without auth', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`);
      expect(response.status).toBe(401);
    });
  });

  describe('User Profile API', () => {
    conditionalIt('should fetch current user profile', async () => {
      const profile = await authenticatedGet('/users/me', authToken);
      expect(profile.dni).toBe(TEST_USER.dni);
      expect(profile.email).toBeDefined();
    });
  });

  describe('Appointments API', () => {
    conditionalIt('should fetch appointments list', async () => {
      const appointments = await authenticatedGet('/appointments/mine', authToken);
      expect(Array.isArray(appointments)).toBe(true);
    });

    conditionalIt('should have correct appointment structure', async () => {
      const appointments = await authenticatedGet('/appointments/mine', authToken);
      if (appointments.length > 0) {
        expect(appointments[0].appointment_id).toBeDefined();
        expect(appointments[0].user_id).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    conditionalIt('should handle 404', async () => {
      try {
        await authenticatedGet('/does/not/exist', authToken);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('404');
      }
    });
  });
});

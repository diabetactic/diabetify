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
} from '../../helpers/backend-services.helper';

describe('Backend Integration - Appointments & Auth', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await setupBackendIntegrationTests();
  }, 60000);

  afterAll(() => {
    teardownBackendIntegrationTests();
  });

  describe('Health Checks', () => {
    it('should verify API Gateway is healthy', async () => {
      const response = await fetch(HEALTH_ENDPOINTS.apiGateway);
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(['ok', 'healthy']).toContain(data.status);
    });

    it('should verify all microservices are healthy', async () => {
      const checks = [
        { name: 'API Gateway', url: HEALTH_ENDPOINTS.apiGateway },
        { name: 'Glucoserver', url: HEALTH_ENDPOINTS.glucoserver },
        { name: 'Login Service', url: HEALTH_ENDPOINTS.login },
        { name: 'Appointments', url: HEALTH_ENDPOINTS.appointments },
      ];

      for (const check of checks) {
        const response = await fetch(check.url);
        expect(response.ok).withContext(`${check.name} should be healthy`).toBe(true);
      }
    });
  });

  describe('Authentication', () => {
    it('should have valid JWT token', () => {
      expect(authToken).toBeTruthy();
      expect(authToken.split('.').length).toBe(3);
    });

    it('should reject requests without auth', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`);
      expect(response.status).toBe(401);
    });
  });

  describe('User Profile API', () => {
    it('should fetch current user profile', async () => {
      const profile = await authenticatedGet('/users/me', authToken);
      expect(profile.dni).toBe(TEST_USER.dni);
      expect(profile.email).toBeDefined();
    });
  });

  describe('Appointments API', () => {
    it('should fetch appointments list', async () => {
      const appointments = await authenticatedGet('/appointments/mine', authToken);
      expect(Array.isArray(appointments)).toBe(true);
    });

    it('should have correct appointment structure', async () => {
      const appointments = await authenticatedGet('/appointments/mine', authToken);
      if (appointments.length > 0) {
        expect(appointments[0].appointment_id).toBeDefined();
        expect(appointments[0].user_id).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle 404', async () => {
      try {
        await authenticatedGet('/does/not/exist', authToken);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('404');
      }
    });
  });
});

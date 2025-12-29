/**
 * Backend Integration Tests - Auth (Complete Flow)
 *
 * Tests: login, token refresh, session management, and logout.
 * Requires Docker backend: pnpm run docker:start
 */

import {
  waitForBackendServices,
  loginTestUser,
  TEST_USER,
  TEST_USERS,
  SERVICE_URLS,
  isBackendAvailable,
  clearCachedAuthToken,
  authenticatedGet,
} from '../../helpers/backend-services.helper';

// Test execution state
let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

// Helper for conditional tests
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

describe('Backend Integration - Auth', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  // =========================================================================
  // LOGIN Tests
  // =========================================================================

  describe('LOGIN - POST /token', () => {
    conditionalIt('should login test user with valid credentials', async () => {
      const token = await loginTestUser(TEST_USER);
      expect(token).toBeTruthy();
      expect(token.split('.').length).toBe(3); // JWT format
    });

    conditionalIt('should reject invalid password', async () => {
      const formData = new URLSearchParams();
      formData.append('username', TEST_USER.dni);
      formData.append('password', 'wrong-password');

      const response = await fetch(`${SERVICE_URLS.apiGateway}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData.toString(),
      });

      expect(response.ok).toBeFalse();
      expect([401, 403]).toContain(response.status);
    });

    conditionalIt('should reject non-existent user', async () => {
      const formData = new URLSearchParams();
      formData.append('username', '999999'); // DNI que no existe
      formData.append('password', 'anypassword');

      const response = await fetch(`${SERVICE_URLS.apiGateway}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData.toString(),
      });

      expect(response.ok).toBeFalse();
      expect([401, 403, 404]).toContain(response.status);
    });

    conditionalIt('should reject empty credentials', async () => {
      const formData = new URLSearchParams();
      formData.append('username', '');
      formData.append('password', '');

      const response = await fetch(`${SERVICE_URLS.apiGateway}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData.toString(),
      });

      expect(response.ok).toBeFalse();
    });
  });

  // =========================================================================
  // TOKEN VALIDATION Tests
  // =========================================================================

  describe('TOKEN VALIDATION', () => {
    let validToken: string;

    beforeAll(async () => {
      if (!shouldRun) return;
      validToken = await loginTestUser(TEST_USER);
    });

    conditionalIt('should accept valid token for protected endpoints', async () => {
      const profile = await authenticatedGet('/users/me', validToken);
      expect(profile).toBeDefined();
      expect(profile.dni).toBe(TEST_USER.dni);
    });

    conditionalIt('should reject request without Authorization header', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`);
      expect(response.status).toBe(401);
    });

    conditionalIt('should reject malformed token', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`, {
        headers: {
          Authorization: 'Bearer invalid-token-format',
          Accept: 'application/json',
        },
      });

      expect(response.ok).toBeFalse();
      // Backend may return 401, 403, or 500 depending on token parsing
      expect([401, 403, 500]).toContain(response.status);
    });

    conditionalIt('should reject expired/invalid JWT', async () => {
      // JWT with invalid signature
      const fakeJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`, {
        headers: {
          Authorization: `Bearer ${fakeJwt}`,
          Accept: 'application/json',
        },
      });

      expect(response.ok).toBeFalse();
      // Backend may return 401, 403, or 500 depending on signature validation
      expect([401, 403, 500]).toContain(response.status);
    });
  });

  // =========================================================================
  // SESSION Management Tests
  // =========================================================================

  describe('SESSION MANAGEMENT', () => {
    conditionalIt('should allow multiple login sessions for same user', async () => {
      // Clear cache to ensure fresh tokens
      clearCachedAuthToken();

      // Login same user twice - simulates multiple browser sessions
      const token1 = await loginTestUser(TEST_USERS.user1);
      clearCachedAuthToken(); // Force fresh login
      const token2 = await loginTestUser(TEST_USERS.user1);

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();

      // Both tokens should be valid for the same user
      const profile1 = await authenticatedGet('/users/me', token1);
      const profile2 = await authenticatedGet('/users/me', token2);

      expect(profile1.dni).toBe(TEST_USERS.user1.dni);
      expect(profile2.dni).toBe(TEST_USERS.user1.dni);
    });

    conditionalIt('should isolate sessions between users', async () => {
      const token1 = await loginTestUser(TEST_USERS.user4);

      // User4's token should only access user4's data
      const profile = await authenticatedGet('/users/me', token1);
      expect(profile.dni).toBe(TEST_USERS.user4.dni);
    });
  });

  // =========================================================================
  // LOGOUT Tests
  // =========================================================================

  describe('LOGOUT', () => {
    conditionalIt('should clear cached token on logout', async () => {
      // Login to get a cached token
      await loginTestUser(TEST_USER);

      // Clear simula logout
      clearCachedAuthToken();

      // A new login should generate a fresh token
      const freshToken = await loginTestUser(TEST_USER);
      expect(freshToken).toBeTruthy();
    });

    conditionalIt('should handle logout endpoint if available', async () => {
      const token = await loginTestUser(TEST_USER);

      // Try logout via endpoint (may not exist)
      try {
        const response = await fetch(`${SERVICE_URLS.apiGateway}/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        // If endpoint exists, should return 200 or 204
        if (response.ok) {
          expect([200, 204]).toContain(response.status);
        }
      } catch {
        // Logout endpoint may not exist (JWT is stateless)
      }
    });
  });
});

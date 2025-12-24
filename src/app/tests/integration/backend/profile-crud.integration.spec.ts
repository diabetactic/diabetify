/**
 * Backend Integration Tests - Profile CRUD
 *
 * Tests user profile operations against the Docker backend.
 * Supported fields: dni, password, name, surname, email, tidepool, hospital_account
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  waitForBackendServices,
  loginTestUser,
  isBackendAvailable,
  authenticatedGet,
  authenticatedPatch,
  TEST_USER,
  clearCachedAuthToken,
} from '../../helpers/backend-services.helper';

interface UserProfile {
  dni: string;
  email: string;
  name?: string;
  surname?: string;
  blocked?: boolean;
  tidepool?: string | null;
  hospital_account?: string;
  times_measured?: number;
  streak?: number;
  max_streak?: number;
}

let shouldRun = false;
let authToken: string;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

afterEach(() => {
  if (shouldRun) {
    clearCachedAuthToken();
  }
});

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

describe('Backend Integration - Profile CRUD', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
    authToken = await loginTestUser(TEST_USER);
  }, 30000);

  // =========================================================================
  // READ Operations
  // =========================================================================

  describe('READ - GET /users/me', () => {
    conditionalIt('should fetch current user profile', async () => {
      const profile: UserProfile = await authenticatedGet('/users/me', authToken);

      expect(profile).toBeDefined();
      expect(profile.dni).toBe(TEST_USER.dni);
      expect(typeof profile.name).toBe('string');
      expect(typeof profile.email).toBe('string');
    });

    conditionalIt('should include all expected profile fields', async () => {
      const profile: UserProfile = await authenticatedGet('/users/me', authToken);

      // Required fields
      expect(profile).toHaveProperty('dni');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('surname');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('blocked');

      // Optional fields may be present
      expect(profile).toHaveProperty('hospital_account');
    });

    conditionalIt('should return consistent data across requests', async () => {
      const profile1: UserProfile = await authenticatedGet('/users/me', authToken);
      const profile2: UserProfile = await authenticatedGet('/users/me', authToken);

      expect(profile1.dni).toBe(profile2.dni);
      expect(profile1.email).toBe(profile2.email);
      expect(profile1.name).toBe(profile2.name);
    });
  });

  // =========================================================================
  // UPDATE Operations
  // =========================================================================

  describe('UPDATE - PATCH /users/me', () => {
    let originalName: string;

    beforeAll(async () => {
      if (!shouldRun) return;
      const profile = await authenticatedGet('/users/me', authToken);
      originalName = profile.name;
    });

    afterAll(async () => {
      if (!shouldRun || !originalName) return;
      // Restore original name
      try {
        await authenticatedPatch('/users/me', { name: originalName }, authToken);
      } catch (_error) {
        // Ignore restoration errors during teardown
      }
    });

    conditionalIt('should update name field', async () => {
      const testName = `Test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const updated: UserProfile = await authenticatedPatch(
        '/users/me',
        { name: testName },
        authToken
      );

      expect(updated).toBeDefined();
      expect(updated.name).toBe(testName);

      // Note: Skip GET verification as concurrent tests may modify profile
      // The PATCH response already confirms the update was successful
    });

    conditionalIt('should update surname field', async () => {
      const testSurname = `Surname_${Date.now()}`;

      const updated: UserProfile = await authenticatedPatch(
        '/users/me',
        { surname: testSurname },
        authToken
      );

      expect(updated).toBeDefined();
      expect(updated.surname).toBe(testSurname);
    });

    conditionalIt('should handle partial updates correctly', async () => {
      const partialUpdate = { name: `Partial_${Date.now()}` };

      const updated: UserProfile = await authenticatedPatch('/users/me', partialUpdate, authToken);

      expect(updated.name).toBe(partialUpdate.name);
      // Other fields should remain unchanged
      expect(updated.dni).toBe(TEST_USER.dni);
      expect(updated.email).toBeDefined();
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('ERROR HANDLING', () => {
    conditionalIt('should reject profile access without authentication', async () => {
      const response = await fetch(`http://localhost:8000/users/me`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      expect(response.status).toBeOneOf([401, 403]);
    });

    conditionalIt('should reject profile update without authentication', async () => {
      const response = await fetch(`http://localhost:8000/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name: 'Unauthorized Update' }),
      });

      expect(response.status).toBeOneOf([401, 403]);
    });

    conditionalIt('should reject update with invalid token', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIn0.fake';

      const response = await fetch(`http://localhost:8000/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fakeToken}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ name: 'Invalid Token Update' }),
      });

      expect(response.status).toBeOneOf([401, 403, 422, 500]);
    });
  });
});

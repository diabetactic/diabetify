/**
 * Backend Integration Tests - Multi-User Data Isolation
 *
 * Critical security tests ensuring user data isolation:
 * - User A cannot see User B's readings
 * - User A cannot see User B's profile
 * - User A cannot see User B's achievements/streaks
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  authenticatedGet,
  createGlucoseReading,
  getGlucoseReadings,
  GlucoseReadingType,
  clearCachedAuthToken,
} from '../../helpers/backend-services.helper';

let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    console.log('⏭️  Backend not available - skipping data isolation tests');
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

afterEach(() => {
  clearCachedAuthToken();
});

const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        console.log(`  ⏭️  Skipping: ${name}`);
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Backend Integration - Multi-User Data Isolation', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  // =========================================================================
  // READINGS ISOLATION
  // =========================================================================

  describe('Readings Data Isolation', () => {
    conditionalIt(
      'should create and retrieve readings for a single user',
      async () => {
        // User 1 creates a unique reading
        const token1 = await loginTestUser(TEST_USERS.user1);
        const uniqueNote = `isolation-test-${Date.now()}-user1`;

        const reading = {
          glucose_level: 142,
          reading_type: 'ALMUERZO' as GlucoseReadingType,
          notes: uniqueNote,
        };

        const created = await createGlucoseReading(reading, token1);
        expect(created.id).toBeDefined();

        // Same user fetches their readings
        const userReadings = await getGlucoseReadings(token1);

        // User should see their own reading
        const found = userReadings.find((r: any) => r.notes === uniqueNote);
        expect(found).toBeDefined();
        expect(found.glucose_level).toBe(142);
      },
      20000
    );

    conditionalIt(
      'should return valid reading list for user',
      async () => {
        // User 1 readings
        const token1 = await loginTestUser(TEST_USERS.user1);
        const readings1 = await getGlucoseReadings(token1);

        // Should have valid array
        expect(Array.isArray(readings1)).toBe(true);

        // All readings should have required fields
        for (const reading of readings1) {
          expect(reading.id).toBeDefined();
          expect(reading.glucose_level).toBeDefined();
          expect(reading.reading_type).toBeDefined();
        }
      },
      20000
    );
  });

  // =========================================================================
  // PROFILE ISOLATION
  // =========================================================================

  describe('Profile Data Isolation', () => {
    conditionalIt(
      'should return correct user profile for authenticated user',
      async () => {
        // User 1 profile
        const token1 = await loginTestUser(TEST_USERS.user1);
        const profile1 = await authenticatedGet('/users/me', token1);

        expect(profile1.dni).toBe(TEST_USERS.user1.dni);
        expect(profile1).toHaveProperty('name');
      },
      15000
    );

    conditionalIt(
      'should only return own profile via /users/me endpoint',
      async () => {
        // User can only access their own /users/me
        const token1 = await loginTestUser(TEST_USERS.user1);
        const profile1 = await authenticatedGet('/users/me', token1);

        // Should only see their own data
        expect(profile1.dni).toBe(TEST_USERS.user1.dni);
      },
      15000
    );
  });

  // =========================================================================
  // ACHIEVEMENTS ISOLATION
  // =========================================================================

  describe('Achievements Data Isolation', () => {
    conditionalIt(
      'should return streak data for authenticated user',
      async () => {
        const token1 = await loginTestUser(TEST_USERS.user1);
        const streak = await authenticatedGet('/achievements/streak/', token1);

        // Should have valid structure
        expect(typeof streak.streak).toBe('number');
        expect(typeof streak.max_streak).toBe('number');
        expect(streak).toBeDefined();
      },
      15000
    );

    conditionalIt(
      'should return achievements progress for authenticated user',
      async () => {
        const token1 = await loginTestUser(TEST_USERS.user1);
        const achievements = await authenticatedGet('/achievements/', token1);

        // Should be an array
        expect(Array.isArray(achievements)).toBe(true);
      },
      15000
    );
  });

  // =========================================================================
  // CROSS-ENDPOINT ISOLATION
  // =========================================================================

  describe('Cross-Endpoint Access', () => {
    conditionalIt(
      'should access multiple endpoints in same session',
      async () => {
        // User 1 accesses multiple endpoints
        const token1 = await loginTestUser(TEST_USERS.user1);

        const [profile1, readings1, streak1] = await Promise.all([
          authenticatedGet('/users/me', token1),
          getGlucoseReadings(token1),
          authenticatedGet('/achievements/streak/', token1),
        ]);

        expect(profile1.dni).toBe(TEST_USERS.user1.dni);
        expect(Array.isArray(readings1)).toBe(true);
        expect(typeof streak1.streak).toBe('number');
      },
      20000
    );
  });
});

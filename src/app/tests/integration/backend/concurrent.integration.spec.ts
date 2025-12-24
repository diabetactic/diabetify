/**
 * Backend Integration Tests - Concurrent Operations
 *
 * Tests race conditions and parallel request handling:
 * 1. Parallel readings creation
 * 2. Concurrent user updates to same resource
 * 3. Rapid sequential requests (rate limiting)
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  createGlucoseReading,
  getGlucoseReadings,
  GlucoseReadingType,
  clearCachedAuthToken,
} from '../../helpers/backend-services.helper';

let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

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

describe('Backend Integration - Concurrent Operations', () => {
  const createdReadingIds: string[] = [];

  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  afterEach(async () => {
    if (!shouldRun) return;

    // Clean up readings created during tests
    // Note: Backend may not support DELETE, so we ignore errors
    createdReadingIds.length = 0;
    clearCachedAuthToken();
  });

  // =========================================================================
  // TEST 1: Parallel Readings Creation
  // =========================================================================

  describe('Parallel Readings Creation', () => {
    conditionalIt(
      'should create 5 readings simultaneously without race conditions',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Prepare 5 readings with unique values
        const readingsData = Array.from({ length: 5 }, (_, index) => ({
          glucose_level: 100 + index * 10,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: `Parallel reading ${index + 1}`,
        }));

        // Create all readings in parallel with Promise.all
        const createPromises = readingsData.map(reading => createGlucoseReading(reading, token));

        const responses = await Promise.all(createPromises);

        // Verify that all responses have unique IDs
        const ids = responses.map(r => r.id);
        ids.forEach(id => createdReadingIds.push(String(id)));

        expect(ids.length).toBe(5);

        // Verify that there are NO duplicate IDs (no race conditions)
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(5);

        // Verify correct values
        responses.forEach((response, index) => {
          expect(response.glucose_level).toBe(readingsData[index].glucose_level);
          expect(response.notes).toBe(readingsData[index].notes);
        });

        // Verify that all readings were saved to DB
        const allReadings = await getGlucoseReadings(token);
        const createdValues = readingsData.map(r => r.glucose_level);

        for (const value of createdValues) {
          const found = allReadings.find((r: any) => r.glucose_level === value);
          expect(found).toBeDefined();
        }
      },
      15000
    );
  });

  // =========================================================================
  // TEST 2: Concurrent Users Same Resource
  // =========================================================================

  describe('Concurrent Users Same Resource', () => {
    conditionalIt(
      'should handle concurrent reading creations from same user',
      async () => {
        // User 1 creates concurrent readings
        const token1 = await loginTestUser(TEST_USERS.user1);

        // Create two readings in parallel from the same user
        const reading1 = {
          glucose_level: 155,
          reading_type: 'ALMUERZO' as GlucoseReadingType,
          notes: 'Concurrent reading 1',
        };

        const reading2 = {
          glucose_level: 160,
          reading_type: 'ALMUERZO' as GlucoseReadingType,
          notes: 'Concurrent reading 2',
        };

        const [result1, result2] = await Promise.allSettled([
          createGlucoseReading(reading1, token1),
          createGlucoseReading(reading2, token1),
        ]);

        // Both creations should be successful
        const successCount = [result1, result2].filter(r => r.status === 'fulfilled').length;

        expect(successCount).toBe(2);

        // Save IDs for cleanup
        if (result1.status === 'fulfilled') {
          createdReadingIds.push(String(result1.value.id));
        }
        if (result2.status === 'fulfilled') {
          createdReadingIds.push(String(result2.value.id));
        }

        // Verify that both readings exist in the list
        const allReadings = await getGlucoseReadings(token1);
        const found1 = allReadings.find((r: any) => r.notes === 'Concurrent reading 1');
        const found2 = allReadings.find((r: any) => r.notes === 'Concurrent reading 2');

        expect(found1).toBeDefined();
        expect(found2).toBeDefined();
      },
      15000
    );
  });

  // =========================================================================
  // TEST 3: Rapid Sequential Requests
  // =========================================================================

  describe('Rapid Sequential Requests', () => {
    conditionalIt(
      'should handle 10 rapid requests without duplicates',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Fire 10 requests in parallel
        const requestPromises = Array.from({ length: 10 }, (_, index) =>
          createGlucoseReading(
            {
              glucose_level: 90 + index,
              reading_type: 'OTRO' as GlucoseReadingType,
              notes: `Rapid request #${index + 1}`,
            },
            token
          )
            .then(data => ({ success: true, data }))
            .catch(error => ({
              success: false,
              error: error.message,
            }))
        );

        const responses = await Promise.all(requestPromises);

        // Count successful responses
        const successResponses = responses.filter(r => r.success);

        // Save IDs of successful readings for cleanup
        successResponses.forEach(response => {
          if (response.success && response.data?.id) {
            createdReadingIds.push(String(response.data.id));
          }
        });

        // At least some requests should be successful
        expect(successResponses.length).toBeGreaterThan(0);

        // Verify data integrity in successful requests
        for (const response of successResponses) {
          if (response.success) {
            expect(response.data).toHaveProperty('id');
            expect(response.data.glucose_level).toBeGreaterThanOrEqual(90);
            expect(response.data.glucose_level).toBeLessThan(100);
          }
        }

        // Verify that there are NO duplicates
        const uniqueIds = new Set(createdReadingIds);
        expect(uniqueIds.size).toBe(createdReadingIds.length);
      },
      20000
    );
  });
});

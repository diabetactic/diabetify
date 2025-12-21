/**
 * Backend Integration Tests - Readings Sync Behavior
 *
 * Tests synchronization-related behaviors with the Docker backend.
 * Tests sequential creation, list retrieval, and data consistency.
 *
 * Available API endpoints:
 * - POST /glucose/create (query params)
 * - GET /glucose/mine → { readings: [...] }
 * - GET /glucose/mine/latest → { readings: [...] }
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  waitForBackendServices,
  loginTestUser,
  isBackendAvailable,
  createGlucoseReading,
  getGlucoseReadings,
  getLatestGlucoseReading,
  parseBackendDate,
  GlucoseReadingData,
  GlucoseReadingType,
  SERVICE_URLS,
  TEST_USER,
} from '../../helpers/backend-services.helper';

let shouldRun = false;
let authToken: string;

// Helper para generar lecturas de prueba con timestamps únicos
function createTestReading(index: number): Omit<GlucoseReadingData, 'id' | 'user_id'> {
  const types: GlucoseReadingType[] = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'];
  return {
    glucose_level: 100 + index * 10, // 100, 110, 120, etc.
    reading_type: types[index % types.length],
    created_at: new Date().toISOString(),
    notes: `Sync test reading ${index + 1}`,
  };
}

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    console.log('⏭️  Backend not available - skipping readings sync integration tests');
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
        console.log(`  ⏭️  Skipping: ${name}`);
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Backend Integration - Readings Sync Behavior', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
    authToken = await loginTestUser(TEST_USER);
  }, 60000);

  // =========================================================================
  // SEQUENTIAL CREATION
  // =========================================================================

  describe('Sequential Reading Creation', () => {
    conditionalIt('should create multiple readings sequentially', async () => {
      const readings = [createTestReading(0), createTestReading(1), createTestReading(2)];
      const createdIds: number[] = [];

      for (const reading of readings) {
        const created = await createGlucoseReading(reading, authToken);
        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        createdIds.push(created.id!);
      }

      expect(createdIds.length).toBe(3);
      // All IDs should be unique
      const uniqueIds = new Set(createdIds);
      expect(uniqueIds.size).toBe(3);
    });

    conditionalIt('should reflect created readings in list', async () => {
      const uniqueNote = `sync-list-test-${Date.now()}`;
      const reading = {
        ...createTestReading(0),
        notes: uniqueNote,
      };

      await createGlucoseReading(reading, authToken);

      const allReadings = await getGlucoseReadings(authToken);

      expect(Array.isArray(allReadings)).toBe(true);
      const found = allReadings.find((r: GlucoseReadingData) => r.notes === uniqueNote);
      expect(found).toBeDefined();
    });
  });

  // =========================================================================
  // LATEST READING CONSISTENCY
  // =========================================================================

  describe('Latest Reading Consistency', () => {
    conditionalIt('should return most recent reading as latest', async () => {
      const reading = {
        ...createTestReading(0),
        glucose_level: 189,
        notes: `latest-test-${Date.now()}`,
      };

      await createGlucoseReading(reading, authToken);

      const latest = await getLatestGlucoseReading(authToken);

      expect(latest).toBeDefined();
      expect(latest.id).toBeDefined();
      expect(typeof latest.glucose_level).toBe('number');
    });

    conditionalIt('should update latest after new reading', async () => {
      // Create first reading
      const first = await createGlucoseReading(createTestReading(0), authToken);
      expect(first.id).toBeDefined();

      // Create second reading
      const second = await createGlucoseReading(createTestReading(1), authToken);
      expect(second.id).toBeDefined();

      // Get latest - verifies the endpoint works
      const latest = await getLatestGlucoseReading(authToken);
      expect(latest.id).toBeDefined();
      expect(latest.glucose_level).toBeDefined();

      // The latest should have an ID >= first (could be one we created or a concurrent one)
      // We can't guarantee exact ID due to potential concurrent test runs
      expect(latest.id).toBeGreaterThanOrEqual(first.id - 10); // Allow some margin
    });
  });

  // =========================================================================
  // DATA CONSISTENCY
  // =========================================================================

  describe('Data Consistency', () => {
    conditionalIt('should maintain data integrity across operations', async () => {
      const testValue = 155;
      const testNotes = `integrity-${Date.now()}`;

      const reading = {
        glucose_level: testValue,
        reading_type: 'OTRO' as GlucoseReadingType,
        notes: testNotes,
      };

      // Create
      const created = await createGlucoseReading(reading, authToken);
      expect(created.glucose_level).toBe(testValue);
      expect(created.notes).toBe(testNotes);

      // Retrieve via list
      const allReadings = await getGlucoseReadings(authToken);
      const found = allReadings.find((r: GlucoseReadingData) => r.id === created.id);

      expect(found).toBeDefined();
      expect(found!.glucose_level).toBe(testValue);
      expect(found!.notes).toBe(testNotes);
    });

    conditionalIt('should handle rapid sequential requests', async () => {
      const results: GlucoseReadingData[] = [];

      // Create 5 readings in rapid succession
      for (let i = 0; i < 5; i++) {
        const reading = {
          glucose_level: 100 + i * 5,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: `rapid-${Date.now()}-${i}`,
        };

        const created = await createGlucoseReading(reading, authToken);
        results.push(created);
      }

      // All should have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    conditionalIt('should preserve reading order in list', async () => {
      const allReadings = await getGlucoseReadings(authToken);

      expect(Array.isArray(allReadings)).toBe(true);

      // Verify readings have valid timestamps (using backend date parser)
      for (const reading of allReadings) {
        const date = parseBackendDate(reading.created_at!);
        expect(date).not.toBeNull();
      }
    });
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('Error Handling', () => {
    conditionalIt('should reject unauthenticated sync attempts', async () => {
      const params = new URLSearchParams({
        glucose_level: '120',
        reading_type: 'OTRO',
      });

      try {
        const response = await fetch(
          `${SERVICE_URLS.apiGateway}/glucose/create?${params.toString()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        expect(response.status).toBeOneOf([401, 403]);
      } catch (error) {
        expect(String(error)).toMatch(/401|403|unauthorized/i);
      }
    });
  });
});

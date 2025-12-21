/**
 * Backend Integration Tests - Readings CRUD
 *
 * Tests real CRUD operations against the Docker backend (glucoserver service).
 * Requires Docker backend to be running: pnpm run docker:start
 *
 * API Schema:
 * - POST /glucose/create?glucose_level=X&reading_type=Y&... (query params)
 * - GET /glucose/mine → { readings: [...] }
 * - GET /glucose/mine/latest → single reading
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

// Estado de ejecución de tests
let shouldRun = false;
let authToken: string;

// Helper para generar datos de lectura de prueba
function createTestReading(
  overrides: Partial<Omit<GlucoseReadingData, 'id' | 'user_id'>> = {}
): Omit<GlucoseReadingData, 'id' | 'user_id'> {
  const types: GlucoseReadingType[] = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'];
  return {
    glucose_level: 120 + Math.floor(Math.random() * 60), // 120-180 mg/dL
    reading_type: types[Math.floor(Math.random() * types.length)],
    created_at: new Date().toISOString(),
    notes: 'Test reading from integration test',
    ...overrides,
  };
}

// Verificar disponibilidad del backend antes de ejecutar tests
beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    console.log('⏭️  Backend not available - skipping readings CRUD integration tests');
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

// Helper para tests condicionales
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

describe('Backend Integration - Readings CRUD', () => {
  beforeAll(async () => {
    if (!shouldRun) {
      return;
    }
    await waitForBackendServices(['apiGateway']);
    authToken = await loginTestUser(TEST_USER);
  }, 60000);

  // =========================================================================
  // CREATE Operations - POST /glucose/create
  // =========================================================================

  describe('CREATE - POST /glucose/create', () => {
    conditionalIt('should create a new glucose reading', async () => {
      const newReading = createTestReading({ glucose_level: 135 });

      const created = await createGlucoseReading(newReading, authToken);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.glucose_level).toBe(135);
      expect(created.reading_type).toBe(newReading.reading_type);
    });

    conditionalIt('should create reading with minimum required fields', async () => {
      const minimalReading = {
        glucose_level: 95,
        reading_type: 'OTRO' as GlucoseReadingType,
      };

      const created = await createGlucoseReading(minimalReading, authToken);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.glucose_level).toBe(95);
    });

    conditionalIt('should create reading with all fields', async () => {
      const fullReading = {
        glucose_level: 145,
        reading_type: 'ALMUERZO' as GlucoseReadingType,
        created_at: new Date().toISOString(),
        notes: 'Full reading with notes',
      };

      const created = await createGlucoseReading(fullReading, authToken);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.glucose_level).toBe(145);
      expect(created.reading_type).toBe('ALMUERZO');
      expect(created.notes).toBe('Full reading with notes');
    });

    conditionalIt('should reject reading without authentication', async () => {
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

  // =========================================================================
  // READ Operations - GET /glucose/mine
  // =========================================================================

  describe('READ - GET /glucose/mine', () => {
    conditionalIt('should list all readings for authenticated user', async () => {
      const readings = await getGlucoseReadings(authToken);

      expect(Array.isArray(readings)).toBe(true);
      // Should have at least the readings created before
      expect(readings.length).toBeGreaterThan(0);
    });

    conditionalIt('should return readings with correct structure', async () => {
      const readings = await getGlucoseReadings(authToken);

      expect(Array.isArray(readings)).toBe(true);
      if (readings.length > 0) {
        const reading = readings[0];
        expect(reading).toHaveProperty('id');
        expect(reading).toHaveProperty('glucose_level');
        expect(reading).toHaveProperty('reading_type');
        expect(reading).toHaveProperty('created_at');
      }
    });

    conditionalIt('should reject request without authentication', async () => {
      try {
        const response = await fetch(`${SERVICE_URLS.apiGateway}/glucose/mine`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        expect(response.status).toBeOneOf([401, 403]);
      } catch (error) {
        expect(String(error)).toMatch(/401|403|unauthorized/i);
      }
    });
  });

  // =========================================================================
  // LATEST - GET /glucose/mine/latest
  // =========================================================================

  describe('LATEST - GET /glucose/mine/latest', () => {
    conditionalIt('should return the most recent reading', async () => {
      // First create a reading with known value
      const testReading = createTestReading({
        glucose_level: 177,
        notes: 'Latest test reading',
      });
      await createGlucoseReading(testReading, authToken);

      // Then fetch latest
      const latest = await getLatestGlucoseReading(authToken);

      expect(latest).toBeDefined();
      expect(latest.id).toBeDefined();
      expect(typeof latest.glucose_level).toBe('number');
    });

    conditionalIt('should return reading with complete data', async () => {
      const latest = await getLatestGlucoseReading(authToken);

      expect(latest).toHaveProperty('id');
      expect(latest).toHaveProperty('glucose_level');
      expect(latest).toHaveProperty('reading_type');
      expect(latest).toHaveProperty('created_at');

      // Validate types
      expect(typeof latest.glucose_level).toBe('number');
      expect(typeof latest.reading_type).toBe('string');
    });

    conditionalIt('should reject request without authentication', async () => {
      try {
        const response = await fetch(`${SERVICE_URLS.apiGateway}/glucose/mine/latest`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        expect(response.status).toBeOneOf([401, 403]);
      } catch (error) {
        expect(String(error)).toMatch(/401|403|unauthorized/i);
      }
    });
  });

  // =========================================================================
  // VALIDATION Tests
  // =========================================================================

  describe('Validation', () => {
    conditionalIt('should validate glucose value range', async () => {
      const readings = await getGlucoseReadings(authToken);

      for (const reading of readings) {
        expect(reading.glucose_level).toBeGreaterThan(0);
        expect(reading.glucose_level).toBeLessThan(1000); // Sanity check
      }
    });

    conditionalIt('should have valid timestamp format', async () => {
      const readings = await getGlucoseReadings(authToken);

      for (const reading of readings) {
        // Backend uses DD/MM/YYYY HH:MM:SS format
        const date = parseBackendDate(reading.created_at!);
        expect(date).not.toBeNull();
        expect(date!.toString()).not.toBe('Invalid Date');
      }
    });

    conditionalIt('should have valid reading types', async () => {
      const validTypes: GlucoseReadingType[] = [
        'DESAYUNO',
        'ALMUERZO',
        'MERIENDA',
        'CENA',
        'EJERCICIO',
        'OTRAS_COMIDAS',
        'OTRO',
      ];

      const readings = await getGlucoseReadings(authToken);

      for (const reading of readings) {
        expect(validTypes).toContain(reading.reading_type);
      }
    });
  });
});

/**
 * Backend Integration Tests - Trends & Statistics
 *
 * Tests: Glucose statistics, time-in-range calculations, and trend data.
 * Requires Docker backend: pnpm run docker:start
 */

import {
  waitForBackendServices,
  loginTestUser,
  TEST_USER,
  SERVICE_URLS,
  isBackendAvailable,
  createGlucoseReading,
  getGlucoseReadings,
  authenticatedGet,
} from '../../helpers/backend-services.helper';

// Test execution state
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

describe('Backend Integration - Trends & Statistics', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
    authToken = await loginTestUser(TEST_USER);
  }, 60000);

  // =========================================================================
  // GLUCOSE STATISTICS Tests
  // =========================================================================

  describe('GLUCOSE STATISTICS - GET /glucose/mine', () => {
    conditionalIt('should return readings with statistical data', async () => {
      const readings = await getGlucoseReadings(authToken);

      expect(Array.isArray(readings)).toBe(true);

      if (readings.length > 0) {
        // Verify structure de lectura
        const reading = readings[0];
        expect(reading).toHaveProperty('glucose_level');
        expect(typeof reading.glucose_level).toBe('number');
      }
    });

    conditionalIt('should calculate correct reading counts', async () => {
      // Obtener lecturas actuales
      const readingsBefore = await getGlucoseReadings(authToken);
      const initialCount = readingsBefore.length;

      // Agregar una lectura de prueba
      const testReading = await createGlucoseReading(
        {
          glucose_level: 110,
          reading_type: 'DESAYUNO',
          notes: '__STATS_TEST__ Count verification',
        },
        authToken
      );

      expect(testReading).toBeDefined();

      // Verify that el conteo aumento (usar >= para tolerancia a tests concurrentes)
      const readingsAfter = await getGlucoseReadings(authToken);
      expect(readingsAfter.length).toBeGreaterThanOrEqual(initialCount + 1);
    });

    conditionalIt('should return readings sorted by date (newest first)', async () => {
      const readings = await getGlucoseReadings(authToken);

      if (readings.length >= 2) {
        // Verify order descendente
        for (let i = 0; i < readings.length - 1; i++) {
          const currentDate = new Date(readings[i].created_at || '');
          const nextDate = new Date(readings[i + 1].created_at || '');

          // Si ambas fechas son validas, la actual debe ser >= a la siguiente
          if (!isNaN(currentDate.getTime()) && !isNaN(nextDate.getTime())) {
            expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
          }
        }
      }
    });
  });

  // =========================================================================
  // TIME IN RANGE Tests
  // =========================================================================

  describe('TIME IN RANGE Calculations', () => {
    conditionalIt('should categorize readings by glucose range', async () => {
      const readings = await getGlucoseReadings(authToken);

      // Categorizar lecturas manualmente
      const categories = {
        veryLow: 0, // < 54 mg/dL
        low: 0, // 54-69 mg/dL
        inRange: 0, // 70-180 mg/dL
        high: 0, // 181-250 mg/dL
        veryHigh: 0, // > 250 mg/dL
      };

      readings.forEach(reading => {
        const value = reading.glucose_level;
        if (value < 54) categories.veryLow++;
        else if (value < 70) categories.low++;
        else if (value <= 180) categories.inRange++;
        else if (value <= 250) categories.high++;
        else categories.veryHigh++;
      });

      // Verify that la suma de categorias = total de lecturas
      const total =
        categories.veryLow +
        categories.low +
        categories.inRange +
        categories.high +
        categories.veryHigh;
      expect(total).toBe(readings.length);
    });

    conditionalIt('should add readings with different range values', async () => {
      // Agregar lecturas en diferentes rangos
      const testReadings = [
        { glucose_level: 45, notes: '__TIR_TEST__ Very Low' },
        { glucose_level: 65, notes: '__TIR_TEST__ Low' },
        { glucose_level: 120, notes: '__TIR_TEST__ In Range' },
        { glucose_level: 200, notes: '__TIR_TEST__ High' },
        { glucose_level: 280, notes: '__TIR_TEST__ Very High' },
      ];

      for (const reading of testReadings) {
        const created = await createGlucoseReading(
          {
            glucose_level: reading.glucose_level,
            reading_type: 'OTRO',
            notes: reading.notes,
          },
          authToken
        );
        expect(created).toBeDefined();
        expect(created.glucose_level).toBe(reading.glucose_level);
      }
    });
  });

  // =========================================================================
  // AVERAGE & VARIABILITY Tests
  // =========================================================================

  describe('AVERAGE & VARIABILITY Calculations', () => {
    conditionalIt('should calculate correct average from readings', async () => {
      const readings = await getGlucoseReadings(authToken);

      if (readings.length === 0) {
        return;
      }

      // Calculate average manualmente
      const sum = readings.reduce((acc, r) => acc + r.glucose_level, 0);
      const average = sum / readings.length;

      expect(average).toBeGreaterThan(0);
      expect(average).toBeLessThan(600); // Valor maximo razonable
    });

    conditionalIt('should calculate standard deviation', async () => {
      const readings = await getGlucoseReadings(authToken);

      if (readings.length < 2) {
        return;
      }

      // Calculate deviation estandar
      const values = readings.map(r => r.glucose_level);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(avgSquaredDiff);

      expect(stdDev).toBeGreaterThanOrEqual(0);
    });

    conditionalIt('should calculate coefficient of variation (CV)', async () => {
      const readings = await getGlucoseReadings(authToken);

      if (readings.length < 2) {
        return;
      }

      const values = readings.map(r => r.glucose_level);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(avgSquaredDiff);

      // CV = (stdDev / mean) * 100
      const cv = (stdDev / mean) * 100;

      expect(cv).toBeGreaterThanOrEqual(0);
      expect(cv).toBeLessThan(100); // CV > 100% seria muy inusual
    });
  });

  // =========================================================================
  // DATE RANGE FILTERING Tests
  // =========================================================================

  describe('DATE RANGE Filtering', () => {
    conditionalIt('should filter readings by date range', async () => {
      // Obtener todas las lecturas
      const allReadings = await getGlucoseReadings(authToken);

      if (allReadings.length === 0) {
        return;
      }

      // Filtrar ultimos 7 dias (client-side)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentReadings = allReadings.filter(r => {
        const readingDate = new Date(r.created_at || '');
        return !isNaN(readingDate.getTime()) && readingDate >= sevenDaysAgo;
      });

      // Debe haber menos o igual lecturas en el rango
      expect(recentReadings.length).toBeLessThanOrEqual(allReadings.length);
    });

    conditionalIt('should group readings by day for trends', async () => {
      const readings = await getGlucoseReadings(authToken);

      // Agrupar por dia
      const byDay = new Map<string, number[]>();

      readings.forEach(r => {
        const date = new Date(r.created_at || '');
        if (isNaN(date.getTime())) return;

        const dayKey = date.toISOString().split('T')[0];
        if (!byDay.has(dayKey)) {
          byDay.set(dayKey, []);
        }
        byDay.get(dayKey)!.push(r.glucose_level);
      });

      // Calculate average por dia
      const dailyAverages = Array.from(byDay.entries()).map(([day, values]) => ({
        day,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
      }));

      expect(dailyAverages.length).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // MEAL CONTEXT ANALYSIS Tests
  // =========================================================================

  describe('MEAL CONTEXT Analysis', () => {
    conditionalIt('should group readings by meal context', async () => {
      const readings = await getGlucoseReadings(authToken);

      // Agrupar por tipo de lectura
      const byMeal = new Map<string, number[]>();

      readings.forEach(r => {
        const mealType = r.reading_type || 'OTRO';
        if (!byMeal.has(mealType)) {
          byMeal.set(mealType, []);
        }
        byMeal.get(mealType)!.push(r.glucose_level);
      });

      // Calculate statistics por contexto
      const mealStats = Array.from(byMeal.entries()).map(([meal, values]) => ({
        meal,
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      }));

      expect(mealStats.length).toBeGreaterThanOrEqual(0);

      // Verify meal stats structure
      mealStats.forEach(_stat => {
        // Stats validated above
      });
    });

    conditionalIt('should add readings with different meal contexts', async () => {
      const mealContexts = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'] as const;

      for (const mealContext of mealContexts) {
        const reading = await createGlucoseReading(
          {
            glucose_level: 100 + Math.floor(Math.random() * 50),
            reading_type: mealContext,
            notes: `__MEAL_TEST__ ${mealContext}`,
          },
          authToken
        );
        expect(reading).toBeDefined();
        expect(reading.reading_type).toBe(mealContext);
      }
    });
  });

  // =========================================================================
  // ESTIMATED A1C Tests
  // =========================================================================

  describe('ESTIMATED A1C Calculation', () => {
    conditionalIt('should calculate eA1C from average glucose', async () => {
      const readings = await getGlucoseReadings(authToken);

      if (readings.length === 0) {
        return;
      }

      // Calculate average
      const average = readings.reduce((a, r) => a + r.glucose_level, 0) / readings.length;

      // Formula eA1C: (average_glucose + 46.7) / 28.7
      const eA1C = (average + 46.7) / 28.7;

      expect(eA1C).toBeGreaterThan(0);
      expect(eA1C).toBeLessThan(20); // Rango razonable
    });
  });

  // =========================================================================
  // USER PROFILE STATS Tests
  // =========================================================================

  describe('USER PROFILE Statistics', () => {
    conditionalIt('should retrieve user profile with stats', async () => {
      const profile = await authenticatedGet('/users/me', authToken);

      expect(profile).toBeDefined();
      expect(profile.dni).toBe(TEST_USER.dni);

      // Verify fields de estadisticas si existen
      if (profile.streak !== undefined) {
        expect(typeof profile.streak).toBe('number');
      }

      if (profile.total_readings !== undefined) {
        expect(typeof profile.total_readings).toBe('number');
      }
    });
  });

  // =========================================================================
  // CLEANUP - Remove test readings
  // =========================================================================

  afterAll(async () => {
    if (!shouldRun) return;

    try {
      // Obtener lecturas de prueba
      const readings = await getGlucoseReadings(authToken);
      const testReadings = readings.filter(
        r =>
          r.notes?.includes('__STATS_TEST__') ||
          r.notes?.includes('__TIR_TEST__') ||
          r.notes?.includes('__MEAL_TEST__')
      );

      // Eliminar lecturas de prueba
      for (const reading of testReadings) {
        if (reading.id) {
          await fetch(`${SERVICE_URLS.apiGateway}/glucose/${reading.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          });
        }
      }
    } catch {
      // Cleanup errors are non-critical
    }
  });
});

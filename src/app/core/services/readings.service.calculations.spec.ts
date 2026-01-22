/**
 * ReadingsService Medical Calculation Precision Tests
 *
 * CRITICAL: These tests validate medical calculations that directly
 * impact patient care decisions. Failures here are HIGH PRIORITY.
 *
 * Formulas tested:
 * - HbA1c (ADAG): eA1C(%) = (average glucose mg/dL + 46.7) / 28.7
 * - GMI (Glucose Management Indicator): 3.31 + 0.02392 * avg (mg/dL)
 * - CV (Coefficient of Variation): (SD / mean) * 100
 * - Standard Deviation
 * - Time in Range (TIR) calculations
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ReadingsService, LIVE_QUERY_FN } from '@services/readings.service';
import { DiabetacticDatabase } from '@services/database.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { AuditLogService } from '@services/audit-log.service';
import { MockDataService } from '@services/mock-data.service';

// Mock database for calculations
class MockCalculationsDatabase {
  private readingsStore: LocalGlucoseReading[] = [];

  readings = {
    toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
    where: vi.fn().mockReturnValue({
      between: vi.fn().mockImplementation(() => ({
        toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
      })),
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
    orderBy: vi.fn().mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
      }),
      toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
    }),
    count: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore.length)),
    toCollection: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
  };

  syncQueue = {
    count: vi.fn().mockResolvedValue(0),
    toArray: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
  };

  conflicts = {
    count: vi.fn().mockResolvedValue(0),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue(0),
      }),
    }),
  };

  auditLog = {
    add: vi.fn().mockResolvedValue(1),
  };

  setReadings(readings: LocalGlucoseReading[]): void {
    this.readingsStore = readings;
    this.readings.where.mockReturnValue({
      between: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(readings),
      }),
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(readings),
        count: vi.fn().mockResolvedValue(readings.length),
        offset: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }),
    });
  }
}

describe('ReadingsService - Medical Calculations Precision', () => {
  let service: ReadingsService;
  let mockDb: MockCalculationsDatabase;

  beforeEach(() => {
    mockDb = new MockCalculationsDatabase();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        AuditLogService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        // Disable mock backend to use real calculations from test data
        { provide: MockDataService, useValue: undefined },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<unknown>) =>
            new Observable(subscriber => {
              Promise.resolve(factory()).then(result => subscriber.next(result));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
    // Set current user for multi-user data isolation
    service.setCurrentUser('test-user');
  });

  describe('HbA1c Estimation (ADAG Formula)', () => {
    // Formula: eA1C(%) = (average glucose mg/dL + 46.7) / 28.7
    const calculateExpectedA1c = (avgMgdl: number): number => {
      return Math.round(((avgMgdl + 46.7) / 28.7) * 10) / 10;
    };

    it('should calculate HbA1c correctly for clinical glucose ranges', async () => {
      const testCases = [
        { avg: 100, expectedA1c: 5.1 }, // Normal fasting
        { avg: 126, expectedA1c: 6.0 }, // Prediabetes boundary
        { avg: 154, expectedA1c: 7.0 }, // Diabetes diagnosis
        { avg: 183, expectedA1c: 8.0 }, // Poorly controlled
        { avg: 212, expectedA1c: 9.0 }, // High risk
        { avg: 240, expectedA1c: 10.0 }, // Very high risk
      ];

      for (const { avg, expectedA1c } of testCases) {
        const readings = createReadingsWithAverage(avg, 10);
        mockDb.setReadings(readings);

        const stats = await service.getStatistics('week');
        const calculatedA1c = calculateExpectedA1c(avg);

        expect(stats.estimatedA1C, `avg=${avg}`).toBeCloseTo(calculatedA1c, 1);
        expect(stats.estimatedA1C, `avg=${avg} ~= ${expectedA1c}`).toBeCloseTo(expectedA1c, 0);
      }
    });

    it('should handle boundary values (50-300 mg/dL range)', async () => {
      const boundaryTests = [
        { avg: 50, minA1c: 3.0, maxA1c: 4.0 }, // Critical low
        { avg: 70, minA1c: 4.0, maxA1c: 4.5 }, // Low normal
        { avg: 180, minA1c: 7.5, maxA1c: 8.5 }, // Post-meal target
        { avg: 300, minA1c: 11.5, maxA1c: 12.5 }, // Severely elevated
      ];

      for (const { avg, minA1c, maxA1c } of boundaryTests) {
        const readings = createReadingsWithAverage(avg, 10);
        mockDb.setReadings(readings);

        const stats = await service.getStatistics('week');

        expect(stats.estimatedA1C, `avg=${avg} >= ${minA1c}`).toBeGreaterThanOrEqual(minA1c);
        expect(stats.estimatedA1C, `avg=${avg} <= ${maxA1c}`).toBeLessThanOrEqual(maxA1c);
      }
    });

    it('should handle mmol/L input with correct conversion', async () => {
      // Create readings with 10 mmol/L (which equals 180 mg/dL) → A1c ~7.9%
      const readings = createReadingsWithAverage(10, 10, 'mmol/L');
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week', 3.9, 10, 'mmol/L');

      // Average should be ~10 mmol/L, A1c ~7.9%
      expect(stats.average).toBeCloseTo(10, 0);
      expect(stats.estimatedA1C).toBeGreaterThan(6);
      expect(stats.estimatedA1C).toBeLessThan(10);
    });
  });

  describe('Standard Deviation Precision', () => {
    it('should calculate SD correctly for known datasets', async () => {
      // Dataset with known SD: values [80, 100, 120, 140, 160] → mean=120, SD≈28.28
      const readings = [80, 100, 120, 140, 160].map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week');

      expect(stats.standardDeviation).toBeCloseTo(28.3, 0);
    });

    it('should return 0 SD for uniform readings', async () => {
      const readings = Array(10)
        .fill(null)
        .map((_, i) => createReading(120, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week');

      expect(stats.standardDeviation).toBe(0);
    });

    it('should handle high variability correctly', async () => {
      // High variability: [50, 250, 50, 250, 50] → mean=130, high SD
      const readings = [50, 250, 50, 250, 50].map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week');

      expect(stats.standardDeviation).toBeGreaterThan(80);
      expect(stats.coefficientOfVariation).toBeGreaterThan(60);
    });
  });

  describe('Coefficient of Variation (CV) - Diabetes Stability Metric', () => {
    // CV < 36% indicates stable glucose control
    // CV formula: (SD / mean) * 100

    it('should calculate CV correctly and classify stability', async () => {
      const testCases = [
        { values: [110, 115, 120, 125, 130], expectedCvRange: [0, 10], stable: true },
        { values: [80, 100, 120, 140, 160], expectedCvRange: [20, 30], stable: true },
        { values: [50, 100, 150, 200, 250], expectedCvRange: [45, 55], stable: false },
      ];

      for (const { values, expectedCvRange, stable } of testCases) {
        const readings = values.map((v, i) => createReading(v, i));
        mockDb.setReadings(readings);

        const stats = await service.getStatistics('week');
        const [minCv, maxCv] = expectedCvRange;

        expect(stats.coefficientOfVariation, `CV for ${values}`).toBeGreaterThanOrEqual(minCv);
        expect(stats.coefficientOfVariation, `CV for ${values}`).toBeLessThanOrEqual(maxCv);

        // CV < 36% = stable
        const isStable = stats.coefficientOfVariation < 36;
        expect(isStable, `stability for CV=${stats.coefficientOfVariation}`).toBe(stable);
      }
    });

    it('should handle edge case of single reading (CV = 0)', async () => {
      const readings = [createReading(120, 0)];
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week');

      expect(stats.coefficientOfVariation).toBe(0);
    });
  });

  describe('Time in Range (TIR) Calculations', () => {
    const defaultTargetMin = 70;
    const defaultTargetMax = 180;

    it('should calculate TIR correctly for mixed readings', async () => {
      // 10 readings: 6 in range (70-180), 2 above (200, 220), 2 below (50, 60)
      const values = [80, 100, 120, 150, 170, 175, 200, 220, 50, 60];
      const readings = values.map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week', defaultTargetMin, defaultTargetMax);

      expect(stats.timeInRange).toBe(60); // 6/10 = 60%
      expect(stats.timeAboveRange).toBe(20); // 2/10 = 20%
      expect(stats.timeBelowRange).toBe(20); // 2/10 = 20%
    });

    it('should handle boundary values precisely', async () => {
      // Test exact boundaries: 70 and 180 should be IN range
      const values = [70, 180, 69.9, 180.1];
      const readings = values.map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week', 70, 180);

      expect(stats.timeInRange).toBe(50); // 70 and 180 are in range
      expect(stats.timeBelowRange).toBe(25); // 69.9 is below
      expect(stats.timeAboveRange).toBe(25); // 180.1 is above
    });

    it('should return 100% TIR when all readings in range', async () => {
      const readings = [80, 100, 120, 140, 160].map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week', 70, 180);

      expect(stats.timeInRange).toBe(100);
      expect(stats.timeAboveRange).toBe(0);
      expect(stats.timeBelowRange).toBe(0);
    });

    it('should handle custom target ranges', async () => {
      // Tighter range: 80-140 (pregnancy targets)
      const values = [75, 85, 120, 145, 160];
      const readings = values.map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week', 80, 140);

      expect(stats.timeInRange).toBe(40); // 85, 120 = 2/5
      expect(stats.timeBelowRange).toBe(20); // 75 = 1/5
      expect(stats.timeAboveRange).toBe(40); // 145, 160 = 2/5
    });
  });

  describe('Median Calculation', () => {
    it('should calculate median correctly for odd count', async () => {
      const values = [80, 100, 120, 140, 160]; // sorted, median = 120
      const readings = values.map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week');

      expect(stats.median).toBe(120);
    });

    it('should calculate median correctly for even count', async () => {
      const values = [80, 100, 140, 160]; // sorted, median = (100+140)/2 = 120
      const readings = values.map((v, i) => createReading(v, i));
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week');

      expect(stats.median).toBe(120);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should return zero statistics for empty readings', async () => {
      mockDb.setReadings([]);

      const stats = await service.getStatistics('week');

      expect(stats.average).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.standardDeviation).toBe(0);
      expect(stats.coefficientOfVariation).toBe(0);
      expect(stats.timeInRange).toBe(0);
      expect(stats.totalReadings).toBe(0);
      expect(stats.estimatedA1C).toBe(0);
      expect(stats.gmi).toBe(0);
    });

    it('should handle single reading', async () => {
      const readings = [createReading(120, 0)];
      mockDb.setReadings(readings);

      const stats = await service.getStatistics('week');

      expect(stats.totalReadings).toBe(1);
      expect(stats.average).toBe(120);
      expect(stats.median).toBe(120);
      expect(stats.standardDeviation).toBe(0);
    });
  });

  describe('Unit Conversion Precision', () => {
    // Conversion factor: 18.0182
    it('should convert mg/dL to mmol/L correctly', async () => {
      const testCases = [
        { mgdl: 70, expectedMmol: 3.9 },
        { mgdl: 100, expectedMmol: 5.6 },
        { mgdl: 126, expectedMmol: 7.0 },
        { mgdl: 180, expectedMmol: 10.0 },
        { mgdl: 200, expectedMmol: 11.1 },
      ];

      for (const { mgdl, expectedMmol } of testCases) {
        const readings = [createReading(mgdl, 0, 'mg/dL')];
        mockDb.setReadings(readings);

        const stats = await service.getStatistics('week', 70, 180, 'mmol/L');

        // Average should be converted to mmol/L
        expect(stats.average).toBeCloseTo(expectedMmol, 0);
      }
    });
  });
});

// Helper functions
function createReading(
  value: number,
  dayOffset: number,
  unit: 'mg/dL' | 'mmol/L' = 'mg/dL'
): LocalGlucoseReading {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);

  return {
    id: `reading-${dayOffset}-${Math.random()}`,
    localId: `local-${dayOffset}`,
    time: date.toISOString(),
    value,
    units: unit,
    type: 'smbg',
    synced: true,
    userId: 'test-user',
    status: 'normal',
    localStoredAt: date.toISOString(),
  };
}

function createReadingsWithAverage(
  targetAvg: number,
  count: number,
  unit: 'mg/dL' | 'mmol/L' = 'mg/dL'
): LocalGlucoseReading[] {
  // Create readings that average to targetAvg with some variance
  const readings: LocalGlucoseReading[] = [];
  const variance = 10;

  for (let i = 0; i < count; i++) {
    // Alternate above/below average to maintain target
    const offset = i % 2 === 0 ? variance : -variance;
    const value = targetAvg + offset;
    readings.push(createReading(value, i, unit));
  }

  return readings;
}

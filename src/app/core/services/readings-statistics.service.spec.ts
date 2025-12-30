import { TestBed } from '@angular/core/testing';
import {
  ReadingsStatisticsService,
  DEFAULT_TARGET_MIN,
  DEFAULT_TARGET_MAX,
} from './readings-statistics.service';
import { ReadingsMapperService } from './readings-mapper.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';

describe('ReadingsStatisticsService', () => {
  let service: ReadingsStatisticsService;
  let mapperService: ReadingsMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReadingsStatisticsService, ReadingsMapperService],
    });
    service = TestBed.inject(ReadingsStatisticsService);
    mapperService = TestBed.inject(ReadingsMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================================================
  // Helper function to create test readings
  // ============================================================================
  function createReading(value: number, units: 'mg/dL' | 'mmol/L' = 'mg/dL'): LocalGlucoseReading {
    return {
      id: `test_${Date.now()}_${Math.random()}`,
      localId: `test_${Date.now()}_${Math.random()}`,
      time: new Date().toISOString(),
      value,
      units,
      type: 'smbg',
      subType: 'manual',
      deviceId: 'test-device',
      userId: 'test-user',
      synced: false,
      localStoredAt: new Date().toISOString(),
      isLocalOnly: true,
      status: mapperService.calculateGlucoseStatus(value, units),
    };
  }

  // ============================================================================
  // Default Constants Tests
  // ============================================================================
  describe('Default Constants', () => {
    it('should have correct default target min', () => {
      expect(DEFAULT_TARGET_MIN).toBe(70);
    });

    it('should have correct default target max', () => {
      expect(DEFAULT_TARGET_MAX).toBe(180);
    });
  });

  // ============================================================================
  // calculateAverage Tests
  // ============================================================================
  describe('calculateAverage', () => {
    it('should return 0 for empty array', () => {
      expect(service.calculateAverage([])).toBe(0);
    });

    it('should calculate average for single value', () => {
      expect(service.calculateAverage([100])).toBe(100);
    });

    it('should calculate average for multiple values', () => {
      expect(service.calculateAverage([100, 200, 300])).toBe(200);
    });

    it('should handle decimal results', () => {
      expect(service.calculateAverage([100, 101])).toBe(100.5);
    });

    it('should handle large arrays', () => {
      const values = Array.from({ length: 1000 }, (_, i) => i + 1);
      expect(service.calculateAverage(values)).toBe(500.5);
    });
  });

  // ============================================================================
  // calculateMedian Tests
  // ============================================================================
  describe('calculateMedian', () => {
    it('should return 0 for empty array', () => {
      expect(service.calculateMedian([])).toBe(0);
    });

    it('should return single value for array with one element', () => {
      expect(service.calculateMedian([100])).toBe(100);
    });

    it('should calculate median for odd number of values', () => {
      expect(service.calculateMedian([100, 200, 300])).toBe(200);
    });

    it('should calculate median for even number of values', () => {
      expect(service.calculateMedian([100, 200, 300, 400])).toBe(250);
    });

    it('should require sorted input', () => {
      // Note: This tests the method as documented - it expects sorted input
      const sorted = [50, 100, 150, 200, 250];
      expect(service.calculateMedian(sorted)).toBe(150);
    });
  });

  // ============================================================================
  // calculateStandardDeviation Tests
  // ============================================================================
  describe('calculateStandardDeviation', () => {
    it('should return 0 for empty array', () => {
      expect(service.calculateStandardDeviation([], 0)).toBe(0);
    });

    it('should return 0 when all values are the same', () => {
      const values = [100, 100, 100, 100];
      expect(service.calculateStandardDeviation(values, 100)).toBe(0);
    });

    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const mean = 5;
      const result = service.calculateStandardDeviation(values, mean);
      expect(result).toBeCloseTo(2, 0);
    });

    it('should handle glucose-like values', () => {
      const values = [80, 100, 120, 140, 160];
      const mean = service.calculateAverage(values);
      const result = service.calculateStandardDeviation(values, mean);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });
  });

  // ============================================================================
  // calculateTimeInRange Tests
  // ============================================================================
  describe('calculateTimeInRange', () => {
    it('should return zeros for empty array', () => {
      const result = service.calculateTimeInRange([], 70, 180);
      expect(result.timeInRange).toBe(0);
      expect(result.timeAboveRange).toBe(0);
      expect(result.timeBelowRange).toBe(0);
    });

    it('should calculate 100% in range when all values are in range', () => {
      const values = [80, 100, 120, 150, 170];
      const result = service.calculateTimeInRange(values, 70, 180);

      expect(result.timeInRange).toBe(100);
      expect(result.timeAboveRange).toBe(0);
      expect(result.timeBelowRange).toBe(0);
    });

    it('should calculate 100% above range when all values are high', () => {
      const values = [200, 250, 300];
      const result = service.calculateTimeInRange(values, 70, 180);

      expect(result.timeInRange).toBe(0);
      expect(result.timeAboveRange).toBe(100);
      expect(result.timeBelowRange).toBe(0);
    });

    it('should calculate 100% below range when all values are low', () => {
      const values = [40, 50, 60];
      const result = service.calculateTimeInRange(values, 70, 180);

      expect(result.timeInRange).toBe(0);
      expect(result.timeAboveRange).toBe(0);
      expect(result.timeBelowRange).toBe(100);
    });

    it('should calculate mixed percentages correctly', () => {
      // 2 low, 4 in range, 4 high = 10 total
      const values = [50, 60, 80, 100, 120, 140, 200, 220, 240, 260];
      const result = service.calculateTimeInRange(values, 70, 180);

      expect(result.timeBelowRange).toBe(20);
      expect(result.timeInRange).toBe(40);
      expect(result.timeAboveRange).toBe(40);
    });

    it('should include boundary values in range', () => {
      const values = [70, 180]; // Both boundary values
      const result = service.calculateTimeInRange(values, 70, 180);

      expect(result.timeInRange).toBe(100);
    });
  });

  // ============================================================================
  // calculateEstimatedA1C Tests
  // ============================================================================
  describe('calculateEstimatedA1C', () => {
    it('should calculate A1C using ADAG formula for mg/dL', () => {
      // eA1C = (avgGlucose + 46.7) / 28.7
      // For 100 mg/dL: (100 + 46.7) / 28.7 ≈ 5.11%
      const result = service.calculateEstimatedA1C(100, 'mg/dL');
      expect(result).toBeCloseTo(5.11, 1);
    });

    it('should calculate A1C for typical normal glucose', () => {
      // 120 mg/dL: (120 + 46.7) / 28.7 ≈ 5.81%
      const result = service.calculateEstimatedA1C(120, 'mg/dL');
      expect(result).toBeCloseTo(5.81, 1);
    });

    it('should calculate A1C for high glucose', () => {
      // 200 mg/dL: (200 + 46.7) / 28.7 ≈ 8.6%
      const result = service.calculateEstimatedA1C(200, 'mg/dL');
      expect(result).toBeCloseTo(8.6, 1);
    });

    it('should convert mmol/L to mg/dL before calculation', () => {
      // 5.5 mmol/L ≈ 99 mg/dL → A1C ≈ 5.1%
      const result = service.calculateEstimatedA1C(5.5, 'mmol/L');
      expect(result).toBeCloseTo(5.1, 1);
    });

    it('should handle diabetic range glucose', () => {
      // 154 mg/dL corresponds to A1C of 7%
      const result = service.calculateEstimatedA1C(154, 'mg/dL');
      expect(result).toBeCloseTo(7.0, 1);
    });
  });

  // ============================================================================
  // getEmptyStatistics Tests
  // ============================================================================
  describe('getEmptyStatistics', () => {
    it('should return statistics object with all zeros', () => {
      const result = service.getEmptyStatistics();

      expect(result.average).toBe(0);
      expect(result.median).toBe(0);
      expect(result.standardDeviation).toBe(0);
      expect(result.coefficientOfVariation).toBe(0);
      expect(result.timeInRange).toBe(0);
      expect(result.timeAboveRange).toBe(0);
      expect(result.timeBelowRange).toBe(0);
      expect(result.totalReadings).toBe(0);
      expect(result.estimatedA1C).toBe(0);
      expect(result.gmi).toBe(0);
    });
  });

  // ============================================================================
  // calculateStatistics (Integration) Tests
  // ============================================================================
  describe('calculateStatistics', () => {
    it('should return empty statistics for empty readings array', () => {
      const result = service.calculateStatistics([]);

      expect(result.totalReadings).toBe(0);
      expect(result.average).toBe(0);
    });

    it('should calculate all statistics for single reading', () => {
      const readings = [createReading(100)];
      const result = service.calculateStatistics(readings);

      expect(result.totalReadings).toBe(1);
      expect(result.average).toBe(100);
      expect(result.median).toBe(100);
      expect(result.standardDeviation).toBe(0);
      expect(result.timeInRange).toBe(100);
    });

    it('should calculate comprehensive statistics for multiple readings', () => {
      const readings = [
        createReading(80),
        createReading(100),
        createReading(120),
        createReading(140),
        createReading(160),
      ];
      const result = service.calculateStatistics(readings);

      expect(result.totalReadings).toBe(5);
      expect(result.average).toBe(120);
      expect(result.median).toBe(120);
      expect(result.timeInRange).toBe(100);
      expect(result.standardDeviation).toBeGreaterThan(0);
      expect(result.coefficientOfVariation).toBeGreaterThan(0);
    });

    it('should use custom target range when provided', () => {
      const readings = [createReading(100), createReading(110), createReading(120)];

      // With default range (70-180), all should be in range
      const defaultResult = service.calculateStatistics(readings);
      expect(defaultResult.timeInRange).toBe(100);

      // With narrow range (105-115), only 110 should be in range
      const customResult = service.calculateStatistics(readings, 105, 115);
      expect(customResult.timeInRange).toBeCloseTo(33.3, 0);
    });

    it('should handle mixed unit readings', () => {
      const readings = [createReading(100, 'mg/dL'), createReading(6.0, 'mmol/L')]; // ~108 mg/dL

      const result = service.calculateStatistics(readings, 70, 180, 'mg/dL');

      expect(result.totalReadings).toBe(2);
      expect(result.average).toBeCloseTo(104, 0);
    });

    it('should round values to one decimal place', () => {
      const readings = [createReading(100), createReading(101), createReading(102)];
      const result = service.calculateStatistics(readings);

      // Check that average is rounded
      expect(result.average.toString()).toMatch(/^\d+\.?\d?$/);
    });

    it('should calculate coefficient of variation correctly', () => {
      const readings = [createReading(80), createReading(100), createReading(120)];
      const result = service.calculateStatistics(readings);

      // CV = (SD / Mean) * 100
      const expectedCV = (result.standardDeviation / result.average) * 100;
      expect(result.coefficientOfVariation).toBeCloseTo(expectedCV, 0);
    });

    it('should calculate GMI same as estimatedA1C', () => {
      const readings = [createReading(100), createReading(120), createReading(140)];
      const result = service.calculateStatistics(readings);

      expect(result.gmi).toBe(result.estimatedA1C);
    });

    it('should handle readings with values at glucose status boundaries', () => {
      const readings = [
        createReading(53), // critical-low (below range)
        createReading(69), // low (below range)
        createReading(70), // normal (IN range - boundary)
        createReading(179), // normal (IN range)
        createReading(180), // high (IN range - boundary)
        createReading(251), // critical-high (above range)
      ];

      const result = service.calculateStatistics(readings);
      expect(result.totalReadings).toBe(6);
      // 3 of 6 are in range (70, 179, 180): timeInRange = 50%
      expect(result.timeInRange).toBeCloseTo(50, 0);
    });

    it('should display statistics in requested unit', () => {
      const readings = [createReading(100, 'mg/dL'), createReading(120, 'mg/dL')];

      // Request mmol/L display
      const mmolResult = service.calculateStatistics(readings, 70, 180, 'mmol/L');

      // Average of 100 and 120 mg/dL = 110 mg/dL ≈ 6.1 mmol/L
      expect(mmolResult.average).toBeCloseTo(6.1, 1);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling Tests
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle very high glucose values', () => {
      const readings = [createReading(500), createReading(600)];
      const result = service.calculateStatistics(readings);

      expect(result.totalReadings).toBe(2);
      expect(result.average).toBe(550);
      expect(result.timeAboveRange).toBe(100);
    });

    it('should handle very low glucose values', () => {
      const readings = [createReading(30), createReading(40)];
      const result = service.calculateStatistics(readings);

      expect(result.totalReadings).toBe(2);
      expect(result.average).toBe(35);
      expect(result.timeBelowRange).toBe(100);
    });

    it('should handle large number of readings', () => {
      const readings = Array.from({ length: 1000 }, () =>
        createReading(Math.floor(Math.random() * 200) + 50)
      );
      const result = service.calculateStatistics(readings);

      expect(result.totalReadings).toBe(1000);
      expect(result.average).toBeGreaterThan(0);
    });
  });
});

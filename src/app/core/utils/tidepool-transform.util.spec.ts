/**
 * Unit tests for Tidepool transformation utilities
 * Tests all pure functions for data transformation and calculations
 */

import {
  transformTidepoolToLocal,
  calculateGlucoseStatus,
  convertGlucoseUnit,
  transformBatch,
  generateLocalId,
} from './tidepool-transform.util';
import { CBGReading, SMBGReading, GlucoseReading } from '../models/glucose-reading.model';

describe('TidepoolTransformUtil', () => {
  describe('calculateGlucoseStatus', () => {
    describe('mg/dL unit', () => {
      it('should return critical-low for values below 54 mg/dL', () => {
        expect(calculateGlucoseStatus(53, 'mg/dL')).toBe('critical-low');
        expect(calculateGlucoseStatus(40, 'mg/dL')).toBe('critical-low');
        expect(calculateGlucoseStatus(30, 'mg/dL')).toBe('critical-low');
      });

      it('should return low for values between 54-69 mg/dL', () => {
        expect(calculateGlucoseStatus(54, 'mg/dL')).toBe('low');
        expect(calculateGlucoseStatus(60, 'mg/dL')).toBe('low');
        expect(calculateGlucoseStatus(69, 'mg/dL')).toBe('low');
      });

      it('should return normal for values between 70-180 mg/dL', () => {
        expect(calculateGlucoseStatus(70, 'mg/dL')).toBe('normal');
        expect(calculateGlucoseStatus(100, 'mg/dL')).toBe('normal');
        expect(calculateGlucoseStatus(180, 'mg/dL')).toBe('normal');
      });

      it('should return high for values between 181-250 mg/dL', () => {
        expect(calculateGlucoseStatus(181, 'mg/dL')).toBe('high');
        expect(calculateGlucoseStatus(200, 'mg/dL')).toBe('high');
        expect(calculateGlucoseStatus(250, 'mg/dL')).toBe('high');
      });

      it('should return critical-high for values above 250 mg/dL', () => {
        expect(calculateGlucoseStatus(251, 'mg/dL')).toBe('critical-high');
        expect(calculateGlucoseStatus(300, 'mg/dL')).toBe('critical-high');
        expect(calculateGlucoseStatus(400, 'mg/dL')).toBe('critical-high');
      });
    });

    describe('mmol/L unit', () => {
      it('should return critical-low for values below 3.0 mmol/L', () => {
        expect(calculateGlucoseStatus(2.9, 'mmol/L')).toBe('critical-low');
        expect(calculateGlucoseStatus(2.0, 'mmol/L')).toBe('critical-low');
      });

      it('should return low for values between 3.0-3.8 mmol/L', () => {
        expect(calculateGlucoseStatus(3.0, 'mmol/L')).toBe('low');
        expect(calculateGlucoseStatus(3.5, 'mmol/L')).toBe('low');
        expect(calculateGlucoseStatus(3.8, 'mmol/L')).toBe('low');
      });

      it('should return normal for values between 3.9-10.0 mmol/L', () => {
        expect(calculateGlucoseStatus(3.9, 'mmol/L')).toBe('normal');
        expect(calculateGlucoseStatus(6.0, 'mmol/L')).toBe('normal');
        expect(calculateGlucoseStatus(10.0, 'mmol/L')).toBe('normal');
      });

      it('should return high for values between 10.1-13.9 mmol/L', () => {
        expect(calculateGlucoseStatus(10.1, 'mmol/L')).toBe('high');
        expect(calculateGlucoseStatus(12.0, 'mmol/L')).toBe('high');
        expect(calculateGlucoseStatus(13.9, 'mmol/L')).toBe('high');
      });

      it('should return critical-high for values above 13.9 mmol/L', () => {
        expect(calculateGlucoseStatus(14.0, 'mmol/L')).toBe('critical-high');
        expect(calculateGlucoseStatus(20.0, 'mmol/L')).toBe('critical-high');
      });
    });

    describe('error handling', () => {
      it('should throw error for null or undefined value', () => {
        expect(() => calculateGlucoseStatus(null as any, 'mg/dL')).toThrow();
        expect(() => calculateGlucoseStatus(undefined as any, 'mg/dL')).toThrow();
      });

      it('should throw error for non-numeric value', () => {
        expect(() => calculateGlucoseStatus('100' as any, 'mg/dL')).toThrow();
        expect(() => calculateGlucoseStatus(NaN, 'mg/dL')).toThrow();
        expect(() => calculateGlucoseStatus(Infinity, 'mg/dL')).toThrow();
      });

      it('should throw error for negative value', () => {
        expect(() => calculateGlucoseStatus(-10, 'mg/dL')).toThrow();
      });

      it('should throw error for invalid unit', () => {
        expect(() => calculateGlucoseStatus(100, 'invalid' as any)).toThrow();
      });
    });
  });

  describe('convertGlucoseUnit', () => {
    it('should convert mg/dL to mmol/L correctly', () => {
      const result = convertGlucoseUnit(180, 'mg/dL', 'mmol/L');
      expect(result).toBeCloseTo(9.99, 2);
    });

    it('should convert mmol/L to mg/dL correctly', () => {
      const result = convertGlucoseUnit(10, 'mmol/L', 'mg/dL');
      expect(result).toBeCloseTo(180.182, 2);
    });

    it('should return same value when converting between same units', () => {
      expect(convertGlucoseUnit(100, 'mg/dL', 'mg/dL')).toBe(100);
      expect(convertGlucoseUnit(5.5, 'mmol/L', 'mmol/L')).toBe(5.5);
    });

    it('should handle decimal values correctly', () => {
      const result = convertGlucoseUnit(120.5, 'mg/dL', 'mmol/L');
      expect(result).toBeCloseTo(6.69, 2);
    });

    describe('error handling', () => {
      it('should throw error for invalid value', () => {
        expect(() => convertGlucoseUnit(null as any, 'mg/dL', 'mmol/L')).toThrow();
        expect(() => convertGlucoseUnit(NaN, 'mg/dL', 'mmol/L')).toThrow();
        expect(() => convertGlucoseUnit(-10, 'mg/dL', 'mmol/L')).toThrow();
      });

      it('should throw error for invalid units', () => {
        expect(() => convertGlucoseUnit(100, 'invalid' as any, 'mmol/L')).toThrow();
        expect(() => convertGlucoseUnit(100, 'mg/dL', 'invalid' as any)).toThrow();
      });
    });
  });

  describe('transformTidepoolToLocal', () => {
    const mockCBGReading: CBGReading = {
      id: 'cbg_12345',
      type: 'cbg',
      value: 120,
      units: 'mg/dL',
      time: '2025-01-15T10:30:00.000Z',
      deviceId: 'dexcom_g6',
      uploadId: 'upload_abc123',
    };

    const mockSMBGReading: SMBGReading = {
      id: 'smbg_67890',
      type: 'smbg',
      value: 130,
      units: 'mg/dL',
      time: '2025-01-15T11:00:00.000Z',
      deviceId: 'meter_123',
      uploadId: 'upload_def456',
      subType: 'manual',
    };

    it('should transform CBG reading to local format', () => {
      const result = transformTidepoolToLocal(mockCBGReading, 'user_abc');

      expect(result.id).toBe('cbg_12345');
      expect(result.type).toBe('cbg');
      expect(result.value).toBe(120);
      expect(result.units).toBe('mg/dL');
      expect(result.userId).toBe('user_abc');
      expect(result.synced).toBe(true);
      expect(result.isLocalOnly).toBe(false);
      expect(result.status).toBe('normal');
      expect(result.localId).toMatch(/^local_\d+_[a-z0-9]+$/);
      expect(result.localStoredAt).toBeDefined();
    });

    it('should transform SMBG reading to local format', () => {
      const result = transformTidepoolToLocal(mockSMBGReading, 'user_xyz');

      expect(result.id).toBe('smbg_67890');
      expect(result.type).toBe('smbg');
      expect(result.value).toBe(130);
      expect(result.userId).toBe('user_xyz');
      expect(result.synced).toBe(true);
      expect(result.isLocalOnly).toBe(false);
      expect(result.status).toBe('normal');
    });

    it('should calculate correct status for different glucose values', () => {
      const lowReading = { ...mockCBGReading, value: 60 };
      const highReading = { ...mockCBGReading, value: 200 };
      const criticalHighReading = { ...mockCBGReading, value: 300 };

      expect(transformTidepoolToLocal(lowReading, 'user_abc').status).toBe('low');
      expect(transformTidepoolToLocal(highReading, 'user_abc').status).toBe('high');
      expect(transformTidepoolToLocal(criticalHighReading, 'user_abc').status).toBe(
        'critical-high'
      );
    });

    it('should preserve all Tidepool fields', () => {
      const result = transformTidepoolToLocal(mockCBGReading, 'user_abc');

      expect(result.deviceId).toBe('dexcom_g6');
      expect(result.uploadId).toBe('upload_abc123');
      expect(result.time).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should trim userId whitespace', () => {
      const result = transformTidepoolToLocal(mockCBGReading, '  user_abc  ');
      expect(result.userId).toBe('user_abc');
    });

    describe('error handling', () => {
      it('should throw error for null reading', () => {
        expect(() => transformTidepoolToLocal(null as any, 'user_abc')).toThrow();
      });

      it('should throw error for empty userId', () => {
        expect(() => transformTidepoolToLocal(mockCBGReading, '')).toThrow();
        expect(() => transformTidepoolToLocal(mockCBGReading, '   ')).toThrow();
      });

      it('should throw error for invalid userId', () => {
        expect(() => transformTidepoolToLocal(mockCBGReading, null as any)).toThrow();
        expect(() => transformTidepoolToLocal(mockCBGReading, undefined as any)).toThrow();
      });
    });
  });

  describe('transformBatch', () => {
    const mockReadings: GlucoseReading[] = [
      {
        id: 'reading_1',
        type: 'cbg',
        value: 100,
        units: 'mg/dL',
        time: '2025-01-15T10:00:00.000Z',
        deviceId: 'device_1',
        uploadId: 'upload_1',
      },
      {
        id: 'reading_2',
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: '2025-01-15T11:00:00.000Z',
        deviceId: 'device_2',
        uploadId: 'upload_2',
        subType: 'manual',
      },
    ];

    it('should transform multiple readings', () => {
      const result = transformBatch(mockReadings, 'user_abc');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('reading_1');
      expect(result[1].id).toBe('reading_2');
      expect(result[0].userId).toBe('user_abc');
      expect(result[1].userId).toBe('user_abc');
    });

    it('should return empty array for empty input', () => {
      const result = transformBatch([], 'user_abc');
      expect(result).toEqual([]);
    });

    it('should maintain order of readings', () => {
      const result = transformBatch(mockReadings, 'user_abc');

      expect(result[0].id).toBe('reading_1');
      expect(result[1].id).toBe('reading_2');
    });

    it('should apply transformations to all readings', () => {
      const result = transformBatch(mockReadings, 'user_abc');

      result.forEach(reading => {
        expect(reading.synced).toBe(true);
        expect(reading.isLocalOnly).toBe(false);
        expect(reading.localId).toBeDefined();
        expect(reading.status).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should throw error for non-array input', () => {
        expect(() => transformBatch(null as any, 'user_abc')).toThrow();
        expect(() => transformBatch('not an array' as any, 'user_abc')).toThrow();
      });

      it('should throw error for invalid userId', () => {
        expect(() => transformBatch(mockReadings, '')).toThrow();
        expect(() => transformBatch(mockReadings, null as any)).toThrow();
      });
    });
  });

  describe('generateLocalId', () => {
    it('should generate ID with correct format', () => {
      const id = generateLocalId();
      expect(id).toMatch(/^local_\d+_[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateLocalId();
      const id2 = generateLocalId();
      const id3 = generateLocalId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should include timestamp component', () => {
      const beforeTimestamp = Date.now();
      const id = generateLocalId();
      const afterTimestamp = Date.now();

      const timestampPart = parseInt(id.split('_')[1]);
      expect(timestampPart).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestampPart).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should generate IDs with local_ prefix', () => {
      const id = generateLocalId();
      expect(id.startsWith('local_')).toBe(true);
    });
  });
});

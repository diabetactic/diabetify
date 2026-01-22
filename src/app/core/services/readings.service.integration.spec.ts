/**
 * Integration tests for ReadingsService with real IndexedDB
 * Tests actual database operations without mocks
 */
// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { ReadingsService } from '@services/readings.service';
import { db } from '@services/database.service';
import { GlucoseReading, GlucoseStatus } from '@models/glucose-reading.model';

describe('ReadingsService Integration Tests', () => {
  let service: ReadingsService;

  beforeEach(async () => {
    // Clear database before each test
    await db.clearAllData();

    TestBed.configureTestingModule({
      providers: [ReadingsService],
    });

    service = TestBed.inject(ReadingsService);
    service.setCurrentUser('test-user');
  });

  afterEach(async () => {
    // Cleanup after tests
    await db.clearAllData();
  });

  describe('Sequential Reading Addition', () => {
    it('should successfully add first reading to IndexedDB', async () => {
      const reading: Partial<GlucoseReading> = {
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      };

      const result = await service.addReading(reading as any);

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.id).not.toBe('');
      expect(result.value).toBe(120);

      // Verify stored in database
      const stored = await db.readings.get(result.id);
      expect(stored).toBeDefined();
      expect(stored?.value).toBe(120);
    });

    it('should successfully add SECOND reading without duplicate key error', async () => {
      // Add first reading
      const reading1: Partial<GlucoseReading> = {
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      };
      const result1 = await service.addReading(reading1 as any);

      // Add second reading - THIS MUST NOT FAIL
      const reading2: Partial<GlucoseReading> = {
        type: 'smbg',
        value: 150,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      };
      const result2 = await service.addReading(reading2 as any);

      expect(result2).toBeDefined();
      expect(result2.id).toBeTruthy();
      expect(result2.id).not.toBe('');
      expect(result2.id).not.toBe(result1.id);
      expect(result2.value).toBe(150);

      // Verify both stored
      const count = await db.readings.count();
      expect(count).toBe(2);
    });

    it('should add multiple readings sequentially', async () => {
      const readings: Partial<GlucoseReading>[] = [
        {
          type: 'smbg',
          value: 100,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        },
        {
          type: 'smbg',
          value: 120,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        },
        {
          type: 'smbg',
          value: 140,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        },
        {
          type: 'smbg',
          value: 160,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        },
        {
          type: 'smbg',
          value: 180,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        },
      ];

      const results = [];
      for (const reading of readings) {
        const result = await service.addReading(reading as any);
        results.push(result);
      }

      // All should have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      // All should be stored
      const count = await db.readings.count();
      expect(count).toBe(5);
    });

    it('should generate unique IDs for each reading', async () => {
      const ids: string[] = [];

      for (let i = 0; i < 10; i++) {
        const reading: Partial<GlucoseReading> = {
          type: 'smbg',
          value: 100 + i,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        };
        const result = await service.addReading(reading as any);
        ids.push(result.id);
      }

      // All IDs must be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      // No empty IDs
      expect(ids.every(id => id && id !== '')).toBe(true);
    });
  });

  describe('Reading Retrieval', () => {
    it('should retrieve all readings after adding multiple', async () => {
      // Add 3 readings
      await service.addReading({
        type: 'smbg',
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      } as any);
      await service.addReading({
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      } as any);
      await service.addReading({
        type: 'smbg',
        value: 140,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      } as any);

      const result = await service.getAllReadings();

      expect(result.readings.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should maintain data integrity across operations', async () => {
      const reading: Partial<GlucoseReading> = {
        type: 'smbg',
        value: 180,
        units: 'mg/dL',
        time: '2024-10-27T10:00:00Z',
        subType: 'manual',
        notes: 'Test note',
        tags: ['after-lunch'],
      };

      const added = await service.addReading(reading as any);
      const retrieved = await db.readings.get(added.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe(180);
      expect(retrieved?.units).toBe('mg/dL');
      expect(retrieved?.notes).toBe('Test note');
      expect(retrieved?.tags).toContain('after-lunch');
    });
  });

  describe('ID Generation', () => {
    it('should generate IDs with correct format', async () => {
      const reading: Partial<GlucoseReading> = {
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      };

      const result = await service.addReading(reading as any);

      // ID should start with 'local_'
      expect(result.id).toMatch(/^local_\d+_[a-z0-9]+$/);

      // localId should also exist and match the id
      expect(result.localId).toBeTruthy();
      expect(result.localId).toBe(result.id);
    });

    it('should handle empty ID gracefully', async () => {
      const reading: any = {
        id: '', // Empty ID should be replaced
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
      };

      const result = await service.addReading(reading);

      // Should generate new ID
      expect(result.id).toBeTruthy();
      expect(result.id).not.toBe('');
      expect(result.id).toMatch(/^local_\d+_[a-z0-9]+$/);
    });
  });

  describe('Glucose Status Calculation', () => {
    it('should correctly set glucose status for different values', async () => {
      const testCases: Array<{ value: number; expectedStatus: GlucoseStatus }> = [
        { value: 45, expectedStatus: 'critical-low' },
        { value: 65, expectedStatus: 'low' },
        { value: 120, expectedStatus: 'normal' },
        { value: 200, expectedStatus: 'high' },
        { value: 300, expectedStatus: 'critical-high' },
      ];

      for (const testCase of testCases) {
        const reading: Partial<GlucoseReading> = {
          type: 'smbg',
          value: testCase.value,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        };

        const result = await service.addReading(reading as any);
        expect(result.status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('exportManualReadingsSummary', () => {
    it('should return empty summary when no manual readings exist', async () => {
      const summary = await service.exportManualReadingsSummary(14);

      expect(summary.totalReadings).toBe(0);
      expect(summary.unit).toBe('mg/dL');
      expect(summary.readings.length).toBe(0);
      expect(summary.statistics.average).toBeUndefined();
      expect(summary.statistics.minimum).toBeUndefined();
      expect(summary.statistics.maximum).toBeUndefined();
    });

    it('should aggregate manual readings with consistent units and statistics', async () => {
      const now = new Date('2024-10-26T10:00:00Z');
      const earlier = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const later = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      const first = await service.addReading({
        type: 'smbg',
        value: 100,
        units: 'mg/dL',
        time: earlier.toISOString(),
        subType: 'manual',
        notes: 'fasting',
      } as any);

      const second = await service.addReading({
        type: 'smbg',
        value: 6.5,
        units: 'mmol/L',
        time: later.toISOString(),
        subType: 'manual',
      } as any);

      await service.addReading({
        type: 'smbg',
        value: 140,
        units: 'mg/dL',
        time: now.toISOString(),
        subType: 'linked',
      } as any);

      await service.addReading({
        type: 'cbg',
        value: 150,
        units: 'mg/dL',
        time: now.toISOString(),
        subType: 'manual',
      } as any);

      const summary = await service.exportManualReadingsSummary(7);

      expect(summary.totalReadings).toBe(2);
      expect(summary.unit).toBe('mg/dL');
      expect(summary.readings.map(r => r.id)).toEqual([first.id, second.id]);
      expect(summary.readings[0].value).toBe(100);
      expect(summary.readings[0].notes).toBe('fasting');
      expect(summary.readings[1].value).toBeCloseTo(117.1, 1);
      expect(summary.statistics.average).toBeCloseTo(108.6, 1);
      expect(summary.statistics.minimum).toBe(100);
      expect(summary.statistics.maximum).toBeCloseTo(117.1, 1);
      expect(summary.readings.every(r => r.status)).toBe(true);
    });

    it('should prefer earliest reading unit and convert subsequent values', async () => {
      const older = new Date('2024-10-20T08:00:00Z');
      const newer = new Date('2024-10-21T08:00:00Z');

      await service.addReading({
        type: 'smbg',
        value: 6.0,
        units: 'mmol/L',
        time: older.toISOString(),
        subType: 'manual',
      } as any);

      await service.addReading({
        type: 'smbg',
        value: 180,
        units: 'mg/dL',
        time: newer.toISOString(),
        subType: 'manual',
      } as any);

      const summary = await service.exportManualReadingsSummary(14);

      expect(summary.unit).toBe('mmol/L');
      expect(summary.totalReadings).toBe(2);
      expect(summary.readings[0].value).toBe(6.0);
      expect(summary.readings[1].value).toBeCloseTo(9.99, 2);
      expect(summary.statistics.average).toBeCloseTo(7.99, 2);
      expect(summary.statistics.maximum).toBeCloseTo(9.99, 2);
      expect(summary.readings[1].status).toBe('high');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sequential additions', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const reading: Partial<GlucoseReading> = {
          type: 'smbg',
          value: 100 + i * 10,
          units: 'mg/dL',
          time: new Date().toISOString(),
          subType: 'manual',
        };
        promises.push(service.addReading(reading as any));
      }

      const results = await Promise.all(promises);

      // All should have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      // All should be stored
      const count = await db.readings.count();
      expect(count).toBe(5);
    });
  });
});

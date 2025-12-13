/**
 * Unit tests for glucose reading models
 * Tests type definitions, interfaces, and constants
 */

import {
  GlucoseUnit,
  TrendRateUnit,
  GlucoseType,
  SMBGSubType,
  GlucoseStatus,
  TidepoolBaseData,
  CBGReading,
  SMBGReading,
  GlucoseReading,
  LocalGlucoseFields,
  LocalGlucoseReading,
  GlucoseQueryParams,
  GlucoseStatistics,
} from '@models/glucose-reading.model';

describe('GlucoseReadingModel', () => {
  describe('Type definitions', () => {
    it('should support both GlucoseUnit values', () => {
      const units: GlucoseUnit[] = ['mg/dL', 'mmol/L'];
      units.forEach(unit => {
        const reading: Pick<CBGReading, 'units'> = { units: unit };
        expect(reading.units).toBe(unit);
      });
    });

    it('should support both TrendRateUnit values', () => {
      const units: TrendRateUnit[] = ['mg/dL/minute', 'mmol/L/minute'];
      units.forEach(unit => {
        const rate = unit;
        expect(rate).toBe(unit);
      });
    });

    it('should support both GlucoseType values', () => {
      const types: GlucoseType[] = ['cbg', 'smbg'];
      types.forEach(type => {
        const reading: Pick<TidepoolBaseData, 'type'> = { type };
        expect(reading.type).toBe(type);
      });
    });

    it('should support both SMBGSubType values', () => {
      const subTypes: SMBGSubType[] = ['manual', 'linked'];
      subTypes.forEach(subType => {
        const reading: Pick<SMBGReading, 'subType'> = { subType };
        expect(reading.subType).toBe(subType);
      });
    });

    it('should support all GlucoseStatus values', () => {
      const statuses: GlucoseStatus[] = ['low', 'normal', 'high', 'critical-low', 'critical-high'];
      statuses.forEach(status => {
        const fields: Pick<LocalGlucoseFields, 'status'> = { status };
        expect(fields.status).toBe(status);
      });
    });
  });

  describe('TidepoolBaseData interface', () => {
    it('should accept minimal base data', () => {
      const baseData: TidepoolBaseData = {
        id: 'reading123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
      };
      expect(baseData.id).toBe('reading123');
      expect(baseData.type).toBe('cbg');
      expect(baseData.time).toBe('2024-01-01T12:00:00Z');
    });

    it('should accept base data with all optional fields', () => {
      const baseData: TidepoolBaseData = {
        id: 'reading123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        deviceId: 'device456',
        deviceTime: '2024-01-01T12:00:00',
        uploadId: 'upload789',
        guid: 'guid-123-456',
        clockDriftOffset: 0,
        conversionOffset: 0,
        timezoneOffset: -480,
        timezone: 'America/Los_Angeles',
        createdTime: '2024-01-01T12:00:00Z',
        modifiedTime: '2024-01-01T12:00:00Z',
        annotations: [{ code: 'test', value: 'annotation' }],
        notes: 'Note 1, Note 2',
        tags: ['tag1', 'tag2'],
      };
      expect(baseData.deviceId).toBe('device456');
      expect(baseData.timezone).toBe('America/Los_Angeles');
      expect(baseData.annotations?.length).toBe(1);
      expect(baseData.notes).toBe('Note 1, Note 2');
      expect(baseData.tags?.length).toBe(2);
    });

    it('should accept annotations without values', () => {
      const baseData: TidepoolBaseData = {
        id: 'reading123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        annotations: [{ code: 'test' }],
      };
      expect(baseData.annotations?.[0].value).toBeUndefined();
    });
  });

  describe('CBGReading interface', () => {
    it('should accept minimal CBG reading', () => {
      const reading: CBGReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
      };
      expect(reading.type).toBe('cbg');
      expect(reading.value).toBe(120);
      expect(reading.units).toBe('mg/dL');
    });

    it('should accept CBG reading with trend data', () => {
      const reading: CBGReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
        trendRate: 1.5,
        trendRateUnits: 'mg/dL/minute',
      };
      expect(reading.trendRate).toBe(1.5);
      expect(reading.trendRateUnits).toBe('mg/dL/minute');
    });

    it('should accept CBG reading with sample interval', () => {
      const reading: CBGReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
        sampleInterval: 300000,
      };
      expect(reading.sampleInterval).toBe(300000);
    });

    it('should accept backfilled CBG reading', () => {
      const reading: CBGReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
        backfilled: true,
      };
      expect(reading.backfilled).toBe(true);
    });

    it('should accept mmol/L values', () => {
      const reading: CBGReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 6.7,
        units: 'mmol/L',
        trendRate: 0.08,
        trendRateUnits: 'mmol/L/minute',
      };
      expect(reading.units).toBe('mmol/L');
      expect(reading.trendRateUnits).toBe('mmol/L/minute');
    });
  });

  describe('SMBGReading interface', () => {
    it('should accept minimal SMBG reading', () => {
      const reading: SMBGReading = {
        id: 'smbg123',
        type: 'smbg',
        time: '2024-01-01T12:00:00Z',
        value: 95,
        units: 'mg/dL',
      };
      expect(reading.type).toBe('smbg');
      expect(reading.value).toBe(95);
      expect(reading.units).toBe('mg/dL');
    });

    it('should accept manual SMBG reading', () => {
      const reading: SMBGReading = {
        id: 'smbg123',
        type: 'smbg',
        time: '2024-01-01T12:00:00Z',
        value: 95,
        units: 'mg/dL',
        subType: 'manual',
      };
      expect(reading.subType).toBe('manual');
    });

    it('should accept linked SMBG reading', () => {
      const reading: SMBGReading = {
        id: 'smbg123',
        type: 'smbg',
        time: '2024-01-01T12:00:00Z',
        value: 95,
        units: 'mg/dL',
        subType: 'linked',
      };
      expect(reading.subType).toBe('linked');
    });

    it('should accept SMBG reading with all base fields', () => {
      const reading: SMBGReading = {
        id: 'smbg123',
        type: 'smbg',
        time: '2024-01-01T12:00:00Z',
        value: 95,
        units: 'mg/dL',
        subType: 'manual',
        deviceId: 'meter789',
        notes: 'Before meal',
        tags: ['fasting'],
      };
      expect(reading.deviceId).toBe('meter789');
      expect(reading.notes).toBe('Before meal');
      expect(reading.tags?.[0]).toBe('fasting');
    });
  });

  describe('GlucoseReading union type', () => {
    it('should accept CBG as GlucoseReading', () => {
      const reading: GlucoseReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
      };
      expect(reading.type).toBe('cbg');
    });

    it('should accept SMBG as GlucoseReading', () => {
      const reading: GlucoseReading = {
        id: 'smbg123',
        type: 'smbg',
        time: '2024-01-01T12:00:00Z',
        value: 95,
        units: 'mg/dL',
      };
      expect(reading.type).toBe('smbg');
    });
  });

  describe('LocalGlucoseFields interface', () => {
    it('should accept minimal local fields', () => {
      const fields: LocalGlucoseFields = {
        synced: false,
      };
      expect(fields.synced).toBe(false);
    });

    it('should accept all local fields', () => {
      const fields: LocalGlucoseFields = {
        localId: 'local123',
        synced: true,
        status: 'normal',
        userId: 'user456',
        localStoredAt: '2024-01-01T12:00:00Z',
        isLocalOnly: false,
        backendId: 789,
        mealContext: 'before-breakfast',
      };
      expect(fields.localId).toBe('local123');
      expect(fields.synced).toBe(true);
      expect(fields.status).toBe('normal');
      expect(fields.userId).toBe('user456');
      expect(fields.backendId).toBe(789);
      expect(fields.mealContext).toBe('before-breakfast');
    });

    it('should accept all status values', () => {
      const statuses: GlucoseStatus[] = ['low', 'normal', 'high', 'critical-low', 'critical-high'];
      statuses.forEach(status => {
        const fields: LocalGlucoseFields = {
          synced: true,
          status,
        };
        expect(fields.status).toBe(status);
      });
    });
  });

  describe('LocalGlucoseReading intersection type', () => {
    it('should accept CBG with local fields', () => {
      const reading: LocalGlucoseReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
        synced: true,
        status: 'normal',
        localId: 'local123',
      };
      expect(reading.type).toBe('cbg');
      expect(reading.synced).toBe(true);
      expect(reading.status).toBe('normal');
    });

    it('should accept SMBG with local fields', () => {
      const reading: LocalGlucoseReading = {
        id: 'smbg123',
        type: 'smbg',
        time: '2024-01-01T12:00:00Z',
        value: 95,
        units: 'mg/dL',
        subType: 'manual',
        synced: false,
        isLocalOnly: true,
        mealContext: 'after-lunch',
      };
      expect(reading.type).toBe('smbg');
      expect(reading.subType).toBe('manual');
      expect(reading.synced).toBe(false);
      expect(reading.isLocalOnly).toBe(true);
      expect(reading.mealContext).toBe('after-lunch');
    });

    it('should accept reading with backend and Tidepool IDs', () => {
      const reading: LocalGlucoseReading = {
        id: 'tidepool123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
        synced: true,
        backendId: 456,
        localId: 'local789',
      };
      expect(reading.id).toBe('tidepool123');
      expect(reading.backendId).toBe(456);
      expect(reading.localId).toBe('local789');
    });
  });

  describe('GlucoseQueryParams interface', () => {
    it('should accept empty query params', () => {
      const params: GlucoseQueryParams = {};
      expect(Object.keys(params).length).toBe(0);
    });

    it('should accept date range query', () => {
      const params: GlucoseQueryParams = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };
      expect(params.startDate).toBe('2024-01-01T00:00:00Z');
      expect(params.endDate).toBe('2024-01-31T23:59:59Z');
    });

    it('should accept single type filter', () => {
      const params: GlucoseQueryParams = {
        type: 'cbg',
      };
      expect(params.type).toBe('cbg');
    });

    it('should accept multiple type filters', () => {
      const params: GlucoseQueryParams = {
        type: ['cbg', 'smbg'],
      };
      expect(Array.isArray(params.type)).toBe(true);
      expect(params.type).toEqual(['cbg', 'smbg']);
    });

    it('should accept pagination params', () => {
      const params: GlucoseQueryParams = {
        limit: 100,
        offset: 50,
      };
      expect(params.limit).toBe(100);
      expect(params.offset).toBe(50);
    });

    it('should accept sort order', () => {
      const params: GlucoseQueryParams = {
        sort: 'desc',
      };
      expect(params.sort).toBe('desc');
    });

    it('should accept all params together', () => {
      const params: GlucoseQueryParams = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        type: 'cbg',
        limit: 100,
        offset: 0,
        sort: 'asc',
      };
      expect(params.startDate).toBeDefined();
      expect(params.type).toBe('cbg');
      expect(params.limit).toBe(100);
      expect(params.sort).toBe('asc');
    });
  });

  describe('GlucoseStatistics interface', () => {
    it('should accept minimal statistics', () => {
      const stats: GlucoseStatistics = {
        average: 125,
        median: 120,
        standardDeviation: 30,
        coefficientOfVariation: 24,
        timeInRange: 70,
        timeAboveRange: 20,
        timeBelowRange: 10,
        totalReadings: 288,
      };
      expect(stats.average).toBe(125);
      expect(stats.median).toBe(120);
      expect(stats.totalReadings).toBe(288);
    });

    it('should accept statistics with A1C and GMI', () => {
      const stats: GlucoseStatistics = {
        average: 125,
        median: 120,
        standardDeviation: 30,
        coefficientOfVariation: 24,
        timeInRange: 70,
        timeAboveRange: 20,
        timeBelowRange: 10,
        totalReadings: 288,
        estimatedA1C: 6.5,
        gmi: 6.3,
      };
      expect(stats.estimatedA1C).toBe(6.5);
      expect(stats.gmi).toBe(6.3);
    });

    it('should accept valid time percentages', () => {
      const stats: GlucoseStatistics = {
        average: 125,
        median: 120,
        standardDeviation: 30,
        coefficientOfVariation: 24,
        timeInRange: 75,
        timeAboveRange: 15,
        timeBelowRange: 10,
        totalReadings: 288,
      };
      const totalPercentage = stats.timeInRange + stats.timeAboveRange + stats.timeBelowRange;
      expect(totalPercentage).toBe(100);
    });

    it('should accept zero readings', () => {
      const stats: GlucoseStatistics = {
        average: 0,
        median: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        timeInRange: 0,
        timeAboveRange: 0,
        timeBelowRange: 0,
        totalReadings: 0,
      };
      expect(stats.totalReadings).toBe(0);
    });
  });

  describe('Data integrity', () => {
    it('should preserve all CBG fields in LocalGlucoseReading', () => {
      const cbg: CBGReading = {
        id: 'cbg123',
        type: 'cbg',
        time: '2024-01-01T12:00:00Z',
        value: 120,
        units: 'mg/dL',
        trendRate: 1.5,
        trendRateUnits: 'mg/dL/minute',
        sampleInterval: 300000,
      };

      const local: LocalGlucoseReading = {
        ...cbg,
        synced: true,
        status: 'normal',
      };

      expect(local.value).toBe(cbg.value);
      expect(local.trendRate).toBe(cbg.trendRate);
      expect(local.sampleInterval).toBe(cbg.sampleInterval);
    });

    it('should preserve all SMBG fields in LocalGlucoseReading', () => {
      const smbg: SMBGReading = {
        id: 'smbg123',
        type: 'smbg',
        time: '2024-01-01T12:00:00Z',
        value: 95,
        units: 'mg/dL',
        subType: 'manual',
        notes: 'Before meal',
      };

      const local: LocalGlucoseReading = {
        ...smbg,
        synced: true,
        mealContext: 'before-breakfast',
      };

      expect(local.value).toBe(smbg.value);
      expect(local.subType).toBe(smbg.subType);
      expect(local.notes).toEqual(smbg.notes);
    });
  });
});

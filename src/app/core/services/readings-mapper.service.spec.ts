import { TestBed } from '@angular/core/testing';
import { ReadingsMapperService, BackendGlucoseReading } from './readings-mapper.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { MockReading } from '@services/mock-data.service';

describe('ReadingsMapperService', () => {
  let service: ReadingsMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReadingsMapperService],
    });
    service = TestBed.inject(ReadingsMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================================================
  // Unit Conversion Tests
  // ============================================================================
  describe('convertToUnit', () => {
    it('should return same value when converting to same unit', () => {
      expect(service.convertToUnit(100, 'mg/dL', 'mg/dL')).toBe(100);
      expect(service.convertToUnit(5.5, 'mmol/L', 'mmol/L')).toBe(5.5);
    });

    it('should convert mg/dL to mmol/L correctly', () => {
      // 100 mg/dL ≈ 5.55 mmol/L
      const result = service.convertToUnit(100, 'mg/dL', 'mmol/L');
      expect(result).toBeCloseTo(5.55, 1);
    });

    it('should convert mmol/L to mg/dL correctly', () => {
      // 5.5 mmol/L ≈ 99.1 mg/dL
      const result = service.convertToUnit(5.5, 'mmol/L', 'mg/dL');
      expect(result).toBeCloseTo(99.1, 0);
    });

    it('should handle edge case values', () => {
      expect(service.convertToUnit(0, 'mg/dL', 'mmol/L')).toBe(0);
      expect(service.convertToUnit(0, 'mmol/L', 'mg/dL')).toBe(0);
    });

    it('should convert high glucose values correctly', () => {
      // 400 mg/dL ≈ 22.2 mmol/L
      const result = service.convertToUnit(400, 'mg/dL', 'mmol/L');
      expect(result).toBeCloseTo(22.2, 1);
    });

    it('should convert low glucose values correctly', () => {
      // 40 mg/dL ≈ 2.22 mmol/L
      const result = service.convertToUnit(40, 'mg/dL', 'mmol/L');
      expect(result).toBeCloseTo(2.22, 1);
    });
  });

  describe('toMgDl', () => {
    it('should return same value for mg/dL input', () => {
      expect(service.toMgDl(100, 'mg/dL')).toBe(100);
    });

    it('should convert mmol/L to mg/dL', () => {
      const result = service.toMgDl(5.5, 'mmol/L');
      expect(result).toBeCloseTo(99.1, 0);
    });
  });

  // ============================================================================
  // Status Calculation Tests
  // ============================================================================
  describe('calculateGlucoseStatus', () => {
    describe('with mg/dL values', () => {
      it('should return critical-low for values below 54', () => {
        expect(service.calculateGlucoseStatus(53, 'mg/dL')).toBe('critical-low');
        expect(service.calculateGlucoseStatus(40, 'mg/dL')).toBe('critical-low');
        expect(service.calculateGlucoseStatus(0, 'mg/dL')).toBe('critical-low');
      });

      it('should return low for values 54-69', () => {
        expect(service.calculateGlucoseStatus(54, 'mg/dL')).toBe('low');
        expect(service.calculateGlucoseStatus(60, 'mg/dL')).toBe('low');
        expect(service.calculateGlucoseStatus(69, 'mg/dL')).toBe('low');
      });

      it('should return normal for values 70-179', () => {
        expect(service.calculateGlucoseStatus(70, 'mg/dL')).toBe('normal');
        expect(service.calculateGlucoseStatus(100, 'mg/dL')).toBe('normal');
        expect(service.calculateGlucoseStatus(120, 'mg/dL')).toBe('normal');
        expect(service.calculateGlucoseStatus(179, 'mg/dL')).toBe('normal');
      });

      it('should return high for values 180-250', () => {
        expect(service.calculateGlucoseStatus(180, 'mg/dL')).toBe('high');
        expect(service.calculateGlucoseStatus(200, 'mg/dL')).toBe('high');
        expect(service.calculateGlucoseStatus(250, 'mg/dL')).toBe('high');
      });

      it('should return critical-high for values above 250', () => {
        expect(service.calculateGlucoseStatus(251, 'mg/dL')).toBe('critical-high');
        expect(service.calculateGlucoseStatus(300, 'mg/dL')).toBe('critical-high');
        expect(service.calculateGlucoseStatus(400, 'mg/dL')).toBe('critical-high');
      });
    });

    describe('with mmol/L values', () => {
      it('should return critical-low for values below 3 mmol/L', () => {
        // 3 mmol/L ≈ 54 mg/dL
        expect(service.calculateGlucoseStatus(2.5, 'mmol/L')).toBe('critical-low');
      });

      it('should return low for values 3-3.8 mmol/L', () => {
        // 3.0-3.9 mmol/L ≈ 54-70 mg/dL
        expect(service.calculateGlucoseStatus(3.5, 'mmol/L')).toBe('low');
      });

      it('should return normal for values 3.9-9.9 mmol/L', () => {
        // 3.9-9.9 mmol/L ≈ 70-180 mg/dL
        expect(service.calculateGlucoseStatus(5.5, 'mmol/L')).toBe('normal');
        expect(service.calculateGlucoseStatus(7.0, 'mmol/L')).toBe('normal');
      });

      it('should return high for values 10-13.9 mmol/L', () => {
        // 10-13.9 mmol/L ≈ 180-250 mg/dL
        expect(service.calculateGlucoseStatus(11.0, 'mmol/L')).toBe('high');
      });

      it('should return critical-high for values above 13.9 mmol/L', () => {
        // > 13.9 mmol/L ≈ > 250 mg/dL
        expect(service.calculateGlucoseStatus(15.0, 'mmol/L')).toBe('critical-high');
      });
    });
  });

  // ============================================================================
  // Timestamp Parsing Tests
  // ============================================================================
  describe('parseBackendTimestamp', () => {
    it('should parse backend timestamp format correctly', () => {
      const timestamp = '15/06/2024 14:30:00';
      const result = service.parseBackendTimestamp(timestamp);
      const date = new Date(result);

      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(date.getUTCDate()).toBe(15);
      // Time should be 17:30 UTC (14:30 Argentina time + 3 hours)
      expect(date.getUTCHours()).toBe(17);
      expect(date.getUTCMinutes()).toBe(30);
    });

    it('should handle different dates correctly', () => {
      const timestamp = '01/01/2025 00:00:00';
      const result = service.parseBackendTimestamp(timestamp);
      const date = new Date(result);

      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(1);
      expect(date.getUTCHours()).toBe(3); // Midnight Argentina = 3 AM UTC
    });
  });

  describe('formatToBackendTimestamp', () => {
    it('should format date to ISO 8601 format', () => {
      const date = new Date('2024-06-15T14:30:00Z');
      const result = service.formatToBackendTimestamp(date);

      expect(result).toBe('2024-06-15T14:30:00Z');
    });

    it('should handle dates with milliseconds', () => {
      const date = new Date('2024-06-15T14:30:45.123Z');
      const result = service.formatToBackendTimestamp(date);

      expect(result).toBe('2024-06-15T14:30:45Z');
    });
  });

  // ============================================================================
  // Backend to Local Mapping Tests
  // ============================================================================
  describe('mapBackendToLocal', () => {
    it('should map backend reading to local format', () => {
      const backendReading: BackendGlucoseReading = {
        id: 123,
        user_id: 456,
        glucose_level: 120,
        reading_type: 'DESAYUNO',
        created_at: '15/06/2024 14:30:00',
        notes: 'Test note',
      };

      const result = service.mapBackendToLocal(backendReading);

      expect(result.id).toBe('backend_123');
      expect(result.localId).toBe('backend_123');
      expect(result.backendId).toBe(123);
      expect(result.value).toBe(120);
      expect(result.units).toBe('mg/dL');
      expect(result.type).toBe('smbg');
      expect(result.subType).toBe('manual');
      expect(result.deviceId).toBe('backend-sync');
      expect(result.userId).toBe('456');
      expect(result.synced).toBe(true);
      expect(result.isLocalOnly).toBe(false);
      expect(result.status).toBe('normal');
      expect(result.mealContext).toBe('DESAYUNO');
      expect(result.notes).toBe('Test note');
    });

    it('should calculate correct status for different glucose levels', () => {
      const lowReading: BackendGlucoseReading = {
        id: 1,
        user_id: 1,
        glucose_level: 50,
        reading_type: 'OTRO',
        created_at: '15/06/2024 14:30:00',
      };

      const highReading: BackendGlucoseReading = {
        id: 2,
        user_id: 1,
        glucose_level: 300,
        reading_type: 'OTRO',
        created_at: '15/06/2024 14:30:00',
      };

      expect(service.mapBackendToLocal(lowReading).status).toBe('critical-low');
      expect(service.mapBackendToLocal(highReading).status).toBe('critical-high');
    });

    it('should handle missing reading_type with default', () => {
      const reading: BackendGlucoseReading = {
        id: 1,
        user_id: 1,
        glucose_level: 100,
        reading_type: '',
        created_at: '15/06/2024 14:30:00',
      };

      const result = service.mapBackendToLocal(reading);
      expect(result.mealContext).toBe('OTRO');
    });

    it('should convert timestamp to ISO format', () => {
      const reading: BackendGlucoseReading = {
        id: 1,
        user_id: 1,
        glucose_level: 100,
        reading_type: 'OTRO',
        created_at: '15/06/2024 14:30:00',
      };

      const result = service.mapBackendToLocal(reading);
      expect(result.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('mapMockToLocal', () => {
    it('should map mock reading to local format', () => {
      const mockReading: MockReading = {
        id: 'mock_123',
        date: new Date('2024-06-15T14:30:00Z'),
        glucose: 110,
        notes: 'Mock note',
      };

      const result = service.mapMockToLocal(mockReading);

      expect(result.id).toBe('mock_123');
      expect(result.localId).toBe('mock_123');
      expect(result.value).toBe(110);
      expect(result.units).toBe('mg/dL');
      expect(result.type).toBe('smbg');
      expect(result.subType).toBe('manual');
      expect(result.deviceId).toBe('mock-device');
      expect(result.userId).toBe('pac001');
      expect(result.synced).toBe(true);
      expect(result.isLocalOnly).toBe(false);
      expect(result.status).toBe('normal');
      expect(result.notes).toBe('Mock note');
    });

    it('should convert date to ISO string', () => {
      const mockReading: MockReading = {
        id: 'mock_123',
        date: new Date('2024-06-15T14:30:00Z'),
        glucose: 100,
      };

      const result = service.mapMockToLocal(mockReading);
      expect(result.time).toBe('2024-06-15T14:30:00.000Z');
    });
  });

  // ============================================================================
  // Local to Backend Mapping Tests
  // ============================================================================
  describe('buildBackendCreateParams', () => {
    it('should build params with required fields', () => {
      const reading: LocalGlucoseReading = {
        id: 'local_123',
        localId: 'local_123',
        time: '2024-06-15T14:30:00.000Z',
        value: 120,
        units: 'mg/dL',
        type: 'smbg',
        subType: 'manual',
        deviceId: 'test-device',
        userId: 'user1',
        synced: false,
        localStoredAt: '2024-06-15T14:30:00.000Z',
        isLocalOnly: true,
        status: 'normal',
        mealContext: 'ALMUERZO',
      };

      const result = service.buildBackendCreateParams(reading);

      expect(result['glucose_level']).toBe('120');
      expect(result['reading_type']).toBe('ALMUERZO');
      expect(result['created_at']).toBeDefined();
    });

    it('should include notes when present', () => {
      const reading: LocalGlucoseReading = {
        id: 'local_123',
        localId: 'local_123',
        time: '2024-06-15T14:30:00.000Z',
        value: 120,
        units: 'mg/dL',
        type: 'smbg',
        subType: 'manual',
        deviceId: 'test-device',
        userId: 'user1',
        synced: false,
        localStoredAt: '2024-06-15T14:30:00.000Z',
        isLocalOnly: true,
        status: 'normal',
        notes: 'Test notes',
      };

      const result = service.buildBackendCreateParams(reading);

      expect(result['notes']).toBe('Test notes');
    });

    it('should use OTRO as default reading_type when mealContext is missing', () => {
      const reading: LocalGlucoseReading = {
        id: 'local_123',
        localId: 'local_123',
        time: '2024-06-15T14:30:00.000Z',
        value: 120,
        units: 'mg/dL',
        type: 'smbg',
        subType: 'manual',
        deviceId: 'test-device',
        userId: 'user1',
        synced: false,
        localStoredAt: '2024-06-15T14:30:00.000Z',
        isLocalOnly: true,
        status: 'normal',
      };

      const result = service.buildBackendCreateParams(reading);

      expect(result['reading_type']).toBe('OTRO');
    });
  });

  // ============================================================================
  // ID Generation Tests
  // ============================================================================
  describe('generateLocalId', () => {
    it('should generate unique IDs', () => {
      const id1 = service.generateLocalId();
      const id2 = service.generateLocalId();

      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct prefix', () => {
      const id = service.generateLocalId();

      expect(id).toMatch(/^local_\d+_[a-z0-9]+$/);
    });

    it('should generate IDs with timestamp component', () => {
      const before = Date.now();
      const id = service.generateLocalId();
      const after = Date.now();

      const timestampPart = parseInt(id.split('_')[1], 10);
      expect(timestampPart).toBeGreaterThanOrEqual(before);
      expect(timestampPart).toBeLessThanOrEqual(after);
    });
  });
});

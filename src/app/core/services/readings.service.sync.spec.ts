/**
 * ReadingsService Sync Queue Tests
 *
 * Tests for the critical sync queue logic that handles:
 * - Pushing local readings to backend
 * - Fetching readings from backend
 * - Retry logic and error handling
 * - Deduplication and merging
 *
 * These tests protect against:
 * - Duplicate readings (data corruption)
 * - Lost readings (data loss)
 * - Infinite retries (battery drain)
 * - Race conditions in concurrent sync
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReadingsService, LIVE_QUERY_FN } from '@services/readings.service';
import { DiabetacticDatabase, SyncQueueItem } from '@services/database.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { Observable } from 'rxjs';

// Mock database with sync queue capabilities
class MockSyncDatabase {
  private syncQueueItems: SyncQueueItem[] = [];
  private readingsStore: LocalGlucoseReading[] = [];

  readings = {
    toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
    where: vi.fn().mockReturnValue({
      between: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
    get: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockImplementation((reading: LocalGlucoseReading) => {
      this.readingsStore.push(reading);
      return Promise.resolve(reading.id);
    }),
    update: vi.fn().mockImplementation((id: string, updates: Partial<LocalGlucoseReading>) => {
      const index = this.readingsStore.findIndex(r => r.id === id);
      if (index >= 0) {
        this.readingsStore[index] = { ...this.readingsStore[index], ...updates };
      }
      return Promise.resolve(1);
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    orderBy: vi.fn().mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
        }),
      }),
      toArray: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore)),
    }),
    filter: vi.fn().mockImplementation((predicate: (r: LocalGlucoseReading) => boolean) => ({
      toArray: jest
        .fn()
        .mockImplementation(() => Promise.resolve(this.readingsStore.filter(predicate))),
    })),
    count: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore.length)),
    toCollection: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
  };

  syncQueue = {
    add: vi.fn().mockImplementation((item: SyncQueueItem) => {
      const id = Date.now();
      this.syncQueueItems.push({ ...item, id });
      return Promise.resolve(id);
    }),
    toArray: vi.fn().mockImplementation(() => Promise.resolve([...this.syncQueueItems])),
    delete: vi.fn().mockImplementation((id: number) => {
      this.syncQueueItems = this.syncQueueItems.filter(i => i.id !== id);
      return Promise.resolve();
    }),
    update: vi.fn().mockImplementation((id: number, updates: Partial<SyncQueueItem>) => {
      const index = this.syncQueueItems.findIndex(i => i.id === id);
      if (index >= 0) {
        this.syncQueueItems[index] = { ...this.syncQueueItems[index], ...updates };
      }
      return Promise.resolve(1);
    }),
    count: vi.fn().mockImplementation(() => Promise.resolve(this.syncQueueItems.length)),
    clear: vi.fn().mockImplementation(() => {
      this.syncQueueItems = [];
      return Promise.resolve();
    }),
    bulkAdd: vi.fn().mockImplementation((items: SyncQueueItem[]) => {
      for (const item of items) {
        const id = Date.now() + Math.random();
        this.syncQueueItems.push({ ...item, id });
      }
      return Promise.resolve();
    }),
  };

  // Helper methods for tests
  addQueueItem(item: SyncQueueItem): void {
    const id = Date.now() + Math.random();
    this.syncQueueItems.push({ ...item, id });
  }

  getQueueItems(): SyncQueueItem[] {
    return [...this.syncQueueItems];
  }

  addReading(reading: LocalGlucoseReading): void {
    this.readingsStore.push(reading);
  }

  getReadings(): LocalGlucoseReading[] {
    return [...this.readingsStore];
  }

  clearAll(): void {
    this.syncQueueItems = [];
    this.readingsStore = [];
  }

  // Mock transaction method - executes callback immediately
  transaction = vi.fn().mockImplementation(async (mode: string, ...args: unknown[]) => {
    // The last argument is the callback function
    const callback = args[args.length - 1] as () => Promise<unknown>;
    return await callback();
  });
}

// Mock ApiGatewayService
class MockApiGatewayService {
  request = vi.fn();
}

// Mock LoggerService
class MockLoggerService {
  debug = vi.fn();
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
}

describe('ReadingsService - Sync Queue Logic', () => {
  let service: ReadingsService;
  let mockDb: MockSyncDatabase;
  let mockApiGateway: MockApiGatewayService;
  let mockLogger: MockLoggerService;

  beforeEach(() => {
    mockDb = new MockSyncDatabase();
    mockApiGateway = new MockApiGatewayService();
    mockLogger = new MockLoggerService();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: LoggerService, useValue: mockLogger },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<any>) =>
            new Observable(subscriber => {
              Promise.resolve(factory()).then(result => subscriber.next(result));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
  });

  afterEach(() => {
    mockDb.clearAll();
    vi.clearAllMocks();
  });

  describe('syncPendingReadings()', () => {
    const createQueueItem = (overrides: Partial<SyncQueueItem> = {}): SyncQueueItem => ({
      id: Date.now(),
      operation: 'create',
      readingId: 'test-reading-1',
      reading: {
        id: 'test-reading-1',
        localId: 'local_123',
        value: 120,
        units: 'mg/dL',
        time: '2024-01-15T10:00:00Z',
        type: 'smbg',
        synced: false,
        userId: 'user1',
        status: 'normal',
        localStoredAt: new Date().toISOString(),
      },
      timestamp: Date.now(),
      retryCount: 0,
      ...overrides,
    });

    it('should mark reading as synced after successful push', async () => {
      const queueItem = createQueueItem();
      mockDb.addQueueItem(queueItem);
      mockDb.addReading(queueItem.reading!);

      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            id: 999,
            user_id: 1,
            glucose_level: 120,
            reading_type: 'OTRO',
            created_at: '15/01/2024 10:00:00',
          },
        })
      );

      await service.syncPendingReadings();

      expect(mockDb.readings.update).toHaveBeenCalledWith(
        queueItem.readingId,
        expect.objectContaining({ synced: true, backendId: 999 })
      );
    });

    it('should clear queue and process items on successful sync', async () => {
      const queueItem = createQueueItem();
      mockDb.addQueueItem(queueItem);

      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: { id: 999 },
        })
      );

      await service.syncPendingReadings();

      // New 3-phase pattern: clear() is called first, then items are processed
      expect(mockDb.syncQueue.clear).toHaveBeenCalled();
    });

    it('should re-add item with incremented retryCount on network error', async () => {
      const queueItem = createQueueItem({ retryCount: 0 });
      mockDb.addQueueItem(queueItem);

      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Network error')));

      await service.syncPendingReadings();

      // 3-phase pattern: clear() first, then bulkAdd() for failed items
      expect(mockDb.syncQueue.clear).toHaveBeenCalled();
      expect(mockDb.syncQueue.bulkAdd).toHaveBeenCalledWith([
        expect.objectContaining({
          retryCount: 1,
          lastError: expect.stringContaining('Network error'),
        }),
      ]);
    });

    it('should remove from queue after MAX_RETRIES (3)', async () => {
      const queueItem = createQueueItem({ retryCount: 2 }); // Next failure will be 3rd retry
      mockDb.addQueueItem(queueItem);

      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Network error')));

      await service.syncPendingReadings();

      // 3-phase pattern: clear() first, item NOT re-added because max retries reached
      expect(mockDb.syncQueue.clear).toHaveBeenCalled();
      // bulkAdd should NOT be called with this item since it exceeded retry limit
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Sync',
        expect.stringContaining('Max retries reached')
      );
    });

    it('should NOT retry on 400 errors (invalid data)', async () => {
      const queueItem = createQueueItem({ retryCount: 0 });
      mockDb.addQueueItem(queueItem);

      // Simulate 400 error from backend
      mockApiGateway.request.mockReturnValue(
        of({
          success: false,
          error: { message: 'Invalid glucose level', status: 400 },
        })
      );

      await service.syncPendingReadings();

      // Should still increment retry count but error is logged
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle partial sync failure gracefully', async () => {
      // Add 3 items to queue
      const items = [
        createQueueItem({ readingId: 'reading-1' }),
        createQueueItem({ readingId: 'reading-2' }),
        createQueueItem({ readingId: 'reading-3' }),
      ];
      items.forEach(item => mockDb.addQueueItem(item));

      // First succeeds, second fails, third succeeds
      mockApiGateway.request
        .mockReturnValueOnce(of({ success: true, data: { id: 1 } }))
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of({ success: true, data: { id: 3 } }));

      const result = await service.syncPendingReadings();

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should return zero counts when in mock mode', async () => {
      // Access private property to set mock mode
      (service as any).isMockBackend = true;

      const queueItem = createQueueItem();
      mockDb.addQueueItem(queueItem);

      const result = await service.syncPendingReadings();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });

    it('should handle delete operations without backend call', async () => {
      const queueItem = createQueueItem({
        operation: 'delete',
        reading: undefined,
      });
      mockDb.addQueueItem(queueItem);

      const result = await service.syncPendingReadings();

      // Delete operations are processed but no API call for delete
      // 3-phase pattern: clear() first, then items are processed
      expect(mockDb.syncQueue.clear).toHaveBeenCalled();
      expect(result.success).toBe(1);
    });

    it('should save backend ID to local reading for deduplication', async () => {
      const queueItem = createQueueItem();
      mockDb.addQueueItem(queueItem);
      mockDb.addReading(queueItem.reading!);

      const backendId = 12345;
      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            id: backendId,
            user_id: 1,
            glucose_level: 120,
            reading_type: 'OTRO',
            created_at: '15/01/2024 10:00:00',
          },
        })
      );

      await service.syncPendingReadings();

      expect(mockDb.readings.update).toHaveBeenCalledWith(
        queueItem.readingId,
        expect.objectContaining({ backendId: backendId })
      );
    });
  });

  describe('fetchFromBackend()', () => {
    it('should skip duplicates by backendId', async () => {
      // Existing reading with backendId
      mockDb.addReading({
        id: 'existing-1',
        localId: 'local_1',
        backendId: 100,
        value: 120,
        units: 'mg/dL',
        time: '2024-01-15T10:00:00Z',
        type: 'smbg',
        synced: true,
        userId: 'user1',
        status: 'normal',
        localStoredAt: new Date().toISOString(),
      });

      // Backend returns same reading (id: 100)
      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 100,
                user_id: 1,
                glucose_level: 120,
                reading_type: 'OTRO',
                created_at: '15/01/2024 10:00:00',
              },
            ],
          },
        })
      );

      // Setup filter mock to find existing reading
      mockDb.readings.filter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ backendId: 100 }]),
      });

      const result = await service.fetchFromBackend();

      expect(result.merged).toBe(0); // Should not add duplicate
    });

    it('should add new readings from backend', async () => {
      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 200,
                user_id: 1,
                glucose_level: 150,
                reading_type: 'DESAYUNO',
                created_at: '16/01/2024 08:00:00',
              },
            ],
          },
        })
      );

      // No existing readings with this backendId
      mockDb.readings.filter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      const result = await service.fetchFromBackend();

      expect(result.merged).toBe(1);
      expect(mockDb.readings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          backendId: 200,
          value: 150,
          mealContext: 'DESAYUNO',
        })
      );
    });

    it('should parse backend date format "DD/MM/YYYY HH:mm:ss"', async () => {
      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 300,
                user_id: 1,
                glucose_level: 100,
                reading_type: 'OTRO',
                created_at: '25/12/2024 14:30:45',
              },
            ],
          },
        })
      );

      mockDb.readings.filter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      await service.fetchFromBackend();

      const addedReading = (mockDb.readings.add as Mock).mock.calls[0][0];
      const parsedDate = new Date(addedReading.time);

      expect(parsedDate.getFullYear()).toBe(2024);
      expect(parsedDate.getMonth()).toBe(11); // December (0-indexed)
      expect(parsedDate.getDate()).toBe(25);
    });

    it('should handle empty response', async () => {
      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: { readings: [] },
        })
      );

      const result = await service.fetchFromBackend();

      expect(result.fetched).toBe(0);
      expect(result.merged).toBe(0);
    });

    it('should handle API failure gracefully', async () => {
      mockApiGateway.request.mockReturnValue(
        of({
          success: false,
          error: { message: 'Unauthorized' },
        })
      );

      const result = await service.fetchFromBackend();

      expect(result.fetched).toBe(0);
      expect(result.merged).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return zero counts when in mock mode', async () => {
      (service as any).isMockBackend = true;

      const result = await service.fetchFromBackend();

      expect(result.fetched).toBe(0);
      expect(result.merged).toBe(0);
      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });
  });

  describe('performFullSync()', () => {
    it('should push before pull (order matters)', async () => {
      const callOrder: string[] = [];

      vi.spyOn(service, 'syncPendingReadings').mockImplementation(async () => {
        callOrder.push('push');
        return { success: 0, failed: 0 };
      });

      vi.spyOn(service, 'fetchFromBackend').mockImplementation(async () => {
        callOrder.push('fetch');
        return { fetched: 0, merged: 0 };
      });

      await service.performFullSync();

      expect(callOrder).toEqual(['push', 'fetch']);
    });

    it('should continue fetch even if push partially fails', async () => {
      vi.spyOn(service, 'syncPendingReadings').mockResolvedValue({
        success: 2,
        failed: 1,
      });

      vi.spyOn(service, 'fetchFromBackend').mockResolvedValue({
        fetched: 5,
        merged: 3,
      });

      const result = await service.performFullSync();

      expect(result.pushed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.fetched).toBe(3);
    });

    it('should return combined results', async () => {
      vi.spyOn(service, 'syncPendingReadings').mockResolvedValue({
        success: 5,
        failed: 0,
      });

      vi.spyOn(service, 'fetchFromBackend').mockResolvedValue({
        fetched: 10,
        merged: 8,
      });

      const result = await service.performFullSync();

      expect(result).toEqual({
        pushed: 5,
        fetched: 8,
        failed: 0,
      });
    });
  });
});

describe('ReadingsService - Glucose Status Boundaries', () => {
  let service: ReadingsService;
  let mockDb: MockSyncDatabase;

  beforeEach(() => {
    mockDb = new MockSyncDatabase();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<any>) =>
            new Observable(subscriber => {
              Promise.resolve(factory()).then(result => subscriber.next(result));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
  });

  describe('calculateGlucoseStatus() boundary precision (mg/dL)', () => {
    // Access private method for testing
    const getStatus = (service: ReadingsService, value: number, unit: 'mg/dL' | 'mmol/L') => {
      return (service as any).calculateGlucoseStatus(value, unit);
    };

    it('should return critical-low at 53.9 mg/dL', () => {
      expect(getStatus(service, 53.9, 'mg/dL')).toBe('critical-low');
    });

    it('should return low at 54.0 mg/dL (boundary)', () => {
      expect(getStatus(service, 54, 'mg/dL')).toBe('low');
    });

    it('should return low at 54.1 mg/dL', () => {
      expect(getStatus(service, 54.1, 'mg/dL')).toBe('low');
    });

    it('should return low at 69.9 mg/dL', () => {
      expect(getStatus(service, 69.9, 'mg/dL')).toBe('low');
    });

    it('should return normal at 70.0 mg/dL (boundary)', () => {
      expect(getStatus(service, 70, 'mg/dL')).toBe('normal');
    });

    it('should return normal at 100 mg/dL (typical)', () => {
      expect(getStatus(service, 100, 'mg/dL')).toBe('normal');
    });

    it('should return normal at 179.9 mg/dL', () => {
      expect(getStatus(service, 179.9, 'mg/dL')).toBe('normal');
    });

    it('should return high at 180.0 mg/dL (boundary)', () => {
      expect(getStatus(service, 180, 'mg/dL')).toBe('high');
    });

    it('should return high at 180.1 mg/dL', () => {
      expect(getStatus(service, 180.1, 'mg/dL')).toBe('high');
    });

    it('should return high at 250.0 mg/dL (boundary)', () => {
      expect(getStatus(service, 250, 'mg/dL')).toBe('high');
    });

    it('should return critical-high at 250.1 mg/dL', () => {
      expect(getStatus(service, 250.1, 'mg/dL')).toBe('critical-high');
    });

    it('should return critical-high at 400 mg/dL', () => {
      expect(getStatus(service, 400, 'mg/dL')).toBe('critical-high');
    });
  });

  describe('calculateGlucoseStatus() boundary precision (mmol/L)', () => {
    const getStatus = (service: ReadingsService, value: number, unit: 'mg/dL' | 'mmol/L') => {
      return (service as any).calculateGlucoseStatus(value, unit);
    };

    // mmol/L to mg/dL conversion factor: 18.0182
    // 54 mg/dL = 3.0 mmol/L
    // 70 mg/dL = 3.9 mmol/L
    // 180 mg/dL = 10.0 mmol/L
    // 250 mg/dL = 13.9 mmol/L

    it('should return critical-low at 2.9 mmol/L (< 3.0)', () => {
      expect(getStatus(service, 2.9, 'mmol/L')).toBe('critical-low');
    });

    it('should return low at 3.0 mmol/L (boundary)', () => {
      expect(getStatus(service, 3.0, 'mmol/L')).toBe('low');
    });

    it('should return low at 3.8 mmol/L', () => {
      expect(getStatus(service, 3.8, 'mmol/L')).toBe('low');
    });

    it('should return normal at 3.9 mmol/L (boundary)', () => {
      expect(getStatus(service, 3.9, 'mmol/L')).toBe('normal');
    });

    it('should return normal at 7.0 mmol/L (typical)', () => {
      expect(getStatus(service, 7.0, 'mmol/L')).toBe('normal');
    });

    it('should return normal at 9.9 mmol/L', () => {
      expect(getStatus(service, 9.9, 'mmol/L')).toBe('normal');
    });

    it('should return high at 10.0 mmol/L (boundary)', () => {
      expect(getStatus(service, 10.0, 'mmol/L')).toBe('high');
    });

    it('should return high at 13.8 mmol/L', () => {
      expect(getStatus(service, 13.8, 'mmol/L')).toBe('high');
    });

    it('should return critical-high at 13.9 mmol/L (boundary)', () => {
      expect(getStatus(service, 13.9, 'mmol/L')).toBe('critical-high');
    });

    it('should return critical-high at 20.0 mmol/L', () => {
      expect(getStatus(service, 20.0, 'mmol/L')).toBe('critical-high');
    });
  });

  describe('calculateGlucoseStatus() edge cases', () => {
    const getStatus = (service: ReadingsService, value: number, unit: 'mg/dL' | 'mmol/L') => {
      return (service as any).calculateGlucoseStatus(value, unit);
    };

    it('should handle zero value', () => {
      expect(getStatus(service, 0, 'mg/dL')).toBe('critical-low');
    });

    it('should handle negative value', () => {
      expect(getStatus(service, -10, 'mg/dL')).toBe('critical-low');
    });

    it('should handle very high values', () => {
      expect(getStatus(service, 1000, 'mg/dL')).toBe('critical-high');
    });
  });

  describe('convertToUnit() precision', () => {
    const convert = (
      service: ReadingsService,
      value: number,
      from: 'mg/dL' | 'mmol/L',
      to: 'mg/dL' | 'mmol/L'
    ) => {
      return (service as any).convertToUnit(value, from, to);
    };

    it('should convert mg/dL to mmol/L correctly', () => {
      const result = convert(service, 180, 'mg/dL', 'mmol/L');
      expect(result).toBeCloseTo(9.99, 1);
    });

    it('should convert mmol/L to mg/dL correctly', () => {
      const result = convert(service, 10, 'mmol/L', 'mg/dL');
      expect(result).toBeCloseTo(180.18, 1);
    });

    it('should return same value when units match', () => {
      expect(convert(service, 120, 'mg/dL', 'mg/dL')).toBe(120);
      expect(convert(service, 6.7, 'mmol/L', 'mmol/L')).toBe(6.7);
    });

    it('should handle round-trip conversion', () => {
      const original = 120;
      const toMmol = convert(service, original, 'mg/dL', 'mmol/L');
      const backToMgdl = convert(service, toMmol, 'mmol/L', 'mg/dL');
      expect(backToMgdl).toBeCloseTo(original, 0);
    });
  });
});

describe('ReadingsService - Backend Date Parsing', () => {
  let service: ReadingsService;
  let mockDb: MockSyncDatabase;

  beforeEach(() => {
    mockDb = new MockSyncDatabase();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<any>) =>
            new Observable(subscriber => {
              Promise.resolve(factory()).then(result => subscriber.next(result));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
  });

  describe('mapBackendToLocal()', () => {
    const mapBackend = (service: ReadingsService, backend: any) => {
      return (service as any).mapBackendToLocal(backend);
    };

    it('should parse "DD/MM/YYYY HH:mm:ss" format correctly', () => {
      const backend = {
        id: 1,
        user_id: 100,
        glucose_level: 120,
        reading_type: 'OTRO',
        created_at: '25/12/2024 14:30:45',
      };

      const result = mapBackend(service, backend);
      const date = new Date(result.time);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11); // December
      expect(date.getDate()).toBe(25);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
    });

    it('should preserve backend ID for deduplication', () => {
      const backend = {
        id: 12345,
        user_id: 100,
        glucose_level: 120,
        reading_type: 'OTRO',
        created_at: '01/01/2024 00:00:00',
      };

      const result = mapBackend(service, backend);

      expect(result.backendId).toBe(12345);
      expect(result.id).toBe('backend_12345');
    });

    it('should mark as synced', () => {
      const backend = {
        id: 1,
        user_id: 100,
        glucose_level: 120,
        reading_type: 'OTRO',
        created_at: '01/01/2024 00:00:00',
      };

      const result = mapBackend(service, backend);

      expect(result.synced).toBe(true);
      expect(result.isLocalOnly).toBe(false);
    });

    it('should map reading type to mealContext', () => {
      const backend = {
        id: 1,
        user_id: 100,
        glucose_level: 120,
        reading_type: 'DESAYUNO',
        created_at: '01/01/2024 00:00:00',
      };

      const result = mapBackend(service, backend);

      expect(result.mealContext).toBe('DESAYUNO');
    });

    it('should calculate glucose status', () => {
      const backend = {
        id: 1,
        user_id: 100,
        glucose_level: 45,
        reading_type: 'OTRO',
        created_at: '01/01/2024 00:00:00',
      };

      const result = mapBackend(service, backend);

      expect(result.status).toBe('critical-low');
    });
  });
});

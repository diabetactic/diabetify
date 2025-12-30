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
import { ReadingsMapperService } from '@services/readings-mapper.service';
import { ReadingsStatisticsService } from '@services/readings-statistics.service';
import { ReadingsSyncService } from '@services/readings-sync.service';
import { DiabetacticDatabase, SyncConflictItem, SyncQueueItem } from '@services/database.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { Observable } from 'rxjs';
import { AuditLogService } from '@services/audit-log.service';
import { MockDataService } from '@services/mock-data.service';

// Mock database with sync queue capabilities
class MockSyncDatabase {
  private syncQueueItems: SyncQueueItem[] = [];
  private readingsStore: LocalGlucoseReading[] = [];
  private conflictsStore: SyncConflictItem[] = [];
  private auditLogStore: any[] = [];

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
      toArray: vi
        .fn()
        .mockImplementation(() => Promise.resolve(this.readingsStore.filter(predicate))),
    })),
    count: vi.fn().mockImplementation(() => Promise.resolve(this.readingsStore.length)),
    toCollection: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
    put: vi.fn().mockImplementation((reading: LocalGlucoseReading) => {
      const index = this.readingsStore.findIndex(r => r.id === reading.id);
      if (index >= 0) {
        this.readingsStore[index] = reading;
      } else {
        this.readingsStore.push(reading);
      }
      return Promise.resolve(reading.id);
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

  conflicts = {
    add: vi.fn().mockImplementation((item: SyncConflictItem) => {
      const id = Date.now();
      this.conflictsStore.push({ ...item, id });
      return Promise.resolve(id);
    }),
    update: vi.fn().mockImplementation((id: number, updates: Partial<SyncConflictItem>) => {
      const index = this.conflictsStore.findIndex(c => c.id === id);
      if (index >= 0) {
        this.conflictsStore[index] = {
          ...this.conflictsStore[index],
          ...updates,
        };
      }
      return Promise.resolve(1);
    }),
    toArray: vi.fn().mockImplementation(() => Promise.resolve(this.conflictsStore)),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        count: vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve(this.conflictsStore.filter(c => c.status === 'pending').length)
          ),
      }),
    }),
  };

  auditLog = {
    add: vi.fn().mockImplementation((item: any) => {
      this.auditLogStore.push(item);
      return Promise.resolve(Date.now());
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
    this.conflictsStore = [];
    this.auditLogStore = [];
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
  let syncService: ReadingsSyncService;
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
        ReadingsMapperService,
        ReadingsStatisticsService,
        ReadingsSyncService,
        AuditLogService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: LoggerService, useValue: mockLogger },
        // Disable mock backend to use real calculations from test data
        { provide: MockDataService, useValue: undefined },
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
    syncService = TestBed.inject(ReadingsSyncService);
    // Disable mock mode to test real sync logic
    (service as any).isMockBackend = false;
    (syncService as any).isMockBackend = false;
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

    it('should mark reading as synced with backend ID after successful push', async () => {
      const queueItem = createQueueItem();
      mockDb.addQueueItem(queueItem);
      mockDb.addReading(queueItem.reading!);

      const backendId = 999;
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
        expect.objectContaining({ synced: true, backendId })
      );
    });

    it('should clear queue and process items using 3-phase pattern', async () => {
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

    it.each([
      {
        description: 'network error with retries remaining',
        retryCount: 0,
        error: new Error('Network error'),
        shouldRetry: true,
        expectedRetryCount: 1,
      },
      {
        description: 'max retries reached (3)',
        retryCount: 2,
        error: new Error('Network error'),
        shouldRetry: false,
        expectedWarning: 'Max retries reached',
      },
      {
        description: 'invalid data (400 error)',
        retryCount: 0,
        error: { success: false, error: { message: 'Invalid glucose level', status: 400 } },
        shouldRetry: false,
        isApiResponse: true,
        expectedError: true,
      },
    ])(
      'should handle retry logic for $description',
      async ({
        retryCount,
        error,
        shouldRetry,
        expectedRetryCount,
        expectedWarning,
        isApiResponse,
        expectedError,
      }) => {
        const queueItem = createQueueItem({ retryCount });
        mockDb.addQueueItem(queueItem);

        if (isApiResponse) {
          mockApiGateway.request.mockReturnValue(of(error));
        } else {
          mockApiGateway.request.mockReturnValue(throwError(() => error));
        }

        await service.syncPendingReadings();

        expect(mockDb.syncQueue.clear).toHaveBeenCalled();

        if (shouldRetry) {
          expect(mockDb.syncQueue.bulkAdd).toHaveBeenCalledWith([
            expect.objectContaining({
              retryCount: expectedRetryCount,
              lastError: expect.any(String),
            }),
          ]);
        }

        if (expectedWarning) {
          expect(mockLogger.warn).toHaveBeenCalledWith(
            'Sync',
            expect.stringContaining(expectedWarning)
          );
        }

        if (expectedError) {
          expect(mockLogger.error).toHaveBeenCalled();
        }
      }
    );

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

    it('should skip sync and return zero counts when in mock mode', async () => {
      // Access private property to set mock mode on both services
      (service as any).isMockBackend = true;
      (syncService as any).isMockBackend = true;

      const queueItem = createQueueItem();
      mockDb.addQueueItem(queueItem);

      const result = await service.syncPendingReadings();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });

    it('should process delete operations without backend API call', async () => {
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
  });

  describe('fetchFromBackend()', () => {
    it('should skip duplicate readings by backendId', async () => {
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

    it('should add new readings from backend with correct mapping', async () => {
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

    it.each([
      {
        scenario: 'empty response',
        mockResponse: of({ success: true, data: { readings: [] } }),
        isMockMode: false,
        expectApiCall: true,
      },
      {
        scenario: 'API failure',
        mockResponse: of({ success: false, error: { message: 'Unauthorized' } }),
        isMockMode: false,
        expectApiCall: true,
        expectWarning: true,
      },
      {
        scenario: 'mock mode',
        mockResponse: null,
        isMockMode: true,
        expectApiCall: false,
      },
    ])(
      'should handle $scenario gracefully',
      async ({ mockResponse, isMockMode, expectApiCall, expectWarning }) => {
        if (isMockMode) {
          (service as any).isMockBackend = true;
          (syncService as any).isMockBackend = true;
        }

        if (mockResponse) {
          mockApiGateway.request.mockReturnValue(mockResponse);
        }

        const result = await service.fetchFromBackend();

        expect(result.fetched).toBe(0);
        expect(result.merged).toBe(0);

        if (expectApiCall) {
          expect(mockApiGateway.request).toHaveBeenCalled();
        } else {
          expect(mockApiGateway.request).not.toHaveBeenCalled();
        }

        if (expectWarning) {
          expect(mockLogger.warn).toHaveBeenCalled();
        }
      }
    );
  });

  describe('performFullSync()', () => {
    it('should push before pull (order matters)', async () => {
      const callOrder: string[] = [];

      vi.spyOn(syncService, 'syncPendingReadings').mockImplementation(async () => {
        callOrder.push('push');
        return { success: 0, failed: 0 };
      });

      vi.spyOn(syncService, 'fetchFromBackend').mockImplementation(async () => {
        callOrder.push('fetch');
        return { fetched: 0, merged: 0 };
      });

      await service.performFullSync();

      expect(callOrder).toEqual(['push', 'fetch']);
    });

    it('should continue fetch even if push partially fails and return combined results', async () => {
      vi.spyOn(syncService, 'syncPendingReadings').mockResolvedValue({
        success: 2,
        failed: 1,
      });

      vi.spyOn(syncService, 'fetchFromBackend').mockResolvedValue({
        fetched: 5,
        merged: 3,
      });

      const result = await service.performFullSync();

      expect(result.pushed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.fetched).toBe(3);
    });
  });

  describe('Conflict Resolution', () => {
    const localReading: LocalGlucoseReading = {
      id: 'reading1',
      localId: 'local_reading1',
      backendId: 101,
      value: 150,
      units: 'mg/dL',
      time: '2024-01-20T12:00:00Z',
      type: 'smbg',
      synced: false,
      userId: 'user1',
      status: 'high',
      localStoredAt: new Date().toISOString(),
      notes: 'Local note',
    };

    const serverReading: LocalGlucoseReading = {
      id: 'backend_101',
      localId: 'backend_101',
      backendId: 101,
      value: 155,
      units: 'mg/dL',
      time: '2024-01-20T12:01:00Z',
      type: 'smbg',
      synced: true,
      userId: 'user1',
      status: 'high',
      localStoredAt: new Date().toISOString(),
      notes: 'Server note',
    };

    const conflict: SyncConflictItem = {
      id: 1,
      readingId: 'reading1',
      localReading,
      serverReading,
      status: 'pending',
      createdAt: Date.now(),
    };

    it('should detect conflict when local unsynced reading differs from server', async () => {
      mockDb.addReading(localReading);

      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 101,
                user_id: 1,
                glucose_level: 155,
                reading_type: 'OTRO',
                created_at: '20/01/2024 09:01:00', // UTC-3
                notes: 'Server note',
              },
            ],
          },
        })
      );

      mockDb.readings.filter = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([localReading]),
      });

      await service.fetchFromBackend();

      expect(mockDb.conflicts.add).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Sync',
        expect.stringContaining('Conflict detected')
      );
    });

    it('should resolve conflict with "keep-mine"', async () => {
      await service.resolveConflict(conflict, 'keep-mine');
      expect(mockDb.readings.update).toHaveBeenCalledWith('reading1', { synced: false });
      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'update' })
      );
      expect(mockDb.conflicts.update).toHaveBeenCalledWith(1, { status: 'resolved' });
      expect(mockDb.auditLog.add).toHaveBeenCalled();
    });

    it('should resolve conflict with "keep-server"', async () => {
      await service.resolveConflict(conflict, 'keep-server');
      expect(mockDb.readings.put).toHaveBeenCalledWith({ ...serverReading, synced: true });
      expect(mockDb.conflicts.update).toHaveBeenCalledWith(1, { status: 'resolved' });
      expect(mockDb.auditLog.add).toHaveBeenCalled();
    });

    it('should resolve conflict with "keep-both"', async () => {
      await service.resolveConflict(conflict, 'keep-both');
      expect(mockDb.readings.update).toHaveBeenCalledWith('reading1', { synced: false });
      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'update' })
      );
      expect(mockDb.readings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          value: serverReading.value,
          id: expect.stringMatching(/^local_/),
        })
      );
      expect(mockDb.conflicts.update).toHaveBeenCalledWith(1, { status: 'resolved' });
      expect(mockDb.auditLog.add).toHaveBeenCalled();
    });
  });
});

describe('ReadingsMapperService - Glucose Status Boundaries', () => {
  let mapperService: ReadingsMapperService;
  let mockDb: MockSyncDatabase;

  beforeEach(() => {
    mockDb = new MockSyncDatabase();

    TestBed.configureTestingModule({
      providers: [
        ReadingsMapperService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        // Disable mock backend to use real calculations from test data
        { provide: MockDataService, useValue: undefined },
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

    mapperService = TestBed.inject(ReadingsMapperService);
  });

  describe('calculateGlucoseStatus() - all boundary and edge cases', () => {
    const getStatus = (mapper: ReadingsMapperService, value: number, unit: 'mg/dL' | 'mmol/L') => {
      return mapper.calculateGlucoseStatus(value, unit);
    };

    // Consolidated mg/dL and mmol/L boundary tests
    // Boundaries: <54=critical-low, 54-69=low, 70-179=normal, 180-250=high, >250=critical-high
    it('should classify glucose status correctly for all mg/dL boundaries', () => {
      const mgdlCases = [
        { value: 53.9, expected: 'critical-low' },
        { value: 54, expected: 'low' },
        { value: 69.9, expected: 'low' },
        { value: 70, expected: 'normal' },
        { value: 100, expected: 'normal' },
        { value: 179.9, expected: 'normal' },
        { value: 180, expected: 'high' },
        { value: 250, expected: 'high' },
        { value: 250.1, expected: 'critical-high' },
        { value: 400, expected: 'critical-high' },
      ];

      mgdlCases.forEach(({ value, expected }) => {
        expect(getStatus(mapperService, value, 'mg/dL'), `${value} mg/dL`).toBe(expected);
      });
    });

    it('should classify glucose status correctly for all mmol/L boundaries', () => {
      // mmol/L to mg/dL: *18.0182. Boundaries: 3.0, 3.9, 10.0, 13.9
      const mmolCases = [
        { value: 2.9, expected: 'critical-low' },
        { value: 3.0, expected: 'low' },
        { value: 3.8, expected: 'low' },
        { value: 3.9, expected: 'normal' },
        { value: 7.0, expected: 'normal' },
        { value: 9.9, expected: 'normal' },
        { value: 10.0, expected: 'high' },
        { value: 13.8, expected: 'high' },
        { value: 13.9, expected: 'critical-high' },
        { value: 20.0, expected: 'critical-high' },
      ];

      mmolCases.forEach(({ value, expected }) => {
        expect(getStatus(mapperService, value, 'mmol/L'), `${value} mmol/L`).toBe(expected);
      });
    });

    it('should handle edge cases (zero, negative, extreme)', () => {
      const edgeCases = [
        { value: 0, unit: 'mg/dL' as const, expected: 'critical-low' },
        { value: -10, unit: 'mg/dL' as const, expected: 'critical-low' },
        { value: 1000, unit: 'mg/dL' as const, expected: 'critical-high' },
      ];

      edgeCases.forEach(({ value, unit, expected }) => {
        expect(getStatus(mapperService, value, unit), `${value} ${unit}`).toBe(expected);
      });
    });
  });

  describe('convertToUnit() precision', () => {
    const convert = (
      mapper: ReadingsMapperService,
      value: number,
      from: 'mg/dL' | 'mmol/L',
      to: 'mg/dL' | 'mmol/L'
    ) => {
      return mapper.convertToUnit(value, from, to);
    };

    it('should convert between units correctly', () => {
      const conversions = [
        { value: 180, from: 'mg/dL' as const, to: 'mmol/L' as const, expected: 9.99 },
        { value: 10, from: 'mmol/L' as const, to: 'mg/dL' as const, expected: 180.18 },
      ];

      conversions.forEach(({ value, from, to, expected }) => {
        const result = convert(mapperService, value, from, to);
        expect(result).toBeCloseTo(expected, 1);
      });
    });

    it('should handle same-unit and round-trip conversions', () => {
      // Same unit tests
      expect(convert(mapperService, 120, 'mg/dL', 'mg/dL')).toBe(120);
      expect(convert(mapperService, 6.7, 'mmol/L', 'mmol/L')).toBe(6.7);

      // Round-trip test
      const original = 120;
      const toMmol = convert(mapperService, original, 'mg/dL', 'mmol/L');
      const backToMgdl = convert(mapperService, toMmol, 'mmol/L', 'mg/dL');
      expect(backToMgdl).toBeCloseTo(original, 0);
    });
  });
});

describe('ReadingsMapperService - Backend Date Parsing', () => {
  let mapperService: ReadingsMapperService;
  let mockDb: MockSyncDatabase;

  beforeEach(() => {
    mockDb = new MockSyncDatabase();

    TestBed.configureTestingModule({
      providers: [
        ReadingsMapperService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        // Disable mock backend to use real calculations from test data
        { provide: MockDataService, useValue: undefined },
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

    mapperService = TestBed.inject(ReadingsMapperService);
  });

  describe('mapBackendToLocal()', () => {
    const mapBackend = (mapper: ReadingsMapperService, backend: any) => {
      return mapper.mapBackendToLocal(backend);
    };

    it('should parse "DD/MM/YYYY HH:mm:ss" format and map backend response correctly', () => {
      const backend = {
        id: 12345,
        user_id: 100,
        glucose_level: 120,
        reading_type: 'DESAYUNO',
        created_at: '25/12/2024 14:30:45',
      };

      const result = mapBackend(mapperService, backend);
      const date = new Date(result.time);

      // Backend dates are in Argentina time (UTC-3), converted to UTC
      // 14:30:45 Argentina = 17:30:45 UTC
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(11); // December
      expect(date.getUTCDate()).toBe(25);
      expect(date.getUTCHours()).toBe(17); // 14:30 Argentina + 3h = 17:30 UTC
      expect(date.getUTCMinutes()).toBe(30);
      expect(date.getUTCSeconds()).toBe(45);

      // Verify backend ID preservation and mapping
      expect(result.backendId).toBe(12345);
      expect(result.id).toBe('backend_12345');
      expect(result.synced).toBe(true);
      expect(result.isLocalOnly).toBe(false);
      expect(result.mealContext).toBe('DESAYUNO');
    });

    it('should calculate glucose status for mapped readings', () => {
      const testCases = [
        { glucose_level: 45, expectedStatus: 'critical-low' },
        { glucose_level: 60, expectedStatus: 'low' },
        { glucose_level: 120, expectedStatus: 'normal' },
        { glucose_level: 200, expectedStatus: 'high' },
        { glucose_level: 300, expectedStatus: 'critical-high' },
      ];

      testCases.forEach(({ glucose_level, expectedStatus }) => {
        const backend = {
          id: 1,
          user_id: 100,
          glucose_level,
          reading_type: 'OTRO',
          created_at: '01/01/2024 00:00:00',
        };

        const result = mapBackend(mapperService, backend);
        expect(result.status).toBe(expectedStatus);
      });
    });
  });
});

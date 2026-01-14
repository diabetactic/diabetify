import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ReadingsSyncService } from './readings-sync.service';
import { ReadingsMapperService, BackendGlucoseReading } from './readings-mapper.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { AuditLogService } from './audit-log.service';
import { DiabetacticDatabase, SyncConflictItem, SyncQueueItem } from '@services/database.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';

// Mock Capacitor Network
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Mock environment
vi.mock('@env/environment', () => ({
  environment: {
    backendMode: 'real',
  },
}));

describe('ReadingsSyncService', () => {
  let service: ReadingsSyncService;
  let _mapperService: ReadingsMapperService;
  let mockApiGateway: Partial<ApiGatewayService>;
  let mockLogger: Partial<LoggerService>;
  let mockAuditLog: Partial<AuditLogService>;
  let mockDatabase: Partial<DiabetacticDatabase>;
  let mockInjector: Partial<Injector>;

  // Test data
  const createTestReading = (
    overrides: Partial<LocalGlucoseReading> = {}
  ): LocalGlucoseReading => ({
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    localId: `local_${Date.now()}`,
    time: new Date().toISOString(),
    value: 100,
    units: 'mg/dL',
    type: 'smbg',
    subType: 'manual',
    deviceId: 'test-device',
    userId: 'test-user',
    synced: false,
    localStoredAt: new Date().toISOString(),
    isLocalOnly: true,
    status: 'normal',
    ...overrides,
  });

  const createBackendReading = (
    overrides: Partial<BackendGlucoseReading> = {}
  ): BackendGlucoseReading => ({
    id: Math.floor(Math.random() * 10000),
    user_id: 1,
    glucose_level: 100,
    reading_type: 'OTRO',
    created_at: '15/06/2024 14:30:00',
    ...overrides,
  });

  beforeEach(() => {
    // Create mock database
    mockDatabase = {
      readings: {
        add: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(undefined),
            toArray: vi.fn().mockResolvedValue([]),
          }),
          between: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as DiabetacticDatabase['readings'],
      syncQueue: {
        add: vi.fn().mockResolvedValue(1),
        toArray: vi.fn().mockResolvedValue([]),
        clear: vi.fn().mockResolvedValue(undefined),
        bulkAdd: vi.fn().mockResolvedValue([]),
      } as unknown as DiabetacticDatabase['syncQueue'],
      conflicts: {
        add: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue(1),
      } as unknown as DiabetacticDatabase['conflicts'],
      transaction: vi.fn().mockImplementation((_mode, _table, callback) => callback()),
    } as unknown as DiabetacticDatabase;

    // Create mock API gateway
    mockApiGateway = {
      request: vi.fn().mockReturnValue(of({ success: true, data: { readings: [] } })),
    };

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Create mock audit log
    mockAuditLog = {
      logConflictResolution: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock injector
    const mockLocalAuthService = {
      refreshUserProfile: vi.fn().mockResolvedValue(undefined),
    };
    mockInjector = {
      get: vi.fn().mockReturnValue(mockLocalAuthService),
    };

    TestBed.configureTestingModule({
      providers: [
        ReadingsSyncService,
        ReadingsMapperService,
        { provide: DiabetacticDatabase, useValue: mockDatabase },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: LoggerService, useValue: mockLogger },
        { provide: AuditLogService, useValue: mockAuditLog },
        { provide: Injector, useValue: mockInjector },
      ],
    });

    _mapperService = TestBed.inject(ReadingsMapperService);
    service = TestBed.inject(ReadingsSyncService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ============================================================================
  // Network Status Tests
  // ============================================================================
  describe('Network Status', () => {
    it('should return online status', () => {
      expect(service.getIsOnline()).toBe(true);
    });
  });

  // ============================================================================
  // Sync Queue Tests
  // ============================================================================
  describe('addToSyncQueue', () => {
    it('should add create operation to queue', async () => {
      const reading = createTestReading();
      await service.addToSyncQueue('create', reading);

      expect(mockDatabase.syncQueue?.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          readingId: reading.id,
          reading: reading,
          retryCount: 0,
        })
      );
    });

    it('should add update operation to queue', async () => {
      const reading = createTestReading();
      await service.addToSyncQueue('update', reading);

      expect(mockDatabase.syncQueue?.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
          readingId: reading.id,
          reading: reading,
        })
      );
    });

    it('should add delete operation to queue without reading data', async () => {
      const reading = createTestReading();
      await service.addToSyncQueue('delete', reading);

      expect(mockDatabase.syncQueue?.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
          readingId: reading.id,
          reading: undefined,
        })
      );
    });

    it('should include timestamp in queue item', async () => {
      const before = Date.now();
      const reading = createTestReading();
      await service.addToSyncQueue('create', reading);
      const after = Date.now();

      const call = vi.mocked(mockDatabase.syncQueue?.add).mock.calls[0][0];
      expect(call.timestamp).toBeGreaterThanOrEqual(before);
      expect(call.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================================
  // syncPendingReadings Tests
  // ============================================================================
  describe('syncPendingReadings', () => {
    it('should return empty result when queue is empty', async () => {
      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([]);

      const result = await service.syncPendingReadings();

      expect(result).toEqual({ success: 0, failed: 0, lastError: null });
    });

    it('should process create operations in queue', async () => {
      const reading = createTestReading();
      const queueItem: SyncQueueItem = {
        operation: 'create',
        readingId: reading.id,
        reading: reading,
        timestamp: Date.now(),
        retryCount: 0,
      };

      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([queueItem]);
      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: true, data: { id: 123, ...createBackendReading() } })
      );

      const result = await service.syncPendingReadings();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      const reading = createTestReading();
      const queueItem: SyncQueueItem = {
        operation: 'create',
        readingId: reading.id,
        reading: reading,
        timestamp: Date.now(),
        retryCount: 0,
      };

      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([queueItem]);
      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: false, error: { message: 'API Error' } })
      );

      const result = await service.syncPendingReadings();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.lastError).toContain('API Error');
    });

    it('should retry failed items up to retry limit', async () => {
      const reading = createTestReading();
      const queueItem: SyncQueueItem = {
        operation: 'create',
        readingId: reading.id,
        reading: reading,
        timestamp: Date.now(),
        retryCount: 1, // Already retried once
      };

      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([queueItem]);
      vi.mocked(mockApiGateway.request).mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      await service.syncPendingReadings();

      // Should re-add to queue with incremented retry count
      expect(mockDatabase.syncQueue?.bulkAdd).toHaveBeenCalled();
    });

    it('should not retry items that reached max retries', async () => {
      const reading = createTestReading();
      const queueItem: SyncQueueItem = {
        operation: 'create',
        readingId: reading.id,
        reading: reading,
        timestamp: Date.now(),
        retryCount: 3, // At max retries
      };

      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([queueItem]);
      vi.mocked(mockApiGateway.request).mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      await service.syncPendingReadings();

      // Should not add item back to queue (max retries reached)
      const bulkAddCalls = vi.mocked(mockDatabase.syncQueue?.bulkAdd).mock.calls;
      if (bulkAddCalls.length > 0) {
        expect(bulkAddCalls[0][0]).toEqual([]);
      }
    });

    it('should use mutex to prevent concurrent syncs', async () => {
      vi.mocked(mockDatabase.syncQueue?.toArray).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return [];
      });

      // Start two concurrent syncs
      const promise1 = service.syncPendingReadings();
      const promise2 = service.syncPendingReadings();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should return the same result (mutex returns existing promise)
      expect(result1).toEqual(result2);
      // Database should only be queried once
      expect(mockDatabase.syncQueue?.toArray).toHaveBeenCalledTimes(1);
    });

    it('should mark readings as synced on success', async () => {
      const reading = createTestReading({ id: 'test_123' });
      const queueItem: SyncQueueItem = {
        operation: 'create',
        readingId: reading.id,
        reading: reading,
        timestamp: Date.now(),
        retryCount: 0,
      };

      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([queueItem]);
      vi.mocked(mockApiGateway.request).mockReturnValue(of({ success: true, data: { id: 456 } }));

      await service.syncPendingReadings();

      expect(mockDatabase.readings?.update).toHaveBeenCalledWith('test_123', { synced: true });
    });
  });

  // ============================================================================
  // fetchFromBackend Tests
  // ============================================================================
  describe('fetchFromBackend', () => {
    it('should return empty result when offline', async () => {
      // Force offline state
      Object.defineProperty(service, 'isOnline', { value: false, writable: true });
      (service as unknown as { isOnline: boolean }).isOnline = false;

      const result = await service.fetchFromBackend();

      expect(result).toEqual({ fetched: 0, merged: 0 });
    });

    it('should fetch readings from backend API', async () => {
      const backendReadings = [
        createBackendReading({ id: 1, glucose_level: 100 }),
        createBackendReading({ id: 2, glucose_level: 120 }),
      ];

      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: true, data: { readings: backendReadings } })
      );
      vi.mocked(mockDatabase.readings?.filter).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<DiabetacticDatabase['readings']['filter']>);

      const result = await service.fetchFromBackend();

      expect(result.fetched).toBe(2);
      expect(mockDatabase.readings?.add).toHaveBeenCalledTimes(2);
    });

    it('should not duplicate existing readings', async () => {
      const backendReading = createBackendReading({ id: 123 });
      const existingReading = createTestReading({ backendId: 123 });

      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: true, data: { readings: [backendReading] } })
      );
      vi.mocked(mockDatabase.readings?.filter).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([existingReading]),
      } as unknown as ReturnType<DiabetacticDatabase['readings']['filter']>);

      const result = await service.fetchFromBackend();

      // Should not add as new since it already exists
      expect(result.merged).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: false, error: { message: 'Server error' } })
      );

      const result = await service.fetchFromBackend();

      expect(result).toEqual({ fetched: 0, merged: 0 });
    });

    it('should use mutex to prevent concurrent fetches', async () => {
      vi.mocked(mockApiGateway.request).mockImplementation(() => {
        return of({ success: true, data: { readings: [] } });
      });

      const promise1 = service.fetchFromBackend();
      const promise2 = service.fetchFromBackend();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(result2);
    });

    it('should link unsynced local readings to backend readings with matching value and time', async () => {
      const timestamp = '15/06/2024 14:30:00';
      const backendReading = createBackendReading({
        id: 123,
        glucose_level: 100,
        created_at: timestamp,
      });
      const localReading = createTestReading({
        value: 100,
        time: new Date('2024-06-15T17:30:00Z').toISOString(), // Same time (Argentina UTC-3)
        synced: false,
        backendId: undefined,
      });

      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: true, data: { readings: [backendReading] } })
      );

      // Mock where().equals().first() for backendId lookup - returns undefined (no existing)
      vi.mocked(mockDatabase.readings?.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
          toArray: vi.fn().mockResolvedValue([]),
        }),
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as ReturnType<DiabetacticDatabase['readings']['where']>);

      // Mock filter for unsynced match - returns local reading
      vi.mocked(mockDatabase.readings?.filter).mockImplementation(
        () =>
          ({
            toArray: vi.fn().mockResolvedValue([localReading]),
          }) as unknown as ReturnType<DiabetacticDatabase['readings']['filter']>
      );

      await service.fetchFromBackend();

      // Should link local to backend instead of creating new
      expect(mockDatabase.readings?.update).toHaveBeenCalledWith(
        localReading.id,
        expect.objectContaining({
          backendId: 123,
          synced: true,
        })
      );
    });
  });

  // ============================================================================
  // fetchLatestFromBackend Tests
  // ============================================================================
  describe('fetchLatestFromBackend', () => {
    it('should fetch latest readings (last 15 days)', async () => {
      const backendReadings = [createBackendReading({ id: 1 })];

      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: true, data: { readings: backendReadings } })
      );
      vi.mocked(mockDatabase.readings?.filter).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<DiabetacticDatabase['readings']['filter']>);

      const result = await service.fetchLatestFromBackend();

      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.glucose.latest');
      expect(result.fetched).toBe(1);
    });

    it('should return empty when offline', async () => {
      (service as unknown as { isOnline: boolean }).isOnline = false;

      const result = await service.fetchLatestFromBackend();

      expect(result).toEqual({ fetched: 0, merged: 0 });
    });

    it('should update existing readings if values differ', async () => {
      const existingReading = createTestReading({ id: 'existing', backendId: 123, value: 100 });
      const backendReading = createBackendReading({ id: 123, glucose_level: 150 }); // Different value

      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: true, data: { readings: [backendReading] } })
      );
      vi.mocked(mockDatabase.readings?.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingReading),
          toArray: vi.fn().mockResolvedValue([existingReading]),
        }),
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as ReturnType<DiabetacticDatabase['readings']['where']>);

      await service.fetchLatestFromBackend();

      expect(mockDatabase.readings?.update).toHaveBeenCalledWith(
        'existing',
        expect.objectContaining({
          value: 150,
          synced: true,
        })
      );
    });
  });

  // ============================================================================
  // performFullSync Tests
  // ============================================================================
  describe('performFullSync', () => {
    it('should perform push then fetch', async () => {
      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([]);
      vi.mocked(mockApiGateway.request).mockReturnValue(
        of({ success: true, data: { readings: [] } })
      );

      const result = await service.performFullSync();

      expect(result).toEqual({
        pushed: 0,
        fetched: 0,
        failed: 0,
        lastError: null,
      });
    });

    it('should aggregate results from push and fetch', async () => {
      const reading = createTestReading();
      const queueItem: SyncQueueItem = {
        operation: 'create',
        readingId: reading.id,
        reading: reading,
        timestamp: Date.now(),
        retryCount: 0,
      };

      vi.mocked(mockDatabase.syncQueue?.toArray).mockResolvedValue([queueItem]);
      vi.mocked(mockApiGateway.request)
        .mockReturnValueOnce(of({ success: true, data: { id: 1 } })) // Push
        .mockReturnValueOnce(
          of({
            success: true,
            data: { readings: [createBackendReading({ id: 99 })] },
          })
        ); // Fetch

      vi.mocked(mockDatabase.readings?.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
          toArray: vi.fn().mockResolvedValue([]),
        }),
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as ReturnType<DiabetacticDatabase['readings']['where']>);

      vi.mocked(mockDatabase.readings?.filter).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<DiabetacticDatabase['readings']['filter']>);

      const result = await service.performFullSync();

      expect(result.pushed).toBe(1);
      expect(result.fetched).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  // ============================================================================
  // resolveConflict Tests
  // ============================================================================
  describe('resolveConflict', () => {
    const createConflict = (): SyncConflictItem => ({
      id: 1,
      readingId: 'test_123',
      localReading: createTestReading({ id: 'test_123', value: 100 }),
      serverReading: createTestReading({ id: 'backend_456', value: 120, backendId: 456 }),
      status: 'pending',
      createdAt: Date.now(),
    });

    it('should handle keep-mine resolution', async () => {
      const conflict = createConflict();

      await service.resolveConflict(conflict, 'keep-mine');

      expect(mockDatabase.readings?.update).toHaveBeenCalledWith('test_123', { synced: false });
      expect(mockDatabase.syncQueue?.add).toHaveBeenCalled();
      expect(mockDatabase.conflicts?.update).toHaveBeenCalledWith(1, { status: 'resolved' });
    });

    it('should handle keep-server resolution', async () => {
      const conflict = createConflict();

      await service.resolveConflict(conflict, 'keep-server');

      expect(mockDatabase.readings?.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...conflict.serverReading,
          synced: true,
        })
      );
      expect(mockDatabase.conflicts?.update).toHaveBeenCalledWith(1, { status: 'resolved' });
    });

    it('should handle keep-both resolution', async () => {
      const conflict = createConflict();

      await service.resolveConflict(conflict, 'keep-both');

      // Should update local and add server as new
      expect(mockDatabase.readings?.update).toHaveBeenCalledWith('test_123', { synced: false });
      expect(mockDatabase.readings?.add).toHaveBeenCalled();
      expect(mockDatabase.conflicts?.update).toHaveBeenCalledWith(1, { status: 'resolved' });
    });

    it('should log conflict resolution to audit log', async () => {
      const conflict = createConflict();

      await service.resolveConflict(conflict, 'keep-mine');

      expect(mockAuditLog.logConflictResolution).toHaveBeenCalledWith(
        'test_123',
        'keep-mine',
        expect.objectContaining({
          local: conflict.localReading,
          server: conflict.serverReading,
        })
      );
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle network exceptions gracefully', async () => {
      vi.mocked(mockApiGateway.request).mockReturnValue(
        throwError(() => new Error('Network unavailable'))
      );

      const result = await service.fetchFromBackend();

      expect(result).toEqual({ fetched: 0, merged: 0 });
    });

    it('should handle database errors during sync', async () => {
      vi.mocked(mockDatabase.syncQueue?.toArray).mockRejectedValue(new Error('DB Error'));

      await expect(service.syncPendingReadings()).rejects.toThrow('DB Error');
    });

    it('should handle empty response data', async () => {
      vi.mocked(mockApiGateway.request).mockReturnValue(of({ success: true, data: null }));

      const result = await service.fetchFromBackend();

      expect(result).toEqual({ fetched: 0, merged: 0 });
    });

    it('should handle missing readings array in response', async () => {
      vi.mocked(mockApiGateway.request).mockReturnValue(of({ success: true, data: {} }));

      const result = await service.fetchFromBackend();

      expect(result).toEqual({ fetched: 0, merged: 0 });
    });
  });
});

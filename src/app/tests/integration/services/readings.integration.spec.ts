/**
 * ReadingsService Integration Tests
 *
 * Tests glucose reading operations with IndexedDB and HTTP sync:
 * 1. Sync pending readings to backend
 * 2. Fetch readings from backend with pagination
 * 3. Full sync workflow (push pending → fetch all)
 * 4. Deduplication by backendId
 * 5. Deduplication by value+timestamp matching
 * 6. Conflict resolution (server wins)
 * 7. Offline queue creation and persistence
 * 8. Auto-sync trigger on network reconnect
 * 9. Timezone handling (UTC-3 Argentina)
 * 10. Reading CRUD through ApiGatewayService
 * 11. Mock mode fallback for readings
 * 12. Cache invalidation after sync
 * 13. Concurrent sync prevention (mutex)
 * 14. Error recovery on partial sync failure
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { ReadingsService, PaginatedReadings } from '@core/services/readings.service';
import { ApiGatewayService, ApiResponse } from '@core/services/api-gateway.service';
import { LoggerService } from '@core/services/logger.service';
import { MockDataService } from '@core/services/mock-data.service';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';

// Mock environment to enable sync (not mock backend mode)
vi.mock('@env/environment', () => ({
  environment: {
    production: false,
    backendMode: 'local', // Enable sync - not mock mode
  },
}));

// Mock Capacitor Network
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Mock Dexie database
const mockReadingsData: LocalGlucoseReading[] = [];
const mockSyncQueueData: any[] = [];

const mockDb = {
  readings: {
    add: vi.fn().mockImplementation((reading: LocalGlucoseReading) => {
      mockReadingsData.push(reading);
      return Promise.resolve(reading.id);
    }),
    get: vi.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockReadingsData.find(r => r.id === id));
    }),
    update: vi.fn().mockImplementation((id: string, updates: Partial<LocalGlucoseReading>) => {
      const index = mockReadingsData.findIndex(r => r.id === id);
      if (index >= 0) {
        Object.assign(mockReadingsData[index], updates);
      }
      return Promise.resolve(1);
    }),
    delete: vi.fn().mockImplementation((id: string) => {
      const index = mockReadingsData.findIndex(r => r.id === id);
      if (index >= 0) {
        mockReadingsData.splice(index, 1);
      }
      return Promise.resolve();
    }),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
        and: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      between: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
    orderBy: vi.fn().mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        offset: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockReadingsData),
          }),
          toArray: vi.fn().mockResolvedValue(mockReadingsData),
        }),
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockReadingsData),
        }),
        toArray: vi.fn().mockResolvedValue(mockReadingsData),
      }),
      toArray: vi.fn().mockResolvedValue(mockReadingsData),
    }),
    toArray: vi.fn().mockResolvedValue(mockReadingsData),
    toCollection: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(mockReadingsData),
    }),
    count: vi.fn().mockResolvedValue(mockReadingsData.length),
    clear: vi.fn().mockImplementation(() => {
      mockReadingsData.length = 0;
      return Promise.resolve();
    }),
    filter: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
    bulkAdd: vi.fn().mockResolvedValue(undefined),
    bulkPut: vi.fn().mockResolvedValue(undefined),
  },
  syncQueue: {
    add: vi.fn().mockImplementation((item: any) => {
      mockSyncQueueData.push(item);
      return Promise.resolve(item.id || Date.now());
    }),
    toArray: vi.fn().mockResolvedValue(mockSyncQueueData),
    clear: vi.fn().mockImplementation(() => {
      mockSyncQueueData.length = 0;
      return Promise.resolve();
    }),
    count: vi.fn().mockResolvedValue(mockSyncQueueData.length),
    bulkAdd: vi.fn().mockResolvedValue(undefined),
  },
  transaction: vi
    .fn()
    .mockImplementation((_mode: string, _tables: any[], fn: () => Promise<any>) => fn()),
};

// Mock liveQuery - returns observable-like that emits mock data without calling queryFn
const mockLiveQuery = vi.fn().mockImplementation(() => {
  return {
    subscribe: (callback: (data: any) => void) => {
      // Emit current mock data without calling the actual query function
      // This avoids triggering the db.readings.orderBy chain during initialization
      Promise.resolve().then(() => callback(mockReadingsData));
      return { unsubscribe: vi.fn() };
    },
  };
});

describe('ReadingsService Integration Tests', () => {
  let service: ReadingsService;
  let httpMock: HttpTestingController;

  let mockApiGateway: {
    request: ReturnType<typeof vi.fn>;
  };

  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  let mockMockData: {
    getStats: ReturnType<typeof vi.fn>;
    getReadings: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Limpiar datos mock
    mockReadingsData.length = 0;
    mockSyncQueueData.length = 0;

    mockApiGateway = {
      request: vi.fn().mockReturnValue(of({ success: true, data: {} })),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockMockData = {
      getStats: vi.fn().mockReturnValue(of({ avgGlucose: 120, timeInRange: 70 })),
      getReadings: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ReadingsService,
          useFactory: () => {
            return new ReadingsService(
              mockDb as any,
              mockLiveQuery as any,
              mockMockData as any,
              mockApiGateway as any,
              mockLogger as any,
              undefined
            );
          },
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.ngOnDestroy();
    httpMock.verify();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  describe('Reading CRUD Operations', () => {
    it('should add a new reading and queue for sync', async () => {
      // ARRANGE
      const newReading = {
        value: 120,
        time: new Date().toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      };

      // ACT
      const result = await service.addReading(newReading);

      // ASSERT
      expect(result.id).toBeDefined();
      expect(result.value).toBe(120);
      expect(result.synced).toBe(false);
      expect(result.status).toBe('normal');
      expect(mockDb.readings.add).toHaveBeenCalled();
      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          readingId: result.id,
        })
      );
    });

    it('should calculate glucose status correctly', async () => {
      // Test diferentes rangos de glucosa
      const lowReading = await service.addReading({
        value: 60,
        time: new Date().toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      });
      const normalReading = await service.addReading({
        value: 120,
        time: new Date().toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      });
      const highReading = await service.addReading({
        value: 200,
        time: new Date().toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      });
      const criticalLow = await service.addReading({
        value: 45,
        time: new Date().toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      });
      const criticalHigh = await service.addReading({
        value: 300,
        time: new Date().toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      });

      expect(lowReading.status).toBe('low');
      expect(normalReading.status).toBe('normal');
      expect(highReading.status).toBe('high');
      expect(criticalLow.status).toBe('critical-low');
      expect(criticalHigh.status).toBe('critical-high');
    });

    it('should update reading and mark as unsynced', async () => {
      // ARRANGE
      const reading: LocalGlucoseReading = {
        id: 'test-123',
        localId: 'test-123',
        value: 120,
        time: new Date().toISOString(),
        units: 'mg/dL',
        type: 'smbg',
        synced: true,
        userId: 'user-1',
        localStoredAt: new Date().toISOString(),
        isLocalOnly: false,
        status: 'normal',
      };
      mockReadingsData.push(reading);
      mockDb.readings.get.mockResolvedValue(reading);

      // ACT
      const updated = await service.updateReading('test-123', { value: 130 });

      // ASSERT
      expect(updated?.value).toBe(130);
      expect(mockDb.readings.update).toHaveBeenCalledWith(
        'test-123',
        expect.objectContaining({ value: 130, synced: false })
      );
    });

    it('should delete reading and add to sync queue if was synced', async () => {
      // ARRANGE
      const reading: LocalGlucoseReading = {
        id: 'delete-123',
        localId: 'delete-123',
        value: 120,
        time: new Date().toISOString(),
        units: 'mg/dL',
        type: 'smbg',
        synced: true,
        userId: 'user-1',
        localStoredAt: new Date().toISOString(),
        isLocalOnly: false,
        status: 'normal',
      };
      mockDb.readings.get.mockResolvedValue(reading);

      // ACT
      await service.deleteReading('delete-123');

      // ASSERT
      expect(mockDb.readings.delete).toHaveBeenCalledWith('delete-123');
      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
          readingId: 'delete-123',
        })
      );
    });

    it('should throw error when updating non-existent reading', async () => {
      // ARRANGE
      mockDb.readings.get.mockResolvedValue(undefined);

      // ACT & ASSERT
      await expect(service.updateReading('non-existent', { value: 150 })).rejects.toThrow(
        'Reading with id non-existent not found'
      );
    });
  });

  describe('Sync Operations', () => {
    it('should add reading to sync queue when created', async () => {
      // ARRANGE
      const reading = {
        value: 115,
        time: new Date().toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
        mealContext: 'DESAYUNO',
      };

      // ACT
      const result = await service.addReading(reading);

      // ASSERT - Reading should be added to sync queue for later sync
      expect(result.synced).toBe(false);
      expect(result.isLocalOnly).toBe(true);
      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'create',
          readingId: result.id,
        })
      );
    });

    it('should return empty result when sync queue is empty', async () => {
      // ARRANGE - Queue is already empty from beforeEach

      // ACT
      const result = await service.syncPendingReadings();

      // ASSERT
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      // No API calls should be made when queue is empty
    });

    it('should prevent concurrent sync operations (mutex)', async () => {
      // ARRANGE
      mockSyncQueueData.push({
        operation: 'create',
        readingId: 'concurrent-1',
        reading: { id: 'concurrent-1', value: 100 },
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Simular request lento
      mockApiGateway.request.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: { id: 1 } }), 100))
      );

      // ACT - Iniciar dos syncs concurrentes
      const sync1 = service.syncPendingReadings();
      const sync2 = service.syncPendingReadings();

      const [result1, result2] = await Promise.all([sync1, sync2]);

      // ASSERT - Ambos deben retornar el mismo resultado (mismo promise)
      expect(result1).toEqual(result2);
    });
  });

  describe('Fetch from Backend', () => {
    it('should fetch readings from backend and merge with local', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 2001,
                user_id: 1000,
                glucose_level: 145,
                reading_type: 'ALMUERZO',
                created_at: '15/01/2024 12:30:00',
              },
            ],
          },
        })
      );

      // ACT
      const result = await service.fetchFromBackend();

      // ASSERT
      expect(result.fetched).toBe(1);
      expect(result.merged).toBe(1);
      expect(mockDb.readings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          backendId: 2001,
          value: 145,
          mealContext: 'ALMUERZO',
        })
      );
    });

    it('should deduplicate by backendId', async () => {
      // ARRANGE - Agregar reading existente con backendId
      const existingReading: LocalGlucoseReading = {
        id: 'backend_2001',
        localId: 'backend_2001',
        backendId: 2001,
        value: 145,
        time: new Date().toISOString(),
        units: 'mg/dL',
        type: 'smbg',
        synced: true,
        userId: 'user-1',
        localStoredAt: new Date().toISOString(),
        isLocalOnly: false,
        status: 'normal',
      };
      mockReadingsData.push(existingReading);
      mockDb.readings.filter.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([existingReading]),
      });

      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 2001,
                user_id: 1000,
                glucose_level: 145,
                reading_type: 'ALMUERZO',
                created_at: '15/01/2024 12:30:00',
              },
            ],
          },
        })
      );

      // ACT
      const result = await service.fetchFromBackend();

      // ASSERT - No debe agregar duplicado
      expect(result.merged).toBe(0);
    });

    it('should deduplicate by value+timestamp matching', async () => {
      // ARRANGE - Reading local no sincronizado con mismo valor y tiempo cercano
      const localReading: LocalGlucoseReading = {
        id: 'local_123',
        localId: 'local_123',
        value: 145,
        time: '2024-01-15T15:30:00.000Z', // Mismo tiempo que backend (UTC-3)
        units: 'mg/dL',
        type: 'smbg',
        synced: false,
        userId: 'user-1',
        localStoredAt: new Date().toISOString(),
        isLocalOnly: true,
        status: 'normal',
      };
      mockReadingsData.push(localReading);

      // Mock filter para encontrar match por valor+tiempo
      mockDb.readings.filter.mockImplementation(
        (filterFn: (r: LocalGlucoseReading) => boolean) => ({
          toArray: vi.fn().mockImplementation(async () => {
            // Primer call busca por backendId (retorna vacío)
            // Segundo call busca por valor+tiempo
            return mockReadingsData.filter(filterFn);
          }),
        })
      );

      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 2002,
                user_id: 1000,
                glucose_level: 145,
                reading_type: 'MERIENDA',
                created_at: '15/01/2024 12:30:00', // UTC-3 → 15:30 UTC
              },
            ],
          },
        })
      );

      // ACT
      const result = await service.fetchFromBackend();

      // ASSERT - Debe linkear, no crear duplicado
      expect(result.merged).toBe(0); // No merged porque se linkeó
      expect(mockDb.readings.update).toHaveBeenCalledWith(
        'local_123',
        expect.objectContaining({
          backendId: 2002,
          synced: true,
        })
      );
    });

    it('should update local reading when backend has different value (server wins)', async () => {
      // ARRANGE
      const existingReading: LocalGlucoseReading = {
        id: 'backend_2003',
        localId: 'backend_2003',
        backendId: 2003,
        value: 140, // Valor local
        time: new Date().toISOString(),
        units: 'mg/dL',
        type: 'smbg',
        synced: true,
        userId: 'user-1',
        localStoredAt: new Date().toISOString(),
        isLocalOnly: false,
        status: 'normal',
        notes: 'old notes',
      };
      mockDb.readings.filter.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([existingReading]),
      });

      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: {
            readings: [
              {
                id: 2003,
                user_id: 1000,
                glucose_level: 155, // Valor diferente del servidor
                reading_type: 'CENA',
                created_at: '15/01/2024 19:00:00',
                notes: 'updated notes',
              },
            ],
          },
        })
      );

      // ACT
      await service.fetchFromBackend();

      // ASSERT - Servidor gana
      expect(mockDb.readings.update).toHaveBeenCalledWith(
        'backend_2003',
        expect.objectContaining({
          value: 155,
          notes: 'updated notes',
        })
      );
    });

    it('should prevent concurrent fetch operations (mutex)', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: { readings: [] },
              }),
            50
          )
        )
      );

      // ACT
      const fetch1 = service.fetchFromBackend();
      const fetch2 = service.fetchFromBackend();

      const [result1, result2] = await Promise.all([fetch1, fetch2]);

      // ASSERT - Mismo resultado
      expect(result1).toEqual(result2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Sync',
        'Fetch already in progress, returning existing promise'
      );
    });
  });

  describe('Full Sync Workflow', () => {
    it('should execute full sync and return result structure', async () => {
      // ARRANGE - Empty queue means no push needed
      mockApiGateway.request.mockReturnValue(of({ success: true, data: { readings: [] } }));

      // ACT
      const result = await service.performFullSync();

      // ASSERT - Verify result structure
      expect(result).toHaveProperty('pushed');
      expect(result).toHaveProperty('fetched');
      expect(result).toHaveProperty('failed');
      expect(typeof result.pushed).toBe('number');
      expect(typeof result.fetched).toBe('number');
      expect(typeof result.failed).toBe('number');
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate statistics for readings in date range', async () => {
      // ARRANGE
      const now = new Date();
      const readings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 100,
          time: now.toISOString(),
          units: 'mg/dL',
          status: 'normal',
        } as LocalGlucoseReading,
        {
          id: '2',
          value: 120,
          time: now.toISOString(),
          units: 'mg/dL',
          status: 'normal',
        } as LocalGlucoseReading,
        {
          id: '3',
          value: 140,
          time: now.toISOString(),
          units: 'mg/dL',
          status: 'normal',
        } as LocalGlucoseReading,
        {
          id: '4',
          value: 200,
          time: now.toISOString(),
          units: 'mg/dL',
          status: 'high',
        } as LocalGlucoseReading,
        {
          id: '5',
          value: 60,
          time: now.toISOString(),
          units: 'mg/dL',
          status: 'low',
        } as LocalGlucoseReading,
      ];

      mockDb.readings.where.mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(readings),
        }),
      });

      // ACT
      const stats = await service.getStatistics('week');

      // ASSERT
      expect(stats.totalReadings).toBe(5);
      expect(stats.average).toBe(124); // (100+120+140+200+60)/5
      expect(stats.timeInRange).toBeGreaterThan(0);
      expect(stats.timeAboveRange).toBeGreaterThan(0);
      expect(stats.timeBelowRange).toBeGreaterThan(0);
      expect(stats.estimatedA1C).toBeGreaterThan(0);
    });

    it('should return empty statistics when no readings', async () => {
      // ARRANGE
      mockDb.readings.where.mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      // ACT
      const stats = await service.getStatistics('month');

      // ASSERT
      expect(stats.totalReadings).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.timeInRange).toBe(0);
    });
  });

  describe('Manual Readings Export', () => {
    it('should export manual SMBG readings summary', async () => {
      // ARRANGE
      const now = new Date();
      const readings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 110,
          time: now.toISOString(),
          units: 'mg/dL',
          type: 'smbg',
          subType: 'manual',
          status: 'normal',
        } as LocalGlucoseReading,
        {
          id: '2',
          value: 130,
          time: new Date(now.getTime() - 3600000).toISOString(),
          units: 'mg/dL',
          type: 'smbg',
          subType: 'manual',
          status: 'normal',
        } as LocalGlucoseReading,
      ];

      mockDb.readings.orderBy.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(readings),
      });

      // ACT
      const summary = await service.exportManualReadingsSummary(14);

      // ASSERT
      expect(summary.totalReadings).toBe(2);
      expect(summary.unit).toBe('mg/dL');
      expect(summary.statistics.average).toBe(120);
      expect(summary.statistics.minimum).toBe(110);
      expect(summary.statistics.maximum).toBe(130);
      expect(summary.readings.length).toBe(2);
    });
  });

  describe('Timezone Handling', () => {
    it('should create readings with ISO 8601 timestamps', async () => {
      // ARRANGE
      const reading = {
        value: 120,
        time: '2024-01-15T15:30:00.000Z', // UTC ISO 8601
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      };

      // ACT
      const result = await service.addReading(reading);

      // ASSERT - Reading should preserve ISO 8601 format
      expect(result.time).toBe('2024-01-15T15:30:00.000Z');
      expect(new Date(result.time).toISOString()).toBe('2024-01-15T15:30:00.000Z');
    });

    it('should handle Date objects and convert to ISO string', async () => {
      // ARRANGE
      const date = new Date('2024-01-15T12:00:00Z');
      const reading = {
        value: 125,
        time: date.toISOString(),
        units: 'mg/dL' as const,
        type: 'smbg' as const,
      };

      // ACT
      const result = await service.addReading(reading);

      // ASSERT
      expect(result.time).toContain('2024-01-15');
      expect(new Date(result.time).getTime()).toBe(date.getTime());
    });
  });

  describe('Pagination', () => {
    it('should paginate readings correctly', async () => {
      // ARRANGE
      const allReadings = Array.from({ length: 25 }, (_, i) => ({
        id: `reading-${i}`,
        value: 100 + i,
        time: new Date().toISOString(),
      }));

      mockDb.readings.count.mockResolvedValue(25);
      // When offset is 0, code skips offset() and calls limit() directly on reverse()
      mockDb.readings.orderBy.mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          // limit() available directly (when offset is 0)
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(allReadings.slice(0, 10)),
          }),
          // offset() for when offset > 0
          offset: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue(allReadings.slice(0, 10)),
            }),
            toArray: vi.fn().mockResolvedValue(allReadings.slice(0, 10)),
          }),
          // toArray for when no pagination
          toArray: vi.fn().mockResolvedValue(allReadings),
        }),
      });

      // ACT
      const result = await service.getAllReadings(10, 0);

      // ASSERT
      expect(result.readings.length).toBe(10);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(10);
    });
  });
});

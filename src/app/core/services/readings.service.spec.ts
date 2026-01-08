// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { ReadingsService, LIVE_QUERY_FN } from '@services/readings.service';
import { ReadingsMapperService } from '@services/readings-mapper.service';
import { ReadingsStatisticsService } from '@services/readings-statistics.service';
import { ReadingsSyncService } from '@services/readings-sync.service';
import { DiabetacticDatabase } from '@services/database.service';
import { LocalGlucoseReading, GlucoseReading } from '@models/glucose-reading.model';
import { Observable, of } from 'rxjs';
import { MockDataService } from '@services/mock-data.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { AuditLogService } from '@services/audit-log.service';

// Mock Dexie database
class MockDatabaseService {
  readings = {
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnValue({
      between: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
    filter: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
    get: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue('mock-id'),
    update: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined),
    orderBy: vi.fn().mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
    toCollection: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
    put: vi.fn().mockResolvedValue('mock-id'),
  };

  syncQueue = {
    add: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    toArray: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };

  conflicts = {
    add: vi.fn().mockResolvedValue(1),
    update: vi.fn().mockResolvedValue(1),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        count: vi.fn().mockResolvedValue(0),
      }),
    }),
  };

  auditLog = {
    add: vi.fn().mockResolvedValue(1),
  };

  // Mock transaction method - executes callback immediately
  transaction = vi.fn().mockImplementation(async (mode: string, ...args: unknown[]) => {
    // The last argument is the callback function
    const callback = args[args.length - 1] as () => Promise<unknown>;
    return await callback();
  });
}

describe('ReadingsService', () => {
  let service: ReadingsService;
  let syncService: ReadingsSyncService;
  let mockDb: MockDatabaseService;
  let mockApiGateway: Mock<ApiGatewayService>;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockApiGateway = {
      request: vi.fn(),
      clearCache: vi.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        ReadingsMapperService,
        ReadingsStatisticsService,
        ReadingsSyncService,
        AuditLogService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        // Disable mock backend to use real calculations from test data
        { provide: MockDataService, useValue: undefined },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<any> | any) =>
            new Observable<any>(subscriber => {
              Promise.resolve(factory())
                .then(result => {
                  subscriber.next(result);
                })
                .catch(error => subscriber.error?.(error));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
    syncService = TestBed.inject(ReadingsSyncService);
  });

  describe('addReading', () => {
    it('should add a glucose reading with proper transformation', async () => {
      const reading: GlucoseReading = {
        id: '',
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: '2024-01-15T10:00:00Z',
      };

      await service.addReading(reading);

      expect(mockDb.readings.add).toHaveBeenCalled();
      const addedReading = (mockDb.readings.add as Mock).mock.calls.slice(-1)[0][0];
      expect(addedReading.value).toBe(120);
      expect(addedReading.units).toBe('mg/dL');
      expect(addedReading.type).toBe('smbg');
      expect(addedReading.synced).toBe(false);
    });

    it('should handle mmol/L to mg/dL conversion', async () => {
      const reading: GlucoseReading = {
        id: '',
        type: 'smbg',
        value: 6.7,
        units: 'mmol/L',
        time: '2024-01-15T10:00:00Z',
      };

      await service.addReading(reading);

      const addedReading = (mockDb.readings.add as Mock).mock.calls.slice(-1)[0][0];
      expect(addedReading.value).toBe(6.7);
      expect(addedReading.units).toBe('mmol/L');
    });

    it('should set glucose status correctly', async () => {
      const testCases = [
        { value: 45, expectedStatus: 'critical-low' },
        { value: 65, expectedStatus: 'low' },
        { value: 120, expectedStatus: 'normal' },
        { value: 200, expectedStatus: 'high' },
        { value: 300, expectedStatus: 'critical-high' },
      ];

      for (const testCase of testCases) {
        const reading: GlucoseReading = {
          id: '',
          type: 'smbg',
          value: testCase.value,
          units: 'mg/dL',
          time: '2024-01-15T10:00:00Z',
        };

        await service.addReading(reading);

        const addedReading = (mockDb.readings.add as Mock).mock.calls.slice(-1)[0][0];
        expect(addedReading.status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('getStatistics', () => {
    it('should calculate correct statistics for glucose readings', async () => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 100,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '2',
          value: 120,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '3',
          value: 140,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '4',
          value: 180,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'high',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '5',
          value: 200,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'high',
          localStoredAt: new Date().toISOString(),
        },
      ];

      (mockDb.readings.where as Mock).mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockReadings),
        }),
      });

      const stats = await service.getStatistics('week');

      expect(stats.average).toBe(148); // (100+120+140+180+200)/5
      expect(stats.median).toBe(140);
      expect(stats.standardDeviation).toBeCloseTo(37.1, 1);
      expect(stats.totalReadings).toBe(5);
      expect(stats.timeInRange).toBe(80); // 4 out of 5 readings in range
      expect(stats.timeBelowRange).toBe(0);
      expect(stats.timeAboveRange).toBe(20); // 1 out of 5 readings above range
    });

    it('should calculate HbA1c estimate correctly', async () => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 150,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
      ];

      (mockDb.readings.where as Mock).mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockReadings),
        }),
      });

      const stats = await service.getStatistics('month');

      // HbA1c = (average + 46.7) / 28.7
      // For average of 150: (150 + 46.7) / 28.7 = 6.85
      expect(stats.estimatedA1C).toBeCloseTo(6.85, 0);
    });

    it('should calculate GMI correctly', async () => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 150,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
      ];

      (mockDb.readings.where as Mock).mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockReadings),
        }),
      });

      const stats = await service.getStatistics('month');

      // GMI is essentially the same as eA1C
      expect(stats.gmi).toBeCloseTo(6.85, 0);
    });

    it('should handle empty readings gracefully', async () => {
      (mockDb.readings.where as Mock).mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      });

      const stats = await service.getStatistics('week');

      expect(stats.average).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.totalReadings).toBe(0);
      expect(stats.timeInRange).toBe(0);
    });
  });

  describe('updateReading', () => {
    it('should update a reading and mark as unsynced', async () => {
      const updates = { value: 130, notes: 'Updated note' };

      (mockDb.readings.get as Mock).mockResolvedValue({
        id: 'test-id',
        value: 100,
        units: 'mg/dL',
        time: '2024-01-15T10:00:00Z',
        type: 'smbg',
        synced: false,
      });

      await service.updateReading('test-id', updates);

      expect(mockDb.readings.update).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          value: 130,
          notes: 'Updated note',
          status: 'normal',
        })
      );
    });

    it('should add to sync queue for offline sync', async () => {
      const updates = { value: 130 };

      const existing = {
        id: 'test-id',
        value: 100,
        units: 'mg/dL',
        time: '2024-01-15T10:00:00Z',
        type: 'smbg',
        synced: false,
      };
      (mockDb.readings.get as Mock).mockResolvedValue(existing);

      await service.updateReading('test-id', updates);

      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
          readingId: 'test-id',
        })
      );
    });
  });

  describe('getReadingsByDateRange', () => {
    it('should retrieve readings within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 120,
          units: 'mg/dL',
          time: '2024-01-15T10:00:00Z',
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
      ];

      (mockDb.readings.where as Mock).mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockReadings),
        }),
      });

      const result = await service.getReadingsByDateRange(startDate, endDate);

      expect(mockDb.readings.where).toHaveBeenCalledWith('time');
      expect(result).toEqual(mockReadings);
      expect(result.length).toBe(1);
    });
  });

  describe('Coefficient of Variation', () => {
    it('should calculate CV correctly', async () => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 100,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '2',
          value: 120,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '3',
          value: 140,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
      ];

      (mockDb.readings.where as Mock).mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockReadings),
        }),
      });

      const stats = await service.getStatistics('week');

      // CV = (population standard deviation / average) * 100
      // Average = 120, StdDev ≈ 16.33
      // CV ≈ (16.33 / 120) * 100 = 13.6%
      expect(stats.coefficientOfVariation).toBeCloseTo(13.6, 1);
    });

    it('should consider CV < 36% as stable', async () => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 118,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '2',
          value: 120,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        {
          id: '3',
          value: 122,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          synced: false,
          userId: 'user1',
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
      ];

      (mockDb.readings.where as Mock).mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockReadings),
        }),
      });

      const stats = await service.getStatistics('week');

      expect(stats.coefficientOfVariation).toBeLessThan(36);
    });
  });

  describe('fetchLatestFromBackend', () => {
    it('should fetch latest readings from backend using new endpoint', async () => {
      // Disable mock mode on both services to test real fetch logic
      (service as any).isMockBackend = false;
      (syncService as any).isMockBackend = false;

      const mockBackendReadings = [
        {
          id: 1,
          user_id: 123,
          glucose_level: 120,
          reading_type: 'DESAYUNO',
          created_at: '15/12/2025 08:00:00',
          notes: 'Test reading',
        },
      ];

      const mockApiResponse = {
        success: true,
        data: { readings: mockBackendReadings },
      };

      mockApiGateway.request.mockReturnValue(of(mockApiResponse));
      (mockDb.readings.filter as Mock).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      const result = await service.fetchLatestFromBackend();

      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.glucose.latest');
      expect(result.fetched).toBe(1);
      expect(result.merged).toBe(1);
      expect(mockDb.readings.add).toHaveBeenCalled();
    });

    it('should skip fetch if offline', async () => {
      // Set sync service to offline state
      (syncService as any).isOnline = false;

      const result = await service.fetchLatestFromBackend();

      expect(result.fetched).toBe(0);
      expect(result.merged).toBe(0);
      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });

    it('should handle backend errors gracefully', async () => {
      // Disable mock mode to test error handling
      (syncService as any).isMockBackend = false;

      const mockErrorResponse = {
        success: false,
        error: {
          code: 'BACKEND_ERROR',
          message: 'Backend error',
          retryable: false,
        },
      };

      mockApiGateway.request.mockReturnValue(of(mockErrorResponse));

      const result = await service.fetchLatestFromBackend();

      expect(result.fetched).toBe(0);
      expect(result.merged).toBe(0);
    });
  });
});

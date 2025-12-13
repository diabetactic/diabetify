import { TestBed } from '@angular/core/testing';
import { ReadingsService, LIVE_QUERY_FN } from '@services/readings.service';
import { DiabetacticDatabase } from '@services/database.service';
import { LocalGlucoseReading, GlucoseReading } from '@models/glucose-reading.model';
import { Observable, of } from 'rxjs';
import { MockDataService } from '@services/mock-data.service';
import { ApiGatewayService } from '@services/api-gateway.service';

// Mock Dexie database
class MockDatabaseService {
  readings = {
    toArray: jest.fn().mockResolvedValue([]),
    where: jest.fn().mockReturnValue({
      between: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    }),
    filter: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    }),
    get: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue('mock-id'),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(undefined),
    bulkAdd: jest.fn().mockResolvedValue(undefined),
    orderBy: jest.fn().mockReturnValue({
      reverse: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        toArray: jest.fn().mockResolvedValue([]),
      }),
    }),
    toCollection: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    }),
  };

  syncQueue = {
    add: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
    toArray: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    where: jest.fn().mockReturnValue({
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  };

  // Mock transaction method - executes callback immediately
  transaction = jest.fn().mockImplementation(async (mode: string, ...args: unknown[]) => {
    // The last argument is the callback function
    const callback = args[args.length - 1] as () => Promise<unknown>;
    return await callback();
  });
}

describe('ReadingsService', () => {
  let service: ReadingsService;
  let mockDb: MockDatabaseService;
  let mockApiGateway: jest.Mocked<ApiGatewayService>;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockApiGateway = {
      request: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        { provide: MockDataService, useValue: null },
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
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
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
      const addedReading = (mockDb.readings.add as jest.Mock).mock.calls.slice(-1)[0][0];
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

      const addedReading = (mockDb.readings.add as jest.Mock).mock.calls.slice(-1)[0][0];
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

        const addedReading = (mockDb.readings.add as jest.Mock).mock.calls.slice(-1)[0][0];
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

      (mockDb.readings.where as jest.Mock).mockReturnValue({
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockReadings),
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

      (mockDb.readings.where as jest.Mock).mockReturnValue({
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockReadings),
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

      (mockDb.readings.where as jest.Mock).mockReturnValue({
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockReadings),
        }),
      });

      const stats = await service.getStatistics('month');

      // GMI = 3.31 + (0.02392 * average)
      // For average of 150: 3.31 + (0.02392 * 150) = 6.898
      expect(stats.gmi).toBeCloseTo(6.898, 2);
    });

    it('should handle empty readings gracefully', async () => {
      (mockDb.readings.where as jest.Mock).mockReturnValue({
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
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

      (mockDb.readings.get as jest.Mock).mockResolvedValue({
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
      (mockDb.readings.get as jest.Mock).mockResolvedValue(existing);

      await service.updateReading('test-id', updates);

      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'update',
          readingId: 'test-id',
        })
      );
    });
  });

  describe('deleteReading', () => {
    it('should delete a reading from database', async () => {
      (mockDb.readings.get as jest.Mock).mockResolvedValue({
        id: 'test-id',
        value: 100,
        units: 'mg/dL',
        time: '2024-01-15T10:00:00Z',
        type: 'smbg',
        synced: true,
      });
      await service.deleteReading('test-id');

      expect(mockDb.readings.delete).toHaveBeenCalledWith('test-id');
    });

    it('should add delete operation to sync queue', async () => {
      (mockDb.readings.get as jest.Mock).mockResolvedValue({
        id: 'test-id',
        value: 100,
        units: 'mg/dL',
        time: '2024-01-15T10:00:00Z',
        type: 'smbg',
        synced: true,
      });
      await service.deleteReading('test-id');

      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'delete',
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

      (mockDb.readings.where as jest.Mock).mockReturnValue({
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockReadings),
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

      (mockDb.readings.where as jest.Mock).mockReturnValue({
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockReadings),
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

      (mockDb.readings.where as jest.Mock).mockReturnValue({
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockReadings),
        }),
      });

      const stats = await service.getStatistics('week');

      expect(stats.coefficientOfVariation).toBeLessThan(36);
    });
  });

  describe('fetchLatestFromBackend', () => {
    it('should fetch latest readings from backend using new endpoint', async () => {
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
      (mockDb.readings.filter as jest.Mock).mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await service.fetchLatestFromBackend();

      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.glucose.latest');
      expect(result.fetched).toBe(1);
      expect(result.merged).toBe(1);
      expect(mockDb.readings.add).toHaveBeenCalled();
    });

    it('should skip fetch if offline', async () => {
      // Set service to offline state
      (service as any).isOnline = false;

      const result = await service.fetchLatestFromBackend();

      expect(result.fetched).toBe(0);
      expect(result.merged).toBe(0);
      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });

    it('should handle backend errors gracefully', async () => {
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

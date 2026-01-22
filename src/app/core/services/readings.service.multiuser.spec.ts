import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { vi, Mock } from 'vitest';
import { ReadingsService, LIVE_QUERY_FN } from '@services/readings.service';
import { ReadingsMapperService } from '@services/readings-mapper.service';
import { ReadingsStatisticsService } from '@services/readings-statistics.service';
import { ReadingsSyncService } from '@services/readings-sync.service';
import { DiabetacticDatabase } from '@services/database.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiGatewayService } from '@services/api-gateway.service';
import { AuditLogService } from '@services/audit-log.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';

class MockEnvironmentConfigService {
  isMockMode = false;
  backendMode = 'local';
}

function createTestReading(
  id: string,
  userId: string,
  value: number,
  time: string
): LocalGlucoseReading {
  return {
    id,
    userId,
    value,
    units: 'mg/dL',
    time,
    type: 'smbg',
    synced: false,
    status: value < 70 ? 'low' : value > 180 ? 'high' : 'normal',
    localStoredAt: new Date().toISOString(),
  };
}

const USER_A_ID = 'user-a-123';
const USER_B_ID = 'user-b-456';

const userAReadings: LocalGlucoseReading[] = [
  createTestReading('r1', USER_A_ID, 100, '2026-01-01T10:00:00Z'),
  createTestReading('r2', USER_A_ID, 110, '2026-01-01T11:00:00Z'),
  createTestReading('r3', USER_A_ID, 120, '2026-01-01T12:00:00Z'),
];

const userBReadings: LocalGlucoseReading[] = [
  createTestReading('r4', USER_B_ID, 130, '2026-01-01T10:00:00Z'),
  createTestReading('r5', USER_B_ID, 140, '2026-01-01T11:00:00Z'),
];

const allReadings = [...userAReadings, ...userBReadings];

class MockDatabaseService {
  private _readings: LocalGlucoseReading[] = [];

  readings = {
    toArray: vi.fn().mockImplementation(() => Promise.resolve(this._readings)),
    where: vi.fn().mockImplementation((field: string) => {
      if (field === 'userId') {
        return {
          equals: vi.fn().mockImplementation((userId: string) => ({
            toArray: vi
              .fn()
              .mockImplementation(() =>
                Promise.resolve(this._readings.filter(r => r.userId === userId))
              ),
            count: vi
              .fn()
              .mockImplementation(() =>
                Promise.resolve(this._readings.filter(r => r.userId === userId).length)
              ),
            offset: vi.fn().mockImplementation((offset: number) => ({
              limit: vi.fn().mockImplementation((limit: number) => ({
                toArray: vi.fn().mockImplementation(() => {
                  const userReadings = this._readings.filter(r => r.userId === userId);
                  return Promise.resolve(userReadings.slice(offset, offset + limit));
                }),
              })),
              toArray: vi.fn().mockImplementation(() => {
                const userReadings = this._readings.filter(r => r.userId === userId);
                return Promise.resolve(userReadings.slice(offset));
              }),
            })),
            limit: vi.fn().mockImplementation((limit: number) => ({
              toArray: vi.fn().mockImplementation(() => {
                const userReadings = this._readings.filter(r => r.userId === userId);
                return Promise.resolve(userReadings.slice(0, limit));
              }),
            })),
          })),
        };
      }
      if (field === 'time') {
        return {
          between: vi.fn().mockImplementation((start: string, end: string) => ({
            toArray: vi
              .fn()
              .mockImplementation(() =>
                Promise.resolve(this._readings.filter(r => r.time >= start && r.time <= end))
              ),
          })),
        };
      }
      return {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(undefined),
        }),
      };
    }),
    filter: vi.fn().mockImplementation((predicate: (r: LocalGlucoseReading) => boolean) => ({
      toArray: vi.fn().mockImplementation(() => Promise.resolve(this._readings.filter(predicate))),
    })),
    get: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue('mock-id'),
    update: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined),
    orderBy: vi.fn().mockImplementation(() => ({
      reverse: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(() => Promise.resolve(this._readings)),
        }),
        toArray: vi.fn().mockImplementation(() => Promise.resolve(this._readings)),
      }),
      toArray: vi.fn().mockImplementation(() => Promise.resolve(this._readings)),
    })),
    toCollection: vi.fn().mockReturnValue({
      toArray: vi.fn().mockImplementation(() => Promise.resolve(this._readings)),
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
    clear: vi.fn().mockResolvedValue(undefined),
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

  transaction = vi.fn().mockImplementation(async (_mode: string, ...args: unknown[]) => {
    const callback = args[args.length - 1] as () => Promise<unknown>;
    return await callback();
  });

  setReadings(readings: LocalGlucoseReading[]): void {
    this._readings = [...readings];
  }

  getReadings(): LocalGlucoseReading[] {
    return this._readings;
  }
}

describe('ReadingsService Multi-User Isolation', () => {
  let service: ReadingsService;
  let mockDb: MockDatabaseService;
  let mockApiGateway: Mock<ApiGatewayService>;
  let readingsSubject: BehaviorSubject<LocalGlucoseReading[]>;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockDb.setReadings(allReadings);
    readingsSubject = new BehaviorSubject<LocalGlucoseReading[]>([]);

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
        { provide: EnvironmentConfigService, useClass: MockEnvironmentConfigService },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<LocalGlucoseReading[]> | LocalGlucoseReading[]) =>
            new Observable<LocalGlucoseReading[]>(subscriber => {
              Promise.resolve(factory())
                .then(result => {
                  subscriber.next(result);
                  readingsSubject.next(result);
                })
                .catch(error => subscriber.error?.(error));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
  });

  afterEach(() => {
    service.clearCurrentUser();
    TestBed.resetTestingModule();
  });

  describe('setCurrentUser / clearCurrentUser', () => {
    it('should return empty array when no user is set', async () => {
      // No user set - should return empty results
      const result = await service.getAllReadings();

      expect(result.readings).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return only readings for the current user', async () => {
      // Set user A
      service.setCurrentUser(USER_A_ID);

      const result = await service.getAllReadings();

      expect(result.readings.length).toBe(userAReadings.length);
      expect(result.total).toBe(userAReadings.length);
      expect(result.readings.every(r => r.userId === USER_A_ID)).toBe(true);
    });

    it("should switch to different user's readings when setCurrentUser is called", async () => {
      // Start with user A
      service.setCurrentUser(USER_A_ID);
      let result = await service.getAllReadings();
      expect(result.readings.length).toBe(userAReadings.length);
      expect(result.readings.every(r => r.userId === USER_A_ID)).toBe(true);

      // Switch to user B
      service.setCurrentUser(USER_B_ID);
      result = await service.getAllReadings();
      expect(result.readings.length).toBe(userBReadings.length);
      expect(result.readings.every(r => r.userId === USER_B_ID)).toBe(true);
    });

    it('should return empty array after clearCurrentUser is called', async () => {
      // Set a user first
      service.setCurrentUser(USER_A_ID);
      let result = await service.getAllReadings();
      expect(result.readings.length).toBe(userAReadings.length);

      // Clear user
      service.clearCurrentUser();
      result = await service.getAllReadings();

      expect(result.readings).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle user with no readings gracefully', async () => {
      // Set a user that has no readings in the database
      const nonExistentUserId = 'user-no-readings-999';
      service.setCurrentUser(nonExistentUserId);

      const result = await service.getAllReadings();

      expect(result.readings).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getReadingsByDateRange with userId filtering', () => {
    it('should filter getReadingsByDateRange by userId', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      const endDate = new Date('2026-01-01T23:59:59Z');

      // Set user A
      service.setCurrentUser(USER_A_ID);
      let result = await service.getReadingsByDateRange(startDate, endDate);

      // Should only return user A's readings
      expect(result.length).toBe(userAReadings.length);
      expect(result.every(r => r.userId === USER_A_ID)).toBe(true);

      // Switch to user B
      service.setCurrentUser(USER_B_ID);
      result = await service.getReadingsByDateRange(startDate, endDate);

      // Should only return user B's readings
      expect(result.length).toBe(userBReadings.length);
      expect(result.every(r => r.userId === USER_B_ID)).toBe(true);
    });

    it('should return empty array for date range query when no user is set', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      const endDate = new Date('2026-01-01T23:59:59Z');

      // No user set
      const result = await service.getReadingsByDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('getAllReadings with pagination and userId filtering', () => {
    it('should filter getAllReadings by userId with pagination', async () => {
      service.setCurrentUser(USER_A_ID);

      // Test with limit
      const result = await service.getAllReadings(2, 0);

      expect(result.readings.length).toBeLessThanOrEqual(2);
      expect(result.total).toBe(userAReadings.length);
      expect(result.readings.every(r => r.userId === USER_A_ID)).toBe(true);
    });

    it('should return correct hasMore flag based on user-specific total', async () => {
      service.setCurrentUser(USER_A_ID);

      // Get only 1 reading when user has 3
      const result = await service.getAllReadings(1, 0);

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(userAReadings.length);
    });
  });

  describe('readings$ observable with userId filtering', () => {
    it('should emit empty array when no user is set', async () => {
      // No setCurrentUser called
      let emittedReadings: LocalGlucoseReading[] = [];

      service.readings$.subscribe(readings => {
        emittedReadings = readings;
      });

      // Wait for observable to emit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should start with empty array since no user is set
      expect(emittedReadings).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid user switching', async () => {
      // Rapidly switch users
      service.setCurrentUser(USER_A_ID);
      service.setCurrentUser(USER_B_ID);
      service.setCurrentUser(USER_A_ID);
      service.setCurrentUser(USER_B_ID);

      const result = await service.getAllReadings();

      // Should reflect the last set user (USER_B)
      expect(result.readings.every(r => r.userId === USER_B_ID)).toBe(true);
      expect(result.total).toBe(userBReadings.length);
    });

    it('should not leak data between users', async () => {
      // Get user A readings
      service.setCurrentUser(USER_A_ID);
      const userAResult = await service.getAllReadings();

      // Get user B readings
      service.setCurrentUser(USER_B_ID);
      const userBResult = await service.getAllReadings();

      // Verify no overlap
      const userAIds = userAResult.readings.map(r => r.id);
      const userBIds = userBResult.readings.map(r => r.id);

      const overlap = userAIds.filter(id => userBIds.includes(id));
      expect(overlap).toEqual([]);

      // Verify correct counts
      expect(userAResult.total).toBe(userAReadings.length);
      expect(userBResult.total).toBe(userBReadings.length);
    });

    it('should handle empty database gracefully', async () => {
      // Clear all readings
      mockDb.setReadings([]);

      service.setCurrentUser(USER_A_ID);
      const result = await service.getAllReadings();

      expect(result.readings).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});

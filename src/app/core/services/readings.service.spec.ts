import { TestBed } from '@angular/core/testing';
import { ReadingsService, LIVE_QUERY_FN } from './readings.service';
import { DiabetacticDatabase } from './database.service';
import {
  LocalGlucoseReading,
  GlucoseReading,
  GlucoseStatistics,
} from '../models/glucose-reading.model';
import { Observable } from 'rxjs';
import { MockDataService } from './mock-data.service';

// Mock Dexie database
class MockDatabaseService {
  readings = {
    toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
    where: jasmine.createSpy('where').and.returnValue({
      between: jasmine.createSpy('between').and.returnValue({
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
      }),
      equals: jasmine.createSpy('equals').and.returnValue({
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
      }),
    }),
    get: jasmine.createSpy('get').and.returnValue(Promise.resolve(undefined)),
    add: jasmine.createSpy('add').and.returnValue(Promise.resolve('mock-id')),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve(1)),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
    bulkAdd: jasmine.createSpy('bulkAdd').and.returnValue(Promise.resolve()),
    orderBy: jasmine.createSpy('orderBy').and.returnValue({
      reverse: jasmine.createSpy('reverse').and.returnValue({
        limit: jasmine.createSpy('limit').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
        }),
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
      }),
    }),
    toCollection: jasmine.createSpy('toCollection').and.returnValue({
      toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
    }),
  };

  syncQueue = {
    add: jasmine.createSpy('add').and.returnValue(Promise.resolve()),
    count: jasmine.createSpy('count').and.returnValue(Promise.resolve(0)),
    toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
    where: jasmine.createSpy('where').and.returnValue({
      equals: jasmine.createSpy('equals').and.returnValue({
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
      }),
    }),
  };
}

describe('ReadingsService', () => {
  let service: ReadingsService;
  let mockDb: MockDatabaseService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        { provide: MockDataService, useValue: null },
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

      const result = await service.addReading(reading);

      expect(mockDb.readings.add).toHaveBeenCalled();
      const addedReading = (mockDb.readings.add as jasmine.Spy).calls.mostRecent().args[0];
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

      const addedReading = (mockDb.readings.add as jasmine.Spy).calls.mostRecent().args[0];
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

        const addedReading = (mockDb.readings.add as jasmine.Spy).calls.mostRecent().args[0];
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

      (mockDb.readings.where as jasmine.Spy).and.returnValue({
        between: jasmine.createSpy('between').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockReadings)),
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

      (mockDb.readings.where as jasmine.Spy).and.returnValue({
        between: jasmine.createSpy('between').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockReadings)),
        }),
      });

      const stats = await service.getStatistics('month');

      // HbA1c = (average + 46.7) / 28.7
      // For average of 150: (150 + 46.7) / 28.7 = 6.85
      expect(stats.estimatedA1C).toBeCloseTo(6.85, 1);
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

      (mockDb.readings.where as jasmine.Spy).and.returnValue({
        between: jasmine.createSpy('between').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockReadings)),
        }),
      });

      const stats = await service.getStatistics('month');

      // GMI = 3.31 + (0.02392 * average)
      // For average of 150: 3.31 + (0.02392 * 150) = 6.898
      expect(stats.gmi).toBeCloseTo(6.898, 2);
    });

    it('should handle empty readings gracefully', async () => {
      (mockDb.readings.where as jasmine.Spy).and.returnValue({
        between: jasmine.createSpy('between').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([])),
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
      const updates = { value: 130, notes: ['Updated note'] };

      mockDb.readings.get.and.returnValue(
        Promise.resolve({
          id: 'test-id',
          value: 100,
          units: 'mg/dL',
          time: '2024-01-15T10:00:00Z',
          type: 'smbg',
          synced: false,
        })
      );

      await service.updateReading('test-id', updates);

      expect(mockDb.readings.update).toHaveBeenCalledWith(
        'test-id',
        jasmine.objectContaining({
          value: 130,
          notes: ['Updated note'],
          units: 'mg/dL',
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
      mockDb.readings.get.and.returnValue(Promise.resolve(existing));

      await service.updateReading('test-id', updates);

      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          operation: 'update',
          readingId: 'test-id',
        })
      );
    });
  });

  describe('deleteReading', () => {
    it('should delete a reading from database', async () => {
      mockDb.readings.get.and.returnValue(
        Promise.resolve({
          id: 'test-id',
          value: 100,
          units: 'mg/dL',
          time: '2024-01-15T10:00:00Z',
          type: 'smbg',
          synced: true,
        })
      );
      await service.deleteReading('test-id');

      expect(mockDb.readings.delete).toHaveBeenCalledWith('test-id');
    });

    it('should add delete operation to sync queue', async () => {
      mockDb.readings.get.and.returnValue(
        Promise.resolve({
          id: 'test-id',
          value: 100,
          units: 'mg/dL',
          time: '2024-01-15T10:00:00Z',
          type: 'smbg',
          synced: true,
        })
      );
      await service.deleteReading('test-id');

      expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
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

      (mockDb.readings.where as jasmine.Spy).and.returnValue({
        between: jasmine.createSpy('between').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockReadings)),
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

      (mockDb.readings.where as jasmine.Spy).and.returnValue({
        between: jasmine.createSpy('between').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockReadings)),
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

      (mockDb.readings.where as jasmine.Spy).and.returnValue({
        between: jasmine.createSpy('between').and.returnValue({
          toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockReadings)),
        }),
      });

      const stats = await service.getStatistics('week');

      expect(stats.coefficientOfVariation).toBeLessThan(36);
    });
  });
});

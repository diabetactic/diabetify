/**
 * Offline-Online Integration Tests
 *
 * Tests the complete offline-first behavior across multiple services:
 * 1. ReadingsService - Offline queue management
 * 2. DatabaseService - IndexedDB as offline storage
 * 3. Network detection - Online/offline state management
 * 4. ApiGatewayService - Automatic sync when online
 *
 * Flow: Offline Queue → Network Detection → Auto Sync → Conflict Resolution
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ReadingsService } from '../../core/services/readings.service';
import { ApiGatewayService } from '../../core/services/api-gateway.service';
// CapacitorHttpService removed - services now use HttpClient directly with Capacitor auto-patching
import { ExternalServicesManager } from '../../core/services/external-services-manager.service';
import { PlatformDetectorService } from '../../core/services/platform-detector.service';
import { EnvironmentDetectorService } from '../../core/services/environment-detector.service';
import { LoggerService } from '../../core/services/logger.service';
import { MockAdapterService } from '../../core/services/mock-adapter.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { TidepoolAuthService } from '../../core/services/tidepool-auth.service';
import { LocalAuthService } from '../../core/services/local-auth.service';
import { LocalGlucoseReading, GlucoseUnit } from '../../core/models/glucose-reading.model';
import { db } from '../../core/services/database.service';
import { Network } from '@capacitor/network';

describe('Offline-Online Integration Tests', () => {
  let readingsService: ReadingsService;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;
  let mockLocalAuth: jasmine.SpyObj<LocalAuthService>;

  const createMockReading = (
    overrides?: Partial<LocalGlucoseReading>
  ): Omit<LocalGlucoseReading, 'id'> => ({
    time: new Date().toISOString(),
    value: 120,
    units: 'mg/dL' as GlucoseUnit,
    type: 'smbg' as const,
    subType: 'manual',
    deviceId: 'test-device',
    userId: 'test-user',
    synced: false,
    localStoredAt: new Date().toISOString(),
    isLocalOnly: true,
    status: 'normal',
    mealContext: 'OTRO',
    ...overrides,
  });

  const simulateOffline = () => {
    (Network.getStatus as jest.Mock).mockResolvedValue({
      connected: false,
      connectionType: 'none',
    });
  };

  const simulateOnline = () => {
    (Network.getStatus as jest.Mock).mockResolvedValue({ connected: true, connectionType: 'wifi' });
  };

  beforeEach(async () => {
    // Clear database
    await db.readings.clear();
    await db.syncQueue.clear();

    // Create mocks
    mockHttpClient = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete', 'patch']);

    mockLocalAuth = jasmine.createSpyObj('LocalAuthService', [
      'getAccessToken',
      'getCurrentUser',
      'waitForInitialization',
    ]);
    mockLocalAuth.getAccessToken.and.resolveTo('test_token');
    mockLocalAuth.waitForInitialization.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        ApiGatewayService,
        { provide: HttpClient, useValue: mockHttpClient },
        {
          provide: ExternalServicesManager,
          useValue: jasmine.createSpyObj('ExternalServicesManager', [
            'isServiceAvailable',
            'getServiceStatus',
          ]),
        },
        {
          provide: PlatformDetectorService,
          useValue: { getApiBaseUrl: () => 'http://localhost:8000' },
        },
        {
          provide: EnvironmentDetectorService,
          useValue: { isPlatformBrowser: () => true },
        },
        {
          provide: LoggerService,
          useValue: jasmine.createSpyObj('LoggerService', [
            'info',
            'debug',
            'warn',
            'error',
            'getRequestId',
            'setRequestId',
          ]),
        },
        {
          provide: MockAdapterService,
          useValue: { isServiceMockEnabled: () => false },
        },
        {
          provide: MockDataService,
          useValue: jasmine.createSpyObj('MockDataService', ['getStats']),
        },
        {
          provide: TidepoolAuthService,
          useValue: jasmine.createSpyObj('TidepoolAuthService', ['getAccessToken']),
        },
        { provide: LocalAuthService, useValue: mockLocalAuth },
      ],
    });

    readingsService = TestBed.inject(ReadingsService);
    apiGatewayService = TestBed.inject(ApiGatewayService);

    const mockExternalServices = TestBed.inject(
      ExternalServicesManager
    ) as jasmine.SpyObj<ExternalServicesManager>;
    mockExternalServices.isServiceAvailable.and.returnValue(true);

    // Default to online
    simulateOnline();
  });

  afterEach(async () => {
    await db.readings.clear();
    await db.syncQueue.clear();
    jest.clearAllMocks();
  });

  describe('Offline Reading Creation', () => {
    it('should store readings locally when offline', async () => {
      // ARRANGE: Go offline
      simulateOffline();

      // ACT: Add multiple readings while offline
      const reading1 = await readingsService.addReading(
        createMockReading({ value: 100, mealContext: 'DESAYUNO' })
      );
      const reading2 = await readingsService.addReading(
        createMockReading({ value: 150, mealContext: 'ALMUERZO' })
      );
      const reading3 = await readingsService.addReading(
        createMockReading({ value: 120, mealContext: 'CENA' })
      );

      // ASSERT: All readings stored in IndexedDB
      const allReadings = await db.readings.toArray();
      expect(allReadings.length).toBe(3);

      // All readings marked as unsynced
      expect(reading1.synced).toBeFalse();
      expect(reading2.synced).toBeFalse();
      expect(reading3.synced).toBeFalse();

      // All readings in sync queue
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(3);
      expect(queueItems.every(item => item.operation === 'create')).toBeTrue();
    });

    it('should not attempt sync when offline', async () => {
      // ARRANGE: Go offline and add reading
      simulateOffline();
      await readingsService.addReading(createMockReading({ value: 140 }));

      // ACT: Try to sync
      const syncResult = await readingsService.syncPendingReadings();

      // ASSERT: Sync skipped
      expect(syncResult.success).toBe(0);
      expect(syncResult.failed).toBe(0);

      // No HTTP calls made
      expect(mockHttpClient.post).not.toHaveBeenCalled();

      // Reading still in queue
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
    });

    it('should allow reading local data when offline', async () => {
      // ARRANGE: Add readings while online
      simulateOnline();
      await readingsService.addReading(createMockReading({ value: 100 }));
      await readingsService.addReading(createMockReading({ value: 150 }));
      await readingsService.addReading(createMockReading({ value: 120 }));

      // Go offline
      simulateOffline();

      // ACT: Read data
      const { readings, total } = await readingsService.getAllReadings();

      // ASSERT: All readings available
      expect(total).toBe(3);
      expect(readings.length).toBe(3);
    });
  });

  describe('Offline-to-Online Transition', () => {
    it('should automatically sync queued readings when coming online', async () => {
      // ARRANGE: Start offline with readings
      simulateOffline();
      await readingsService.addReading(createMockReading({ value: 100, mealContext: 'DESAYUNO' }));
      await readingsService.addReading(createMockReading({ value: 140, mealContext: 'ALMUERZO' }));

      // Verify readings queued
      let queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(2);

      // Setup backend responses
      let backendId = 1000;
      mockHttpClient.post.and.callFake(() =>
        of({
          id: backendId++,
          user_id: 1,
          glucose_level: 120,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );

      // ACT: Come online and sync
      simulateOnline();
      const syncResult = await readingsService.syncPendingReadings();

      // ASSERT: All readings synced
      expect(syncResult.success).toBe(2);
      expect(syncResult.failed).toBe(0);

      // Queue cleared
      queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(0);

      // All readings marked as synced
      const allReadings = await db.readings.toArray();
      expect(allReadings.every(r => r.synced)).toBeTrue();
    });

    it('should handle partial sync failures gracefully', async () => {
      // ARRANGE: Add readings offline
      simulateOffline();
      await readingsService.addReading(createMockReading({ value: 100 })); // Will succeed
      await readingsService.addReading(createMockReading({ value: 140 })); // Will fail
      await readingsService.addReading(createMockReading({ value: 120 })); // Will succeed

      // Setup backend to fail on second call
      let callCount = 0;
      mockHttpClient.post.and.callFake(() => {
        callCount++;
        if (callCount === 2) {
          return throwError(() => ({ status: 500, message: 'Server error' }));
        }
        return of({
          id: 1000 + callCount,
          user_id: 1,
          glucose_level: 120,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        });
      });

      // ACT: Come online and sync
      simulateOnline();
      const syncResult = await readingsService.syncPendingReadings();

      // ASSERT: Partial sync
      expect(syncResult.success).toBe(2);
      expect(syncResult.failed).toBe(1);

      // Failed reading still in queue
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].retryCount).toBe(1);

      // Successful readings synced
      const syncedReadings = await db.readings.filter(r => r.synced === true).toArray();
      expect(syncedReadings.length).toBe(2);
    });
  });

  describe('Intermittent Connectivity', () => {
    it('should handle network drops during sync', async () => {
      // ARRANGE: Add readings
      await readingsService.addReading(createMockReading({ value: 100 }));
      await readingsService.addReading(createMockReading({ value: 140 }));

      // Simulate network drop mid-sync
      let syncAttempts = 0;
      mockHttpClient.post.and.callFake(() => {
        syncAttempts++;
        if (syncAttempts === 2) {
          // Network drops on second reading
          simulateOffline();
          return throwError(() => ({ status: 0, message: 'Network error' }));
        }
        return of({
          id: 1000 + syncAttempts,
          user_id: 1,
          glucose_level: 120,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        });
      });

      // ACT: Start sync
      const syncResult1 = await readingsService.syncPendingReadings();

      // ASSERT: First reading synced, second failed
      expect(syncResult1.success).toBe(1);
      expect(syncResult1.failed).toBe(1);

      // Restore network
      simulateOnline();
      mockHttpClient.post.and.returnValue(
        of({
          id: 2000,
          user_id: 1,
          glucose_level: 140,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );

      // Retry sync
      const syncResult2 = await readingsService.syncPendingReadings();

      // ASSERT: Second reading now synced
      expect(syncResult2.success).toBe(1);

      // All readings synced
      const allReadings = await db.readings.toArray();
      expect(allReadings.every(r => r.synced)).toBeTrue();
    });

    it('should detect network status changes', async () => {
      // ARRANGE: Start online
      simulateOnline();
      await readingsService.addReading(createMockReading({ value: 100 }));

      // Setup backend
      mockHttpClient.post.and.returnValue(
        of({
          id: 1000,
          user_id: 1,
          glucose_level: 100,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );

      // ACT: Sync while online (should work)
      const onlineSync = await readingsService.syncPendingReadings();
      expect(onlineSync.success).toBe(1);

      // Go offline
      simulateOffline();
      await readingsService.addReading(createMockReading({ value: 140 }));

      // Try to sync (should skip)
      const offlineSync = await readingsService.syncPendingReadings();
      expect(offlineSync.success).toBe(0);

      // Queue should have 1 unsynced item
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
    });
  });

  describe('Data Consistency During Sync', () => {
    it('should prevent duplicate syncs with transaction locking', async () => {
      // ARRANGE: Add reading
      await readingsService.addReading(createMockReading({ value: 150 }));

      // Setup backend with delay
      mockHttpClient.post.and.returnValue(
        of({
          id: 1000,
          user_id: 1,
          glucose_level: 150,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );

      // ACT: Trigger concurrent syncs
      const [sync1, sync2] = await Promise.all([
        readingsService.syncPendingReadings(),
        readingsService.syncPendingReadings(),
      ]);

      // ASSERT: Only one sync succeeded (transactions prevent duplicates)
      const totalSuccess = sync1.success + sync2.success;
      expect(totalSuccess).toBeLessThanOrEqual(1);

      // Reading synced only once
      const reading = await db.readings.toArray();
      expect(reading[0].synced).toBeTrue();

      // Queue empty
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(0);
    });

    it('should maintain data integrity across offline updates', async () => {
      // ARRANGE: Add and sync reading
      const reading = await readingsService.addReading(createMockReading({ value: 100 }));

      mockHttpClient.post.and.returnValue(
        of({
          id: 5000,
          user_id: 1,
          glucose_level: 100,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );
      await readingsService.syncPendingReadings();

      // Go offline
      simulateOffline();

      // Update reading offline
      await readingsService.updateReading(reading.id, {
        value: 110,
        notes: 'Updated offline',
      });

      // ASSERT: Update reflected locally
      const updatedLocal = await db.readings.get(reading.id);
      expect(updatedLocal?.value).toBe(110);
      expect(updatedLocal?.notes).toBe('Updated offline');

      // Update queued for sync
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].operation).toBe('update');
    });
  });

  describe('Offline Statistics and Queries', () => {
    it('should calculate statistics from local data when offline', async () => {
      // ARRANGE: Add readings offline
      simulateOffline();

      const now = Date.now();
      await readingsService.addReading(
        createMockReading({ value: 100, time: new Date(now - 3600000).toISOString() })
      );
      await readingsService.addReading(
        createMockReading({ value: 150, time: new Date(now - 1800000).toISOString() })
      );
      await readingsService.addReading(
        createMockReading({ value: 120, time: new Date(now).toISOString() })
      );

      // ACT: Calculate statistics
      const stats = await readingsService.getStatistics('day');

      // ASSERT: Statistics calculated from local data
      expect(stats.totalReadings).toBe(3);
      expect(stats.average).toBeCloseTo(123.3, 1);
      expect(stats.median).toBe(120);
    });

    it('should filter readings by date range when offline', async () => {
      // ARRANGE: Add readings across different days
      simulateOffline();

      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const twoDaysAgo = new Date(today.getTime() - 172800000);

      await readingsService.addReading(
        createMockReading({ value: 100, time: twoDaysAgo.toISOString() })
      );
      await readingsService.addReading(
        createMockReading({ value: 150, time: yesterday.toISOString() })
      );
      await readingsService.addReading(
        createMockReading({ value: 120, time: today.toISOString() })
      );

      // ACT: Get readings for last 24 hours
      const start = new Date(today.getTime() - 86400000);
      const readings = await readingsService.getReadingsByDateRange(start, today);

      // ASSERT: Only today's and yesterday's readings
      expect(readings.length).toBe(2);
      expect(readings.some(r => r.value === 100)).toBeFalse(); // Two days ago excluded
      expect(readings.some(r => r.value === 150)).toBeTrue();
      expect(readings.some(r => r.value === 120)).toBeTrue();
    });
  });

  describe('Long-term Offline Usage', () => {
    it('should handle extended offline period with many readings', async () => {
      // ARRANGE: Simulate week offline with 3 readings per day
      simulateOffline();

      const readings: LocalGlucoseReading[] = [];
      const daysOffline = 7;
      const readingsPerDay = 3;

      for (let day = 0; day < daysOffline; day++) {
        for (let reading = 0; reading < readingsPerDay; reading++) {
          const timestamp = new Date(Date.now() - day * 86400000 - reading * 3600000);
          const created = await readingsService.addReading(
            createMockReading({
              value: 100 + Math.random() * 100,
              time: timestamp.toISOString(),
            })
          );
          readings.push(created);
        }
      }

      // ASSERT: All readings stored locally
      const allReadings = await db.readings.toArray();
      expect(allReadings.length).toBe(daysOffline * readingsPerDay);

      // All unsynced
      expect(allReadings.every(r => !r.synced)).toBeTrue();

      // Setup backend for batch sync
      let backendId = 10000;
      mockHttpClient.post.and.callFake(() =>
        of({
          id: backendId++,
          user_id: 1,
          glucose_level: 120,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );

      // Come online and sync
      simulateOnline();
      const syncResult = await readingsService.syncPendingReadings();

      // ASSERT: All readings synced
      expect(syncResult.success).toBe(daysOffline * readingsPerDay);
      expect(syncResult.failed).toBe(0);

      // Queue cleared
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(0);
    });
  });

  describe('Bidirectional Sync After Offline Period', () => {
    it('should perform full sync after extended offline period', async () => {
      // ARRANGE: Simulate offline period with local changes
      simulateOffline();
      await readingsService.addReading(createMockReading({ value: 140, mealContext: 'DESAYUNO' }));

      // Setup backend responses
      mockHttpClient.post.and.returnValue(
        of({
          id: 6000,
          user_id: 1,
          glucose_level: 140,
          reading_type: 'DESAYUNO',
          created_at: '06/12/2025 08:00:00',
        })
      );

      // Backend has new readings too
      mockHttpClient.get.and.returnValue(
        of({
          readings: [
            {
              id: 7000,
              user_id: 1,
              glucose_level: 180,
              reading_type: 'ALMUERZO',
              created_at: '06/12/2025 14:00:00',
            },
            {
              id: 8000,
              user_id: 1,
              glucose_level: 120,
              reading_type: 'CENA',
              created_at: '06/12/2025 20:00:00',
            },
          ],
        })
      );

      // ACT: Come online and perform full sync
      simulateOnline();
      const fullSync = await readingsService.performFullSync();

      // ASSERT: Bidirectional sync completed
      expect(fullSync.pushed).toBe(1); // Local reading pushed
      expect(fullSync.fetched).toBe(2); // Two backend readings fetched
      expect(fullSync.failed).toBe(0);

      // Total 3 readings now
      const allReadings = await db.readings.toArray();
      expect(allReadings.length).toBe(3);

      // All synced
      expect(allReadings.every(r => r.synced)).toBeTrue();
    });
  });
});

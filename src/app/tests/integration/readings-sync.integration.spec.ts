/**
 * Readings Sync Integration Tests
 *
 * Tests the complete glucose readings sync flow across multiple services:
 * 1. ReadingsService - Local CRUD and sync queue management
 * 2. DatabaseService (Dexie) - IndexedDB persistence
 * 3. ApiGatewayService - Backend sync coordination
 *
 * Flow: Add Reading → Local Storage → Sync Queue → Backend Sync → Verification
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { ReadingsService } from '@core/services/readings.service';
import { ApiGatewayService, ApiResponse } from '@core/services/api-gateway.service';
import { ExternalServicesManager } from '@core/services/external-services-manager.service';
import { PlatformDetectorService } from '@core/services/platform-detector.service';
import { EnvironmentDetectorService } from '@core/services/environment-detector.service';
import { LoggerService } from '@core/services/logger.service';
import { MockAdapterService } from '@core/services/mock-adapter.service';
import { MockDataService } from '@core/services/mock-data.service';
import { TidepoolAuthService } from '@core/services/tidepool-auth.service';
import { LocalAuthService } from '@core/services/local-auth.service';
import { LocalGlucoseReading, GlucoseUnit } from '@core/models/glucose-reading.model';
import { db, DiabetacticDatabase } from '@core/services/database.service';
import { Network } from '@capacitor/network';

describe('Readings Sync Integration Tests', () => {
  let readingsService: ReadingsService;
  let apiGatewayService: ApiGatewayService;
  let mockHttpClient: { get: Mock; post: Mock; put: Mock; delete: Mock; patch: Mock };
  let mockLocalAuth: { getAccessToken: Mock; getCurrentUser: Mock; waitForInitialization: Mock };

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
    mealContext: 'DESAYUNO',
    ...overrides,
  });

  beforeEach(async () => {
    // Clear database before each test - handle PrematureCommitError in fake-indexeddb
    try {
      await db.transaction('rw', [db.readings, db.syncQueue], async () => {
        await db.readings.clear();
        await db.syncQueue.clear();
      });
    } catch (error) {
      if ((error as Error).name === 'PrematureCommitError') {
        await db.readings.clear();
        await db.syncQueue.clear();
      } else {
        throw error;
      }
    }

    // Create HttpClient mock (services now use HttpClient directly with Capacitor auto-patching)
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    };

    mockLocalAuth = {
      getAccessToken: vi.fn().mockResolvedValue('test_token'),
      getCurrentUser: vi.fn(),
      waitForInitialization: vi.fn().mockResolvedValue(undefined),
      refreshUserProfile: vi.fn().mockResolvedValue(undefined),
    };

    const mockExternalServicesObj = {
      isServiceAvailable: vi.fn().mockReturnValue(true),
      getServiceStatus: vi.fn(),
    };

    // Mock Network.getStatus BEFORE service creation to prevent race condition
    // initializeNetworkMonitoring() runs async in constructor and calls Network.getStatus
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: false, connectionType: 'none' });

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        ApiGatewayService,
        { provide: DiabetacticDatabase, useValue: db }, // Ensure same db instance
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: ExternalServicesManager, useValue: mockExternalServicesObj },
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
          useValue: {
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            getRequestId: vi.fn(),
            setRequestId: vi.fn(),
          },
        },
        {
          provide: MockAdapterService,
          useValue: { isServiceMockEnabled: () => false },
        },
        {
          provide: MockDataService,
          useValue: { getStats: vi.fn() },
        },
        {
          provide: TidepoolAuthService,
          useValue: { getAccessToken: vi.fn() },
        },
        { provide: LocalAuthService, useValue: mockLocalAuth },
      ],
    });

    readingsService = TestBed.inject(ReadingsService);
    apiGatewayService = TestBed.inject(ApiGatewayService);

    // Don't mock syncPendingReadings - instead we'll wait for background syncs to settle
    // and verify the queue state carefully in each test

    // Wait for async initializeNetworkMonitoring() to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Set internal state for tests
    const serviceInternal = readingsService as unknown as {
      isOnline: boolean;
      isMockBackend: boolean;
    };
    serviceInternal.isOnline = false;
    serviceInternal.isMockBackend = false;
  });

  afterEach(async () => {
    try {
      await db.transaction('rw', [db.readings, db.syncQueue], async () => {
        await db.readings.clear();
        await db.syncQueue.clear();
      });
    } catch (error) {
      if ((error as Error).name === 'PrematureCommitError') {
        await db.readings.clear();
        await db.syncQueue.clear();
      } else {
        throw error;
      }
    }
    vi.clearAllMocks();
  });

  describe('Add Reading Flow', () => {
    it('should add reading to IndexedDB and sync queue', async () => {
      // ARRANGE
      const reading = createMockReading({ value: 150, mealContext: 'ALMUERZO' });

      // Verify service is offline (background sync should be skipped)
      const service = readingsService as unknown as { isOnline: boolean };
      expect(service.isOnline).toBe(false);

      // ACT: Add reading (background sync is skipped due to offline)
      const addedReading = await readingsService.addReading(reading);

      // ASSERT: Reading added to IndexedDB
      expect(addedReading).toBeDefined();
      expect(addedReading.id).toBeTruthy();
      expect(addedReading.value).toBe(150);
      expect(addedReading.synced).toBe(false);

      // Verify reading is in database
      const dbReading = await db.readings.get(addedReading.id);
      expect(dbReading).toBeDefined();
      expect(dbReading?.value).toBe(150);

      // Verify sync queue item exists - directly query after add
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      const queueItem = queueItems.find(item => item.readingId === addedReading.id);
      expect(queueItem).toBeDefined();
      expect(queueItem?.operation).toBe('create');
    });

    it('should calculate status correctly when adding reading', async () => {
      // Test critical-low
      const criticalLowReading = await readingsService.addReading(createMockReading({ value: 50 }));
      expect(criticalLowReading.status).toBe('critical-low');

      // Test low
      const lowReading = await readingsService.addReading(createMockReading({ value: 65 }));
      expect(lowReading.status).toBe('low');

      // Test normal
      const normalReading = await readingsService.addReading(createMockReading({ value: 120 }));
      expect(normalReading.status).toBe('normal');

      // Test high
      const highReading = await readingsService.addReading(createMockReading({ value: 200 }));
      expect(highReading.status).toBe('high');

      // Test critical-high
      const criticalHighReading = await readingsService.addReading(
        createMockReading({ value: 300 })
      );
      expect(criticalHighReading.status).toBe('critical-high');
    });
  });

  describe('Sync Queue Processing', () => {
    it('should sync pending reading to backend and mark as synced', async () => {
      // ARRANGE: Add reading (offline, so no background sync)
      const reading = await readingsService.addReading(
        createMockReading({ value: 140, mealContext: 'CENA' })
      );

      // Wait for background sync to complete (it should skip due to offline)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify reading is in queue
      const queueItems = await db.syncQueue.toArray();
      console.log(
        '[DEBUG] Queue items after add:',
        queueItems.length,
        queueItems.map(q => q.operation)
      );
      expect(queueItems.length).toBe(1);

      // Debug service state before going online
      const svc = readingsService as unknown as {
        isOnline: boolean;
        isMockBackend: boolean;
        apiGateway: unknown;
      };
      console.log('[DEBUG] Before going online:', {
        isOnline: svc.isOnline,
        isMockBackend: svc.isMockBackend,
        hasApiGateway: !!svc.apiGateway,
      });

      // Setup success response and go online
      const backendResponse: ApiResponse<any> = {
        success: true,
        data: {
          id: 999,
          user_id: 1,
          glucose_level: 140,
          reading_type: 'CENA',
          created_at: '06/12/2025 10:00:00',
        },
      };
      mockHttpClient.post.mockReturnValue(of(backendResponse.data));
      (readingsService as unknown as { isOnline: boolean }).isOnline = true;

      // Verify queue still has items before sync
      const queueBeforeSync = await db.syncQueue.toArray();
      console.log('[DEBUG] Queue before sync:', queueBeforeSync.length);

      // ACT: Call syncPendingReadings (not mocked, uses real implementation)
      console.log('[DEBUG] Calling syncPendingReadings...');
      const syncResult = await readingsService.syncPendingReadings();
      console.log('[DEBUG] Sync result:', syncResult);

      // Check queue after sync
      const queueAfterSync = await db.syncQueue.toArray();
      console.log('[DEBUG] Queue after sync:', queueAfterSync.length);

      // ASSERT: Sync succeeded
      expect(syncResult.success).toBe(1);
      expect(syncResult.failed).toBe(0);

      // Verify backend was called
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      const postCalls = mockHttpClient.post.mock.calls;
      expect(postCalls[0][0]).toContain('/glucose/create');

      // Verify reading marked as synced
      const syncedReading = await db.readings.get(reading.id);
      expect(syncedReading?.synced).toBe(true);
      expect(syncedReading?.backendId).toBe(999);

      // Verify sync queue is empty (already checked in queueAfterSync above)
      expect(queueAfterSync.length).toBe(0);
    });

    it('should handle sync failure and retry with exponential backoff', async () => {
      // ARRANGE: Add reading while offline (no background sync)
      const reading = await readingsService.addReading(createMockReading({ value: 180 }));

      // Item should be in queue with retryCount=0
      let queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].retryCount).toBe(0);

      // Go online with failing mock
      (readingsService as unknown as { isOnline: boolean }).isOnline = true;
      mockHttpClient.post.mockReturnValue(
        throwError(() => ({ status: 503, message: 'Server error' }))
      );

      // ACT: First sync attempt (should fail) - call executeSync directly
      const syncResult1 = await readingsService.syncPendingReadings();

      // ASSERT: Sync failed but item remains in queue with incremented retryCount
      expect(syncResult1.success).toBe(0);
      expect(syncResult1.failed).toBe(1);

      queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].retryCount).toBe(1); // 0 -> 1 after first failure

      // Verify reading still not synced
      const unsyncedReading = await db.readings.get(reading.id);
      expect(unsyncedReading?.synced).toBe(false);
    });

    it('should remove from queue after max retries', async () => {
      // ARRANGE: Add reading while offline
      await readingsService.addReading(createMockReading({ value: 160 }));

      // Go online with failing mock
      (readingsService as unknown as { isOnline: boolean }).isOnline = true;
      mockHttpClient.post.mockReturnValue(
        throwError(() => ({ status: 503, message: 'Server error' }))
      );

      // ACT: Exhaust all 3 retries (SYNC_RETRY_LIMIT = 3) - call executeSync directly
      await readingsService.syncPendingReadings(); // Retry 1 (retryCount 0 -> 1)
      await readingsService.syncPendingReadings(); // Retry 2 (retryCount 1 -> 2)
      await readingsService.syncPendingReadings(); // Retry 3 (retryCount 2 -> 3, removed)

      // ASSERT: Item removed from queue after max retries
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(0);
    });

    it('should sync multiple readings in batch', async () => {
      // ARRANGE: Add multiple readings while offline
      await readingsService.addReading(createMockReading({ value: 100, mealContext: 'DESAYUNO' }));
      await readingsService.addReading(createMockReading({ value: 140, mealContext: 'ALMUERZO' }));
      await readingsService.addReading(createMockReading({ value: 120, mealContext: 'CENA' }));

      // Verify all in queue
      const queueBefore = await db.syncQueue.toArray();
      expect(queueBefore.length).toBe(3);

      // Setup success response and go online
      let backendId = 100;
      mockHttpClient.post.mockImplementation(() =>
        of({
          id: backendId++,
          user_id: 1,
          glucose_level: 120,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );
      (readingsService as unknown as { isOnline: boolean }).isOnline = true;

      // ACT: Sync all readings by calling executeSync directly
      const syncResult = await readingsService.syncPendingReadings();

      // ASSERT: All readings synced
      expect(syncResult.success).toBe(3);
      expect(syncResult.failed).toBe(0);

      // Verify backend called 3 times
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);

      // Verify all readings marked as synced
      const allReadings = await db.readings.toArray();
      const allSynced = allReadings.every(r => r.synced);
      expect(allSynced).toBe(true);

      // Verify queue is empty
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(0);
    });
  });

  describe('Backend Fetch and Merge', () => {
    it('should fetch readings from backend and merge with local storage', async () => {
      // ARRANGE: Add local reading while offline
      const localReading = await readingsService.addReading(
        createMockReading({ value: 130, mealContext: 'DESAYUNO' })
      );

      // Go online for fetch
      (readingsService as unknown as { isOnline: boolean }).isOnline = true;

      // Setup backend response with different reading
      const backendReadings = {
        readings: [
          {
            id: 500,
            user_id: 1,
            glucose_level: 180,
            reading_type: 'ALMUERZO',
            created_at: '05/12/2025 14:00:00',
            notes: 'Backend reading',
          },
        ],
      };
      mockHttpClient.get.mockReturnValue(of(backendReadings));

      // ACT: Fetch from backend
      const fetchResult = await readingsService.fetchFromBackend();

      // ASSERT: New reading merged
      expect(fetchResult.fetched).toBe(1);
      expect(fetchResult.merged).toBe(1);

      // Verify both readings exist
      const allReadings = await db.readings.toArray();
      expect(allReadings.length).toBe(2);

      // Verify local reading unchanged
      const localStillExists = allReadings.find(r => r.id === localReading.id);
      expect(localStillExists).toBeDefined();

      // Verify backend reading added
      const backendExists = allReadings.find(r => r.backendId === 500);
      expect(backendExists).toBeDefined();
      expect(backendExists?.value).toBe(180);
      expect(backendExists?.notes).toBe('Backend reading');
    });

    it('should handle conflicts using server as source of truth', async () => {
      // ARRANGE: Add local reading with backend ID while offline
      const localReading = await readingsService.addReading(
        createMockReading({
          id: 'backend_500',
          value: 120,
          notes: 'Local notes',
          mealContext: 'DESAYUNO',
        })
      );

      await db.readings.update(localReading.id, { backendId: 500, synced: true });

      // Go online for fetch
      (readingsService as unknown as { isOnline: boolean }).isOnline = true;

      // Backend has different value (server wins)
      const backendReadings = {
        readings: [
          {
            id: 500,
            user_id: 1,
            glucose_level: 150, // Different value
            reading_type: 'ALMUERZO', // Different meal
            created_at: '06/12/2025 10:00:00',
            notes: 'Server notes', // Different notes
          },
        ],
      };
      mockHttpClient.get.mockReturnValue(of(backendReadings));

      // ACT: Fetch and merge
      await readingsService.fetchFromBackend();

      // ASSERT: Server value wins
      const updatedReading = await db.readings.get(localReading.id);
      expect(updatedReading?.value).toBe(150); // Server value
      expect(updatedReading?.notes).toBe('Server notes'); // Server notes
      expect(updatedReading?.mealContext).toBe('ALMUERZO'); // Server meal context
    });
  });

  describe('Update Reading Flow', () => {
    it('should update reading locally and queue for sync', async () => {
      // ARRANGE: Add and sync reading first
      const reading = await readingsService.addReading(createMockReading({ value: 100 }));
      await db.readings.update(reading.id, { synced: true, backendId: 999 });
      try {
        await db.transaction('rw', [db.syncQueue], async () => {
          await db.syncQueue.clear(); // Clear initial create operation
        });
      } catch (error) {
        if ((error as Error).name === 'PrematureCommitError') {
          await db.syncQueue.clear();
        } else {
          throw error;
        }
      }

      // ACT: Update reading
      await readingsService.updateReading(reading.id, {
        value: 110,
        notes: 'Updated notes',
      });

      // ASSERT: Reading updated
      const updatedReading = await db.readings.get(reading.id);
      expect(updatedReading?.value).toBe(110);
      expect(updatedReading?.notes).toBe('Updated notes');
      expect(updatedReading?.status).toBe('normal'); // Status recalculated

      // Verify sync queue has update operation (backend update not supported yet)
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].operation).toBe('update');
    });
  });

  describe('Delete Reading Flow', () => {
    it('should delete reading locally and queue for sync', async () => {
      // ARRANGE: Add and sync reading
      const reading = await readingsService.addReading(createMockReading({ value: 130 }));
      await db.readings.update(reading.id, { synced: true, backendId: 888 });
      try {
        await db.transaction('rw', [db.syncQueue], async () => {
          await db.syncQueue.clear();
        });
      } catch (error) {
        if ((error as Error).name === 'PrematureCommitError') {
          await db.syncQueue.clear();
        } else {
          throw error;
        }
      }

      // ACT: Delete reading
      await readingsService.deleteReading(reading.id);

      // ASSERT: Reading deleted from IndexedDB
      const deletedReading = await db.readings.get(reading.id);
      expect(deletedReading).toBeUndefined();

      // Verify delete operation queued (backend delete not supported)
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].operation).toBe('delete');
    });
  });

  describe('Offline Behavior', () => {
    it('should queue readings when offline and sync when online', async () => {
      // ARRANGE: Service starts offline from beforeEach (Network mock returns connected: false)
      // Add reading while offline (background sync will be skipped)
      const reading = await readingsService.addReading(createMockReading({ value: 160 }));

      // Try to sync while offline (should skip) - call executeSync directly
      const offlineSync = await readingsService.syncPendingReadings();

      // ASSERT: Sync skipped while offline
      expect(offlineSync.success).toBe(0);
      expect(offlineSync.failed).toBe(0);

      // Reading still in queue (no sync happened because offline)
      let queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);

      // Simulate going online
      (readingsService as unknown as { isOnline: boolean }).isOnline = true;

      // Setup backend response
      mockHttpClient.post.mockClear();
      mockHttpClient.post.mockReturnValue(
        of({
          id: 777,
          user_id: 1,
          glucose_level: 160,
          reading_type: 'OTRO',
          created_at: '06/12/2025 10:00:00',
        })
      );

      // Sync when online - call executeSync directly
      const onlineSync = await readingsService.syncPendingReadings();

      // ASSERT: Sync succeeded
      expect(onlineSync.success).toBe(1);

      // Queue cleared
      queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(0);

      // Reading marked as synced
      const syncedReading = await db.readings.get(reading.id);
      expect(syncedReading?.synced).toBe(true);
    });
  });

  describe('Full Sync Flow', () => {
    it('should complete full bidirectional sync (push + fetch)', async () => {
      // Check queue is empty before we start
      const queueStart = await db.syncQueue.toArray();
      expect(queueStart.length).toBe(0);

      // ARRANGE: Add local unsynced reading while offline
      const reading = await readingsService.addReading(
        createMockReading({ value: 140, mealContext: 'DESAYUNO' })
      );

      // Verify item is in queue immediately
      const queueAfterAdd = await db.syncQueue.toArray();
      expect(queueAfterAdd.length).toBe(1);

      // Setup success responses and go online
      mockHttpClient.post.mockReturnValue(
        of({
          id: 600,
          user_id: 1,
          glucose_level: 140,
          reading_type: 'DESAYUNO',
          created_at: '06/12/2025 10:00:00',
        })
      );

      mockHttpClient.get.mockReturnValue(
        of({
          readings: [
            {
              id: 700,
              user_id: 1,
              glucose_level: 180,
              reading_type: 'ALMUERZO',
              created_at: '06/12/2025 14:00:00',
            },
          ],
        })
      );

      (readingsService as unknown as { isOnline: boolean }).isOnline = true;

      // ACT: Full sync (syncPendingReadings is not mocked, so it uses the real method)
      const fullSync = await readingsService.performFullSync();

      // ASSERT: Both push and fetch succeeded
      expect(fullSync.pushed).toBe(1); // Local reading pushed
      expect(fullSync.fetched).toBe(1); // Backend reading fetched
      expect(fullSync.failed).toBe(0);

      // Verify 2 readings total (1 local synced + 1 from backend)
      const allReadings = await db.readings.toArray();
      expect(allReadings.length).toBe(2);

      // All readings synced
      const allSynced = allReadings.every(r => r.synced);
      expect(allSynced).toBe(true);
    });
  });
});

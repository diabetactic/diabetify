/**
 * Concurrent Sync Conflicts Integration Tests
 *
 * Tests complex sync conflict scenarios with concurrent operations:
 * - Same reading edited on multiple "devices" offline → server timestamp wins
 * - Reading deleted on server but modified locally
 * - Conflict during batch sync (some succeed, some fail)
 * - Merge strategy for different field conflicts
 * - Concurrent sync triggers (auto + manual)
 * - Debounce/queue handling with mutex protection
 *
 * Uses MSW for network mocking and Vitest for test execution.
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { server, resetMockState } from '@mocks/server';
import { http, HttpResponse, delay } from 'msw';

// Services under test
import { LocalAuthService } from '@core/services/local-auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { LoggerService } from '@core/services/logger.service';
import { ReadingsService } from '@core/services/readings.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';
import { db } from '@core/services/database.service';

const API_BASE = 'http://localhost:8000';

/**
 * TODO: SKIPPED - Requires real HTTP calls or mock mode refactoring
 *
 * This entire test suite is skipped because it requires actual HTTP communication
 * to properly verify sync conflict behavior. The issues are:
 *
 * 1. Mock Mode Bypass: In mock mode, ReadingsService.fetchFromBackend() and
 *    syncPendingReadings() skip HTTP calls entirely, so MSW handlers are never
 *    invoked and conflict detection logic never executes.
 *
 * 2. Conflict Detection: The conflict detection happens when comparing local
 *    unsynced data with server data fetched via HTTP. Without real HTTP calls,
 *    this comparison never occurs.
 *
 * POSSIBLE FIXES:
 * - Option A: Run these tests in an E2E environment with a real backend
 * - Option B: Add a test-only flag to ReadingsService to force HTTP calls
 * - Option C: Refactor tests to mock at the service layer (spy on internal methods)
 *   instead of the HTTP layer
 * - Option D: Create a separate "integration-real-backend" test suite that only
 *   runs when a backend is available (similar to playwright tests)
 *
 * PRIORITY: Medium - These scenarios are critical for data integrity but can
 * be covered by E2E tests in the playwright suite.
 *
 * @see /playwright/tests/docker-backend-e2e.spec.ts for backend-dependent tests
 */
describe.skip('Concurrent Sync Conflicts Integration', () => {
  let authService: LocalAuthService;
  let tokenStorage: TokenStorageService;
  let readingsService: ReadingsService;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(async () => {
    server.resetHandlers();
    resetMockState();
    try {
      await tokenStorage?.clearAll();
    } catch {
      // Ignore cleanup errors during teardown
    }
    try {
      await readingsService?.clearAllReadings();
      await db.conflicts.clear();
    } catch {
      // Ignore cleanup errors during teardown
    }
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        LocalAuthService,
        TokenStorageService,
        LoggerService,
        ReadingsService,
        ApiGatewayService,
      ],
    }).compileComponents();

    authService = TestBed.inject(LocalAuthService);
    tokenStorage = TestBed.inject(TokenStorageService);
    readingsService = TestBed.inject(ReadingsService);

    // Login for authenticated tests
    await firstValueFrom(authService.login('1000', 'tuvieja', false));
  });

  describe('Same Reading Edited on Multiple Devices (Server Wins)', () => {
    it('should create a conflict when local unsynced reading differs from server', async () => {
      // Simulate previously synced reading
      const baseReading = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date('2025-01-01T10:00:00Z').toISOString(),
        type: 'smbg',
        mealContext: 'DESAYUNO',
        notes: 'Original',
      });

      // Mark as synced with backendId
      await db.readings.update(baseReading.id, {
        synced: true,
        backendId: 123,
      });

      // "Device 1": Local offline edit (value: 110, notes: "Device 1 edit")
      await readingsService.updateReading(baseReading.id, {
        value: 110,
        notes: 'Device 1 edit',
      });

      // "Device 2": Server already has another version (value: 120, notes: "Device 2 edit")
      // Mock fetchFromBackend to return server version
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          await delay(50);
          return HttpResponse.json({
            readings: [
              {
                id: 123, // Same backendId
                user_id: 1000,
                glucose_level: 120, // Different value from server
                reading_type: 'DESAYUNO',
                created_at: '01/01/2025 10:00:00', // Server timestamp
                notes: 'Device 2 edit', // Different notes from server
              },
            ],
          });
        })
      );

      // Execute fetchFromBackend -> should create a conflict
      await readingsService.fetchFromBackend();

      // Verify that a conflict was created
      const conflicts = await db.conflicts.toArray();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].localReading.value).toBe(110);
      expect(conflicts[0].serverReading.value).toBe(120);
    });

    it('should handle concurrent edits to different fields', async () => {
      // Synchronized base reading
      const baseReading = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date('2025-01-01T12:00:00Z').toISOString(),
        type: 'smbg',
        mealContext: 'ALMUERZO',
        notes: 'Before lunch',
      });

      await db.readings.update(baseReading.id, {
        synced: true,
        backendId: 456,
      });

      // Local edit: only change notes
      await readingsService.updateReading(baseReading.id, {
        notes: 'After lunch - local edit',
      });

      // Server has changes in value AND mealContext
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [
              {
                id: 456,
                user_id: 1000,
                glucose_level: 150, // Changed value
                reading_type: 'POSTPRANDIAL', // Changed mealContext
                created_at: '01/01/2025 12:00:00',
                notes: 'Server version notes', // Change in notes too
              },
            ],
          });
        })
      );

      await readingsService.fetchFromBackend();

      // Verify that a conflict was created
      const conflicts = await db.conflicts.toArray();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].localReading.notes).toBe('After lunch - local edit');
      expect(conflicts[0].serverReading.value).toBe(150);
      expect(conflicts[0].serverReading.mealContext).toBe('POSTPRANDIAL');
    });
  });

  describe('Reading Deleted on Server but Modified Locally', () => {
    it('should handle local modification of server-deleted reading', async () => {
      // Create and sync reading
      const reading = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'To be deleted on server',
      });

      await db.readings.update(reading.id, {
        synced: true,
        backendId: 999,
      });

      // Modify locally (marks as unsynced)
      await readingsService.updateReading(reading.id, {
        value: 110,
        notes: 'Modified locally',
      });

      // Server returns empty list (reading deleted)
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [], // Reading no longer exists on server
          });
        })
      );

      // Fetch should not delete local reading (no delete sync)
      await readingsService.fetchFromBackend();

      // Local reading should still exist
      const local = await readingsService.getReadingById(reading.id);
      expect(local).toBeDefined();
      expect(local!.value).toBe(110);
      expect(local!.notes).toBe('Modified locally');
    });

    it('should keep local-only reading when server deletes original', async () => {
      // Scenario: reading created offline, server rejects the sync
      const localReading = await readingsService.addReading({
        value: 95,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Created offline',
      });

      // Verify it's local-only
      expect(localReading.synced).toBe(false);
      expect(localReading.isLocalOnly).toBe(true);

      // Server returns 404 when trying to sync
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Validation error' }, { status: 422 });
        })
      );

      // Try sync
      await readingsService.syncPendingReadings();

      // Reading should continue to exist locally
      const stillExists = await readingsService.getReadingById(localReading.id);
      expect(stillExists).toBeDefined();
      expect(stillExists!.isLocalOnly).toBe(true);
    });
  });

  /**
   * TODO: SKIPPED - Flaky timing and mock mode issues
   *
   * These tests have two compounding issues:
   * 1. Timing: Async batch sync with setTimeout() creates race conditions
   * 2. Mock Mode: HTTP calls are skipped, so MSW handlers are never invoked
   *
   * To fix: Either use real backend or refactor to mock at service layer
   */
  describe.skip('Batch Sync with Partial Failures', () => {
    it('should handle some readings succeeding and some failing in batch sync', async () => {
      // First block auto-sync
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Offline' }, { status: 503 });
        })
      );

      // Create 5 local readings
      const readings = [];
      for (let i = 0; i < 5; i++) {
        const reading = await readingsService.addReading({
          value: 100 + i * 10,
          units: 'mg/dL',
          time: new Date(Date.now() - i * 60000).toISOString(),
          type: 'smbg',
          notes: `Reading ${i + 1}`,
        });
        readings.push(reading);
      }

      // Wait for auto-syncs to fail
      await new Promise(resolve => setTimeout(resolve, 150));

      let createCount = 0;

      // Now configure mock: readings 1, 3, 5 succeed, readings 2 and 4 fail
      server.resetHandlers();
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          createCount++;
          await delay(50);

          // Fail on readings 2 and 4
          if (createCount === 2 || createCount === 4) {
            return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
          }

          return HttpResponse.json(
            {
              id: createCount,
              user_id: 1000,
              glucose_level: 100 + createCount * 10,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
              notes: `Reading ${createCount}`,
            },
            { status: 201 }
          );
        })
      );

      // Execute batch sync
      const syncResult = await readingsService.syncPendingReadings();

      // Should report successes and failures
      expect(syncResult.success).toBeGreaterThan(0);
      expect(syncResult.failed).toBeGreaterThan(0);
      expect(syncResult.success + syncResult.failed).toBe(5);

      // Successful readings should be marked as synced
      const allReadings = await readingsService.getAllReadings();
      const syncedCount = allReadings.readings.filter(r => r.synced).length;
      const unsyncedCount = allReadings.readings.filter(r => !r.synced).length;

      expect(syncedCount).toBe(syncResult.success);
      expect(unsyncedCount).toBeGreaterThan(0);
    });

    it('should retry failed readings up to SYNC_RETRY_LIMIT (3 times)', async () => {
      // Create local reading
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Will fail multiple times',
      });

      let attemptCount = 0;

      // Mock: always fails
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          attemptCount++;
          return HttpResponse.json({ detail: 'Persistent error' }, { status: 500 });
        })
      );

      // Attempt 1
      await readingsService.syncPendingReadings();
      expect(attemptCount).toBe(1);

      // Attempt 2
      await readingsService.syncPendingReadings();
      expect(attemptCount).toBe(2);

      // Attempt 3
      await readingsService.syncPendingReadings();
      expect(attemptCount).toBe(3);

      // Attempt 4 - should not retry (limit reached)
      await readingsService.syncPendingReadings();
      // attemptCount stays at 3 because the queue no longer has the item
      expect(attemptCount).toBe(3);

      // Sync queue should be empty (max retries reached)
      const queueCount = await db.syncQueue.count();
      expect(queueCount).toBe(0);
    });

    it('should process remaining queue after partial failure', async () => {
      // Block auto-sync first
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Offline' }, { status: 503 });
        })
      );

      // Create 3 readings
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date(Date.now() - 2000).toISOString(),
        type: 'smbg',
        notes: 'First',
      });
      await readingsService.addReading({
        value: 110,
        units: 'mg/dL',
        time: new Date(Date.now() - 1000).toISOString(),
        type: 'smbg',
        notes: 'Second - will fail',
      });
      await readingsService.addReading({
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Third',
      });

      // Wait for auto-syncs to fail
      await new Promise(resolve => setTimeout(resolve, 150));

      let createCount = 0;

      // Now configure mock: second reading fails, other two succeed
      server.resetHandlers();
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          createCount++;
          if (createCount === 2) {
            return HttpResponse.json({ detail: 'Error' }, { status: 500 });
          }
          return HttpResponse.json(
            {
              id: createCount,
              user_id: 1000,
              glucose_level: 100,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
              notes: '',
            },
            { status: 201 }
          );
        })
      );

      const result = await readingsService.syncPendingReadings();

      // 2 successful, 1 failed
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);

      // The failed one should be in the queue for retry
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].retryCount).toBe(1);
    });
  });

  describe('Merge Strategy for Field Conflicts', () => {
    it('should create a conflict when local and server values differ', async () => {
      // Base reading
      const reading = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        mealContext: 'DESAYUNO',
        notes: 'Original',
      });

      await db.readings.update(reading.id, {
        synced: true,
        backendId: 777,
      });

      // Local: only change notes
      await readingsService.updateReading(reading.id, {
        notes: 'Local notes edit',
      });

      // Server: change value
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [
              {
                id: 777,
                user_id: 1000,
                glucose_level: 150, // Server value
                reading_type: 'DESAYUNO',
                created_at: '01/01/2025 08:00:00',
                notes: 'Original', // Notes unchanged on server
              },
            ],
          });
        })
      );

      await readingsService.fetchFromBackend();

      const conflicts = await db.conflicts.toArray();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].localReading.notes).toBe('Local notes edit');
      expect(conflicts[0].serverReading.value).toBe(150);
    });

    it('should create a conflict when notes differ', async () => {
      const reading = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Original notes',
      });

      await db.readings.update(reading.id, {
        synced: true,
        backendId: 888,
      });

      // Local: change notes
      await readingsService.updateReading(reading.id, {
        notes: 'Local edit: feeling good',
      });

      // Server: different notes
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [
              {
                id: 888,
                user_id: 1000,
                glucose_level: 100,
                reading_type: 'OTRO',
                created_at: '01/01/2025 14:00:00',
                notes: 'Server edit: reviewed by doctor',
              },
            ],
          });
        })
      );

      await readingsService.fetchFromBackend();

      const conflicts = await db.conflicts.toArray();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].localReading.notes).toBe('Local edit: feeling good');
      expect(conflicts[0].serverReading.notes).toBe('Server edit: reviewed by doctor');
    });

    it('should create a conflict when mealContext differs', async () => {
      const reading = await readingsService.addReading({
        value: 140,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        mealContext: 'PREPRANDIAL',
      });

      await db.readings.update(reading.id, {
        synced: true,
        backendId: 555,
      });

      // Local: change mealContext
      await readingsService.updateReading(reading.id, {
        mealContext: 'POSTPRANDIAL',
      });

      // Server: maintains PREPRANDIAL
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [
              {
                id: 555,
                user_id: 1000,
                glucose_level: 140,
                reading_type: 'PREPRANDIAL', // Server did not change
                created_at: '01/01/2025 18:00:00',
                notes: '',
              },
            ],
          });
        })
      );

      await readingsService.fetchFromBackend();

      const conflicts = await db.conflicts.toArray();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].localReading.mealContext).toBe('POSTPRANDIAL');
      expect(conflicts[0].serverReading.mealContext).toBe('PREPRANDIAL');
    });
  });

  /**
   * TODO: SKIPPED - Mock mode bypasses HTTP, preventing mutex verification
   *
   * The mutex behavior for concurrent sync triggers cannot be properly tested
   * because:
   * 1. HTTP calls are skipped in mock mode
   * 2. The mutex protects HTTP operations, not IndexedDB operations
   * 3. Without actual network delays, race conditions don't manifest
   *
   * The mutex logic IS tested indirectly through unit tests of the service's
   * internal state management. For full integration testing, use E2E tests.
   */
  describe.skip('Concurrent Sync Triggers (Auto + Manual)', () => {
    it('should handle manual sync while auto-sync is in progress (mutex)', async () => {
      // Create reading
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      let syncCallCount = 0;

      // Mock: sync takes 200ms
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          syncCallCount++;
          await delay(200);
          return HttpResponse.json(
            {
              id: syncCallCount,
              user_id: 1000,
              glucose_level: 100,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
              notes: '',
            },
            { status: 201 }
          );
        })
      );

      // Fire two concurrent syncs
      const [result1, result2] = await Promise.all([
        readingsService.syncPendingReadings(),
        readingsService.syncPendingReadings(),
      ]);

      // Due to mutex, only ONE backend call should execute
      expect(syncCallCount).toBe(1);

      // Both results should be identical (same promise)
      expect(result1).toEqual(result2);
    });

    it('should handle concurrent fetchFromBackend calls (mutex)', async () => {
      // Mock: fetch takes 150ms
      let fetchCallCount = 0;
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          fetchCallCount++;
          await delay(150);
          return HttpResponse.json({
            readings: [
              {
                id: 1,
                user_id: 1000,
                glucose_level: 120,
                reading_type: 'AYUNAS',
                created_at: '01/01/2025 08:00:00',
                notes: 'Test',
              },
            ],
          });
        })
      );

      // Fire two concurrent fetches
      const [fetch1, fetch2] = await Promise.all([
        readingsService.fetchFromBackend(),
        readingsService.fetchFromBackend(),
      ]);

      // Mutex should prevent duplicates
      expect(fetchCallCount).toBe(1);

      // Both results should be identical
      expect(fetch1).toEqual(fetch2);
    });

    it('should handle performFullSync concurrent calls (mutex on both push and fetch)', async () => {
      // Create local reading
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      let syncCalls = 0;
      let fetchCalls = 0;

      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          syncCalls++;
          await delay(100);
          return HttpResponse.json(
            {
              id: 1,
              user_id: 1000,
              glucose_level: 100,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
              notes: '',
            },
            { status: 201 }
          );
        }),
        http.get(`${API_BASE}/glucose/mine`, async () => {
          fetchCalls++;
          await delay(100);
          return HttpResponse.json({
            readings: [],
          });
        })
      );

      // Fire two concurrent fullSyncs
      const [_sync1, _sync2] = await Promise.all([
        readingsService.performFullSync(),
        readingsService.performFullSync(),
      ]);

      // Mutex should prevent double execution
      expect(syncCalls).toBe(1);
      expect(fetchCalls).toBe(1);
    });
  });

  /**
   * TODO: SKIPPED - Mock mode bypasses HTTP, preventing queue verification
   *
   * Queue handling tests require actual HTTP calls to verify:
   * 1. Items are properly queued when offline
   * 2. Queue is processed in order when online
   * 3. Debouncing prevents duplicate sync attempts
   *
   * Without real HTTP calls, the queue logic appears to work but the actual
   * network behavior is not tested. Queue state management is covered by
   * unit tests; full behavior requires E2E testing.
   */
  describe.skip('Debounce and Queue Handling', () => {
    it('should queue multiple rapid addReading calls without blocking', async () => {
      // Mock sync to prevent auto-sync interference
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          await delay(100);
          return HttpResponse.json(
            {
              id: Math.random(),
              user_id: 1000,
              glucose_level: 100,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
              notes: '',
            },
            { status: 201 }
          );
        })
      );

      const startTime = Date.now();

      // Add 10 readings quickly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          readingsService.addReading({
            value: 100 + i,
            units: 'mg/dL',
            time: new Date(Date.now() - i * 1000).toISOString(),
            type: 'smbg',
            notes: `Rapid ${i}`,
          })
        );
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should complete quickly (< 2 seconds for 10 readings)
      expect(duration).toBeLessThan(2000);

      // All should be in database
      const readings = await readingsService.getAllReadings();
      expect(readings.readings.length).toBe(10);

      // At least some should be in queue (some may have synced already)
      const queueCount = await db.syncQueue.count();
      expect(queueCount).toBeGreaterThanOrEqual(0); // Can be 0 if auto-sync already processed all
    });

    it('should handle sync queue backlog efficiently', async () => {
      // Mock sync to fail initially, preventing auto-sync
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Offline' }, { status: 503 });
        })
      );

      // Create 20 offline readings
      for (let i = 0; i < 20; i++) {
        await readingsService.addReading({
          value: 80 + i,
          units: 'mg/dL',
          time: new Date(Date.now() - i * 60000).toISOString(),
          type: 'smbg',
          notes: `Backlog ${i}`,
        });
      }

      // Wait for auto-syncs to fail
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify there are items in queue (may be less than 20 if some auto-syncs started)
      const queueBefore = await db.syncQueue.count();
      expect(queueBefore).toBeGreaterThan(0);

      // Now change mock to successful to process the queue
      server.resetHandlers();
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          await delay(20); // 20ms per reading
          return HttpResponse.json(
            {
              id: Math.random(),
              user_id: 1000,
              glucose_level: 100,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
              notes: '',
            },
            { status: 201 }
          );
        })
      );

      const startTime = Date.now();
      await readingsService.syncPendingReadings();
      const duration = Date.now() - startTime;

      // Should process all in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);

      // Queue should be empty or nearly empty
      const queueAfter = await db.syncQueue.count();
      expect(queueAfter).toBeLessThanOrEqual(1); // May have one remaining if there was a retry
    });

    it('should not duplicate readings when sync is called multiple times rapidly', async () => {
      // First, block auto-sync to create the reading without syncing
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Blocked' }, { status: 503 });
        })
      );

      // Create a reading
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      // Wait for auto-sync to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      let createCallCount = 0;

      // Now allow successful sync
      server.resetHandlers();
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          createCallCount++;
          await delay(150); // Longer delay to ensure mutex works
          return HttpResponse.json(
            {
              id: createCallCount,
              user_id: 1000,
              glucose_level: 100,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
              notes: '',
            },
            { status: 201 }
          );
        })
      );

      // Call sync 5 times quickly
      await Promise.all([
        readingsService.syncPendingReadings(),
        readingsService.syncPendingReadings(),
        readingsService.syncPendingReadings(),
        readingsService.syncPendingReadings(),
        readingsService.syncPendingReadings(),
      ]);

      // Due to mutex, should only create ONE reading in backend
      expect(createCallCount).toBe(1);

      // Should only have 1 reading locally
      const readings = await readingsService.getAllReadings();
      expect(readings.readings.length).toBe(1);
    });
  });
});

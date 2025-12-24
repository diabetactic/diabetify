/**
 * Sync Conflicts Integration Tests (MSW)
 *
 * Tests offline queue processing, conflict resolution, and data consistency.
 * Critical for ensuring reliable data sync in mobile environments.
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { server, resetMockState } from '../../../mocks/server';
import { http, HttpResponse, delay } from 'msw';

// Services under test
import { LocalAuthService } from '@core/services/local-auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { LoggerService } from '@core/services/logger.service';
import { ReadingsService } from '@core/services/readings.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';

const API_BASE = 'http://localhost:8000';

describe('Sync Conflicts Integration (MSW)', () => {
  let authService: LocalAuthService;
  let tokenStorage: TokenStorageService;
  let readingsService: ReadingsService;
  let httpClient: HttpClient;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(async () => {
    server.resetHandlers();
    resetMockState();
    try {
      await tokenStorage?.clearAll();
    } catch (_error) {
      // Ignore cleanup errors during teardown
    }
    try {
      await readingsService?.clearAllReadings();
    } catch (_error) {
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
    httpClient = TestBed.inject(HttpClient);

    // Login for authenticated tests
    await firstValueFrom(authService.login('1000', 'tuvieja', false));
  });

  describe('Network Transition Handling', () => {
    it('should handle transition from offline to online', async () => {
      // Start online - create reading locally
      const reading1 = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });
      expect(reading1).toBeDefined();

      // Go offline - sync fails
      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          return HttpResponse.error();
        })
      );

      // Sync should handle failure gracefully
      const syncResult1 = await readingsService.syncPendingReadings();
      expect(syncResult1).toBeDefined();

      // Go back online
      server.resetHandlers();

      // Sync should work again
      const syncResult2 = await readingsService.syncPendingReadings();
      expect(syncResult2).toBeDefined();
    });

    it('should handle intermittent network failures', async () => {
      let callCount = 0;

      // Fail first request, succeed second
      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.error();
          }
          return HttpResponse.json(
            {
              id: `reading-${callCount}`,
              glucose_level: 100,
              reading_type: 'OTRO',
              notes: '',
              timestamp: new Date().toISOString(),
              user_id: '1000',
            },
            { status: 201 }
          );
        })
      );

      // Create readings
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      // First sync attempt (may fail partially)
      await readingsService.syncPendingReadings();

      // Second sync attempt should work
      await readingsService.syncPendingReadings();

      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Consistency During Sync', () => {
    it('should handle concurrent create operations', async () => {
      // Simulate two concurrent creates
      const [result1, result2] = await Promise.all([
        readingsService.addReading({
          value: 120,
          units: 'mg/dL',
          time: new Date().toISOString(),
          type: 'smbg',
          mealContext: 'AYUNAS',
          notes: 'Test 1',
        }),
        readingsService.addReading({
          value: 130,
          units: 'mg/dL',
          time: new Date(Date.now() + 1000).toISOString(),
          type: 'smbg',
          mealContext: 'PREPRANDIAL',
          notes: 'Test 2',
        }),
      ]);

      // Both should succeed with different IDs
      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });

    it('should maintain order when processing sync queue', async () => {
      // Create readings in sequence
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
        notes: 'Second',
      });
      await readingsService.addReading({
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Third',
      });

      // Fetch all - should be in order (newest first)
      const readings = await readingsService.getAllReadings();

      expect(readings.readings.length).toBe(3);
      // Should be sorted by time descending
      expect(readings.readings[0].notes).toBe('Third');
      expect(readings.readings[1].notes).toBe('Second');
      expect(readings.readings[2].notes).toBe('First');
    });

    it('should handle partial sync failures', async () => {
      let createCount = 0;

      // First create succeeds, second fails, third succeeds
      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          createCount++;
          if (createCount === 2) {
            return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
          }
          return HttpResponse.json(
            {
              id: `reading-${createCount}`,
              glucose_level: 100 + createCount,
              reading_type: 'OTRO',
              notes: '',
              timestamp: new Date().toISOString(),
              user_id: '1000',
            },
            { status: 201 }
          );
        })
      );

      // Create three readings locally
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date(Date.now() - 2000).toISOString(),
        type: 'smbg',
        notes: 'Test 1',
      });
      await readingsService.addReading({
        value: 110,
        units: 'mg/dL',
        time: new Date(Date.now() - 1000).toISOString(),
        type: 'smbg',
        notes: 'Test 2',
      });
      await readingsService.addReading({
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Test 3',
      });

      // Sync - some should succeed, some fail
      const syncResult = await readingsService.syncPendingReadings();
      expect(syncResult).toBeDefined();

      // All three should still be locally available
      const readings = await readingsService.getAllReadings();
      expect(readings.readings.length).toBe(3);
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle multiple reading creates without conflicts', async () => {
      // Create first reading
      const reading1 = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date(Date.now() - 1000).toISOString(),
        type: 'smbg',
        notes: 'First reading',
      });

      // Create second reading
      const reading2 = await readingsService.addReading({
        value: 110,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Second reading',
      });

      expect(reading1.id).toBeDefined();
      expect(reading2.id).toBeDefined();

      // Both should exist
      const readings = await readingsService.getAllReadings();
      expect(readings.readings.length).toBe(2);
    });

    it('should handle update conflicts gracefully', async () => {
      // Create a reading first
      const created = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Original',
      });

      // Mock conflict on update (409)
      server.use(
        http.put(`${API_BASE}/glucose/:id`, () => {
          return HttpResponse.json({ detail: 'Conflict - resource was modified' }, { status: 409 });
        })
      );

      // Try to update via HTTP - should get conflict
      try {
        await firstValueFrom(
          httpClient.put(`${API_BASE}/glucose/${created.id}`, {
            glucose_level: 200,
          })
        );
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        const httpError = error as HttpErrorResponse;
        expect(httpError.status).toBe(409);
      }
    });

    it('should handle deletion of non-existent item', async () => {
      // Try to delete non-existent - should get error
      try {
        await readingsService.deleteReading('non-existent-id');
        expect.fail('Should have thrown');
      } catch (error) {
        // Expected - reading doesn't exist
        expect(error).toBeDefined();
      }
    });
  });

  describe('Stale Data Detection', () => {
    it('should fetch fresh data after modification', async () => {
      // Create initial reading
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Initial',
      });

      // Fetch readings
      const readings1 = await readingsService.getAllReadings();
      expect(readings1.readings.length).toBe(1);

      // Create another
      await readingsService.addReading({
        value: 110,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'New',
      });

      // Re-fetch - should have both
      const readings2 = await readingsService.getAllReadings();
      expect(readings2.readings.length).toBe(2);
    });

    it('should reflect deletions in subsequent fetches', async () => {
      // Create two readings
      const reading1 = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date(Date.now() - 1000).toISOString(),
        type: 'smbg',
        notes: 'First',
      });
      await readingsService.addReading({
        value: 110,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Second',
      });

      // Verify both exist
      const readings1 = await readingsService.getAllReadings();
      expect(readings1.readings.length).toBe(2);

      // Delete first
      await readingsService.deleteReading(reading1.id);

      // Re-fetch - should have only one
      const readings2 = await readingsService.getAllReadings();
      expect(readings2.readings.length).toBe(1);
    });
  });

  describe('Slow Network Handling', () => {
    it('should handle slow sync responses without timeout issues', async () => {
      // Create a reading locally
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      // Simulate slow network on sync
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          await delay(500); // 500ms delay
          return HttpResponse.json(
            {
              id: 'slow-reading',
              glucose_level: 100,
              reading_type: 'OTRO',
              notes: '',
              timestamp: new Date().toISOString(),
              user_id: '1000',
            },
            { status: 201 }
          );
        })
      );

      const startTime = Date.now();
      await readingsService.syncPendingReadings();
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(400); // Allow some variance
    });

    it('should handle variable response times', async () => {
      // Create multiple readings
      for (let i = 0; i < 3; i++) {
        await readingsService.addReading({
          value: 100 + i * 10,
          units: 'mg/dL',
          time: new Date(Date.now() - i * 1000).toISOString(),
          type: 'smbg',
        });
      }

      let callCount = 0;
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          callCount++;
          const delayTime = callCount * 50; // Increasing delay
          await delay(delayTime);
          return HttpResponse.json(
            {
              id: `reading-${callCount}`,
              glucose_level: 100 + callCount,
              reading_type: 'OTRO',
              notes: '',
              timestamp: new Date().toISOString(),
              user_id: '1000',
            },
            { status: 201 }
          );
        })
      );

      // Sync all - should complete
      const result = await readingsService.syncPendingReadings();
      expect(result).toBeDefined();
    });
  });

  describe('Retry Behavior', () => {
    it('should handle sync failure gracefully', async () => {
      // Create a reading
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      let callCount = 0;
      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          callCount++;
          return HttpResponse.json({ detail: 'Invalid data' }, { status: 400 });
        })
      );

      // Sync should handle failure gracefully
      const result = await readingsService.syncPendingReadings();
      expect(result).toBeDefined();

      // Should have been called at least once
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle server returning error details', async () => {
      // Create a reading
      await readingsService.addReading({
        value: 1000, // Out of range
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          return HttpResponse.json(
            { detail: 'Glucose level must be between 20 and 600' },
            { status: 422 }
          );
        })
      );

      // Sync should handle failure gracefully
      const result = await readingsService.syncPendingReadings();
      expect(result).toBeDefined();
    });
  });

  describe('Data Integrity Checks', () => {
    it('should preserve reading values accurately', async () => {
      const testValue = 142;
      const testMealContext = 'POSTPRANDIAL';
      const testNotes = 'After lunch - pizza';

      const created = await readingsService.addReading({
        value: testValue,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        mealContext: testMealContext,
        notes: testNotes,
      });

      expect(created.value).toBe(testValue);
      expect(created.mealContext).toBe(testMealContext);
      expect(created.notes).toBe(testNotes);

      // Fetch and verify
      const readings = await readingsService.getAllReadings(1, 0);
      const fetched = readings.readings[0];

      expect(fetched.value).toBe(testValue);
      expect(fetched.mealContext).toBe(testMealContext);
      expect(fetched.notes).toBe(testNotes);
    });

    it('should assign local ID to new readings', async () => {
      const created = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      expect(created.id).toBeDefined();
      expect(typeof created.id).toBe('string');
      expect(created.id.length).toBeGreaterThan(0);
    });

    it('should generate valid timestamps', async () => {
      const before = new Date().toISOString();

      const created = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Timestamp test',
      });

      const after = new Date().toISOString();

      // Time should be within the test window
      expect(created.time).toBeDefined();
      const ts = new Date(created.time);
      expect(ts.toISOString() >= before).toBe(true);
      expect(ts.toISOString() <= after).toBe(true);
    });
  });
});

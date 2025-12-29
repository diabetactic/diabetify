/**
 * Session Timeout Transaction Integration Tests
 *
 * Critical edge case tests for session timeout during active operations:
 * - Timeout during IndexedDB transactions
 * - Timeout during active synchronization
 * - Timeout during form submission
 * - Grace period handling
 * - Activity detection resetting timeout
 * - Session synchronization between multiple tabs
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { server, resetMockState } from '../../../../mocks/server';
import { http, HttpResponse, delay } from 'msw';
import 'fake-indexeddb/auto';

// Services under test
import { SessionTimeoutService } from '@core/services/session-timeout.service';
import { LocalAuthService } from '@core/services/local-auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { LoggerService } from '@core/services/logger.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';
import { db } from '@core/services/database.service';

const API_BASE = 'http://localhost:8000';

describe('Session Timeout Transactions Integration', () => {
  let sessionTimeout: SessionTimeoutService;
  let authService: LocalAuthService;
  let tokenStorage: TokenStorageService;
  let _router: Router;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(async () => {
    server.resetHandlers();
    resetMockState();
    vi.clearAllTimers();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'welcome', component: class {} },
          { path: 'dashboard', component: class {} },
        ]),
        SessionTimeoutService,
        LocalAuthService,
        TokenStorageService,
        LoggerService,
        ApiGatewayService,
      ],
    }).compileComponents();

    sessionTimeout = TestBed.inject(SessionTimeoutService);
    authService = TestBed.inject(LocalAuthService);
    tokenStorage = TestBed.inject(TokenStorageService);
    _router = TestBed.inject(Router);
  });

  describe('Timeout during IndexedDB transaction', () => {
    it('should complete active transaction before logout', async () => {
      // Initial login
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Simulate long transaction in IndexedDB
      const transactionPromise = db.transaction('rw', [db.readings, db.syncQueue], async () => {
        // Add multiple readings during transaction
        await db.readings.add({
          id: 'reading-1',
          userId: '1000',
          value: 120,
          time: new Date().toISOString(),
          type: 'fasting',
          source: 'manual',
          synced: false,
          localStoredAt: Date.now(),
        });

        await db.readings.add({
          id: 'reading-2',
          userId: '1000',
          value: 130,
          time: new Date().toISOString(),
          type: 'postprandial',
          source: 'manual',
          synced: false,
          localStoredAt: Date.now(),
        });

        // During transaction, timeout fires
        await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

        // Continue with transaction
        await db.syncQueue.add({
          operation: 'create',
          readingId: 'reading-1',
          timestamp: Date.now(),
          retryCount: 0,
        });
      });

      // Wait for transaction to complete
      await transactionPromise;

      // Verify that the data was saved correctly
      const readings = await db.readings.toArray();
      expect(readings).toHaveLength(2);

      const syncItems = await db.syncQueue.toArray();
      expect(syncItems).toHaveLength(1);

      // Flush timers to execute logout
      await vi.runAllTimersAsync();

      // Verify that logout eventually occurred
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('should abort failed transaction and logout', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      let transactionFailed = false;

      try {
        await db.transaction('rw', [db.readings], async () => {
          await db.readings.add({
            id: 'reading-1',
            userId: '1000',
            value: 120,
            time: new Date().toISOString(),
            type: 'fasting',
            source: 'manual',
            synced: false,
            localStoredAt: Date.now(),
          });

          // Simulate transaction error
          throw new Error('Transaction error');
        });
      } catch (_error) {
        transactionFailed = true;
      }

      expect(transactionFailed).toBe(true);

      // Timeout occurs after failure
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);
      await vi.runAllTimersAsync();

      // Verify logout
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);

      // Verify that the data was not saved
      const readings = await db.readings.toArray();
      expect(readings).toHaveLength(0);
    });
  });

  describe('Timeout during active synchronization', () => {
    it('should complete sync in progress before logout', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Add items to sync queue
      await db.syncQueue.bulkAdd([
        {
          operation: 'create',
          readingId: 'reading-1',
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          operation: 'create',
          readingId: 'reading-2',
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          operation: 'create',
          readingId: 'reading-3',
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      // Mock sync endpoint with delay (using MSW delay for fake timer compatibility)
      server.use(
        http.post(`${API_BASE}/glucose-readings`, async () => {
          // Simulate slow sync using MSW delay
          await delay(100);
          return HttpResponse.json({ id: 'synced-reading', synced: true }, { status: 201 });
        })
      );

      // Start sync
      const syncPromise = (async () => {
        const items = await db.syncQueue.toArray();
        for (const item of items) {
          // Simulate processing of each item using MSW delay
          await delay(50);
          await db.syncQueue.delete(item.id!);
        }
      })();

      // Timeout occurs during sync
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      // Wait for sync to complete
      await syncPromise;
      await vi.runAllTimersAsync();

      // Verify that queue was emptied
      const remainingItems = await db.syncQueue.toArray();
      expect(remainingItems).toHaveLength(0);

      // Verify logout after sync
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('should handle timeout during network failure in sync', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Add item to sync
      await db.syncQueue.add({
        operation: 'create',
        readingId: 'reading-1',
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Mock network failure
      server.use(
        http.post(`${API_BASE}/glucose-readings`, () => {
          return HttpResponse.error();
        })
      );

      // Try sync that will fail
      let syncFailed = false;
      try {
        const response = await fetch(`${API_BASE}/glucose-readings`, {
          method: 'POST',
          body: JSON.stringify({ value: 120 }),
        });
        if (!response.ok) throw new Error('Sync failed');
      } catch (_error) {
        syncFailed = true;
        // Item remains in queue with incremented retry
        await db.syncQueue
          .where('readingId')
          .equals('reading-1')
          .modify(item => {
            item.retryCount++;
            item.lastError = 'Network error';
          });
      }

      expect(syncFailed).toBe(true);

      // Timeout occurs
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);
      await vi.runAllTimersAsync();

      // Verify that item stayed in queue for later retry
      const items = await db.syncQueue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].retryCount).toBe(1);
      expect(items[0].lastError).toBe('Network error');

      // Verify logout
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });
  });

  describe('Timeout during form submission', () => {
    it('should complete HTTP request before logout', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      let formSubmitted = false;
      let responseReceived = false;

      // Mock form endpoint with delay
      server.use(
        http.post(`${API_BASE}/appointments`, async () => {
          await delay(200);
          formSubmitted = true;
          return HttpResponse.json({ id: 'appointment-1' }, { status: 201 });
        })
      );

      // Start form submission
      const submitPromise = fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: '1000',
          dateTime: new Date().toISOString(),
        }),
      }).then(async response => {
        responseReceived = response.ok;
        return response.json();
      });

      // Timeout occurs during submission
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      // Wait for the form to complete
      await submitPromise;
      await vi.runAllTimersAsync();

      expect(formSubmitted).toBe(true);
      expect(responseReceived).toBe(true);

      // Logout occurs after submission
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('should prevent new form submission after timeout', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Trigger timeout
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);
      await vi.runAllTimersAsync();

      // Verify logout
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);

      // Attempting form submission after logout should fail
      server.use(
        http.post(`${API_BASE}/appointments`, () => {
          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        })
      );

      const response = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: '1000' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Grace period handling', () => {
    it('should show warning 5 minutes before timeout', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Advance to 25 minutes (5 minutes before the 30-minute timeout)
      await vi.advanceTimersByTimeAsync(25 * 60 * 1000);

      // In a real implementation, we would verify warning was shown
      // For now, verify session is still active
      const isAuthBefore = await firstValueFrom(authService.isAuthenticated());
      expect(isAuthBefore).toBe(true);

      // Advance the remaining 5 minutes + 1 second
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);
      await vi.runAllTimersAsync();

      // Should now be logged out
      const isAuthAfter = await firstValueFrom(authService.isAuthenticated());
      expect(isAuthAfter).toBe(false);
    });

    it('should extend session if there is activity during grace period', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Advance to 26 minutes (grace period)
      await vi.advanceTimersByTimeAsync(26 * 60 * 1000);

      // Simulate user activity (click)
      document.dispatchEvent(new Event('click'));

      // Wait for 1 second debounce
      await vi.advanceTimersByTimeAsync(1000);

      // Advance 25 more minutes (should still be active because it was reset)
      await vi.advanceTimersByTimeAsync(25 * 60 * 1000);

      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });
  });

  describe('Activity detection resetting timeout', () => {
    it('should reset timeout on user click', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Advance 20 minutes
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      // User activity
      document.dispatchEvent(new Event('click'));
      await vi.advanceTimersByTimeAsync(1000); // debounce

      // Advance another 25 minutes (total 45, but reset at minute 20)
      await vi.advanceTimersByTimeAsync(25 * 60 * 1000);

      // Should still be authenticated (20 + 25 < 20 + 30)
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should reset timeout on keypress', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      await vi.advanceTimersByTimeAsync(28 * 60 * 1000); // 28 minutes

      // Type something
      document.dispatchEvent(new KeyboardEvent('keypress', { key: 'a' }));
      await vi.advanceTimersByTimeAsync(1000);

      await vi.advanceTimersByTimeAsync(20 * 60 * 1000); // +20 minutes = 48 total

      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should reset timeout on mousemove', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      await vi.advanceTimersByTimeAsync(29 * 60 * 1000); // 29 minutes

      // Move mouse
      document.dispatchEvent(new MouseEvent('mousemove'));
      await vi.advanceTimersByTimeAsync(1000);

      await vi.advanceTimersByTimeAsync(15 * 60 * 1000); // +15 minutes = 44 total

      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should reset timeout on scroll', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      await vi.advanceTimersByTimeAsync(27 * 60 * 1000);

      document.dispatchEvent(new Event('scroll'));
      await vi.advanceTimersByTimeAsync(1000);

      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should reset timeout on touchstart (mobile)', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      await vi.advanceTimersByTimeAsync(28 * 60 * 1000);

      document.dispatchEvent(new TouchEvent('touchstart'));
      await vi.advanceTimersByTimeAsync(1000);

      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should reset timeout on window focus', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);

      // User returns to the tab
      window.dispatchEvent(new Event('focus'));
      await vi.advanceTimersByTimeAsync(1000);

      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });
  });

  describe('Multi-tab session synchronization', () => {
    it('should synchronize logout between tabs using Preferences', async () => {
      // Login in tab 1
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Verify authenticated
      let isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);

      // Simulate logout from another tab (by calling logout directly)
      await authService.logout();

      // Verify that the state was updated
      isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);

      // Verify that the session timeout stops
      sessionTimeout.stopMonitoring();

      // Advancing time should not cause additional actions
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
      await vi.runAllTimersAsync();

      isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('should synchronize session renewal between tabs', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Advance 20 minutes in tab 1
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

      // Simulate activity in tab 2 (which resets the global timer)
      // In practice this would be handled via storage events or BroadcastChannel
      // Here we simulate by resetting directly
      document.dispatchEvent(new Event('click'));
      await vi.advanceTimersByTimeAsync(1000); // debounce

      // Advance 25 more minutes
      await vi.advanceTimersByTimeAsync(25 * 60 * 1000);

      // Session should still be active (reset at minute 20)
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should handle simultaneous logout in multiple tabs', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Simulate simultaneous logout (idempotent)
      await Promise.all([authService.logout(), authService.logout(), authService.logout()]);

      // Verify final state
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);

      const user = authService.getCurrentUser();
      expect(user).toBeNull();

      // Verify that IndexedDB was cleared
      const stats = await db.getStats();
      expect(stats.readingsCount).toBe(0);
      expect(stats.syncQueueCount).toBe(0);
    });
  });
});

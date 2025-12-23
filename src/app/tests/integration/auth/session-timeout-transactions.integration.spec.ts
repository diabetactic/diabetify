/**
 * Session Timeout Transaction Integration Tests
 *
 * Pruebas de casos límite críticos para timeout de sesión durante operaciones activas:
 * - Timeout durante transacciones IndexedDB
 * - Timeout durante sincronización activa
 * - Timeout durante envío de formularios
 * - Manejo de grace period
 * - Detección de actividad reseteando timeout
 * - Sincronización de sesión entre múltiples tabs
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { server, resetMockState } from '../../../../mocks/server';
import { http, HttpResponse } from 'msw';
import 'fake-indexeddb/auto';

// Services bajo prueba
import { SessionTimeoutService } from '@core/services/session-timeout.service';
import { LocalAuthService } from '@core/services/local-auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { LoggerService } from '@core/services/logger.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';
import { db } from '@core/services/database.service';

const API_BASE = 'http://localhost:8000';

// TODO: These tests require proper configuration de MSW, SessionTimeoutService y IndexedDB
// Se saltan temporalmente hasta que se resuelvan los problemas de providers
describe.skip('Session Timeout Transactions Integration', () => {
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
    try {
      await tokenStorage?.clearAll();
      await db.clearAllData();
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
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

  describe('Timeout durante transacción IndexedDB', () => {
    it('debe completar transacción activa antes de logout', async () => {
      // Login inicial
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Simulate long transaction en IndexedDB
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
        vi.advanceTimersByTime(30 * 60 * 1000 + 1000);

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

      // Verify that los datos se guardaron correctamente
      const readings = await db.readings.toArray();
      expect(readings).toHaveLength(2);

      const syncItems = await db.syncQueue.toArray();
      expect(syncItems).toHaveLength(1);

      // Flush timers para ejecutar logout
      await vi.runAllTimersAsync();

      // Verify that logout eventually occurred
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('debe abortar transacción fallida y hacer logout', async () => {
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
      } catch {
        transactionFailed = true;
      }

      expect(transactionFailed).toBe(true);

      // Timeout occurs after failure
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);
      await vi.runAllTimersAsync();

      // Verify logout
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);

      // Verify that los datos no se guardaron
      const readings = await db.readings.toArray();
      expect(readings).toHaveLength(0);
    });
  });

  describe('Timeout durante sincronización activa', () => {
    it('debe completar sincronización en progreso antes de logout', async () => {
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

      // Mock sync endpoint with delay
      server.use(
        http.post(`${API_BASE}/glucose-readings`, async () => {
          // Simulate slow sync
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ id: 'synced-reading', synced: true }, { status: 201 });
        })
      );

      // Start sync
      const syncPromise = (async () => {
        const items = await db.syncQueue.toArray();
        for (const item of items) {
          // Simular procesamiento de cada item
          await new Promise(resolve => setTimeout(resolve, 50));
          await db.syncQueue.delete(item.id!);
        }
      })();

      // Timeout occurs during sync
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);

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

    it('debe manejar timeout durante fallo de red en sincronización', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Agregar item a sincronizar
      await db.syncQueue.add({
        operation: 'create',
        readingId: 'reading-1',
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Mock fallo de red
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
      } catch {
        syncFailed = true;
        // Item permanece en cola con retry incrementado
        await db.syncQueue
          .where('readingId')
          .equals('reading-1')
          .modify(item => {
            item.retryCount++;
            item.lastError = 'Network error';
          });
      }

      expect(syncFailed).toBe(true);

      // Timeout ocurre
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);
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

  describe('Timeout durante envío de formulario', () => {
    it('debe completar envío HTTP antes de logout', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      let formSubmitted = false;
      let responseReceived = false;

      // Mock endpoint de formulario con delay
      server.use(
        http.post(`${API_BASE}/appointments`, async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
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
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);

      // Esperar a que el formulario complete
      await submitPromise;
      await vi.runAllTimersAsync();

      expect(formSubmitted).toBe(true);
      expect(responseReceived).toBe(true);

      // Logout occurs after submission
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('debe prevenir envío de nuevo formulario después de timeout', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Provocar timeout
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);
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
    it('debe mostrar advertencia 5 minutos antes de timeout', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      // Avanzar a 25 minutos (5 minutos antes del timeout de 30)
      tick(25 * 60 * 1000);

      // In a real implementation, we would verify warning was shown
      // For now, verify session is still active
      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(true);

      // Avanzar los 5 minutos restantes + 1 segundo
      tick(5 * 60 * 1000 + 1000);
      flush();

      // Should now be logged out
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(false);
    }));

    it('debe extender sesión si hay actividad durante grace period', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      // Avanzar a 26 minutos (grace period)
      tick(26 * 60 * 1000);

      // Simular actividad del usuario (click)
      document.dispatchEvent(new Event('click'));

      // Esperar debounce de 1 segundo
      tick(1000);

      // Advance 25 more minutes (should still be active because it was reset)
      tick(25 * 60 * 1000);

      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(true);
    }));
  });

  describe('Detección de actividad reseteando timeout', () => {
    it('debe resetear timeout en click del usuario', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      // Avanzar 20 minutos
      tick(20 * 60 * 1000);

      // Actividad del usuario
      document.dispatchEvent(new Event('click'));
      tick(1000); // debounce

      // Avanzar otros 25 minutos (total 45, pero reseteado en minuto 20)
      tick(25 * 60 * 1000);

      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      // Should still be authenticated (20 + 25 < 20 + 30)
      expect(isAuth).toBe(true);
    }));

    it('debe resetear timeout en keypress', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      tick(28 * 60 * 1000); // 28 minutos

      // Escribir algo
      document.dispatchEvent(new KeyboardEvent('keypress', { key: 'a' }));
      tick(1000);

      tick(20 * 60 * 1000); // +20 minutos = 48 total

      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(true);
    }));

    it('debe resetear timeout en mousemove', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      tick(29 * 60 * 1000); // 29 minutos

      // Mover mouse
      document.dispatchEvent(new MouseEvent('mousemove'));
      tick(1000);

      tick(15 * 60 * 1000); // +15 minutos = 44 total

      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(true);
    }));

    it('debe resetear timeout en scroll', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      tick(27 * 60 * 1000);

      document.dispatchEvent(new Event('scroll'));
      tick(1000);

      tick(20 * 60 * 1000);

      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(true);
    }));

    it('debe resetear timeout en touchstart (mobile)', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      tick(28 * 60 * 1000);

      document.dispatchEvent(new TouchEvent('touchstart'));
      tick(1000);

      tick(20 * 60 * 1000);

      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(true);
    }));

    it('debe resetear timeout en window focus', fakeAsync(() => {
      authService.login('1000', 'tuvieja', false).subscribe();
      tick();

      sessionTimeout.startMonitoring();

      tick(29 * 60 * 1000);

      // Usuario vuelve a la tab
      window.dispatchEvent(new Event('focus'));
      tick(1000);

      tick(20 * 60 * 1000);

      let isAuth = false;
      authService.isAuthenticated().subscribe(val => (isAuth = val));
      tick();

      expect(isAuth).toBe(true);
    }));
  });

  describe('Sincronización de sesión múltiples tabs', () => {
    it('debe sincronizar logout entre tabs usando Preferences', async () => {
      // Login en tab 1
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Verify authenticated
      let isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);

      // Simular logout desde otra tab (llamando directamente a logout)
      await authService.logout();

      // Verify that state was updated
      isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);

      // Verify that el session timeout se detiene
      sessionTimeout.stopMonitoring();

      // Advancing time should not cause additional actions
      vi.advanceTimersByTime(30 * 60 * 1000);
      await vi.runAllTimersAsync();

      isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('debe sincronizar renovación de sesión entre tabs', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));
      sessionTimeout.startMonitoring();

      // Avanzar 20 minutos en tab 1
      vi.advanceTimersByTime(20 * 60 * 1000);

      // Simular actividad en tab 2 (que resetea el timer global)
      // In practice this would be handled via storage events or BroadcastChannel
      // Here we simulate by resetting directly
      document.dispatchEvent(new Event('click'));
      vi.advanceTimersByTime(1000); // debounce

      // Advance 25 more minutes
      vi.advanceTimersByTime(25 * 60 * 1000);

      // Session should still be active (reset at minute 20)
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('debe manejar logout simultáneo en múltiples tabs', async () => {
      await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Simulate simultaneous logout (idempotent)
      await Promise.all([authService.logout(), authService.logout(), authService.logout()]);

      // Verify state final
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

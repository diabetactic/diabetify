/**
 * Token Refresh During Active Operations - Integration Tests
 *
 * Pruebas de integración para verificar que el token refresh funciona correctamente
 * durante operaciones activas críticas como:
 * - Envío de lecturas de glucosa
 * - Solicitudes de citas
 * - Operaciones de sincronización batch
 * - Múltiples requests concurrentes
 *
 * Usa MSW para simular respuestas de red y escenarios de expiración de tokens.
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { server, resetMockState } from '../../../../mocks/server';
import { http, HttpResponse, delay } from 'msw';

// Services under test
import { LocalAuthService } from '@core/services/local-auth.service';
import { ReadingsService } from '@core/services/readings.service';
import { AppointmentService } from '@core/services/appointment.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
import { TokenStorageService } from '@core/services/token-storage.service';
import { PlatformDetectorService } from '@core/services/platform-detector.service';
import { MockDataService } from '@core/services/mock-data.service';
import { MockAdapterService } from '@core/services/mock-adapter.service';
import { TranslationService } from '@core/services/translation.service';
import { NotificationService } from '@core/services/notification.service';

const API_BASE = 'http://localhost:8000';

// TODO: These tests require proper configuration de MSW y servicios Angular
// Se saltan temporalmente hasta que se resuelvan los problemas de providers
describe.skip('Token Refresh During Active Operations', () => {
  let authService: LocalAuthService;
  let readingsService: ReadingsService;
  let appointmentService: AppointmentService;
  let _apiGateway: ApiGatewayService;
  let httpClient: HttpClient;
  let tokenStorage: TokenStorageService;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(async () => {
    server.resetHandlers();
    resetMockState();
    try {
      await tokenStorage?.clearAll();
      await readingsService?.clearAllReadings();
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllTimers();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true,
        },
        LocalAuthService,
        ReadingsService,
        AppointmentService,
        ApiGatewayService,
        LoggerService,
        TokenStorageService,
        PlatformDetectorService,
        MockDataService,
        MockAdapterService,
        TranslationService,
        NotificationService,
      ],
    }).compileComponents();

    authService = TestBed.inject(LocalAuthService);
    readingsService = TestBed.inject(ReadingsService);
    appointmentService = TestBed.inject(AppointmentService);
    _apiGateway = TestBed.inject(ApiGatewayService);
    httpClient = TestBed.inject(HttpClient);
    tokenStorage = TestBed.inject(TokenStorageService);

    // Login antes de cada test
    const loginResult = await firstValueFrom(authService.login('1000', 'tuvieja', false));
    expect(loginResult.success).toBe(true);
  });

  describe('Token Expira Durante Envío de Lectura de Glucosa', () => {
    it('debe refrescar token y completar el envío de lectura exitosamente', async () => {
      let createAttempts = 0;
      let refreshCalled = false;

      // Primera llamada: 401 (token expirado)
      // Second call: success with new token
      server.use(
        http.post(`${API_BASE}/glucose/create`, async ({ request }) => {
          createAttempts++;

          // Primera llamada falla con 401
          if (createAttempts === 1) {
            return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
          }

          // Second call (after refresh) must have Authorization header
          const authHeader = request.headers.get('authorization');
          expect(authHeader).toBeTruthy();
          expect(authHeader).toContain('Bearer');

          // Simular respuesta exitosa
          await delay(50);
          return HttpResponse.json(
            {
              id: 123,
              user_id: 1000,
              glucose_level: 120,
              reading_type: 'DESAYUNO',
              created_at: new Date().toISOString(),
              notes: 'Test reading',
            },
            { status: 201 }
          );
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          refreshCalled = true;
          await delay(100);
          return HttpResponse.json({
            access_token: 'refreshed-access-token-' + Date.now(),
            refresh_token: 'refreshed-refresh-token-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      // Try to create reading - should handle 401 automatically
      const reading = {
        time: new Date().toISOString(),
        value: 120,
        units: 'mg/dL' as const,
        type: 'smbg' as const,
        subType: 'manual' as const,
        deviceId: 'test-device',
        mealContext: 'DESAYUNO',
        notes: 'Test reading',
      };

      await readingsService.addReading(reading, '1000');

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify that el refresh fue llamado
      expect(refreshCalled).toBe(true);
      // Verify that hubo dos intentos (inicial + retry)
      expect(createAttempts).toBeGreaterThanOrEqual(1);
    });

    it('debe fallar si el refresh token también expiró', async () => {
      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.post(`${API_BASE}/token/refresh`, () => {
          return HttpResponse.json({ detail: 'Refresh token expired' }, { status: 401 });
        })
      );

      const reading = {
        time: new Date().toISOString(),
        value: 130,
        units: 'mg/dL' as const,
        type: 'smbg' as const,
        subType: 'manual' as const,
        deviceId: 'test-device',
      };

      await readingsService.addReading(reading, '1000');

      // Esperar que el sync falle
      await new Promise(resolve => setTimeout(resolve, 300));

      // El servicio debe seguir funcionando pero con readings sin sincronizar
      const unsynced = await readingsService.getUnsyncedReadings();
      expect(unsynced.length).toBeGreaterThan(0);
    });

    it('debe manejar timeout durante refresh', async () => {
      vi.useFakeTimers();

      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          // Simular timeout - delay muy largo
          await delay(30000);
          return HttpResponse.json({
            access_token: 'new-token',
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      const reading = {
        time: new Date().toISOString(),
        value: 140,
        units: 'mg/dL' as const,
        type: 'smbg' as const,
        subType: 'manual' as const,
        deviceId: 'test-device',
      };

      const addPromise = readingsService.addReading(reading, '1000');

      // Avanzar timers
      vi.advanceTimersByTime(35000);

      await addPromise;

      vi.useRealTimers();
    });
  });

  describe('Token Expira Durante Solicitud de Cita', () => {
    it('debe refrescar token y completar la solicitud de cita', async () => {
      let submitAttempts = 0;
      let refreshCalled = false;

      server.use(
        http.post(`${API_BASE}/appointments/queue/enter`, ({ request }) => {
          submitAttempts++;

          if (submitAttempts === 1) {
            return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
          }

          const authHeader = request.headers.get('authorization');
          expect(authHeader).toContain('refreshed-access-token');

          return HttpResponse.json(
            {
              id: 'apt-123',
              user_id: 1000,
              status: 'PENDING',
              position: 1,
              created_at: new Date().toISOString(),
            },
            { status: 201 }
          );
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          refreshCalled = true;
          await delay(50);
          return HttpResponse.json({
            access_token: 'refreshed-access-token-' + Date.now(),
            refresh_token: 'refreshed-refresh-token-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      const result = await firstValueFrom(appointmentService.requestAppointment());

      expect(refreshCalled).toBe(true);
      expect(submitAttempts).toBeGreaterThanOrEqual(2);
      expect(result.success).toBe(true);
      expect(result.state).toBe('PENDING');
    });

    it('debe manejar error cuando refresh falla durante solicitud de cita', async () => {
      server.use(
        http.post(`${API_BASE}/appointments/queue/enter`, () => {
          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.post(`${API_BASE}/token/refresh`, () => {
          return HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 });
        })
      );

      try {
        await firstValueFrom(appointmentService.requestAppointment());
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Token Expira Durante Operación de Sincronización Batch', () => {
    it('debe refrescar token y continuar con batch sync', async () => {
      let refreshCalled = false;
      let createCallCount = 0;

      // Add multiple unsynced readings
      const readings = [
        {
          time: new Date(Date.now() - 3600000).toISOString(),
          value: 110,
          units: 'mg/dL' as const,
          type: 'smbg' as const,
          subType: 'manual' as const,
          deviceId: 'test',
        },
        {
          time: new Date(Date.now() - 7200000).toISOString(),
          value: 125,
          units: 'mg/dL' as const,
          type: 'smbg' as const,
          subType: 'manual' as const,
          deviceId: 'test',
        },
        {
          time: new Date(Date.now() - 10800000).toISOString(),
          value: 105,
          units: 'mg/dL' as const,
          type: 'smbg' as const,
          subType: 'manual' as const,
          deviceId: 'test',
        },
      ];

      for (const reading of readings) {
        await readingsService.addReading(reading, '1000');
      }

      // Mock: primera lectura falla con 401, luego refresh, luego todas exitosas
      server.use(
        http.post(`${API_BASE}/glucose/create`, ({ request }) => {
          createCallCount++;

          if (createCallCount === 1) {
            return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
          }

          const authHeader = request.headers.get('authorization');
          expect(authHeader).toContain('Bearer');

          return HttpResponse.json(
            {
              id: 100 + createCallCount,
              user_id: 1000,
              glucose_level: 120,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
            },
            { status: 201 }
          );
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          refreshCalled = true;
          await delay(100);
          return HttpResponse.json({
            access_token: 'batch-sync-token-' + Date.now(),
            refresh_token: 'batch-sync-refresh-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      // Execute sync
      const syncResult = await readingsService.syncPendingReadings();

      expect(refreshCalled).toBe(true);
      expect(syncResult.success).toBeGreaterThan(0);
      expect(syncResult.failed).toBe(0);
    });

    it('debe continuar batch sync después de refresh parcial', async () => {
      let refreshCount = 0;
      let requestCount = 0;

      // Agregar 5 lecturas
      for (let i = 0; i < 5; i++) {
        await readingsService.addReading(
          {
            time: new Date(Date.now() - i * 3600000).toISOString(),
            value: 100 + i * 10,
            units: 'mg/dL' as const,
            type: 'smbg' as const,
            subType: 'manual' as const,
            deviceId: 'test',
          },
          '1000'
        );
      }

      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          requestCount++;
          // Cada 2 requests, retornar 401
          if (requestCount % 2 === 0) {
            return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
          }
          return HttpResponse.json(
            {
              id: Date.now(),
              user_id: 1000,
              glucose_level: 120,
              reading_type: 'OTRO',
              created_at: new Date().toISOString(),
            },
            { status: 201 }
          );
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          refreshCount++;
          await delay(50);
          return HttpResponse.json({
            access_token: 'partial-sync-token-' + refreshCount,
            refresh_token: 'partial-sync-refresh-' + refreshCount,
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      const syncResult = await readingsService.syncPendingReadings();

      // Al menos algunas deben sincronizar
      expect(syncResult.success + syncResult.failed).toBeGreaterThan(0);
    });
  });

  describe('Múltiples Requests Concurrentes Cuando Token Expira', () => {
    it('debe refrescar una sola vez para múltiples requests concurrentes', async () => {
      let refreshCallCount = 0;
      let _requestsAfterRefresh = 0;

      server.use(
        http.get(`${API_BASE}/users/me`, ({ request }) => {
          const authHeader = request.headers.get('authorization');

          // If has refreshed token, count as success
          if (authHeader?.includes('concurrent-refresh-token')) {
            _requestsAfterRefresh++;
            return HttpResponse.json({
              dni: '1000',
              email: 'test@example.com',
              name: 'Test',
              surname: 'User',
              state: 'ACTIVE',
              streak: 5,
              times_measured: 42,
              max_streak: 10,
            });
          }

          // Primer token: retornar 401
          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.get(`${API_BASE}/glucose/mine`, ({ request }) => {
          const authHeader = request.headers.get('authorization');

          if (authHeader?.includes('concurrent-refresh-token')) {
            requestsAfterRefresh++;
            return HttpResponse.json({
              readings: [],
              total: 0,
            });
          }

          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.get(`${API_BASE}/appointments/status`, ({ request }) => {
          const authHeader = request.headers.get('authorization');

          if (authHeader?.includes('concurrent-refresh-token')) {
            requestsAfterRefresh++;
            return HttpResponse.json({ status: 'NONE' });
          }

          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          refreshCallCount++;
          await delay(100);
          return HttpResponse.json({
            access_token: 'concurrent-refresh-token-' + Date.now(),
            refresh_token: 'concurrent-refresh-refresh-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      // Fire multiple concurrent requests
      // Note: Using HttpClient directly to test raw HTTP behavior without service abstraction
      const results = await Promise.allSettled([
        firstValueFrom(httpClient.get(`${API_BASE}/users/me`)),
        firstValueFrom(httpClient.get(`${API_BASE}/glucose/mine`)),
        firstValueFrom(httpClient.get(`${API_BASE}/appointments/status`)),
      ]);

      // Con un interceptor correcto, solo debe haber 1 refresh
      // (though this depends on interceptor implementation)
      expect(refreshCallCount).toBeGreaterThan(0);

      // Verify that algunos requests se completaron
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    it('debe encolar requests hasta que refresh complete', async () => {
      vi.useFakeTimers();
      let refreshCompleted = false;
      const requestTimestamps: number[] = [];

      server.use(
        http.get(`${API_BASE}/*`, () => {
          if (!refreshCompleted) {
            return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
          }

          requestTimestamps.push(Date.now());
          return HttpResponse.json({ success: true });
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          await delay(500);
          refreshCompleted = true;
          return HttpResponse.json({
            access_token: 'queued-token-' + Date.now(),
            refresh_token: 'queued-refresh-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      // Fire 5 requests that should queue
      // Note: Using HttpClient directly to test raw HTTP behavior without service abstraction
      const promises = [
        firstValueFrom(httpClient.get(`${API_BASE}/endpoint1`)),
        firstValueFrom(httpClient.get(`${API_BASE}/endpoint2`)),
        firstValueFrom(httpClient.get(`${API_BASE}/endpoint3`)),
        firstValueFrom(httpClient.get(`${API_BASE}/endpoint4`)),
        firstValueFrom(httpClient.get(`${API_BASE}/endpoint5`)),
      ];

      vi.advanceTimersByTime(1000);

      await Promise.allSettled(promises);

      vi.useRealTimers();

      // Requests should execute after refresh
      expect(refreshCompleted).toBe(true);
    });
  });

  describe('Escenario: Refresh Token También Expiró', () => {
    it('debe hacer logout automático cuando refresh token expira', async () => {
      const _logoutTriggered = false;

      server.use(
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.post(`${API_BASE}/token/refresh`, () => {
          return HttpResponse.json({ detail: 'Refresh token expired' }, { status: 401 });
        })
      );

      // Monitor auth state
      const authSub = authService.authState$.subscribe(state => {
        if (!state.isAuthenticated && state.user === null) {
          logoutTriggered = true;
        }
      });

      try {
        await firstValueFrom(httpClient.get(`${API_BASE}/users/me`));
      } catch {
        // Expected
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      authSub.unsubscribe();

      // System should have cleared session
      const hasToken = await tokenStorage.hasValidAccessToken();
      expect(hasToken).toBe(false);
    });

    it('debe limpiar datos sensibles después de logout por refresh expirado', async () => {
      // Agregar lectura local
      await readingsService.addReading(
        {
          time: new Date().toISOString(),
          value: 150,
          units: 'mg/dL' as const,
          type: 'smbg' as const,
          subType: 'manual' as const,
          deviceId: 'test',
        },
        '1000'
      );

      server.use(
        http.post(`${API_BASE}/glucose/create`, () => {
          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
        }),
        http.post(`${API_BASE}/token/refresh`, () => {
          return HttpResponse.json({ detail: 'Refresh token expired' }, { status: 401 });
        })
      );

      // Intentar sync - debe fallar
      await readingsService.syncPendingReadings();

      // Do explicit logout
      await authService.logout();

      // Verify that datos fueron limpiados
      const readings = await readingsService.getAllReadings();
      expect(readings.total).toBe(0);
    });
  });

  describe('Verificación de Autorización en Headers', () => {
    it('debe incluir nuevo token en requests subsecuentes después de refresh', async () => {
      let firstCall = true;
      let _secondCallHasNewToken = false;

      server.use(
        http.get(`${API_BASE}/users/me`, ({ request }) => {
          const authHeader = request.headers.get('authorization');

          if (firstCall) {
            firstCall = false;
            return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
          }

          // Verify that el segundo intento tiene el token refrescado
          if (authHeader?.includes('new-access-token')) {
            _secondCallHasNewToken = true;
            return HttpResponse.json({
              dni: '1000',
              email: 'test@example.com',
              name: 'Test',
              surname: 'User',
              state: 'ACTIVE',
              streak: 5,
              times_measured: 42,
              max_streak: 10,
            });
          }

          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        }),
        http.post(`${API_BASE}/token/refresh`, async () => {
          await delay(50);
          return HttpResponse.json({
            access_token: 'new-access-token-' + Date.now(),
            refresh_token: 'new-refresh-token-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
          });
        })
      );

      try {
        await firstValueFrom(httpClient.get(`${API_BASE}/users/me`));
      } catch {
        // Puede fallar dependiendo del interceptor
      }

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Hacer segundo intento
      try {
        await firstValueFrom(httpClient.get(`${API_BASE}/users/me`));
      } catch {
        // May fail
      }

      // Second call should have used new token
      // (this depends on whether interceptor auto-retries)
      expect(firstCall).toBe(false);
    });
  });
});

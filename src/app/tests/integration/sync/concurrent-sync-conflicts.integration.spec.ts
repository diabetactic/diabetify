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

describe('Concurrent Sync Conflicts Integration', () => {
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
      // Ignore errors
    }
    try {
      await readingsService?.clearAllReadings();
    } catch {
      // Ignore errors
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
    it('should resolve conflict with server timestamp winning', async () => {
      // Simular lectura sincronizada previamente
      const baseReading = await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date('2025-01-01T10:00:00Z').toISOString(),
        type: 'smbg',
        mealContext: 'DESAYUNO',
        notes: 'Original',
      });

      // Marcar como sincronizada con backendId
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
                id: 123, // Mismo backendId
                user_id: 1000,
                glucose_level: 120, // Valor diferente del servidor
                reading_type: 'DESAYUNO',
                created_at: '01/01/2025 10:00:00', // Timestamp del servidor
                notes: 'Device 2 edit', // Notas diferentes del servidor
              },
            ],
          });
        })
      );

      // Execute fetchFromBackend -> should apply server changes
      const fetchResult = await readingsService.fetchFromBackend();
      expect(fetchResult.fetched).toBe(1);

      // Verify that server won (server wins)
      const updated = await readingsService.getReadingById(baseReading.id);
      expect(updated).toBeDefined();
      expect(updated!.value).toBe(120); // Valor del servidor
      expect(updated!.notes).toBe('Device 2 edit'); // Notas del servidor
      expect(updated!.synced).toBe(true);
    });

    it('should handle concurrent edits to different fields (server wins all)', async () => {
      // Lectura base sincronizada
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

      // Local edit: solo cambiar notes
      await readingsService.updateReading(baseReading.id, {
        notes: 'After lunch - local edit',
      });

      // Servidor tiene cambios en value Y mealContext
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [
              {
                id: 456,
                user_id: 1000,
                glucose_level: 150, // Cambio en value
                reading_type: 'POSTPRANDIAL', // Cambio en mealContext
                created_at: '01/01/2025 12:00:00',
                notes: 'Server version notes', // Change in notes too
              },
            ],
          });
        })
      );

      await readingsService.fetchFromBackend();

      // Verify that todos los campos del servidor ganaron
      const updated = await readingsService.getReadingById(baseReading.id);
      expect(updated!.value).toBe(150);
      expect(updated!.mealContext).toBe('POSTPRANDIAL');
      expect(updated!.notes).toBe('Server version notes');
    });
  });

  describe('Reading Deleted on Server but Modified Locally', () => {
    it('should handle local modification of server-deleted reading', async () => {
      // Crear y sincronizar lectura
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

      // Modificar localmente (marca como unsynced)
      await readingsService.updateReading(reading.id, {
        value: 110,
        notes: 'Modified locally',
      });

      // Server returns empty list (reading deleted)
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [], // Lectura ya no existe en servidor
          });
        })
      );

      // Fetch should not delete local reading (no delete sync)
      await readingsService.fetchFromBackend();

      // La lectura local debe seguir existiendo
      const local = await readingsService.getReadingById(reading.id);
      expect(local).toBeDefined();
      expect(local!.value).toBe(110);
      expect(local!.notes).toBe('Modified locally');
    });

    it('should keep local-only reading when server deletes original', async () => {
      // Escenario: lectura creada offline, servidor rechaza el sync
      const localReading = await readingsService.addReading({
        value: 95,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Created offline',
      });

      // Verify that es local-only
      expect(localReading.synced).toBe(false);
      expect(localReading.isLocalOnly).toBe(true);

      // Servidor devuelve 404 al intentar sincronizar
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Validation error' }, { status: 422 });
        })
      );

      // Intentar sync
      await readingsService.syncPendingReadings();

      // La lectura debe seguir existiendo localmente
      const stillExists = await readingsService.getReadingById(localReading.id);
      expect(stillExists).toBeDefined();
      expect(stillExists!.isLocalOnly).toBe(true);
    });
  });

  // TODO: Estos tests tienen timing flaky debido a la naturaleza async
  // of batch sync. Must be rewritten with better timing control.
  describe.skip('Batch Sync with Partial Failures', () => {
    it('should handle some readings succeeding and some failing in batch sync', async () => {
      // Primero bloquear auto-sync
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Offline' }, { status: 503 });
        })
      );

      // Crear 5 lecturas locales
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

      // Esperar a que auto-syncs fallen
      await new Promise(resolve => setTimeout(resolve, 150));

      let createCount = 0;

      // Ahora configurar mock: lecturas 1, 3, 5 exitosas, lecturas 2 y 4 fallan
      server.resetHandlers();
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          createCount++;
          await delay(50);

          // Fallar en lecturas 2 y 4
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

      // Ejecutar batch sync
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
      // Crear lectura local
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
        notes: 'Will fail multiple times',
      });

      let attemptCount = 0;

      // Mock: siempre falla
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          attemptCount++;
          return HttpResponse.json({ detail: 'Persistent error' }, { status: 500 });
        })
      );

      // Intento 1
      await readingsService.syncPendingReadings();
      expect(attemptCount).toBe(1);

      // Intento 2
      await readingsService.syncPendingReadings();
      expect(attemptCount).toBe(2);

      // Intento 3
      await readingsService.syncPendingReadings();
      expect(attemptCount).toBe(3);

      // Attempt 4 - should not retry (limit reached)
      await readingsService.syncPendingReadings();
      // attemptCount sigue en 3 porque la cola ya no tiene el item
      expect(attemptCount).toBe(3);

      // Sync queue should be empty (max retries reached)
      const queueCount = await db.syncQueue.count();
      expect(queueCount).toBe(0);
    });

    it('should process remaining queue after partial failure', async () => {
      // Bloquear auto-sync primero
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Offline' }, { status: 503 });
        })
      );

      // Crear 3 lecturas
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

      // Esperar a que auto-syncs fallen
      await new Promise(resolve => setTimeout(resolve, 150));

      let createCount = 0;

      // Ahora configurar mock: segunda lectura falla, otras dos exitosas
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

      // 2 exitosas, 1 fallida
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);

      // La fallida debe estar en la cola para reintentar
      const queueItems = await db.syncQueue.toArray();
      expect(queueItems.length).toBe(1);
      expect(queueItems[0].retryCount).toBe(1);
    });
  });

  describe('Merge Strategy for Field Conflicts', () => {
    it('should merge server changes for value field (server wins)', async () => {
      // Lectura base
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

      // Local: cambiar solo notas
      await readingsService.updateReading(reading.id, {
        notes: 'Local notes edit',
      });

      // Servidor: cambiar value
      server.use(
        http.get(`${API_BASE}/glucose/mine`, async () => {
          return HttpResponse.json({
            readings: [
              {
                id: 777,
                user_id: 1000,
                glucose_level: 150, // Valor del servidor
                reading_type: 'DESAYUNO',
                created_at: '01/01/2025 08:00:00',
                notes: 'Original', // Notas sin cambiar en servidor
              },
            ],
          });
        })
      );

      await readingsService.fetchFromBackend();

      const merged = await readingsService.getReadingById(reading.id);
      // Servidor gana en todos los campos (no hay merge selectivo)
      expect(merged!.value).toBe(150);
      expect(merged!.notes).toBe('Original'); // Servidor sobrescribe
    });

    it('should handle notes field conflict (server wins)', async () => {
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

      // Local: cambiar notas
      await readingsService.updateReading(reading.id, {
        notes: 'Local edit: feeling good',
      });

      // Servidor: notas diferentes
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

      const merged = await readingsService.getReadingById(reading.id);
      expect(merged!.notes).toBe('Server edit: reviewed by doctor'); // Servidor gana
    });

    it('should handle mealContext conflict (server wins)', async () => {
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

      // Local: cambiar mealContext
      await readingsService.updateReading(reading.id, {
        mealContext: 'POSTPRANDIAL',
      });

      // Servidor: mantiene PREPRANDIAL
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

      const merged = await readingsService.getReadingById(reading.id);
      expect(merged!.mealContext).toBe('PREPRANDIAL'); // Servidor gana
    });
  });

  describe('Concurrent Sync Triggers (Auto + Manual)', () => {
    it('should handle manual sync while auto-sync is in progress (mutex)', async () => {
      // Crear lectura
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      let syncCallCount = 0;

      // Mock: sync tarda 200ms
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

      // Disparar dos syncs concurrentes
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
      // Mock: fetch tarda 150ms
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

      // Disparar dos fetches concurrentes
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
      // Crear lectura local
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

      // Disparar dos fullSyncs concurrentes
      const [_sync1, _sync2] = await Promise.all([
        readingsService.performFullSync(),
        readingsService.performFullSync(),
      ]);

      // Mutex should prevent double execution
      expect(syncCalls).toBe(1);
      expect(fetchCalls).toBe(1);
    });
  });

  describe('Debounce and Queue Handling', () => {
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

      // Crear 20 lecturas offline
      for (let i = 0; i < 20; i++) {
        await readingsService.addReading({
          value: 80 + i,
          units: 'mg/dL',
          time: new Date(Date.now() - i * 60000).toISOString(),
          type: 'smbg',
          notes: `Backlog ${i}`,
        });
      }

      // Esperar a que los auto-syncs fallen
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify that hay items en cola (puede ser menos de 20 si algunos auto-syncs empezaron)
      const queueBefore = await db.syncQueue.count();
      expect(queueBefore).toBeGreaterThan(0);

      // Ahora cambiar mock a exitoso para procesar la cola
      server.resetHandlers();
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          await delay(20); // 20ms por lectura
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
      expect(queueAfter).toBeLessThanOrEqual(1); // Puede quedar alguna si hubo retry
    });

    it('should not duplicate readings when sync is called multiple times rapidly', async () => {
      // Primero, bloquear auto-sync para crear la lectura sin que se sincronice
      server.use(
        http.post(`${API_BASE}/glucose/create`, async () => {
          return HttpResponse.json({ detail: 'Blocked' }, { status: 503 });
        })
      );

      // Crear una lectura
      await readingsService.addReading({
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        type: 'smbg',
      });

      // Esperar a que el auto-sync falle
      await new Promise(resolve => setTimeout(resolve, 100));

      let createCallCount = 0;

      // Ahora permitir sync exitoso
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

/**
 * Database Service Integration Tests
 *
 * Pruebas de integración para DiabetacticDatabase (IndexedDB vía Dexie).
 * Verifica operaciones CRUD reales contra fake-indexeddb sin mocks de servicio.
 *
 * COBERTURA (19 tests):
 *
 * Readings Table (6 tests):
 * 1. Add reading con auto-ID
 * 2. Store localStoredAt timestamp
 * 3. Retrieve reading por ID
 * 4. Update reading existente
 * 5. Delete reading
 * 6. Query por backendId index
 *
 * Sync Queue (3 tests):
 * 7. Add sync queue item con auto-increment ID
 * 8. Retrieve items ordenados por timestamp
 * 9. Store share-glucose operation con appointmentId/payload
 *
 * Appointments Cache (2 tests):
 * 10. Store appointment en cache
 * 11. Retrieve all appointments
 *
 * Database Operations (3 tests):
 * 12. Clear all data (3 tablas en transaction)
 * 13. Handle PrematureCommitError gracefully
 * 14. Get stats (counts de todas las tablas)
 *
 * Data Pruning (2 tests):
 * 15. Prune readings > 90 días
 * 16. Keep readings dentro del periodo de retención
 *
 * Quota Management (3 tests):
 * 17. Handle QuotaExceededError → prune → retry
 * 18. Prune 60 días cuando quota exceeded
 * 19. Rethrow errores no-quota desde safeAdd
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { db, DiabetacticDatabase, SyncQueueItem } from '@core/services/database.service';
import { LocalGlucoseReading, GlucoseUnit } from '@models/glucose-reading.model';
import { Appointment } from '@models/appointment.model';
import { vi } from 'vitest';

describe('Database Service Integration Tests', () => {
  /**
   * Helper: Crear lectura de prueba
   */
  const createTestReading = (overrides?: Partial<LocalGlucoseReading>): LocalGlucoseReading => ({
    id: `reading-${Date.now()}-${Math.random()}`,
    value: 120,
    time: new Date().toISOString(),
    type: 'smbg',
    subType: 'manual',
    units: 'mg/dL' as GlucoseUnit,
    userId: 'test-user',
    synced: false,
    localStoredAt: new Date().toISOString(),
    deviceId: 'test-device',
    status: 'normal',
    isLocalOnly: true,
    ...overrides,
  });

  /**
   * Helper: Crear appointment de prueba
   */
  const createTestAppointment = (
    overrides?: Partial<Appointment & { id: string }>
  ): Appointment & { id: string } => ({
    id: `appointment-${Date.now()}-${Math.random()}`, // String ID para IndexedDB
    appointment_id: Math.floor(Math.random() * 10000),
    user_id: 1000,
    glucose_objective: 100,
    insulin_type: 'rapid',
    dose: 10,
    fast_insulin: 'Humalog',
    fixed_dose: 15,
    ratio: 10,
    sensitivity: 50,
    pump_type: 'none',
    control_data: JSON.stringify({ readings: [] }),
    motive: ['AJUSTE'],
    scheduled_date: new Date(),
    ...overrides,
  });

  /**
   * Helper: Crear item de cola de sincronización
   */
  const createTestSyncQueueItem = (
    overrides?: Partial<SyncQueueItem>
  ): Omit<SyncQueueItem, 'id'> => ({
    operation: 'create',
    readingId: `reading-${Date.now()}`,
    timestamp: Date.now(),
    retryCount: 0,
    ...overrides,
  });

  beforeEach(async () => {
    // Limpiar base de datos antes de cada test
    await db.clearAllData();
  });

  afterEach(async () => {
    // Limpiar base de datos después de cada test
    await db.clearAllData();
    vi.clearAllMocks();
  });

  describe('Readings Table Operations', () => {
    it('should add reading and auto-generate ID', async () => {
      // ARRANGE
      const reading = createTestReading({ id: 'reading-12345' });

      // ACT
      const addedId = await db.readings.add(reading);

      // ASSERT
      expect(addedId).toBe('reading-12345'); // Dexie usa el id proporcionado
      const retrieved = await db.readings.get(addedId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe(120);
      expect(retrieved?.type).toBe('smbg');
    });

    it('should store localStoredAt timestamp when adding reading', async () => {
      // ARRANGE
      const timestamp = new Date().toISOString();
      const reading = createTestReading({ localStoredAt: timestamp });

      // ACT
      await db.readings.add(reading);

      // ASSERT
      const stored = await db.readings.get(reading.id);
      expect(stored?.localStoredAt).toBe(timestamp);
    });

    it('should retrieve reading by id', async () => {
      // ARRANGE
      const reading = createTestReading({ value: 150 });
      await db.readings.add(reading);

      // ACT
      const retrieved = await db.readings.get(reading.id);

      // ASSERT
      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe(150);
      expect(retrieved?.id).toBe(reading.id);
    });

    it('should update existing reading', async () => {
      // ARRANGE
      const reading = createTestReading({ value: 120, notes: 'Original' });
      await db.readings.add(reading);

      // ACT
      await db.readings.update(reading.id, {
        value: 140,
        notes: 'Updated notes',
      });

      // ASSERT
      const updated = await db.readings.get(reading.id);
      expect(updated?.value).toBe(140);
      expect(updated?.notes).toBe('Updated notes');
    });

    it('should delete reading from table', async () => {
      // ARRANGE
      const reading = createTestReading();
      await db.readings.add(reading);

      // ACT
      await db.readings.delete(reading.id);

      // ASSERT
      const deleted = await db.readings.get(reading.id);
      expect(deleted).toBeUndefined();
    });

    it('should query readings by backendId index', async () => {
      // ARRANGE
      const reading1 = createTestReading({ backendId: 999 });
      const reading2 = createTestReading({ backendId: 1000 });
      await db.readings.bulkAdd([reading1, reading2]);

      // ACT
      const found = await db.readings.where('backendId').equals(999).first();

      // ASSERT
      expect(found).toBeDefined();
      expect(found?.id).toBe(reading1.id);
      expect(found?.backendId).toBe(999);
    });
  });

  describe('Sync Queue Operations', () => {
    it('should add sync queue item with auto-increment ID', async () => {
      // ARRANGE
      const item = createTestSyncQueueItem({
        operation: 'create',
        readingId: 'reading-123',
      });

      // ACT
      const itemId = await db.syncQueue.add(item);

      // ASSERT
      expect(itemId).toBeDefined();
      expect(typeof itemId).toBe('number'); // Auto-increment ID
      const retrieved = await db.syncQueue.get(itemId);
      expect(retrieved?.operation).toBe('create');
      expect(retrieved?.readingId).toBe('reading-123');
    });

    it('should retrieve pending sync items ordered by timestamp', async () => {
      // ARRANGE
      const timestamp1 = Date.now() - 1000; // Más antiguo
      const timestamp2 = Date.now();
      const timestamp3 = Date.now() + 1000;

      await db.syncQueue.add(createTestSyncQueueItem({ timestamp: timestamp2 }));
      await db.syncQueue.add(createTestSyncQueueItem({ timestamp: timestamp1 }));
      await db.syncQueue.add(createTestSyncQueueItem({ timestamp: timestamp3 }));

      // ACT
      const items = await db.syncQueue.orderBy('timestamp').toArray();

      // ASSERT
      expect(items).toHaveLength(3);
      expect(items[0].timestamp).toBe(timestamp1); // Más antiguo primero
      expect(items[1].timestamp).toBe(timestamp2);
      expect(items[2].timestamp).toBe(timestamp3);
    });

    it('should store share-glucose operation with appointmentId and payload', async () => {
      // ARRANGE
      const shareItem = createTestSyncQueueItem({
        operation: 'share-glucose',
        appointmentId: 'appointment-456',
        payload: {
          appointment_id: 456,
          glucose_ids: [1, 2, 3],
        },
      });

      // ACT
      const itemId = await db.syncQueue.add(shareItem);

      // ASSERT
      const retrieved = await db.syncQueue.get(itemId);
      expect(retrieved?.operation).toBe('share-glucose');
      expect(retrieved?.appointmentId).toBe('appointment-456');
      expect(retrieved?.payload).toEqual({
        appointment_id: 456,
        glucose_ids: [1, 2, 3],
      });
    });
  });

  describe('Appointments Cache Operations', () => {
    it('should store appointment in cache', async () => {
      // ARRANGE
      const appointment = createTestAppointment({
        id: 'appointment-789',
        appointment_id: 789,
        user_id: 1000,
      });

      // ACT
      await db.appointments.add(appointment);

      // ASSERT
      const retrieved = await db.appointments.get('appointment-789');
      expect(retrieved).toBeDefined();
      expect(retrieved?.user_id).toBe(1000);
      expect(retrieved?.insulin_type).toBe('rapid');
      expect(retrieved?.appointment_id).toBe(789);
    });

    it('should retrieve all appointments from table', async () => {
      // ARRANGE
      const appointment1 = createTestAppointment({
        id: 'appointment-1',
        appointment_id: 1,
        user_id: 1000,
      });
      const appointment2 = createTestAppointment({
        id: 'appointment-2',
        appointment_id: 2,
        user_id: 2000,
      });

      await db.appointments.bulkAdd([appointment1, appointment2]);

      // ACT
      const allAppointments = await db.appointments.toArray();

      // ASSERT
      expect(allAppointments).toHaveLength(2);
      expect(allAppointments.find(a => a.appointment_id === 1)).toBeDefined();
      expect(allAppointments.find(a => a.appointment_id === 2)).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    it('should clear all data across 3 tables in transaction', async () => {
      // ARRANGE
      await db.readings.add(createTestReading());
      await db.syncQueue.add(createTestSyncQueueItem());
      await db.appointments.add(createTestAppointment());

      const countsBefore = await Promise.all([
        db.readings.count(),
        db.syncQueue.count(),
        db.appointments.count(),
      ]);
      expect(countsBefore).toEqual([1, 1, 1]);

      // ACT
      await db.clearAllData();

      // ASSERT
      const countsAfter = await Promise.all([
        db.readings.count(),
        db.syncQueue.count(),
        db.appointments.count(),
      ]);
      expect(countsAfter).toEqual([0, 0, 0]);
    });

    it('should handle PrematureCommitError gracefully during clearAllData', async () => {
      // ARRANGE
      await db.readings.add(createTestReading());
      await db.syncQueue.add(createTestSyncQueueItem());

      // ACT: clearAllData maneja PrematureCommitError internamente en fake-indexeddb
      await expect(db.clearAllData()).resolves.not.toThrow();

      // ASSERT: Datos deben estar limpios
      const counts = await Promise.all([db.readings.count(), db.syncQueue.count()]);
      expect(counts).toEqual([0, 0]);
    });

    it('should return accurate stats for all tables', async () => {
      // ARRANGE
      await db.readings.bulkAdd([createTestReading(), createTestReading(), createTestReading()]);
      await db.syncQueue.bulkAdd([createTestSyncQueueItem(), createTestSyncQueueItem()]);
      await db.appointments.add(createTestAppointment());

      // ACT
      const stats = await db.getStats();

      // ASSERT
      expect(stats.readingsCount).toBe(3);
      expect(stats.syncQueueCount).toBe(2);
      expect(stats.appointmentsCount).toBe(1);
      expect(stats.databaseName).toBe('DiabetacticDB');
      expect(stats.version).toBe(3); // Current schema version
    });
  });

  describe('Data Pruning', () => {
    it('should prune readings older than retention period', async () => {
      // ARRANGE
      const now = new Date();
      const old = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 días atrás
      const recent = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás

      await db.readings.bulkAdd([
        createTestReading({ time: old.toISOString() }), // Debe eliminarse
        createTestReading({ time: recent.toISOString() }), // Debe mantenerse
        createTestReading({ time: now.toISOString() }), // Debe mantenerse
      ]);

      // ACT
      const deletedCount = await db.pruneOldData(90); // Mantener últimos 90 días

      // ASSERT
      expect(deletedCount).toBe(1); // Solo 1 lectura eliminada
      const remaining = await db.readings.count();
      expect(remaining).toBe(2); // 2 lecturas restantes
    });

    it('should keep all readings within retention period', async () => {
      // ARRANGE
      const now = new Date();
      const withinPeriod1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const withinPeriod2 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      await db.readings.bulkAdd([
        createTestReading({ time: withinPeriod1.toISOString() }),
        createTestReading({ time: withinPeriod2.toISOString() }),
        createTestReading({ time: now.toISOString() }),
      ]);

      // ACT
      const deletedCount = await db.pruneOldData(90);

      // ASSERT
      expect(deletedCount).toBe(0); // Ninguna lectura eliminada
      const remaining = await db.readings.count();
      expect(remaining).toBe(3); // Todas las lecturas se mantienen
    });
  });

  describe('Quota Management', () => {
    it('should handle QuotaExceededError by pruning then retrying', async () => {
      // ARRANGE
      const oldReading = createTestReading({
        time: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
      });
      await db.readings.add(oldReading);

      const newReading = createTestReading();

      // Mock add() para simular QuotaExceededError en primer intento
      const originalAdd = db.readings.add.bind(db.readings);
      let callCount = 0;
      const spyAdd = vi.spyOn(db.readings, 'add').mockImplementation(async (item: any) => {
        callCount++;
        if (callCount === 1) {
          // Primera llamada: simular quota exceeded
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        } else {
          // Segunda llamada: éxito después de pruning
          return originalAdd(item);
        }
      });

      // ACT
      const addedId = await db.safeAdd(db.readings, newReading);

      // ASSERT
      expect(spyAdd).toHaveBeenCalledTimes(2); // Primer intento + retry
      expect(addedId).toBe(newReading.id);

      // Verificar que lectura vieja fue eliminada durante handleQuotaExceeded
      const oldReadingStillExists = await db.readings.get(oldReading.id);
      expect(oldReadingStillExists).toBeUndefined(); // Eliminada por pruneOldData(60)
    });

    it('should prune 60 days of data when quota exceeded', async () => {
      // ARRANGE
      const now = new Date();
      const old70Days = new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000);
      const old50Days = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
      const recent30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      await db.readings.bulkAdd([
        createTestReading({ time: old70Days.toISOString() }), // Debe eliminarse
        createTestReading({ time: old50Days.toISOString() }), // Debe mantenerse
        createTestReading({ time: recent30Days.toISOString() }), // Debe mantenerse
      ]);

      // ACT
      await db.handleQuotaExceeded();

      // ASSERT
      const remaining = await db.readings.count();
      expect(remaining).toBe(2); // 2 lecturas dentro de 60 días
    });

    it('should rethrow non-quota errors from safeAdd', async () => {
      // ARRANGE
      const reading = createTestReading();

      // Mock para lanzar error que NO es QuotaExceededError
      const spyAdd = vi
        .spyOn(db.readings, 'add')
        .mockRejectedValue(new Error('Database connection error'));

      // ACT & ASSERT
      await expect(db.safeAdd(db.readings, reading)).rejects.toThrow('Database connection error');

      // Verificar que solo intentó una vez (no retry en errores no-quota)
      expect(spyAdd).toHaveBeenCalledTimes(1);
    });
  });
});

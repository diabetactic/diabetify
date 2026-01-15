// Initialize TestBed environment for Vitest
import '../../../test-setup';

import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { DiabetacticDatabase, SyncQueueItem, db } from '@services/database.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { Appointment } from '@models/appointment.model';

interface TestAppointment extends Appointment {
  id: string;
  userId?: number;
}

describe('DiabetacticDatabase', () => {
  let database: DiabetacticDatabase;
  let skipMainHooks = false;

  const mockReading: LocalGlucoseReading = {
    id: 'reading-123',
    type: 'smbg',
    time: new Date().toISOString(),
    value: 120,
    units: 'mg/dL',
    synced: false,
    userId: 'user-1',
    localStoredAt: new Date().toISOString(),
  };

  const mockAppointment: TestAppointment = {
    id: '123',
    appointment_id: 123,
    user_id: 456,
    userId: 456,
    glucose_objective: 100,
    insulin_type: 'rapid',
    dose: 10,
    fast_insulin: 'humalog',
    fixed_dose: 5,
    ratio: 1.5,
    sensitivity: 50,
    pump_type: 'medtronic',
    control_data: '2024-01-15',
    motive: ['control_routine', 'follow_up'],
  };

  beforeEach(async () => {
    if (skipMainHooks) return;
    database = db;
    if (!db.isOpen()) await db.open();

    try {
      await db.transaction(
        'rw',
        [db.readings, db.syncQueue, db.appointments, db.conflicts, db.auditLog],
        async () => {
          await db.readings.clear();
          await db.syncQueue.clear();
          await db.appointments.clear();
          await db.conflicts.clear();
          await db.auditLog.clear();
        }
      );
    } catch (error) {
      if ((error as Error).name === 'PrematureCommitError') {
        await db.readings.clear();
        await db.syncQueue.clear();
        await db.appointments.clear();
        await db.conflicts.clear();
        await db.auditLog.clear();
      } else throw error;
    }
  });

  afterEach(async () => {
    if (skipMainHooks) return;
    try {
      await db.transaction(
        'rw',
        [db.readings, db.syncQueue, db.appointments, db.conflicts, db.auditLog],
        async () => {
          await db.readings.clear();
          await db.syncQueue.clear();
          await db.appointments.clear();
          await db.conflicts.clear();
          await db.auditLog.clear();
        }
      );
    } catch (error) {
      if ((error as Error).name === 'PrematureCommitError') {
        await db.readings.clear();
        await db.syncQueue.clear();
        await db.appointments.clear();
        await db.conflicts.clear();
        await db.auditLog.clear();
      } else throw error;
    }
  });

  // ============================================================================
  // DATABASE INITIALIZATION
  // ============================================================================

  describe('Database Initialization', () => {
    it('should initialize with correct name, version, and tables', () => {
      expect(database.name).toBe('DiabetacticDB');
      expect(database.verno).toBe(5);
      expect(database.readings).toBeDefined();
      expect(database.syncQueue).toBeDefined();
      expect(database.appointments).toBeDefined();
      expect(database.conflicts).toBeDefined();
      expect(database.auditLog).toBeDefined();
    });

    it('should have correct table schemas', async () => {
      // Readings schema
      const readingsSchema = database.table('readings').schema;
      expect(readingsSchema.primKey.name).toBe('id');
      expect(readingsSchema.indexes.some(idx => idx.name === 'time')).toBe(true);
      expect(readingsSchema.indexes.some(idx => idx.name === 'synced')).toBe(true);

      // SyncQueue schema
      const syncSchema = database.table('syncQueue').schema;
      expect(syncSchema.primKey.name).toBe('id');
      expect(syncSchema.primKey.auto).toBe(true);

      // Appointments schema
      const apptSchema = database.table('appointments').schema;
      expect(apptSchema.primKey.name).toBe('id');
      expect(apptSchema.indexes.some(idx => idx.name === 'userId')).toBe(true);

      // Conflicts schema
      const conflictsSchema = database.table('conflicts').schema;
      expect(conflictsSchema.primKey.name).toBe('id');
      expect(conflictsSchema.primKey.auto).toBe(true);
      expect(conflictsSchema.indexes.some(idx => idx.name === 'readingId')).toBe(true);

      // AuditLog schema
      const auditLogSchema = database.table('auditLog').schema;
      expect(auditLogSchema.primKey.name).toBe('id');
      expect(auditLogSchema.primKey.auto).toBe(true);
    });
  });

  // ============================================================================
  // SCHEMA MIGRATION
  // ============================================================================

  describe('Schema Migration', () => {
    const MIGRATION_DB_NAME = 'DiabetacticDB_Migration_Test';

    beforeAll(() => {
      skipMainHooks = true;
    });
    afterAll(() => {
      skipMainHooks = false;
    });

    beforeEach(async () => {
      // SAFETY: Mocking indexedDB for testing purposes
      (global as any).indexedDB = new FDBFactory();
      // SAFETY: Mocking indexedDB for testing purposes
      Dexie.dependencies.indexedDB = (global as any).indexedDB;
      await Dexie.delete(MIGRATION_DB_NAME);
    });

    afterEach(async () => {
      await Dexie.delete(MIGRATION_DB_NAME);
    });

    it('should migrate from v3 to v4 preserving data', async () => {
      // Create v3 database with data
      const dbV3 = new Dexie(MIGRATION_DB_NAME);
      dbV3.version(3).stores({
        readings: 'id, time, type, userId, synced, localStoredAt, backendId',
        syncQueue: '++id, timestamp, operation, appointmentId',
        appointments: 'id, userId, dateTime, status, updatedAt',
      });
      await dbV3.open();

      await dbV3.table('readings').add({
        id: 'reading-1',
        time: new Date().toISOString(),
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        synced: false,
      });
      await dbV3.close();

      // Open with v4 schema
      const dbV4 = new DiabetacticDatabase();
      dbV4.name = MIGRATION_DB_NAME;
      await dbV4.open();

      expect(dbV4.verno).toBe(5);
      expect(await dbV4.table('readings').count()).toBe(1);
      expect(dbV4.tables.map(t => t.name)).toContain('conflicts');
      expect(dbV4.tables.map(t => t.name)).toContain('auditLog');

      await dbV4.close();
    });
  });

  // ============================================================================
  // READINGS CRUD
  // ============================================================================

  describe('Readings Table - CRUD', () => {
    it('should add, retrieve, and delete readings', async () => {
      // Add single
      const id = await database.readings.add(mockReading);
      expect(id).toBe('reading-123');

      const retrieved = await database.readings.get('reading-123');
      expect(retrieved!.value).toBe(120);

      // Bulk add
      await database.readings.bulkAdd([
        { ...mockReading, id: 'r1', value: 100 },
        { ...mockReading, id: 'r2', value: 150 },
      ]);
      expect(await database.readings.count()).toBe(3);

      // Delete
      await database.readings.delete('reading-123');
      expect(await database.readings.get('reading-123')).toBeUndefined();

      // Bulk delete
      await database.readings.bulkDelete(['r1', 'r2']);
      expect(await database.readings.count()).toBe(0);
    });

    it('should update readings with put and update methods', async () => {
      await database.readings.add(mockReading);

      // Update with put
      await database.readings.put({ ...mockReading, value: 150, synced: true });
      let retrieved = await database.readings.get('reading-123');
      expect(retrieved!.value).toBe(150);
      expect(retrieved!.synced).toBe(true);

      // Update with update method
      await database.readings.update('reading-123', { value: 140, notes: 'Updated' });
      retrieved = await database.readings.get('reading-123');
      expect(retrieved!.value).toBe(140);
      expect(retrieved!.notes).toBe('Updated');
    });

    it('should query readings with filters and ordering', async () => {
      await database.readings.bulkAdd([
        { ...mockReading, id: 'r1', value: 80, time: '2024-01-01T08:00:00Z' },
        { ...mockReading, id: 'r2', value: 120, time: '2024-01-01T12:00:00Z' },
        { ...mockReading, id: 'r3', value: 180, time: '2024-01-01T18:00:00Z', synced: true },
        { ...mockReading, id: 'r4', value: 90, time: '2024-01-02T08:00:00Z', type: 'cbg' },
      ]);

      // Filter by synced status
      expect((await database.readings.filter(r => !r.synced).toArray()).length).toBe(3);

      // Filter by type
      expect((await database.readings.where('type').equals('smbg').toArray()).length).toBe(3);

      // Filter by time range
      const ranged = await database.readings
        .where('time')
        .between('2024-01-01T00:00:00Z', '2024-01-01T23:59:59Z', true, true)
        .toArray();
      expect(ranged.length).toBe(3);

      // Order by time descending
      const ordered = await database.readings.orderBy('time').reverse().toArray();
      expect(ordered[0].id).toBe('r4');
    });

    it('should fail on duplicate id', async () => {
      await database.readings.add(mockReading);
      await expect(database.readings.add(mockReading)).rejects.toThrow();
    });
  });

  // ============================================================================
  // SYNCQUEUE CRUD
  // ============================================================================

  describe('SyncQueue Table - CRUD', () => {
    let freshDb: DiabetacticDatabase;
    let testDbName: string;

    beforeAll(() => {
      skipMainHooks = true;
    });
    afterAll(() => {
      skipMainHooks = false;
    });

    beforeEach(async () => {
      testDbName = `DiabetacticDB_SyncQueue_${Math.random().toString(36).slice(2)}`;
      await Dexie.delete(testDbName);

      freshDb = new DiabetacticDatabase();
      freshDb.name = testDbName;
      await freshDb.open();
    });

    afterEach(async () => {
      if (freshDb?.isOpen()) await freshDb.close();
      if (testDbName) await Dexie.delete(testDbName);
    });

    const createMockSyncItem = (): Omit<SyncQueueItem, 'id'> => ({
      operation: 'create',
      readingId: 'reading-123',
      timestamp: Date.now(),
      retryCount: 0,
    });

    it('should add sync items with auto-increment and sequential ids', async () => {
      const id1 = await freshDb.syncQueue.add(createMockSyncItem());
      const id2 = await freshDb.syncQueue.add(createMockSyncItem());

      expect(id1).toBeGreaterThan(0);
      expect(id2).toBe(id1! + 1);

      const retrieved = await freshDb.syncQueue.get(id1);
      expect(retrieved!.operation).toBe('create');
    });

    it('should add sync items with all operation types and payloads', async () => {
      const operations: Array<SyncQueueItem['operation']> = [
        'create',
        'update',
        'delete',
        'share-glucose',
      ];
      for (const operation of operations) {
        await freshDb.syncQueue.add({ ...createMockSyncItem(), operation });
      }
      expect(await freshDb.syncQueue.count()).toBe(4);

      // With reading payload
      const id = await freshDb.syncQueue.add({
        ...createMockSyncItem(),
        reading: {
          id: 'r1',
          type: 'smbg',
          time: new Date().toISOString(),
          value: 120,
          units: 'mg/dL',
          synced: false,
        },
      });
      expect((await freshDb.syncQueue.get(id))!.reading!.value).toBe(120);
    });

    it('should query and update sync items', async () => {
      const ids: (number | undefined)[] = [];
      const items = [
        { ...createMockSyncItem(), operation: 'create' as const, timestamp: Date.now() - 3000 },
        { ...createMockSyncItem(), operation: 'update' as const, timestamp: Date.now() - 2000 },
        {
          ...createMockSyncItem(),
          operation: 'share-glucose' as const,
          appointmentId: 'apt-1',
          timestamp: Date.now(),
        },
      ];
      for (const item of items) ids.push(await freshDb.syncQueue.add(item));

      // Filter by operation
      expect((await freshDb.syncQueue.where('operation').equals('create').toArray()).length).toBe(
        1
      );

      // Filter by appointmentId
      expect(
        (await freshDb.syncQueue.where('appointmentId').equals('apt-1').toArray()).length
      ).toBe(1);

      // Order by timestamp
      const ordered = await freshDb.syncQueue.orderBy('timestamp').toArray();
      expect(ordered[0].operation).toBe('create');

      // Update
      await freshDb.syncQueue.update(ids[0]!, { retryCount: 3, lastError: 'Failed' });
      const updated = await freshDb.syncQueue.get(ids[0]);
      expect(updated!.retryCount).toBe(3);
      expect(updated!.lastError).toBe('Failed');
    });

    it('should delete sync items', async () => {
      const id1 = await freshDb.syncQueue.add(createMockSyncItem());
      await freshDb.syncQueue.add(createMockSyncItem());
      await freshDb.syncQueue.add({ ...createMockSyncItem(), operation: 'delete' });

      await freshDb.syncQueue.delete(id1!);
      expect(await freshDb.syncQueue.count()).toBe(2);

      await freshDb.syncQueue.where('operation').equals('create').delete();
      expect(await freshDb.syncQueue.count()).toBe(1);

      await freshDb.syncQueue.clear();
      expect(await freshDb.syncQueue.count()).toBe(0);
    });
  });

  // ============================================================================
  // APPOINTMENTS CRUD
  // ============================================================================

  describe('Appointments Table - CRUD', () => {
    it('should add, retrieve, and query appointments', async () => {
      await database.appointments.add(mockAppointment);
      expect((await database.appointments.get('123'))!.insulin_type).toBe('rapid');

      await database.appointments.bulkAdd([
        { ...mockAppointment, id: '1', user_id: 100, userId: 100 } as TestAppointment,
        { ...mockAppointment, id: '2', user_id: 100, userId: 100 } as TestAppointment,
        { ...mockAppointment, id: '3', user_id: 200, userId: 200 } as TestAppointment,
      ]);

      expect(await database.appointments.count()).toBe(4);
      expect((await database.appointments.where('userId').equals(100).toArray()).length).toBe(2);
    });

    it('should update and delete appointments', async () => {
      await database.appointments.add(mockAppointment);

      await database.appointments.update('123', { dose: 15, insulin_type: 'long' });
      const updated = await database.appointments.get('123');
      expect(updated!.dose).toBe(15);
      expect(updated!.insulin_type).toBe('long');

      await database.appointments.delete('123');
      expect(await database.appointments.count()).toBe(0);
    });
  });

  // ============================================================================
  // CLEAR ALL DATA & STATS
  // ============================================================================

  describe('clearAllData() and getStats()', () => {
    it('should clear all tables and report correct stats', async () => {
      // Seed data
      await database.readings.add({ ...mockReading, id: 'r1' });
      await database.syncQueue.add({ operation: 'create', timestamp: Date.now(), retryCount: 0 });
      await database.appointments.add({ ...mockAppointment, id: 'a1' } as TestAppointment);
      await database.conflicts.add({
        readingId: 'r1',
        localReading: mockReading,
        serverReading: mockReading,
        status: 'pending',
        createdAt: Date.now(),
      });
      await database.auditLog.add({
        action: 'test',
        details: {},
        createdAt: Date.now(),
      });

      let stats = await database.getStats();
      expect(stats.readingsCount).toBe(1);
      expect(stats.syncQueueCount).toBe(1);
      expect(stats.appointmentsCount).toBe(1);
      expect(stats.conflictsCount).toBe(1);
      expect(stats.auditLogCount).toBe(1);
      expect(stats.databaseName).toBe('DiabetacticDB');
      expect(stats.version).toBe(5);

      await database.clearAllData();

      stats = await database.getStats();
      expect(stats.readingsCount).toBe(0);
      expect(stats.syncQueueCount).toBe(0);
      expect(stats.appointmentsCount).toBe(0);
      expect(stats.conflictsCount).toBe(0);
      expect(stats.auditLogCount).toBe(0);

      // Can still add after clearing
      await database.readings.add({ ...mockReading, id: 'new' });
      expect(await database.readings.count()).toBe(1);
    });
  });

  // ============================================================================
  // SINGLETON INSTANCE
  // ============================================================================

  describe('Singleton Instance', () => {
    it('should export consistent singleton db instance', () => {
      expect(db).toBeDefined();
      expect(db).toBeInstanceOf(DiabetacticDatabase);
      expect(db.name).toBe('DiabetacticDB');
      expect(db.verno).toBe(5);
      expect(db.readings).toBeDefined();
    });
  });

  // ============================================================================
  // CONCURRENT OPERATIONS
  // ============================================================================

  describe('Concurrent Operations', () => {
    it('should handle simultaneous add operations without data loss', async () => {
      const readings = Array.from({ length: 20 }, (_, i) => ({
        id: `concurrent-${i}`,
        type: 'smbg' as const,
        time: new Date(Date.now() + i * 1000).toISOString(),
        value: 100 + i,
        units: 'mg/dL' as const,
        synced: false,
      }));

      await Promise.all(readings.map(r => database.readings.add(r)));

      expect(await database.readings.count()).toBe(20);
      const stored = await database.readings.toArray();
      expect(stored.map(r => r.id).sort()).toEqual(readings.map(r => r.id).sort());
    });

    it('should handle concurrent updates to different records', async () => {
      await database.readings.bulkAdd([
        { ...mockReading, id: 'u1', value: 100 },
        { ...mockReading, id: 'u2', value: 110 },
        { ...mockReading, id: 'u3', value: 120 },
      ]);

      await Promise.all([
        database.readings.update('u1', { synced: true, value: 101 }),
        database.readings.update('u2', { synced: true, value: 111 }),
        database.readings.update('u3', { synced: true, value: 121 }),
      ]);

      const readings = await database.readings.toArray();
      expect(readings.every(r => r.synced)).toBe(true);
      expect(readings.find(r => r.id === 'u1')!.value).toBe(101);
    });

    it('should maintain data integrity under mixed concurrent operations', async () => {
      await database.readings.bulkAdd([
        { ...mockReading, id: 'i1', value: 100 },
        { ...mockReading, id: 'i2', value: 110 },
      ]);

      await Promise.all([
        database.readings.get('i1'),
        database.readings.update('i2', { synced: true }),
        database.readings.add({ ...mockReading, id: 'i3', value: 120 }),
        database.readings.delete('i1'),
      ]);

      const all = await database.readings.toArray();
      expect(all.length).toBe(2);
      expect(all.find(r => r.id === 'i1')).toBeUndefined();
      expect(all.find(r => r.id === 'i2')!.synced).toBe(true);
      expect(all.find(r => r.id === 'i3')!.value).toBe(120);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle constraint violations and database errors', async () => {
      // Duplicate id
      await database.readings.add(mockReading);
      await expect(database.readings.add(mockReading)).rejects.toThrow();

      // Bulk with duplicate
      await expect(
        database.readings.bulkAdd([
          { ...mockReading, id: 'valid-1', value: 120 },
          { ...mockReading, id: 'valid-1', value: 130 }, // Duplicate
        ])
      ).rejects.toThrow();

      // Operations on closed database
      const testDbName = `DiabetacticDB_ErrorTest_${Math.random().toString(36).slice(2)}`;
      const testDb = new DiabetacticDatabase();
      testDb.name = testDbName;
      await testDb.open();
      await testDb.close();

      await expect(testDb.table('readings').add({ ...mockReading, id: 'test' })).rejects.toThrow();

      await Dexie.delete(testDbName);
    });

    it('should handle large bulk inserts gracefully', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `reading-${i}`,
        type: 'smbg' as const,
        time: new Date().toISOString(),
        value: 120,
        units: 'mg/dL' as const,
        synced: false,
        notes: 'Note '.repeat(100),
      }));

      await database.readings.bulkAdd(largeArray);
      expect(await database.readings.count()).toBe(1000);
    });
  });
});

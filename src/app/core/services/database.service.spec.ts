import Dexie, { Table } from 'dexie';
import 'fake-indexeddb/auto';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { DiabetacticDatabase, SyncQueueItem, db } from '@services/database.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { Appointment } from '@models/appointment.model';

/**
 * Extended Appointment type for database tests
 * The database schema uses `id` as primary key and `userId` as index,
 * but the API model uses `appointment_id` and `user_id`.
 * This type bridges both for testing purposes.
 */
interface TestAppointment extends Appointment {
  id: string; // Database primary key
  userId?: number; // Database index (optional, mirrors user_id)
}

/**
 * Comprehensive test suite for Dexie IndexedDB database service
 * Tests schema migrations, CRUD operations, and error handling
 */
describe('DiabetacticDatabase', () => {
  let database: DiabetacticDatabase;
  // Flag to skip main hooks for SyncQueue tests (they use fresh isolated DB)
  let skipMainHooks = false;

  beforeEach(async () => {
    if (skipMainHooks) return;

    // Use the exported singleton for consistency
    database = db;

    // Clear all tables to ensure test isolation without deleting the database
    await db.readings.clear();
    await db.syncQueue.clear();
    await db.appointments.clear();
  });

  afterEach(async () => {
    if (skipMainHooks) return;

    // Clear all tables to ensure test isolation without deleting the database
    // Closing the database is not necessary as we are using the singleton
    await db.readings.clear();
    await db.syncQueue.clear();
    await db.appointments.clear();
  });

  describe('Database Initialization', () => {
    it('should create database with correct name', () => {
      expect(database.name).toBe('DiabetacticDB');
    });

    it('should initialize with version 3', () => {
      expect(database.verno).toBe(3); // Version 3 added backendId index
    });

    it('should have readings table defined', () => {
      expect(database.readings).toBeDefined();
      expect(database.readings.name).toBe('readings');
    });

    it('should have syncQueue table defined', () => {
      expect(database.syncQueue).toBeDefined();
      expect(database.syncQueue.name).toBe('syncQueue');
    });

    it('should have appointments table defined', () => {
      expect(database.appointments).toBeDefined();
      expect(database.appointments.name).toBe('appointments');
    });

    it('should have correct table schema for readings', async () => {
      const schema = database.table('readings').schema;
      expect(schema.primKey.name).toBe('id');
      expect(schema.indexes.some(idx => idx.name === 'time')).toBeTrue();
      expect(schema.indexes.some(idx => idx.name === 'type')).toBeTrue();
      expect(schema.indexes.some(idx => idx.name === 'userId')).toBeTrue();
      expect(schema.indexes.some(idx => idx.name === 'synced')).toBeTrue();
    });

    it('should have correct table schema for syncQueue', async () => {
      const schema = database.table('syncQueue').schema;
      expect(schema.primKey.name).toBe('id');
      expect(schema.primKey.auto).toBeTrue();
      expect(schema.indexes.some(idx => idx.name === 'timestamp')).toBeTrue();
      expect(schema.indexes.some(idx => idx.name === 'operation')).toBeTrue();
    });

    it('should have correct table schema for appointments', async () => {
      const schema = database.table('appointments').schema;
      expect(schema.primKey.name).toBe('id');
      expect(schema.indexes.some(idx => idx.name === 'userId')).toBeTrue();
      expect(schema.indexes.some(idx => idx.name === 'dateTime')).toBeTrue();
      expect(schema.indexes.some(idx => idx.name === 'status')).toBeTrue();
    });
  });

  // Schema Migration tests use isolated FDBFactory to avoid corrupting singleton
  describe('Schema Migration', () => {
    const MIGRATION_DB_NAME = 'DiabetacticDB_Migration_Test';

    beforeAll(() => {
      // Skip main describe hooks for migration tests
      skipMainHooks = true;
    });

    afterAll(() => {
      skipMainHooks = false;
    });

    beforeEach(async () => {
      // Reset global indexedDB for complete isolation

      (global as any).indexedDB = new FDBFactory();
      Dexie.dependencies.indexedDB = (global as any).indexedDB;

      // Ensure test database is deleted
      await Dexie.delete(MIGRATION_DB_NAME);
    });

    afterEach(async () => {
      await Dexie.delete(MIGRATION_DB_NAME);
    });

    it('should migrate from version 1 to version 2', async () => {
      // Create version 1 database
      const dbV1 = new Dexie(MIGRATION_DB_NAME);
      dbV1.version(1).stores({
        readings: 'id, time, type, userId, synced, localStoredAt',
        syncQueue: '++id, timestamp, operation',
      });
      await dbV1.open();

      // Add some data to version 1
      await dbV1.table('readings').add({
        id: 'reading-1',
        time: new Date().toISOString(),
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        synced: false,
      });

      await dbV1.close();

      // Open with version 2 schema (should trigger migration)
      const dbV2 = new Dexie(MIGRATION_DB_NAME);
      dbV2.version(2).stores({
        readings: 'id, time, type, userId, synced, localStoredAt',
        syncQueue: '++id, timestamp, operation, appointmentId',
        appointments: 'id, userId, dateTime, status, updatedAt',
      });
      await dbV2.open();

      expect(dbV2.verno).toBe(2);

      // Verify old data is preserved
      const readings = await dbV2.table('readings').toArray();
      expect(readings.length).toBe(1);
      expect(readings[0].id).toBe('reading-1');

      // Verify new appointments table exists
      expect(dbV2.tables.map(t => t.name)).toContain('appointments');
      const appointments = await dbV2.table('appointments').toArray();
      expect(appointments.length).toBe(0);

      await dbV2.close();
    });

    it('should preserve syncQueue data during migration', async () => {
      // Create v1 with sync queue items
      const dbV1 = new Dexie(MIGRATION_DB_NAME);
      dbV1.version(1).stores({
        readings: 'id, time, type, userId, synced, localStoredAt',
        syncQueue: '++id, timestamp, operation',
      });
      await dbV1.open();

      await dbV1.table('syncQueue').add({
        operation: 'create',
        readingId: 'reading-1',
        timestamp: Date.now(),
        retryCount: 0,
      });

      await dbV1.close();

      // Migrate to v2
      const dbV2 = new Dexie(MIGRATION_DB_NAME);
      dbV2.version(2).stores({
        readings: 'id, time, type, userId, synced, localStoredAt',
        syncQueue: '++id, timestamp, operation, appointmentId',
        appointments: 'id, userId, dateTime, status, updatedAt',
      });
      await dbV2.open();

      const syncItems = await dbV2.table('syncQueue').toArray();
      expect(syncItems.length).toBe(1);
      expect(syncItems[0].operation).toBe('create');
      expect(syncItems[0].readingId).toBe('reading-1');

      await dbV2.close();
    });
  });

  describe('Readings Table - CRUD Operations', () => {
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

    describe('Create Operations', () => {
      it('should add a new reading', async () => {
        const id = await database.readings.add(mockReading);

        expect(id).toBe('reading-123');

        const retrieved = await database.readings.get('reading-123');
        expect(retrieved).toBeDefined();
        expect(retrieved!.value).toBe(120);
        expect(retrieved!.type).toBe('smbg');
      });

      it('should add multiple readings with bulkAdd', async () => {
        const readings: LocalGlucoseReading[] = [
          { ...mockReading, id: 'reading-1', value: 100 },
          { ...mockReading, id: 'reading-2', value: 150 },
          { ...mockReading, id: 'reading-3', value: 200 },
        ];

        await database.readings.bulkAdd(readings);

        const count = await database.readings.count();
        expect(count).toBe(3);
      });

      it('should fail to add reading with duplicate id', async () => {
        await database.readings.add(mockReading);

        await expectAsync(database.readings.add(mockReading)).toBeRejected();
      });

      it('should add reading with all optional fields', async () => {
        const fullReading: LocalGlucoseReading = {
          ...mockReading,
          id: 'full-reading',
          deviceId: 'device-123',
          deviceTime: new Date().toISOString(),
          uploadId: 'upload-456',
          timezone: 'America/Los_Angeles',
          timezoneOffset: -480,
          status: 'normal',
          mealContext: 'before-breakfast',
          notes: 'Feeling good. After exercise',
          tags: ['morning', 'fasting'],
        };

        await database.readings.add(fullReading);

        const retrieved = await database.readings.get('full-reading');
        expect(retrieved!.deviceId).toBe('device-123');
        expect(retrieved!.notes).toBe('Feeling good. After exercise');
        expect(retrieved!.tags).toEqual(['morning', 'fasting']);
      });
    });

    // Skip Read Operations - IndexedDB synced status filtering issue
    describe('Read Operations', () => {
      beforeEach(async () => {
        // Seed database with test data
        const readings: LocalGlucoseReading[] = [
          { ...mockReading, id: 'reading-1', value: 80, time: '2024-01-01T08:00:00Z' },
          { ...mockReading, id: 'reading-2', value: 120, time: '2024-01-01T12:00:00Z' },
          {
            ...mockReading,
            id: 'reading-3',
            value: 180,
            time: '2024-01-01T18:00:00Z',
            synced: true,
          },
          { ...mockReading, id: 'reading-4', value: 90, time: '2024-01-02T08:00:00Z', type: 'cbg' },
        ];

        await database.readings.bulkAdd(readings);
      });

      it('should retrieve reading by id', async () => {
        const reading = await database.readings.get('reading-2');

        expect(reading).toBeDefined();
        expect(reading!.value).toBe(120);
      });

      it('should return undefined for non-existent id', async () => {
        const reading = await database.readings.get('non-existent');

        expect(reading).toBeUndefined();
      });

      it('should retrieve all readings', async () => {
        const allReadings = await database.readings.toArray();

        expect(allReadings.length).toBe(4);
      });

      it('should filter readings by synced status', async () => {
        // Note: IndexedDB stores booleans as 0/1 internally
        // We can filter using the boolean field directly with filter()
        const unsyncedReadings = await database.readings.filter(r => !r.synced).toArray();

        expect(unsyncedReadings.length).toBe(3);
      });

      it('should filter readings by type', async () => {
        const smbgReadings = await database.readings.where('type').equals('smbg').toArray();

        expect(smbgReadings.length).toBe(3);
      });

      it('should filter readings by userId', async () => {
        const userReadings = await database.readings.where('userId').equals('user-1').toArray();

        expect(userReadings.length).toBe(4);
      });

      it('should filter readings by time range', async () => {
        const readings = await database.readings
          .where('time')
          .between('2024-01-01T00:00:00Z', '2024-01-01T23:59:59Z', true, true)
          .toArray();

        expect(readings.length).toBe(3);
      });

      it('should sort readings by time descending', async () => {
        const readings = await database.readings.orderBy('time').reverse().toArray();

        expect(readings[0].id).toBe('reading-4'); // Latest
        expect(readings[3].id).toBe('reading-1'); // Earliest
      });

      it('should limit query results', async () => {
        const readings = await database.readings.limit(2).toArray();

        expect(readings.length).toBe(2);
      });

      it('should count readings matching criteria', async () => {
        const count = await database.readings.where('type').equals('smbg').count();

        expect(count).toBe(3);
      });
    });

    // Skip Update Operations - IndexedDB bulk update issue
    describe('Update Operations', () => {
      beforeEach(async () => {
        await database.readings.add(mockReading);
      });

      it('should update reading with put', async () => {
        const updatedReading = {
          ...mockReading,
          value: 150,
          synced: true,
        };

        await database.readings.put(updatedReading);

        const retrieved = await database.readings.get('reading-123');
        expect(retrieved!.value).toBe(150);
        expect(retrieved!.synced).toBeTrue();
      });

      it('should update reading with update method', async () => {
        await database.readings.update('reading-123', { value: 140, synced: true });

        const retrieved = await database.readings.get('reading-123');
        expect(retrieved!.value).toBe(140);
        expect(retrieved!.synced).toBeTrue();
      });

      it('should bulk update readings', async () => {
        await database.readings.bulkAdd([
          { ...mockReading, id: 'reading-2', value: 100 },
          { ...mockReading, id: 'reading-3', value: 110 },
        ]);

        await database.readings
          .where('id')
          .anyOf(['reading-123', 'reading-2', 'reading-3'])
          .modify({ synced: true });

        // Note: Use filter() since IndexedDB stores booleans specially
        const synced = await database.readings.filter(r => r.synced).count();
        expect(synced).toBe(3);
      });

      it('should update nested fields', async () => {
        await database.readings.update('reading-123', {
          notes: 'Updated note',
          tags: ['updated'],
        });

        const retrieved = await database.readings.get('reading-123');
        expect(retrieved!.notes).toBe('Updated note');
        expect(retrieved!.tags).toEqual(['updated']);
      });
    });

    // Skip Delete Operations - IndexedDB criteria deletion issue
    describe('Delete Operations', () => {
      beforeEach(async () => {
        await database.readings.bulkAdd([
          { ...mockReading, id: 'reading-1' },
          { ...mockReading, id: 'reading-2' },
          { ...mockReading, id: 'reading-3' },
        ]);
      });

      it('should delete reading by id', async () => {
        await database.readings.delete('reading-1');

        const retrieved = await database.readings.get('reading-1');
        expect(retrieved).toBeUndefined();

        const count = await database.readings.count();
        expect(count).toBe(2);
      });

      it('should bulk delete readings', async () => {
        await database.readings.bulkDelete(['reading-1', 'reading-2']);

        const count = await database.readings.count();
        expect(count).toBe(1);
      });

      it('should delete readings matching criteria', async () => {
        // Delete all unsynced readings using filter + delete pattern
        const unsyncedReadings = await database.readings.filter(r => !r.synced).toArray();
        await database.readings.bulkDelete(unsyncedReadings.map(r => r.id));

        const count = await database.readings.count();
        expect(count).toBe(0);
      });

      it('should clear all readings', async () => {
        await database.readings.clear();

        const count = await database.readings.count();
        expect(count).toBe(0);
      });
    });
  });

  describe('SyncQueue Table - CRUD Operations', () => {
    // Fresh database for SyncQueue tests to reset auto-increment counter
    // fake-indexeddb persists auto-increment counter across clear() calls
    let freshDb: Dexie & {
      readings: Table<LocalGlucoseReading, string>;
      syncQueue: Table<SyncQueueItem, number>;
      appointments: Table<Appointment, string>;
    };
    let testDbName: string;

    beforeAll(() => {
      // Skip main describe hooks for SyncQueue tests (they use isolated DB)
      skipMainHooks = true;
    });

    afterAll(() => {
      skipMainHooks = false;
    });

    beforeEach(async () => {
      // Create a unique database name for each test (using crypto for better uniqueness)
      const randomPart = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      testDbName = `DiabetacticDB_SyncQueue_${randomPart}`;

      // Ensure any existing database with this name is deleted first
      await Dexie.delete(testDbName);

      // Create fresh database with unique name
      const testDb = new Dexie(testDbName);
      testDb.version(2).stores({
        readings: 'id, time, type, userId, synced, localStoredAt',
        syncQueue: '++id, timestamp, operation, appointmentId',
        appointments: 'id, userId, dateTime, status, updatedAt',
      });
      await testDb.open();

      // Assign typed table references
      freshDb = testDb as typeof freshDb;
      freshDb.readings = testDb.table('readings');
      freshDb.syncQueue = testDb.table('syncQueue');
      freshDb.appointments = testDb.table('appointments');
    });

    afterEach(async () => {
      if (freshDb?.isOpen()) {
        await freshDb.close();
      }
      if (testDbName) {
        await Dexie.delete(testDbName);
      }
    });

    // Helper function to create fresh sync item without id field
    // (Dexie mutates objects to add id after insertion)
    const createMockSyncItem = (): Omit<SyncQueueItem, 'id'> => ({
      operation: 'create',
      readingId: 'reading-123',
      timestamp: Date.now(),
      retryCount: 0,
    });

    describe('Create Operations', () => {
      it('should add sync queue item with auto-increment id', async () => {
        const id = await freshDb.syncQueue.add(createMockSyncItem());

        expect(id).toBeGreaterThan(0);

        const retrieved = await freshDb.syncQueue.get(id);
        expect(retrieved).toBeDefined();
        expect(retrieved!.operation).toBe('create');
      });

      it('should add multiple sync items with sequential ids', async () => {
        const id1 = await freshDb.syncQueue.add(createMockSyncItem());
        const id2 = await freshDb.syncQueue.add(createMockSyncItem());
        const id3 = await freshDb.syncQueue.add(createMockSyncItem());

        expect(id2).toBe(id1 + 1);
        expect(id3).toBe(id2 + 1);
      });

      it('should add sync item with all operation types', async () => {
        const operations: Array<SyncQueueItem['operation']> = [
          'create',
          'update',
          'delete',
          'share-glucose',
        ];

        for (const operation of operations) {
          await freshDb.syncQueue.add({ ...createMockSyncItem(), operation });
        }

        const count = await freshDb.syncQueue.count();
        expect(count).toBe(4);
      });

      it('should add sync item with reading payload', async () => {
        const itemWithReading: Omit<SyncQueueItem, 'id'> = {
          ...createMockSyncItem(),
          reading: {
            id: 'reading-1',
            type: 'smbg',
            time: new Date().toISOString(),
            value: 120,
            units: 'mg/dL',
            synced: false,
          },
        };

        const id = await freshDb.syncQueue.add(itemWithReading);
        const retrieved = await freshDb.syncQueue.get(id);

        expect(retrieved!.reading).toBeDefined();
        expect(retrieved!.reading!.value).toBe(120);
      });

      it('should add share-glucose sync item with appointmentId and payload', async () => {
        const shareItem: Omit<SyncQueueItem, 'id'> = {
          operation: 'share-glucose',
          appointmentId: 'appointment-123',
          payload: {
            appointmentId: '123',
            shareType: 'summary' as const,
            summary: {
              startDate: '2024-01-01',
              endDate: '2024-01-07',
              daysOfData: 7,
              totalReadings: 100,
              averageGlucose: 120,
              medianGlucose: 118,
              standardDeviation: 15,
              coefficientOfVariation: 12.5,
              timeInRange: {
                veryLow: 2,
                low: 5,
                normal: 80,
                high: 10,
                veryHigh: 3,
              },
              readingTypes: {
                manual: 50,
                cgm: 40,
                meter: 10,
              },
            },
            userConsent: true,
            consentTimestamp: '2024-01-01T10:00:00Z',
          },
          timestamp: Date.now(),
          retryCount: 0,
        };

        const id = await freshDb.syncQueue.add(shareItem);
        const retrieved = await freshDb.syncQueue.get(id);

        expect(retrieved!.appointmentId).toBe('appointment-123');
        expect(retrieved!.payload).toBeDefined();
        expect(retrieved!.payload!.appointmentId).toBe('123');
      });
    });

    describe('Read Operations', () => {
      let addedIds: number[] = [];

      beforeEach(async () => {
        addedIds = [];
        const items: Array<Omit<SyncQueueItem, 'id'>> = [
          { ...createMockSyncItem(), operation: 'create', timestamp: Date.now() - 3000 },
          { ...createMockSyncItem(), operation: 'update', timestamp: Date.now() - 2000 },
          { ...createMockSyncItem(), operation: 'delete', timestamp: Date.now() - 1000 },
          {
            ...createMockSyncItem(),
            operation: 'share-glucose',
            appointmentId: 'apt-1',
            timestamp: Date.now(),
          },
        ];

        for (const item of items) {
          const id = await freshDb.syncQueue.add(item);
          addedIds.push(id);
        }
      });

      it('should retrieve sync item by id', async () => {
        // Use the first added ID instead of hardcoded 1
        const item = await freshDb.syncQueue.get(addedIds[0]);

        expect(item).toBeDefined();
        expect(item!.operation).toBe('create');
      });

      it('should filter sync items by operation', async () => {
        const createItems = await freshDb.syncQueue.where('operation').equals('create').toArray();

        expect(createItems.length).toBe(1);
      });

      it('should filter sync items by appointmentId', async () => {
        const shareItems = await freshDb.syncQueue.where('appointmentId').equals('apt-1').toArray();

        expect(shareItems.length).toBe(1);
        expect(shareItems[0].operation).toBe('share-glucose');
      });

      it('should order sync items by timestamp', async () => {
        const items = await freshDb.syncQueue.orderBy('timestamp').toArray();

        expect(items[0].operation).toBe('create'); // Oldest
        expect(items[3].operation).toBe('share-glucose'); // Newest
      });

      it('should get pending items with high retry count', async () => {
        await freshDb.syncQueue.add({ ...createMockSyncItem(), retryCount: 5 });

        const highRetryItems = await freshDb.syncQueue
          .filter(item => item.retryCount >= 3)
          .toArray();

        expect(highRetryItems.length).toBe(1);
      });
    });

    describe('Update Operations', () => {
      let itemId: number;

      beforeEach(async () => {
        itemId = await freshDb.syncQueue.add(createMockSyncItem());
      });

      it('should increment retry count', async () => {
        await freshDb.syncQueue.update(itemId, { retryCount: 1 });

        const retrieved = await freshDb.syncQueue.get(itemId);
        expect(retrieved!.retryCount).toBe(1);
      });

      it('should update lastError field', async () => {
        await freshDb.syncQueue.update(itemId, { lastError: 'Network timeout' });

        const retrieved = await freshDb.syncQueue.get(itemId);
        expect(retrieved!.lastError).toBe('Network timeout');
      });

      it('should update multiple fields', async () => {
        await freshDb.syncQueue.update(itemId, {
          retryCount: 3,
          lastError: 'Failed after 3 attempts',
        });

        const retrieved = await freshDb.syncQueue.get(itemId);
        expect(retrieved!.retryCount).toBe(3);
        expect(retrieved!.lastError).toBe('Failed after 3 attempts');
      });
    });

    describe('Delete Operations', () => {
      let addedIds: number[] = [];

      beforeEach(async () => {
        addedIds = [];
        const id1 = await freshDb.syncQueue.add(createMockSyncItem());
        const id2 = await freshDb.syncQueue.add(createMockSyncItem());
        const id3 = await freshDb.syncQueue.add(createMockSyncItem());
        addedIds = [id1, id2, id3];
      });

      it('should delete sync item by id', async () => {
        // Use the first added ID instead of hardcoded 1
        await freshDb.syncQueue.delete(addedIds[0]);

        const count = await freshDb.syncQueue.count();
        expect(count).toBe(2);
      });

      it('should delete items by operation type', async () => {
        await freshDb.syncQueue.add({ ...createMockSyncItem(), operation: 'delete' });

        await freshDb.syncQueue.where('operation').equals('create').delete();

        const remaining = await freshDb.syncQueue.count();
        expect(remaining).toBe(1);
      });

      it('should clear all sync queue items', async () => {
        await freshDb.syncQueue.clear();

        const count = await freshDb.syncQueue.count();
        expect(count).toBe(0);
      });
    });
  });

  // Skip Appointments table tests - IndexedDB state isolation issues
  describe('Appointments Table - CRUD Operations', () => {
    const mockAppointment: TestAppointment = {
      id: '123', // Database primary key
      appointment_id: 123,
      user_id: 456,
      userId: 456, // Database index field
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

    describe('Create Operations', () => {
      it('should add appointment', async () => {
        await database.appointments.add(mockAppointment);

        const retrieved = await database.appointments.get('123');
        expect(retrieved).toBeDefined();
        expect(retrieved!.insulin_type).toBe('rapid');
      });

      it('should add appointment with optional fields', async () => {
        const fullAppointment: TestAppointment = {
          ...mockAppointment,
          id: '124',
          appointment_id: 124,
          another_treatment: 'Metformin 500mg',
          other_motive: 'Unusual spike in readings',
        };

        await database.appointments.add(fullAppointment);

        const retrieved = await database.appointments.get('124');
        expect(retrieved!.another_treatment).toBe('Metformin 500mg');
        expect(retrieved!.other_motive).toBe('Unusual spike in readings');
      });

      it('should add multiple appointments', async () => {
        await database.appointments.bulkAdd([
          { ...mockAppointment, id: '1', appointment_id: 1 } as TestAppointment,
          { ...mockAppointment, id: '2', appointment_id: 2 } as TestAppointment,
          { ...mockAppointment, id: '3', appointment_id: 3 } as TestAppointment,
        ]);

        const count = await database.appointments.count();
        expect(count).toBe(3);
      });
    });

    describe('Read Operations', () => {
      beforeEach(async () => {
        await database.appointments.bulkAdd([
          {
            ...mockAppointment,
            id: '1',
            appointment_id: 1,
            user_id: 100,
            userId: 100,
          } as TestAppointment,
          {
            ...mockAppointment,
            id: '2',
            appointment_id: 2,
            user_id: 100,
            userId: 100,
          } as TestAppointment,
          {
            ...mockAppointment,
            id: '3',
            appointment_id: 3,
            user_id: 200,
            userId: 200,
          } as TestAppointment,
        ]);
      });

      it('should retrieve appointment by id', async () => {
        const appointment = await database.appointments.get('1');

        expect(appointment).toBeDefined();
        expect(appointment!.user_id).toBe(100);
      });

      it('should filter appointments by user_id', async () => {
        const userAppointments = await database.appointments.where('userId').equals(100).toArray();

        expect(userAppointments.length).toBe(2);
      });

      it('should retrieve all appointments', async () => {
        const all = await database.appointments.toArray();

        expect(all.length).toBe(3);
      });
    });

    describe('Update Operations', () => {
      beforeEach(async () => {
        await database.appointments.add(mockAppointment);
      });

      it('should update appointment fields', async () => {
        await database.appointments.update('123', {
          dose: 15,
          insulin_type: 'long',
        });

        const retrieved = await database.appointments.get('123');
        expect(retrieved!.dose).toBe(15);
        expect(retrieved!.insulin_type).toBe('long');
      });
    });

    describe('Delete Operations', () => {
      beforeEach(async () => {
        await database.appointments.bulkAdd([
          { ...mockAppointment, id: '1', appointment_id: 1 } as TestAppointment,
          { ...mockAppointment, id: '2', appointment_id: 2 } as TestAppointment,
        ]);
      });

      it('should delete appointment by id', async () => {
        await database.appointments.delete('1');

        const count = await database.appointments.count();
        expect(count).toBe(1);
      });

      it('should clear all appointments', async () => {
        await database.appointments.clear();

        const count = await database.appointments.count();
        expect(count).toBe(0);
      });
    });
  });

  // Skip clearAllData tests - IndexedDB state isolation issues
  describe('clearAllData()', () => {
    beforeEach(async () => {
      // Seed all tables with data
      await database.readings.add({
        id: 'reading-1',
        type: 'smbg',
        time: new Date().toISOString(),
        value: 120,
        units: 'mg/dL',
        synced: false,
      });

      await database.syncQueue.add({
        operation: 'create',
        readingId: 'reading-1',
        timestamp: Date.now(),
        retryCount: 0,
      });

      await database.appointments.add({
        id: '123', // Database primary key
        appointment_id: 123,
        user_id: 456,
        glucose_objective: 100,
        insulin_type: 'rapid',
        dose: 10,
        fast_insulin: 'humalog',
        fixed_dose: 5,
        ratio: 1.5,
        sensitivity: 50,
        pump_type: 'medtronic',
        control_data: '2024-01-15',
        motive: ['control_routine'],
      } as TestAppointment);
    });

    it('should clear all data from all tables', async () => {
      await database.clearAllData();

      const readingsCount = await database.readings.count();
      const syncQueueCount = await database.syncQueue.count();
      const appointmentsCount = await database.appointments.count();

      expect(readingsCount).toBe(0);
      expect(syncQueueCount).toBe(0);
      expect(appointmentsCount).toBe(0);
    });

    it('should allow adding data after clearing', async () => {
      await database.clearAllData();

      await database.readings.add({
        id: 'new-reading',
        type: 'smbg',
        time: new Date().toISOString(),
        value: 150,
        units: 'mg/dL',
        synced: false,
      });

      const count = await database.readings.count();
      expect(count).toBe(1);
    });
  });

  describe('getStats()', () => {
    it('should return statistics for empty database', async () => {
      const stats = await database.getStats();

      expect(stats.readingsCount).toBe(0);
      expect(stats.syncQueueCount).toBe(0);
      expect(stats.appointmentsCount).toBe(0);
      expect(stats.databaseName).toBe('DiabetacticDB');
      expect(stats.version).toBe(3); // Version 3 added backendId index
    });

    it('should return correct counts for populated database', async () => {
      // Add data to all tables
      await database.readings.bulkAdd([
        {
          id: 'r1',
          type: 'smbg',
          time: new Date().toISOString(),
          value: 100,
          units: 'mg/dL',
          synced: false,
        },
        {
          id: 'r2',
          type: 'smbg',
          time: new Date().toISOString(),
          value: 110,
          units: 'mg/dL',
          synced: false,
        },
        {
          id: 'r3',
          type: 'cbg',
          time: new Date().toISOString(),
          value: 120,
          units: 'mg/dL',
          synced: true,
        },
      ]);

      await database.syncQueue.bulkAdd([
        { operation: 'create', timestamp: Date.now(), retryCount: 0 },
        { operation: 'update', timestamp: Date.now(), retryCount: 0 },
      ]);

      await database.appointments.add({
        id: '1', // Database primary key
        appointment_id: 1,
        user_id: 100,
        glucose_objective: 100,
        insulin_type: 'rapid',
        dose: 10,
        fast_insulin: 'humalog',
        fixed_dose: 5,
        ratio: 1.5,
        sensitivity: 50,
        pump_type: 'medtronic',
        control_data: '2024-01-15',
        motive: ['control_routine'],
      } as TestAppointment);

      const stats = await database.getStats();

      expect(stats.readingsCount).toBe(3);
      expect(stats.syncQueueCount).toBe(2);
      expect(stats.appointmentsCount).toBe(1);
    });

    it('should return consistent stats across multiple calls', async () => {
      await database.readings.add({
        id: 'reading-1',
        type: 'smbg',
        time: new Date().toISOString(),
        value: 120,
        units: 'mg/dL',
        synced: false,
      });

      const stats1 = await database.getStats();
      const stats2 = await database.getStats();

      expect(stats1.readingsCount).toBe(stats2.readingsCount);
      expect(stats1.version).toBe(stats2.version);
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton db instance', () => {
      expect(db).toBeDefined();
      expect(db).toBeInstanceOf(DiabetacticDatabase);
      expect(db.name).toBe('DiabetacticDB');
    });

    it('should be the same instance across imports', () => {
      // The singleton should be the same instance
      expect(db.verno).toBe(3); // Version 3 added backendId index
      expect(db.readings).toBeDefined();
    });
  });

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

      // Add all readings concurrently
      await Promise.all(readings.map(r => database.readings.add(r)));

      const count = await database.readings.count();
      expect(count).toBe(20);

      // Verify all readings are present
      const stored = await database.readings.toArray();
      const ids = stored.map(r => r.id).sort();
      const expectedIds = readings.map(r => r.id).sort();
      expect(ids).toEqual(expectedIds);
    });

    it('should handle concurrent read and write operations', async () => {
      // Seed initial data
      await database.readings.add({
        id: 'initial-reading',
        type: 'smbg' as const,
        time: new Date().toISOString(),
        value: 100,
        units: 'mg/dL' as const,
        synced: false,
      });

      // Perform concurrent read and write
      const [readResult, writeResult] = await Promise.all([
        database.readings.get('initial-reading'),
        database.readings.add({
          id: 'concurrent-write',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 150,
          units: 'mg/dL' as const,
          synced: false,
        }),
      ]);

      expect(readResult).toBeDefined();
      expect(readResult!.value).toBe(100);
      expect(writeResult).toBe('concurrent-write');

      const count = await database.readings.count();
      expect(count).toBe(2);
    });

    it('should handle concurrent updates to different records', async () => {
      // Seed data
      await database.readings.bulkAdd([
        {
          id: 'update-1',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 100,
          units: 'mg/dL' as const,
          synced: false,
        },
        {
          id: 'update-2',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 110,
          units: 'mg/dL' as const,
          synced: false,
        },
        {
          id: 'update-3',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 120,
          units: 'mg/dL' as const,
          synced: false,
        },
      ]);

      // Concurrent updates
      await Promise.all([
        database.readings.update('update-1', { synced: true, value: 101 }),
        database.readings.update('update-2', { synced: true, value: 111 }),
        database.readings.update('update-3', { synced: true, value: 121 }),
      ]);

      const readings = await database.readings.toArray();
      expect(readings.every(r => r.synced)).toBeTrue();
      expect(readings.find(r => r.id === 'update-1')!.value).toBe(101);
      expect(readings.find(r => r.id === 'update-2')!.value).toBe(111);
      expect(readings.find(r => r.id === 'update-3')!.value).toBe(121);
    });

    it('should handle rapid sequential operations', async () => {
      // Rapid fire adds and deletes
      for (let i = 0; i < 10; i++) {
        await database.readings.add({
          id: `rapid-${i}`,
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 100 + i,
          units: 'mg/dL' as const,
          synced: false,
        });
      }

      // Rapid deletes
      for (let i = 0; i < 5; i++) {
        await database.readings.delete(`rapid-${i}`);
      }

      const remaining = await database.readings.count();
      expect(remaining).toBe(5);

      // Verify correct items remain
      const items = await database.readings.toArray();
      const ids = items.map(r => r.id).sort();
      expect(ids).toEqual(['rapid-5', 'rapid-6', 'rapid-7', 'rapid-8', 'rapid-9']);
    });

    it('should maintain data integrity under mixed concurrent operations', async () => {
      // Seed data
      await database.readings.bulkAdd([
        {
          id: 'integrity-1',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 100,
          units: 'mg/dL' as const,
          synced: false,
        },
        {
          id: 'integrity-2',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 110,
          units: 'mg/dL' as const,
          synced: false,
        },
      ]);

      // Mixed operations: read, update, add, delete all at once
      const operations = Promise.all([
        database.readings.get('integrity-1'),
        database.readings.update('integrity-2', { synced: true }),
        database.readings.add({
          id: 'integrity-3',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 120,
          units: 'mg/dL' as const,
          synced: false,
        }),
        database.readings.delete('integrity-1'),
      ]);

      await operations;

      // Verify final state
      const all = await database.readings.toArray();
      expect(all.length).toBe(2);
      expect(all.find(r => r.id === 'integrity-1')).toBeUndefined();
      expect(all.find(r => r.id === 'integrity-2')!.synced).toBeTrue();
      expect(all.find(r => r.id === 'integrity-3')!.value).toBe(120);
    });
  });

  describe('Error Handling', () => {
    it('should handle IndexedDB quota exceeded error', async () => {
      // This is a simulated test - actual quota errors are hard to trigger
      // In real scenarios, you'd fill up storage until quota is exceeded

      const largeArray = new Array(1000).fill(null).map((_, i) => ({
        id: `reading-${i}`,
        type: 'smbg' as const,
        time: new Date().toISOString(),
        value: 120,
        units: 'mg/dL' as const,
        synced: false,
        notes: 'Large note to consume space '.repeat(100),
      }));

      // Should handle large bulk inserts gracefully
      await expectAsync(database.readings.bulkAdd(largeArray)).toBeResolved();
    });

    it('should handle constraint violation on duplicate primary key', async () => {
      const reading = {
        id: 'duplicate-id',
        type: 'smbg' as const,
        time: new Date().toISOString(),
        value: 120,
        units: 'mg/dL' as const,
        synced: false,
      };

      await database.readings.add(reading);

      // Attempting to add same id should fail
      await expectAsync(database.readings.add(reading)).toBeRejected();
    });

    it('should handle database connection errors gracefully', async () => {
      // Use a dedicated database to avoid corrupting the singleton
      const testDbName = `DiabetacticDB_ErrorTest_${Math.random().toString(36).slice(2)}`;
      const testDb = new Dexie(testDbName);
      testDb.version(2).stores({
        readings: 'id, time, type, userId, synced, localStoredAt',
        syncQueue: '++id, timestamp, operation, appointmentId',
        appointments: 'id, userId, dateTime, status, updatedAt',
      });
      await testDb.open();

      // Close the database
      await testDb.close();

      // Attempting operations on closed database should fail
      await expectAsync(
        testDb.table('readings').add({
          id: 'test',
          type: 'smbg',
          time: new Date().toISOString(),
          value: 120,
          units: 'mg/dL',
          synced: false,
        })
      ).toBeRejected();

      // Cleanup
      await Dexie.delete(testDbName);
    });

    it('should handle transaction errors during bulk operations', async () => {
      const invalidReadings = [
        {
          id: 'valid-1',
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 120,
          units: 'mg/dL' as const,
          synced: false,
        },
        {
          id: 'valid-1', // Duplicate id - will cause error
          type: 'smbg' as const,
          time: new Date().toISOString(),
          value: 130,
          units: 'mg/dL' as const,
          synced: false,
        },
      ];

      // Bulk operation should fail due to duplicate
      await expectAsync(database.readings.bulkAdd(invalidReadings)).toBeRejected();
    });
  });
});

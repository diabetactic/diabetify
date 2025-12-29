import Dexie from 'dexie';
import 'fake-indexeddb/auto';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { DiabetacticDatabase, AuditLogItem, db } from '@services/database.service';
import { AuditLogService } from '@services/audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let testDb: DiabetacticDatabase;
  let testDbName: string;

  // ============================================================================
  // TEST SETUP AND TEARDOWN
  // ============================================================================

  beforeEach(async () => {
    // Reset indexedDB for isolation
    (globalThis as Record<string, unknown>).indexedDB = new FDBFactory();
    Dexie.dependencies.indexedDB = (globalThis as Record<string, unknown>).indexedDB as IDBFactory;

    // Create unique database name to avoid conflicts
    testDbName = `DiabetacticDB_AuditLogTest_${Math.random().toString(36).slice(2)}`;
    await Dexie.delete(testDbName);

    // Create fresh database instance
    testDb = new DiabetacticDatabase();
    testDb.name = testDbName;
    await testDb.open();

    // Create service with test database
    service = new AuditLogService(testDb);
  });

  afterEach(async () => {
    if (testDb?.isOpen()) {
      await testDb.auditLog.clear();
      await testDb.close();
    }
    if (testDbName) {
      await Dexie.delete(testDbName);
    }
  });

  // ============================================================================
  // SERVICE INSTANTIATION
  // ============================================================================

  describe('Service Instantiation', () => {
    it('should be created with injected database', () => {
      expect(service).toBeDefined();
    });

    it('should use default db singleton when no database is injected', () => {
      const defaultService = new AuditLogService();
      expect(defaultService).toBeDefined();
    });

    it('should use provided database when injected', async () => {
      // Log an entry with our test database
      await service.logConflictResolution('test-id', 'keep-mine', { test: true });

      // Verify entry is in our test database, not the singleton
      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(1);
    });
  });

  // ============================================================================
  // logConflictResolution() - DATA STRUCTURE
  // ============================================================================

  describe('logConflictResolution() - Data Structure', () => {
    it('should log entry with correct action format', async () => {
      await service.logConflictResolution('reading-123', 'keep-mine', {});

      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('conflict-resolution-keep-mine');
    });

    it('should include readingId in details', async () => {
      await service.logConflictResolution('reading-abc', 'keep-server', {});

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toHaveProperty('readingId', 'reading-abc');
    });

    it('should include resolution type in details', async () => {
      await service.logConflictResolution('reading-123', 'keep-both', {});

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toHaveProperty('resolution', 'keep-both');
    });

    it('should spread additional details into the log entry', async () => {
      const additionalDetails = {
        localValue: 120,
        serverValue: 130,
        localTimestamp: '2024-01-15T10:00:00Z',
        serverTimestamp: '2024-01-15T10:05:00Z',
        userId: 'user-456',
      };

      await service.logConflictResolution('reading-123', 'keep-mine', additionalDetails);

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toMatchObject({
        readingId: 'reading-123',
        resolution: 'keep-mine',
        localValue: 120,
        serverValue: 130,
        localTimestamp: '2024-01-15T10:00:00Z',
        serverTimestamp: '2024-01-15T10:05:00Z',
        userId: 'user-456',
      });
    });

    it('should auto-generate id for log entries', async () => {
      await service.logConflictResolution('reading-1', 'keep-mine', {});
      await service.logConflictResolution('reading-2', 'keep-server', {});

      const entries = await testDb.auditLog.toArray();
      expect(entries[0].id).toBeDefined();
      expect(entries[1].id).toBeDefined();
      expect(entries[1].id).toBeGreaterThan(entries[0].id!);
    });
  });

  // ============================================================================
  // logConflictResolution() - RESOLUTION TYPES
  // ============================================================================

  describe('logConflictResolution() - Resolution Types', () => {
    it('should correctly log keep-mine resolution', async () => {
      await service.logConflictResolution('reading-123', 'keep-mine', {
        reason: 'user preference',
      });

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.action).toBe('conflict-resolution-keep-mine');
      expect(entry.details).toMatchObject({
        readingId: 'reading-123',
        resolution: 'keep-mine',
        reason: 'user preference',
      });
    });

    it('should correctly log keep-server resolution', async () => {
      await service.logConflictResolution('reading-456', 'keep-server', {
        reason: 'server is authoritative',
      });

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.action).toBe('conflict-resolution-keep-server');
      expect(entry.details).toMatchObject({
        readingId: 'reading-456',
        resolution: 'keep-server',
        reason: 'server is authoritative',
      });
    });

    it('should correctly log keep-both resolution', async () => {
      await service.logConflictResolution('reading-789', 'keep-both', {
        localId: 'local-reading-789',
        serverId: 'server-reading-789',
      });

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.action).toBe('conflict-resolution-keep-both');
      expect(entry.details).toMatchObject({
        readingId: 'reading-789',
        resolution: 'keep-both',
        localId: 'local-reading-789',
        serverId: 'server-reading-789',
      });
    });

    it('should handle all resolution types in sequence', async () => {
      const resolutions: Array<'keep-mine' | 'keep-server' | 'keep-both'> = [
        'keep-mine',
        'keep-server',
        'keep-both',
      ];

      for (const resolution of resolutions) {
        await service.logConflictResolution(`reading-${resolution}`, resolution, {});
      }

      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(3);
      expect(entries.map(e => e.action)).toEqual([
        'conflict-resolution-keep-mine',
        'conflict-resolution-keep-server',
        'conflict-resolution-keep-both',
      ]);
    });
  });

  // ============================================================================
  // logConflictResolution() - TIMESTAMP ACCURACY
  // ============================================================================

  describe('logConflictResolution() - Timestamp Accuracy', () => {
    it('should set createdAt to current timestamp', async () => {
      const beforeTimestamp = Date.now();
      await service.logConflictResolution('reading-123', 'keep-mine', {});
      const afterTimestamp = Date.now();

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.createdAt).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(entry.createdAt).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should have increasing timestamps for sequential logs', async () => {
      await service.logConflictResolution('reading-1', 'keep-mine', {});
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 5));
      await service.logConflictResolution('reading-2', 'keep-server', {});

      const entries = await testDb.auditLog.orderBy('createdAt').toArray();
      expect(entries[1].createdAt).toBeGreaterThanOrEqual(entries[0].createdAt);
    });

    it('should use Date.now() format (milliseconds since epoch)', async () => {
      await service.logConflictResolution('reading-123', 'keep-mine', {});

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      // Verify it's a reasonable timestamp (between 2020 and 2030)
      const year2020 = new Date('2020-01-01').getTime();
      const year2030 = new Date('2030-01-01').getTime();
      expect(entry.createdAt).toBeGreaterThan(year2020);
      expect(entry.createdAt).toBeLessThan(year2030);
    });
  });

  // ============================================================================
  // LOG RETRIEVAL AND FILTERING
  // ============================================================================

  describe('Log Retrieval and Filtering', () => {
    beforeEach(async () => {
      // Seed test data with different resolutions and timestamps
      const entries: Omit<AuditLogItem, 'id'>[] = [
        {
          action: 'conflict-resolution-keep-mine',
          details: { readingId: 'r1', resolution: 'keep-mine', userId: 'user-1' },
          createdAt: Date.now() - 60000, // 1 minute ago
        },
        {
          action: 'conflict-resolution-keep-server',
          details: { readingId: 'r2', resolution: 'keep-server', userId: 'user-1' },
          createdAt: Date.now() - 30000, // 30 seconds ago
        },
        {
          action: 'conflict-resolution-keep-both',
          details: { readingId: 'r3', resolution: 'keep-both', userId: 'user-2' },
          createdAt: Date.now() - 15000, // 15 seconds ago
        },
        {
          action: 'conflict-resolution-keep-mine',
          details: { readingId: 'r4', resolution: 'keep-mine', userId: 'user-2' },
          createdAt: Date.now(), // now
        },
      ];

      for (const entry of entries) {
        await testDb.auditLog.add(entry);
      }
    });

    it('should retrieve all log entries', async () => {
      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(4);
    });

    it('should retrieve log entries by action type', async () => {
      const keepMineEntries = await testDb.auditLog
        .filter(e => e.action === 'conflict-resolution-keep-mine')
        .toArray();
      expect(keepMineEntries.length).toBe(2);
    });

    it('should retrieve log entries ordered by timestamp', async () => {
      const orderedEntries = await testDb.auditLog.orderBy('createdAt').toArray();
      expect(orderedEntries[0].details).toHaveProperty('readingId', 'r1');
      expect(orderedEntries[3].details).toHaveProperty('readingId', 'r4');
    });

    it('should retrieve log entries in reverse chronological order', async () => {
      const reversedEntries = await testDb.auditLog.orderBy('createdAt').reverse().toArray();
      expect(reversedEntries[0].details).toHaveProperty('readingId', 'r4');
      expect(reversedEntries[3].details).toHaveProperty('readingId', 'r1');
    });

    it('should filter log entries by time range', async () => {
      const now = Date.now();
      const entries = await testDb.auditLog
        .filter(e => e.createdAt >= now - 20000) // Last 20 seconds
        .toArray();
      expect(entries.length).toBe(2); // r3 and r4
    });

    it('should get log entry by id', async () => {
      const allEntries = await testDb.auditLog.toArray();
      const firstId = allEntries[0].id;

      const entry = await testDb.auditLog.get(firstId!);
      expect(entry).toBeDefined();
      expect(entry!.id).toBe(firstId);
    });

    it('should count log entries', async () => {
      const count = await testDb.auditLog.count();
      expect(count).toBe(4);
    });

    it('should return empty array when no entries match filter', async () => {
      const entries = await testDb.auditLog
        .filter(e => e.action === 'non-existent-action')
        .toArray();
      expect(entries).toEqual([]);
    });
  });

  // ============================================================================
  // LOG PERSISTENCE IN INDEXEDDB
  // ============================================================================

  describe('Log Persistence in IndexedDB', () => {
    it('should persist log entries across service instances', async () => {
      // Log entry with first service instance
      await service.logConflictResolution('reading-persist', 'keep-mine', {
        persistenceTest: true,
      });

      // Create new service instance with same database
      const newService = new AuditLogService(testDb);
      await newService.logConflictResolution('reading-persist-2', 'keep-server', {
        persistenceTest: true,
      });

      // Both entries should be in the database
      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(2);
    });

    it('should persist complex details objects', async () => {
      const complexDetails = {
        localReading: {
          id: 'local-123',
          value: 120,
          time: '2024-01-15T10:00:00Z',
          metadata: { device: 'phone', app_version: '1.0.0' },
        },
        serverReading: {
          id: 'server-123',
          value: 125,
          time: '2024-01-15T10:05:00Z',
          metadata: { device: 'web', app_version: '1.0.1' },
        },
        conflictInfo: {
          detectedAt: Date.now(),
          autoResolved: false,
          userDecision: 'manual',
        },
      };

      await service.logConflictResolution('reading-complex', 'keep-mine', complexDetails);

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toMatchObject({
        readingId: 'reading-complex',
        resolution: 'keep-mine',
        ...complexDetails,
      });
    });

    it('should persist entries with null and undefined values in details', async () => {
      const detailsWithNulls = {
        nullValue: null,
        emptyString: '',
        zero: 0,
        falseValue: false,
      };

      await service.logConflictResolution('reading-nulls', 'keep-both', detailsWithNulls);

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toMatchObject({
        readingId: 'reading-nulls',
        resolution: 'keep-both',
        nullValue: null,
        emptyString: '',
        zero: 0,
        falseValue: false,
      });
    });

    it('should persist entries with arrays in details', async () => {
      const detailsWithArrays = {
        affectedReadings: ['r1', 'r2', 'r3'],
        timestamps: [1000, 2000, 3000],
        changes: [{ field: 'value', from: 120, to: 125 }],
      };

      await service.logConflictResolution('reading-arrays', 'keep-mine', detailsWithArrays);

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toMatchObject({
        readingId: 'reading-arrays',
        resolution: 'keep-mine',
        ...detailsWithArrays,
      });
    });

    it('should handle database reopening and maintain data', async () => {
      await service.logConflictResolution('reading-reopen', 'keep-server', { test: 'reopen' });

      // Close and reopen database
      await testDb.close();
      await testDb.open();

      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].details).toHaveProperty('readingId', 'reading-reopen');
    });
  });

  // ============================================================================
  // ERROR HANDLING FOR STORAGE FAILURES
  // ============================================================================

  describe('Error Handling for Storage Failures', () => {
    it('should reject when database is closed', async () => {
      await testDb.close();

      await expect(
        service.logConflictResolution('reading-closed', 'keep-mine', {})
      ).rejects.toThrow();
    });

    it('should handle concurrent writes without data loss', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        service.logConflictResolution(`reading-concurrent-${i}`, 'keep-mine', { index: i })
      );

      await Promise.all(promises);

      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(20);

      // Verify all entries are unique
      const readingIds = entries.map(e => (e.details as { readingId: string }).readingId);
      expect(new Set(readingIds).size).toBe(20);
    });

    it('should handle rapid sequential writes', async () => {
      for (let i = 0; i < 10; i++) {
        await service.logConflictResolution(`reading-rapid-${i}`, 'keep-both', { iteration: i });
      }

      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(10);
    });

    it('should maintain data integrity after failed operation', async () => {
      // First, add a valid entry
      await service.logConflictResolution('reading-valid', 'keep-mine', {});

      // Close database to cause failure
      await testDb.close();

      // Attempt to add another entry (should fail)
      try {
        await service.logConflictResolution('reading-invalid', 'keep-server', {});
      } catch {
        // Expected to fail
      }

      // Reopen database and verify first entry is still there
      await testDb.open();
      const entries = await testDb.auditLog.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].details).toHaveProperty('readingId', 'reading-valid');
    });
  });

  // ============================================================================
  // EDGE CASES AND BOUNDARY CONDITIONS
  // ============================================================================

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty string readingId', async () => {
      await service.logConflictResolution('', 'keep-mine', {});

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toHaveProperty('readingId', '');
    });

    it('should handle very long readingId', async () => {
      const longId = 'r'.repeat(1000);
      await service.logConflictResolution(longId, 'keep-server', {});

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toHaveProperty('readingId', longId);
    });

    it('should handle special characters in readingId', async () => {
      const specialId = 'reading-!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\';
      await service.logConflictResolution(specialId, 'keep-both', {});

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toHaveProperty('readingId', specialId);
    });

    it('should handle unicode characters in details', async () => {
      const unicodeDetails = {
        note: 'Blood glucose measurement',
        symbols: '',
        emoji: 'test emoji',
      };

      await service.logConflictResolution('reading-unicode', 'keep-mine', unicodeDetails);

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toMatchObject({
        readingId: 'reading-unicode',
        resolution: 'keep-mine',
        ...unicodeDetails,
      });
    });

    it('should handle empty details object', async () => {
      await service.logConflictResolution('reading-empty-details', 'keep-mine', {});

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toEqual({
        readingId: 'reading-empty-details',
        resolution: 'keep-mine',
      });
    });

    it('should handle large details object', async () => {
      const largeDetails = {
        data: 'x'.repeat(10000),
        moreData: Array.from({ length: 100 }, (_, i) => ({ key: `item-${i}`, value: i })),
      };

      await service.logConflictResolution('reading-large', 'keep-server', largeDetails);

      const entry = await testDb.auditLog.toArray().then(e => e[0]);
      expect(entry.details).toMatchObject({
        readingId: 'reading-large',
        resolution: 'keep-server',
        ...largeDetails,
      });
    });
  });

  // ============================================================================
  // INTEGRATION WITH DATABASE SERVICE
  // ============================================================================

  describe('Integration with Database Service', () => {
    it('should work with database clearAllData()', async () => {
      await service.logConflictResolution('reading-1', 'keep-mine', {});
      await service.logConflictResolution('reading-2', 'keep-server', {});

      expect(await testDb.auditLog.count()).toBe(2);

      await testDb.clearAllData();

      expect(await testDb.auditLog.count()).toBe(0);

      // Should still be able to add after clearing
      await service.logConflictResolution('reading-after-clear', 'keep-both', {});
      expect(await testDb.auditLog.count()).toBe(1);
    });

    it('should be included in database getStats()', async () => {
      await service.logConflictResolution('reading-stats', 'keep-mine', {});
      await service.logConflictResolution('reading-stats-2', 'keep-server', {});

      const stats = await testDb.getStats();
      expect(stats.auditLogCount).toBe(2);
    });

    it('should use correct table schema', () => {
      const auditLogSchema = testDb.table('auditLog').schema;
      expect(auditLogSchema.primKey.name).toBe('id');
      expect(auditLogSchema.primKey.auto).toBe(true);
    });
  });
});

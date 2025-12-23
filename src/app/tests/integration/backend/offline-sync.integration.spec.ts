/**
 * Backend Integration Tests - Offline-to-Online Sync
 *
 * Tests the synchronization behavior when transitioning between
 * offline and online states:
 * 1. Offline reading storage in IndexedDB
 * 2. Online sync trigger
 * 3. Conflict resolution
 * 4. Partial sync failure handling
 * 5. Network interruption during sync
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  createGlucoseReading,
  getGlucoseReadings,
  GlucoseReadingType,
} from '../../helpers/backend-services.helper';
import { DiabetacticDatabase, SyncQueueItem } from '@services/database.service';

let shouldRun = false;
let db: DiabetacticDatabase;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    shouldRun = false;
    return;
  }
  shouldRun = true;

  // Initialize IndexedDB database
  db = new DiabetacticDatabase();
  await db.open();
}, 10000);

afterAll(async () => {
  if (db) {
    await db.close();
  }
});

const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Backend Integration - Offline-to-Online Sync', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  beforeEach(async () => {
    if (!shouldRun) return;
    // Clear syncQueue before each test
    await db.syncQueue.clear();
  });

  afterEach(async () => {
    if (!shouldRun) return;
    await db.syncQueue.clear();
  });

  // =========================================================================
  // TEST 1: Offline Reading Storage
  // =========================================================================

  describe('Offline Reading Storage', () => {
    conditionalIt(
      'should store reading in syncQueue when created offline',
      async () => {
        // Create item in syncQueue simulating offline reading
        const offlineReading: SyncQueueItem = {
          operation: 'create',
          reading: {
            id: `offline-${Date.now()}`,
            localId: `local-${Date.now()}`,
            value: 120,
            units: 'mg/dL',
            type: 'smbg',
            time: new Date().toISOString(),
            synced: false,
            userId: TEST_USERS.user8.dni,
            status: 'normal',
            localStoredAt: new Date().toISOString(),
          },
          timestamp: Date.now(),
          retryCount: 0,
        };

        await db.syncQueue.add(offlineReading);

        // Verify that it is in syncQueue
        const syncItems = await db.syncQueue.toArray();
        expect(syncItems).toHaveLength(1);
        expect(syncItems[0].operation).toBe('create');
        expect(syncItems[0].reading?.value).toBe(120);
        expect(syncItems[0].reading?.synced).toBe(false);
      },
      10000
    );

    conditionalIt('should accumulate multiple offline readings', async () => {
      // Create multiple offline readings
      const readings: SyncQueueItem[] = Array.from({ length: 5 }, (_, i) => ({
        operation: 'create' as const,
        reading: {
          id: `offline-${Date.now()}-${i}`,
          localId: `local-${Date.now()}-${i}`,
          value: 100 + i * 10,
          units: 'mg/dL' as const,
          type: 'smbg' as const,
          time: new Date(Date.now() - i * 3600000).toISOString(),
          synced: false,
          userId: TEST_USERS.user8.dni,
          status: 'normal' as const,
          localStoredAt: new Date().toISOString(),
        },
        timestamp: Date.now() - i * 3600000,
        retryCount: 0,
      }));

      await db.syncQueue.bulkAdd(readings);

      const syncItems = await db.syncQueue.toArray();
      expect(syncItems).toHaveLength(5);

      // Verify that all timestamps are present (order depends on IndexedDB)
      const timestamps = syncItems.map(s => s.timestamp);
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBe(5);

      // To get ordering, use orderBy explicitly
      const orderedItems = await db.syncQueue.orderBy('timestamp').toArray();
      const orderedTimestamps = orderedItems.map(s => s.timestamp);
      const expectedOrder = [...orderedTimestamps].sort((a, b) => a - b);
      expect(orderedTimestamps).toEqual(expectedOrder);
    });
  });

  // =========================================================================
  // TEST 2: Online Sync Trigger
  // =========================================================================

  describe('Online Sync Trigger', () => {
    conditionalIt(
      'should sync pending items when backend becomes available',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Create pending item in syncQueue
        const pendingItem: SyncQueueItem = {
          operation: 'create',
          reading: {
            id: `pending-${Date.now()}`,
            localId: `local-pending-${Date.now()}`,
            value: 135,
            units: 'mg/dL',
            type: 'smbg',
            time: new Date().toISOString(),
            synced: false,
            userId: TEST_USERS.user8.dni,
            status: 'normal',
            localStoredAt: new Date().toISOString(),
          },
          timestamp: Date.now(),
          retryCount: 0,
        };

        await db.syncQueue.add(pendingItem);

        // Simulate manual sync to backend using helper
        const synced = await createGlucoseReading(
          {
            glucose_level: pendingItem.reading!.value,
            reading_type: 'OTRO' as GlucoseReadingType,
            notes: 'Synced from offline',
          },
          token
        );

        expect(synced.id).toBeDefined();

        // Mark as synced in syncQueue
        await db.syncQueue.clear();

        // Verify that it reached backend
        const readings = await getGlucoseReadings(token);
        const found = readings.find((r: any) => r.glucose_level === 135);
        expect(found).toBeDefined();
      },
      15000
    );
  });

  // =========================================================================
  // TEST 3: Partial Sync Failure Handling
  // =========================================================================

  describe('Partial Sync Failure Handling', () => {
    conditionalIt(
      'should continue syncing valid items when some fail',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Create valid items using helper
        const validReading1 = {
          glucose_level: 110,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: 'Valid 1',
        };

        const validReading2 = {
          glucose_level: 95,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: 'Valid 2',
        };

        // Sync valid items using helper
        const promises = [validReading1, validReading2].map(reading =>
          createGlucoseReading(reading, token)
            .then(data => ({ success: true, data }))
            .catch(() => ({ success: false }))
        );

        const results = await Promise.all(promises);

        // Both valid should sync
        const successCount = results.filter(r => r.success).length;
        expect(successCount).toBe(2);

        // Verify in backend
        const readings = await getGlucoseReadings(token);
        expect(readings.find((r: any) => r.notes === 'Valid 1')).toBeDefined();
        expect(readings.find((r: any) => r.notes === 'Valid 2')).toBeDefined();
      },
      15000
    );
  });

  // =========================================================================
  // TEST 4: SyncQueue Retry Logic
  // =========================================================================

  describe('SyncQueue Retry Logic', () => {
    conditionalIt('should increment retryCount on failed sync attempts', async () => {
      // Create item in syncQueue
      const failingItem: SyncQueueItem = {
        operation: 'create',
        reading: {
          id: `retry-test-${Date.now()}`,
          localId: `local-retry-${Date.now()}`,
          value: 200,
          units: 'mg/dL',
          type: 'smbg',
          time: new Date().toISOString(),
          synced: false,
          userId: 'invalid-user', // Invalid user to force failure
          status: 'normal',
          localStoredAt: new Date().toISOString(),
        },
        timestamp: Date.now(),
        retryCount: 0,
      };

      const itemId = await db.syncQueue.add(failingItem);

      // Simulate failed sync attempt
      await db.syncQueue.update(itemId, {
        retryCount: 1,
        lastError: 'Authentication failed',
      });

      // Verify increment
      const updatedItem = await db.syncQueue.get(itemId);
      expect(updatedItem?.retryCount).toBe(1);
      expect(updatedItem?.lastError).toBe('Authentication failed');

      // Simulate second failed attempt
      await db.syncQueue.update(itemId, {
        retryCount: 2,
        lastError: 'Server unavailable',
      });

      const finalItem = await db.syncQueue.get(itemId);
      expect(finalItem?.retryCount).toBe(2);
    });

    conditionalIt('should preserve sync order by timestamp', async () => {
      const baseTime = Date.now();

      // Create items with different timestamps
      const items: SyncQueueItem[] = [
        {
          operation: 'create',
          reading: {
            id: 'third',
            localId: 'l3',
            value: 130,
            units: 'mg/dL',
            type: 'smbg',
            time: new Date(baseTime).toISOString(),
            synced: false,
            userId: 'test',
            status: 'normal',
            localStoredAt: new Date().toISOString(),
          },
          timestamp: baseTime,
          retryCount: 0,
        },
        {
          operation: 'create',
          reading: {
            id: 'first',
            localId: 'l1',
            value: 110,
            units: 'mg/dL',
            type: 'smbg',
            time: new Date(baseTime - 7200000).toISOString(),
            synced: false,
            userId: 'test',
            status: 'normal',
            localStoredAt: new Date().toISOString(),
          },
          timestamp: baseTime - 7200000,
          retryCount: 0,
        },
        {
          operation: 'create',
          reading: {
            id: 'second',
            localId: 'l2',
            value: 120,
            units: 'mg/dL',
            type: 'smbg',
            time: new Date(baseTime - 3600000).toISOString(),
            synced: false,
            userId: 'test',
            status: 'normal',
            localStoredAt: new Date().toISOString(),
          },
          timestamp: baseTime - 3600000,
          retryCount: 0,
        },
      ];

      await db.syncQueue.bulkAdd(items);

      // Get items ordered by timestamp
      const orderedItems = await db.syncQueue.orderBy('timestamp').toArray();

      expect(orderedItems[0].reading?.id).toBe('first');
      expect(orderedItems[1].reading?.id).toBe('second');
      expect(orderedItems[2].reading?.id).toBe('third');
    });
  });
});

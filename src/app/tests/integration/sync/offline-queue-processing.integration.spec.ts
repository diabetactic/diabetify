/**
 * Integration Tests - Offline Queue Processing
 *
 * Tests queue management, retry logic, persistence, and processing order
 * for offline operations.
 *
 * Coverage:
 * - Queue ordering (FIFO)
 * - Failed item retry logic
 * - Queue persistence across app restarts
 * - Max retry attempts
 * - Exponential backoff simulation
 * - Queue prioritization
 */

import { DiabetacticDatabase, SyncQueueItem } from '@services/database.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';

describe('Integration - Offline Queue Processing', () => {
  let db: DiabetacticDatabase;

  beforeEach(async () => {
    // Create new database instance
    db = new DiabetacticDatabase();
    await db.open();
    // Clear syncQueue before each test
    await db.syncQueue.clear();
  });

  afterEach(async () => {
    // Clean up and close
    try {
      await db.clearAllData();
      await db.close();
    } catch {
      // Ignore close errors
    }
  });

  // =========================================================================
  // TEST 1: Queue Ordering (FIFO)
  // =========================================================================

  describe('Queue Ordering (FIFO)', () => {
    it('should process items in FIFO order based on timestamp', async () => {
      const baseTime = Date.now();

      // Create items with timestamps in specific order
      const items: SyncQueueItem[] = [
        {
          operation: 'create',
          reading: createTestReading('first', 100),
          timestamp: baseTime - 3000,
          retryCount: 0,
        },
        {
          operation: 'create',
          reading: createTestReading('second', 110),
          timestamp: baseTime - 2000,
          retryCount: 0,
        },
        {
          operation: 'create',
          reading: createTestReading('third', 120),
          timestamp: baseTime - 1000,
          retryCount: 0,
        },
      ];

      // Insert in random order
      await db.syncQueue.add(items[2]);
      await db.syncQueue.add(items[0]);
      await db.syncQueue.add(items[1]);

      // Retrieve ordered by timestamp (FIFO)
      const orderedItems = await db.syncQueue.orderBy('timestamp').toArray();

      expect(orderedItems).toHaveLength(3);
      expect(orderedItems[0].reading?.id).toBe('first');
      expect(orderedItems[1].reading?.id).toBe('second');
      expect(orderedItems[2].reading?.id).toBe('third');
    });

    it('should maintain order when adding items concurrently', async () => {
      const itemCount = 10;
      const promises = Array.from({ length: itemCount }, (_, i) => {
        const item: SyncQueueItem = {
          operation: 'create',
          reading: createTestReading(`concurrent-${i}`, 100 + i),
          timestamp: Date.now() + i * 100, // Increment timestamp
          retryCount: 0,
        };
        return db.syncQueue.add(item);
      });

      await Promise.all(promises);

      // Verify order FIFO
      const orderedItems = await db.syncQueue.orderBy('timestamp').toArray();
      expect(orderedItems).toHaveLength(itemCount);

      // Verify that they are ordered by timestamp ascending
      for (let i = 1; i < orderedItems.length; i++) {
        expect(orderedItems[i].timestamp).toBeGreaterThanOrEqual(orderedItems[i - 1].timestamp);
      }
    });
  });

  // =========================================================================
  // TEST 2: Failed Item Retry Logic
  // =========================================================================

  describe('Failed Item Retry Logic', () => {
    it('should increment retryCount on failed sync attempt', async () => {
      const item: SyncQueueItem = {
        operation: 'create',
        reading: createTestReading('retry-test', 130),
        timestamp: Date.now(),
        retryCount: 0,
      };

      const itemId = await db.syncQueue.add(item);

      // Simulate failure and update retryCount
      await db.syncQueue.update(itemId, {
        retryCount: 1,
        lastError: 'Network timeout',
      });

      const updated = await db.syncQueue.get(itemId);
      expect(updated?.retryCount).toBe(1);
      expect(updated?.lastError).toBe('Network timeout');

      // Second failed attempt
      await db.syncQueue.update(itemId, {
        retryCount: 2,
        lastError: 'Server error 500',
      });

      const updated2 = await db.syncQueue.get(itemId);
      expect(updated2?.retryCount).toBe(2);
      expect(updated2?.lastError).toBe('Server error 500');
    });

    it('should track different error types', async () => {
      const errors = [
        { type: 'NetworkError', message: 'Connection failed' },
        { type: 'AuthError', message: 'Unauthorized' },
        { type: 'ValidationError', message: 'Invalid data' },
      ];

      const itemIds = await Promise.all(
        errors.map(async (error, index) => {
          const item: SyncQueueItem = {
            operation: 'create',
            reading: createTestReading(`error-${index}`, 100),
            timestamp: Date.now() + index,
            retryCount: 1,
            lastError: `${error.type}: ${error.message}`,
          };
          return db.syncQueue.add(item);
        })
      );

      // Verify that each error was saved correctly
      for (let i = 0; i < errors.length; i++) {
        const item = await db.syncQueue.get(itemIds[i]);
        expect(item?.lastError).toContain(errors[i].type);
        expect(item?.lastError).toContain(errors[i].message);
      }
    });

    it('should preserve item data across retry attempts', async () => {
      const originalReading = createTestReading('preserve-test', 145);
      const item: SyncQueueItem = {
        operation: 'create',
        reading: originalReading,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const itemId = await db.syncQueue.add(item);

      // Simulate multiple retry attempts
      for (let i = 1; i <= 5; i++) {
        await db.syncQueue.update(itemId, {
          retryCount: i,
          lastError: `Attempt ${i} failed`,
        });
      }

      // Verify that original data was not corrupted
      const finalItem = await db.syncQueue.get(itemId);
      expect(finalItem?.reading?.id).toBe(originalReading.id);
      expect(finalItem?.reading?.value).toBe(originalReading.value);
      expect(finalItem?.retryCount).toBe(5);
    });
  });

  // =========================================================================
  // TEST 3: Queue Persistence Across App Restarts
  // =========================================================================

  describe('Queue Persistence', () => {
    it('should persist queue items after database close/reopen', async () => {
      const items: SyncQueueItem[] = Array.from({ length: 5 }, (_, i) => ({
        operation: 'create' as const,
        reading: createTestReading(`persist-${i}`, 100 + i * 10),
        timestamp: Date.now() + i * 1000,
        retryCount: 0,
      }));

      await db.syncQueue.bulkAdd(items);

      // Verify that se guardaron
      let count = await db.syncQueue.count();
      expect(count).toBe(5);

      // Cerrar base de datos
      await db.close();

      // Reopen database (simulates app restart)
      const newDb = new DiabetacticDatabase();
      await newDb.open();

      // Verify that items persist
      count = await newDb.syncQueue.count();
      expect(count).toBe(5);

      const persistedItems = await newDb.syncQueue.orderBy('timestamp').toArray();
      expect(persistedItems).toHaveLength(5);

      // Verify integrity de datos
      persistedItems.forEach((item, index) => {
        expect(item.reading?.id).toBe(`persist-${index}`);
        expect(item.reading?.value).toBe(100 + index * 10);
      });

      // Cleanup
      await newDb.clearAllData();
      await newDb.close();
    });

    it('should preserve retry state after restart', async () => {
      const item: SyncQueueItem = {
        operation: 'create',
        reading: createTestReading('retry-persist', 125),
        timestamp: Date.now(),
        retryCount: 3,
        lastError: 'Previous error before restart',
      };

      await db.syncQueue.add(item);
      await db.close();

      // Reopen
      const newDb = new DiabetacticDatabase();
      await newDb.open();

      const items = await newDb.syncQueue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].retryCount).toBe(3);
      expect(items[0].lastError).toBe('Previous error before restart');

      // Cleanup
      await newDb.clearAllData();
      await newDb.close();
    });
  });

  // =========================================================================
  // TEST 4: Max Retry Attempts
  // =========================================================================

  describe('Max Retry Attempts', () => {
    const MAX_RETRIES = 5;

    it('should track items reaching max retry limit', async () => {
      const item: SyncQueueItem = {
        operation: 'create',
        reading: createTestReading('max-retry', 160),
        timestamp: Date.now(),
        retryCount: 0,
      };

      const itemId = await db.syncQueue.add(item);

      // Simulate increment until MAX_RETRIES
      for (let i = 1; i <= MAX_RETRIES; i++) {
        await db.syncQueue.update(itemId, {
          retryCount: i,
          lastError: `Retry attempt ${i}`,
        });
      }

      const finalItem = await db.syncQueue.get(itemId);
      expect(finalItem?.retryCount).toBe(MAX_RETRIES);

      // In production, items with retryCount >= MAX_RETRIES should move to dead letter queue
      // This test documents the expected behavior
      const shouldBeInDeadLetter = (finalItem?.retryCount ?? 0) >= MAX_RETRIES;
      expect(shouldBeInDeadLetter).toBe(true);
    });

    it('should filter items by retry count', async () => {
      // Create items with different retry counts
      const items: SyncQueueItem[] = [
        {
          operation: 'create',
          reading: createTestReading('retry-0', 100),
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          operation: 'create',
          reading: createTestReading('retry-3', 110),
          timestamp: Date.now() + 1000,
          retryCount: 3,
        },
        {
          operation: 'create',
          reading: createTestReading('retry-5', 120),
          timestamp: Date.now() + 2000,
          retryCount: MAX_RETRIES,
        },
        {
          operation: 'create',
          reading: createTestReading('retry-6', 130),
          timestamp: Date.now() + 3000,
          retryCount: MAX_RETRIES + 1,
        },
      ];

      await db.syncQueue.bulkAdd(items);

      // Filter items that have exceeded MAX_RETRIES
      const allItems = await db.syncQueue.toArray();
      const exceededRetries = allItems.filter(item => item.retryCount > MAX_RETRIES);
      const withinRetries = allItems.filter(item => item.retryCount <= MAX_RETRIES);

      expect(exceededRetries).toHaveLength(1);
      expect(exceededRetries[0].reading?.id).toBe('retry-6');
      expect(withinRetries).toHaveLength(3);
    });
  });

  // =========================================================================
  // TEST 5: Exponential Backoff Simulation
  // =========================================================================

  describe('Exponential Backoff', () => {
    it('should calculate increasing backoff delays', () => {
      const baseDelay = 1000; // 1 second
      const maxDelay = 60000; // 1 minute

      // Exponential backoff function
      const calculateBackoff = (retryCount: number): number => {
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
        return delay;
      };

      // Verify increasing delays
      expect(calculateBackoff(0)).toBe(1000); // 1s
      expect(calculateBackoff(1)).toBe(2000); // 2s
      expect(calculateBackoff(2)).toBe(4000); // 4s
      expect(calculateBackoff(3)).toBe(8000); // 8s
      expect(calculateBackoff(4)).toBe(16000); // 16s
      expect(calculateBackoff(5)).toBe(32000); // 32s
      expect(calculateBackoff(6)).toBe(60000); // max 60s
      expect(calculateBackoff(10)).toBe(60000); // still at max
    });

    it('should process items respecting backoff timestamps', async () => {
      const _baseDelay = 1000; // Reference delay (timing is hardcoded in test items)
      const now = Date.now();

      // Create items with different retry counts and next retry time
      interface ExtendedSyncQueueItem extends SyncQueueItem {
        nextRetryAt?: number;
      }

      const items: ExtendedSyncQueueItem[] = [
        {
          operation: 'create',
          reading: createTestReading('backoff-0', 100),
          timestamp: now - 10000,
          retryCount: 0,
          nextRetryAt: now - 5000, // Can be retried now
        },
        {
          operation: 'create',
          reading: createTestReading('backoff-2', 110),
          timestamp: now - 8000,
          retryCount: 2,
          nextRetryAt: now + 4000, // Cannot retry yet (in 4s)
        },
        {
          operation: 'create',
          reading: createTestReading('backoff-1', 120),
          timestamp: now - 9000,
          retryCount: 1,
          nextRetryAt: now - 1000, // Can be retried now
        },
      ];

      await db.syncQueue.bulkAdd(items);

      // Filter items that can be processed now
      const allItems = (await db.syncQueue.toArray()) as ExtendedSyncQueueItem[];
      const readyToProcess = allItems.filter(item => (item.nextRetryAt ?? 0) <= now);

      expect(readyToProcess).toHaveLength(2);
      expect(readyToProcess.map(i => i.reading?.id).sort()).toEqual(['backoff-0', 'backoff-1']);
    });
  });

  // =========================================================================
  // TEST 6: Queue Operations (Create, Update, Delete)
  // =========================================================================

  describe('Queue Operations', () => {
    it('should handle different operation types', async () => {
      const operations: SyncQueueItem['operation'][] = [
        'create',
        'update',
        'delete',
        'share-glucose',
      ];

      const items: SyncQueueItem[] = operations.map((op, i) => ({
        operation: op,
        reading: op !== 'share-glucose' ? createTestReading(`${op}-test`, 100 + i * 10) : undefined,
        appointmentId: op === 'share-glucose' ? 'appt-123' : undefined,
        payload: op === 'share-glucose' ? { userId: 'test', data: 'test' } : undefined,
        timestamp: Date.now() + i * 1000,
        retryCount: 0,
      }));

      await db.syncQueue.bulkAdd(items);

      // Verify that all operations were saved
      const allItems = await db.syncQueue.toArray();
      expect(allItems).toHaveLength(4);

      // Verify operations by type
      const createOps = await db.syncQueue.where('operation').equals('create').toArray();
      const updateOps = await db.syncQueue.where('operation').equals('update').toArray();
      const deleteOps = await db.syncQueue.where('operation').equals('delete').toArray();
      const shareOps = await db.syncQueue.where('operation').equals('share-glucose').toArray();

      expect(createOps).toHaveLength(1);
      expect(updateOps).toHaveLength(1);
      expect(deleteOps).toHaveLength(1);
      expect(shareOps).toHaveLength(1);
    });

    it('should process and remove successful items', async () => {
      const items: SyncQueueItem[] = Array.from({ length: 3 }, (_, i) => ({
        operation: 'create' as const,
        reading: createTestReading(`success-${i}`, 100 + i),
        timestamp: Date.now() + i * 1000,
        retryCount: 0,
      }));

      await db.syncQueue.bulkAdd(items);

      // Get the first item to delete it
      const firstItem = await db.syncQueue.orderBy('timestamp').first();
      expect(firstItem).toBeDefined();

      // Simulate successful processing of the first item
      if (firstItem?.id) {
        await db.syncQueue.delete(firstItem.id);
      }

      const remaining = await db.syncQueue.toArray();
      expect(remaining).toHaveLength(2);
      expect(remaining.map(r => r.reading?.id).sort()).toEqual(['success-1', 'success-2']);
    });

    it('should handle batch removal after successful sync', async () => {
      const items: SyncQueueItem[] = Array.from({ length: 10 }, (_, i) => ({
        operation: 'create' as const,
        reading: createTestReading(`batch-${i}`, 100 + i),
        timestamp: Date.now() + i * 1000,
        retryCount: 0,
      }));

      await db.syncQueue.bulkAdd(items);

      // Simulate successful sync of first 5
      const toRemove = await db.syncQueue.orderBy('timestamp').limit(5).primaryKeys();
      await db.syncQueue.bulkDelete(toRemove);

      const remaining = await db.syncQueue.count();
      expect(remaining).toBe(5);
    });
  });
});

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Creates a test glucose reading
 */
function createTestReading(id: string, value: number): LocalGlucoseReading {
  return {
    id,
    localId: `local-${id}`,
    value,
    units: 'mg/dL',
    type: 'smbg',
    time: new Date().toISOString(),
    synced: false,
    userId: 'test-user',
    status: 'normal',
    localStoredAt: new Date().toISOString(),
  };
}

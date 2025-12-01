/**
 * Tidepool Storage Service
 *
 * Helper service for managing storage operations related to Tidepool synchronization.
 * Handles deduplication, bulk storage, conflict resolution, and sync queue management.
 *
 * This service is designed to be used by TidepoolSyncService for:
 * - Storing synced readings from Tidepool API
 * - Preventing duplicate storage
 * - Resolving conflicts between local and Tidepool data
 * - Managing sync queue for successfully synced items
 *
 * @module TidepoolStorageService
 */

import { Injectable } from '@angular/core';
import { db } from './database.service';
import { ReadingsService } from './readings.service';
import { GlucoseReading, LocalGlucoseReading } from '../models/glucose-reading.model';
import { transformBatch, transformTidepoolToLocal } from '../utils/tidepool-transform.util';

/**
 * Result of a bulk storage operation
 * Provides detailed feedback on what was stored, duplicates found, and any errors
 */
export interface StorageResult {
  /** Number of readings successfully stored */
  stored: number;

  /** Number of duplicate readings skipped */
  duplicates: number;

  /** Array of errors encountered during storage */
  errors: Array<{ readingId: string; error: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class TidepoolStorageService {
  constructor(private readingsService: ReadingsService) {}

  /**
   * Store synchronized readings from Tidepool into local database
   *
   * Handles the complete storage workflow:
   * 1. Transform Tidepool readings to local format
   * 2. Check for existing readings by Tidepool ID
   * 3. Separate new readings from existing ones
   * 4. Update existing readings with Tidepool data
   * 5. Bulk insert new readings
   * 6. Clear sync queue for successfully processed readings
   *
   * Uses efficient batch operations to minimize database queries.
   *
   * @param tidepoolReadings - Array of glucose readings from Tidepool API
   * @param userId - User identifier for multi-user support
   * @returns StorageResult with counts and any errors encountered
   *
   * @example
   * ```typescript
   * const tidepoolData = await tidepoolApiService.getReadings(startDate, endDate);
   * const result = await storageService.storeSyncedReadings(tidepoolData, 'user123');
   *
   * console.log(`Stored: ${result.stored}, Duplicates: ${result.duplicates}`);
   * if (result.errors.length > 0) {
   *   console.error('Storage errors:', result.errors);
   * }
   * ```
   */
  async storeSyncedReadings(
    tidepoolReadings: GlucoseReading[],
    userId: string
  ): Promise<StorageResult> {
    const result: StorageResult = {
      stored: 0,
      duplicates: 0,
      errors: [],
    };

    // Handle empty input
    if (!tidepoolReadings || tidepoolReadings.length === 0) {
      return result;
    }

    try {
      // Transform all Tidepool readings to local format
      const localReadings = transformBatch(tidepoolReadings, userId);

      // Extract Tidepool IDs for duplicate checking
      const tidepoolIds = tidepoolReadings.map(r => r.id).filter(id => id != null);

      // Check which readings already exist in database
      const existingIds = await this.checkForDuplicates(tidepoolIds);

      // Separate new readings from existing ones
      const newReadings: LocalGlucoseReading[] = [];
      const existingReadings: Array<{
        tidepoolReading: GlucoseReading;
        localReading: LocalGlucoseReading;
      }> = [];

      for (let i = 0; i < tidepoolReadings.length; i++) {
        const tidepoolReading = tidepoolReadings[i];
        const localReading = localReadings[i];

        if (existingIds.has(tidepoolReading.id)) {
          // Reading already exists, prepare for update
          existingReadings.push({ tidepoolReading, localReading });
        } else {
          // New reading, prepare for insert
          newReadings.push(localReading);
        }
      }

      // Update existing readings
      for (const { tidepoolReading, localReading } of existingReadings) {
        try {
          await this.updateExistingReading(tidepoolReading.id, tidepoolReading);
          result.stored++;
        } catch (error) {
          result.errors.push({
            readingId: tidepoolReading.id,
            error: error instanceof Error ? error.message : 'Failed to update reading',
          });
        }
      }

      // Bulk insert new readings
      if (newReadings.length > 0) {
        try {
          await db.readings.bulkAdd(newReadings);
          result.stored += newReadings.length;
        } catch (error) {
          // Handle bulk add errors (could be partial failure)
          if (error instanceof Error && error.name === 'BulkError') {
            // Dexie BulkError provides details about which items failed
            const bulkError = error as Error & {
              failures?: Array<{ key?: string; message?: string }>;
            };
            const failureCount = bulkError.failures?.length || 0;
            const successCount = newReadings.length - failureCount;

            result.stored += successCount;

            // Log individual failures
            if (bulkError.failures) {
              for (const failure of bulkError.failures) {
                result.errors.push({
                  readingId: failure.key || 'unknown',
                  error: failure.message || 'Bulk insert failed',
                });
              }
            }
          } else {
            // Complete failure
            result.errors.push({
              readingId: 'bulk_operation',
              error: error instanceof Error ? error.message : 'Bulk insert failed',
            });
          }
        }
      }

      // Clear sync queue for successfully processed readings
      const successfulIds = tidepoolIds.filter((id, index) => {
        // Check if this reading was successfully processed
        const hasError = result.errors.some(e => e.readingId === id);
        return !hasError;
      });

      if (successfulIds.length > 0) {
        await this.clearSyncQueue(successfulIds);
      }
    } catch (error) {
      // Catch-all for unexpected errors
      result.errors.push({
        readingId: 'operation',
        error: error instanceof Error ? error.message : 'Unexpected storage error',
      });
    }

    return result;
  }

  /**
   * Check which Tidepool IDs already exist in the database
   *
   * Uses efficient batch query to minimize database operations.
   * Returns a Set for O(1) lookup performance when filtering duplicates.
   *
   * @param tidepoolIds - Array of Tidepool reading IDs to check
   * @returns Set of IDs that already exist in the database
   *
   * @example
   * ```typescript
   * const idsToCheck = ['tp_123', 'tp_456', 'tp_789'];
   * const existingIds = await checkForDuplicates(idsToCheck);
   *
   * if (existingIds.has('tp_123')) {
   *   console.log('Reading tp_123 already exists');
   * }
   * ```
   */
  async checkForDuplicates(tidepoolIds: string[]): Promise<Set<string>> {
    if (!tidepoolIds || tidepoolIds.length === 0) {
      return new Set();
    }

    try {
      // Efficient batch query using Dexie's where().anyOf()
      const existingReadings = await db.readings.where('id').anyOf(tidepoolIds).toArray();

      // Return Set of IDs that exist
      return new Set(existingReadings.map(r => r.id));
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return new Set(); // Return empty set on error to allow storage to proceed
    }
  }

  /**
   * Resolve conflict between local and Tidepool reading
   *
   * Implements conflict resolution strategy:
   * - Tidepool data is the source of truth
   * - Local metadata (localId, localStoredAt) is preserved
   * - Reading is marked as synced
   * - All Tidepool fields (value, time, units, etc.) are updated
   *
   * @param localReading - Existing local reading
   * @param tidepoolReading - Updated reading from Tidepool
   * @returns Merged LocalGlucoseReading with Tidepool data and local metadata
   *
   * @example
   * ```typescript
   * const local: LocalGlucoseReading = {
   *   id: 'tp_123',
   *   localId: 'local_456',
   *   value: 110,
   *   units: 'mg/dL',
   *   synced: false,
   *   // ... other fields
   * };
   *
   * const tidepool: GlucoseReading = {
   *   id: 'tp_123',
   *   value: 115, // Updated value
   *   units: 'mg/dL',
   *   // ... other fields
   * };
   *
   * const resolved = resolveConflict(local, tidepool);
   * // Result: Tidepool data with local.localId preserved and synced=true
   * ```
   */
  resolveConflict(
    localReading: LocalGlucoseReading,
    tidepoolReading: GlucoseReading
  ): LocalGlucoseReading {
    // Transform Tidepool reading to local format
    const transformedReading = transformTidepoolToLocal(tidepoolReading, localReading.userId || '');

    // Merge: prefer Tidepool data, preserve local metadata
    const resolved: LocalGlucoseReading = {
      ...transformedReading,
      localId: localReading.localId, // Preserve original local ID
      synced: true, // Mark as synced
      isLocalOnly: false, // No longer local-only
      localStoredAt: localReading.localStoredAt, // Preserve original storage time
    };

    return resolved;
  }

  /**
   * Clear sync queue for successfully synchronized readings
   *
   * Removes items from the sync queue where the reading has a matching Tidepool ID.
   * Uses efficient batch delete to minimize database operations.
   *
   * This is called after successful storage to clean up the queue and prevent
   * redundant sync attempts.
   *
   * @param tidepoolIds - Array of Tidepool IDs that were successfully synced
   *
   * @example
   * ```typescript
   * const syncedIds = ['tp_123', 'tp_456', 'tp_789'];
   * await clearSyncQueue(syncedIds);
   * // Sync queue items for these readings are now removed
   * ```
   */
  async clearSyncQueue(tidepoolIds: string[]): Promise<void> {
    if (!tidepoolIds || tidepoolIds.length === 0) {
      return;
    }

    try {
      // Find all sync queue items with matching reading IDs
      const queueItems = await db.syncQueue.where('readingId').anyOf(tidepoolIds).toArray();

      // Extract queue item IDs for deletion
      const queueItemIds = queueItems.map(item => item.id).filter((id): id is number => id != null);

      // Bulk delete from sync queue
      if (queueItemIds.length > 0) {
        await db.syncQueue.bulkDelete(queueItemIds);
      }
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      // Don't throw - sync queue cleanup failure shouldn't fail the overall operation
    }
  }

  /**
   * Update an existing reading with Tidepool data
   *
   * Retrieves the existing local reading, resolves conflicts with Tidepool data,
   * and updates the database using ReadingsService for consistency.
   *
   * @param readingId - Tidepool ID of the reading to update
   * @param tidepoolReading - Updated reading data from Tidepool
   *
   * @throws Error if reading not found in database
   *
   * @example
   * ```typescript
   * const updatedReading: GlucoseReading = {
   *   id: 'tp_123',
   *   value: 125,
   *   units: 'mg/dL',
   *   // ... other fields
   * };
   *
   * await updateExistingReading('tp_123', updatedReading);
   * ```
   */
  async updateExistingReading(readingId: string, tidepoolReading: GlucoseReading): Promise<void> {
    // Retrieve existing reading from database
    const existingReading = await db.readings.get(readingId);

    if (!existingReading) {
      throw new Error(`Reading with id ${readingId} not found in database`);
    }

    // Resolve conflict: prefer Tidepool data
    const resolvedReading = this.resolveConflict(existingReading, tidepoolReading);

    // Update using ReadingsService for consistency
    // Note: We update by the ID field (not localId) since that's the primary key
    await this.readingsService.updateReading(readingId, resolvedReading);
  }
}

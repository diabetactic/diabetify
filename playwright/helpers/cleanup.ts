/**
 * Cleanup Helper for Playwright Tests
 *
 * Provides utilities for cleaning up test data after test runs
 */

import { APIRequestContext } from '@playwright/test';
import { HEROKU_URLS } from './config';

export interface CleanupItem {
  id: string;
  type: 'reading' | 'appointment';
}

/**
 * Delete a glucose reading via API
 *
 * @param apiContext - Playwright API request context
 * @param readingId - Reading ID to delete
 * @param authToken - Auth token for API call
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteReading(
  apiContext: APIRequestContext,
  readingId: string,
  authToken: string
): Promise<boolean> {
  try {
    const response = await apiContext.delete(
      `${HEROKU_URLS.glucoServer}/api/v1/readings/${readingId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.ok()) {
      console.log(`✅ Deleted reading ${readingId}`);
      return true;
    } else {
      console.warn(`⚠️  Failed to delete reading ${readingId}: ${response.status()}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting reading ${readingId}:`, error);
    return false;
  }
}

/**
 * Delete an appointment via API
 *
 * @param apiContext - Playwright API request context
 * @param appointmentId - Appointment ID to delete
 * @param authToken - Auth token for API call
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteAppointment(
  apiContext: APIRequestContext,
  appointmentId: string,
  authToken: string
): Promise<boolean> {
  try {
    const response = await apiContext.delete(
      `${HEROKU_URLS.apiGateway}/appointments/${appointmentId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.ok()) {
      console.log(`✅ Deleted appointment ${appointmentId}`);
      return true;
    } else {
      console.warn(`⚠️  Failed to delete appointment ${appointmentId}: ${response.status()}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting appointment ${appointmentId}:`, error);
    return false;
  }
}

/**
 * Clean up multiple test items
 *
 * @param apiContext - Playwright API request context
 * @param items - Array of items to clean up
 * @param authToken - Auth token for API calls
 * @returns Object with counts of successful and failed deletions
 */
export async function cleanupTestData(
  apiContext: APIRequestContext,
  items: CleanupItem[],
  authToken: string
): Promise<{ success: number; failed: number }> {
  console.log(`\n🧹 Cleaning up ${items.length} test items...`);

  let success = 0;
  let failed = 0;

  for (const item of items) {
    let deleted = false;

    if (item.type === 'reading') {
      deleted = await deleteReading(apiContext, item.id, authToken);
    } else if (item.type === 'appointment') {
      deleted = await deleteAppointment(apiContext, item.id, authToken);
    }

    if (deleted) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`✅ Cleanup complete: ${success} deleted, ${failed} failed\n`);

  return { success, failed };
}

/**
 * Create a cleanup tracker for use in tests
 *
 * Usage pattern:
 * ```typescript
 * const cleanup = createCleanupTracker();
 *
 * test('create reading', async ({ page }) => {
 *   const reading = await createReading(...);
 *   cleanup.track(reading.id, 'reading');
 * });
 *
 * test.afterAll(async () => {
 *   await cleanup.cleanup(apiContext, authToken);
 * });
 * ```
 */
export function createCleanupTracker() {
  const items: CleanupItem[] = [];

  return {
    /**
     * Track an item for cleanup
     */
    track(id: string, type: 'reading' | 'appointment') {
      items.push({ id, type });
    },

    /**
     * Get all tracked items
     */
    getItems(): CleanupItem[] {
      return [...items];
    },

    /**
     * Clear all tracked items
     */
    clear() {
      items.length = 0;
    },

    /**
     * Clean up all tracked items
     */
    async cleanup(
      apiContext: APIRequestContext,
      authToken: string
    ): Promise<{ success: number; failed: number }> {
      if (items.length === 0) {
        return { success: 0, failed: 0 };
      }

      const result = await cleanupTestData(apiContext, items, authToken);
      items.length = 0; // Clear after cleanup
      return result;
    },
  };
}

/**
 * Dexie database configuration for local IndexedDB storage
 * Manages glucose readings and sync queue
 */

import Dexie, { Table } from 'dexie';
import { LocalGlucoseReading } from '../models';

/**
 * Sync queue item for offline operations
 */
export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  readingId: string;
  reading?: LocalGlucoseReading;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Diabetify IndexedDB database
 * Uses Dexie for type-safe IndexedDB operations
 */
export class DiabetifyDatabase extends Dexie {
  // Tables
  readings!: Table<LocalGlucoseReading, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('DiabetifyDB');

    // Define database schema
    // Version 1: Initial schema
    this.version(1).stores({
      // Glucose readings table
      // Index by: id (primary), time, type, userId, synced
      readings: 'id, time, type, userId, synced, localStoredAt',

      // Sync queue table for offline operations
      // Index by: id (auto-increment primary), timestamp
      syncQueue: '++id, timestamp, operation',
    });

    // Map tables to TypeScript classes
    this.readings = this.table('readings');
    this.syncQueue = this.table('syncQueue');
  }

  /**
   * Clear all data (for testing/debugging)
   */
  async clearAllData(): Promise<void> {
    await this.readings.clear();
    await this.syncQueue.clear();
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [readingsCount, syncQueueCount] = await Promise.all([
      this.readings.count(),
      this.syncQueue.count(),
    ]);

    return {
      readingsCount,
      syncQueueCount,
      databaseName: this.name,
      version: this.verno,
    };
  }
}

// Singleton instance
export const db = new DiabetifyDatabase();

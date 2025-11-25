/**
 * Dexie database configuration for local IndexedDB storage
 * Manages glucose readings and sync queue
 */

import Dexie, { Table } from 'dexie';
import { LocalGlucoseReading } from '../models';
import { Appointment } from '../models/appointment.model';
import { GlucoseShareRequest } from '../models/glucose-share.model';

/**
 * Sync queue item for offline operations
 */
export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete' | 'share-glucose';
  readingId?: string;
  reading?: LocalGlucoseReading;
  appointmentId?: string; // For share-glucose operations
  payload?: GlucoseShareRequest; // For share-glucose payloads
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Diabetactic IndexedDB database
 * Uses Dexie for type-safe IndexedDB operations
 */
export class DiabetacticDatabase extends Dexie {
  // Tables
  readings!: Table<LocalGlucoseReading, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  appointments!: Table<Appointment, string>;

  constructor() {
    super('DiabetacticDB');

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

    // Version 2: Add appointments table
    this.version(2).stores({
      // Keep existing tables
      readings: 'id, time, type, userId, synced, localStoredAt',
      syncQueue: '++id, timestamp, operation, appointmentId',

      // New appointments table cache
      // Index by: id (primary), userId, dateTime, status, updatedAt
      appointments: 'id, userId, dateTime, status, updatedAt',
    });

    // Map tables to TypeScript classes
    this.readings = this.table('readings');
    this.syncQueue = this.table('syncQueue');
    this.appointments = this.table('appointments');
  }

  /**
   * Clear all data (for testing/debugging)
   */
  async clearAllData(): Promise<void> {
    await this.readings.clear();
    await this.syncQueue.clear();
    await this.appointments.clear();
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [readingsCount, syncQueueCount, appointmentsCount] = await Promise.all([
      this.readings.count(),
      this.syncQueue.count(),
      this.appointments.count(),
    ]);

    return {
      readingsCount,
      syncQueueCount,
      appointmentsCount,
      databaseName: this.name,
      version: this.verno,
    };
  }
}

// Singleton instance
export const db = new DiabetacticDatabase();

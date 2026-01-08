/**
 * Dexie database configuration for local IndexedDB storage
 * Manages glucose readings and sync queue
 */

import Dexie, { Table } from 'dexie';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { Appointment } from '@models/appointment.model';
import { LoggerService } from '@services/logger.service';
import { inject } from '@angular/core';

/**
 * Sync conflict item
 */
export interface SyncConflictItem {
  id?: number;
  readingId: string;
  localReading: LocalGlucoseReading;
  serverReading: LocalGlucoseReading;
  status: 'pending' | 'resolved';
  createdAt: number;
}

/**
 * Audit log item
 */
export interface AuditLogItem {
  id?: number;
  action: string;
  details: unknown;
  createdAt: number;
}

/**
 * Sync queue item for offline operations
 */
export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  readingId?: string;
  reading?: LocalGlucoseReading;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Diabetactic IndexedDB database
 * Uses Dexie for type-safe IndexedDB operations
 */
export class DiabetacticDatabase extends Dexie {
  private logger?: LoggerService;

  // Tables
  readings!: Table<LocalGlucoseReading, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  appointments!: Table<Appointment, string>;
  conflicts!: Table<SyncConflictItem, number>;
  auditLog!: Table<AuditLogItem, number>;

  constructor() {
    super('DiabetacticDB');
    // Try to inject LoggerService if available
    try {
      this.logger = inject(LoggerService);
    } catch {
      // LoggerService not available in this context (e.g., during tests)
      this.logger = undefined;
    }

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

    // Version 3: Add backendId index to readings for efficient sync lookups
    this.version(3).stores({
      // Add backendId index to prevent O(n) scans during sync
      readings: 'id, time, type, userId, synced, localStoredAt, backendId',
      syncQueue: '++id, timestamp, operation, appointmentId',
      appointments: 'id, userId, dateTime, status, updatedAt',
    });

    // Version 4: Add conflicts and auditLog tables
    this.version(4).stores({
      readings: 'id, time, type, userId, synced, localStoredAt, backendId',
      syncQueue: '++id, timestamp, operation, appointmentId',
      appointments: 'id, userId, dateTime, status, updatedAt',
      conflicts: '++id, readingId, status, createdAt',
      auditLog: '++id, action, createdAt',
    });

    // Map tables to TypeScript classes
    this.readings = this.table('readings');
    this.syncQueue = this.table('syncQueue');
    this.appointments = this.table('appointments');
    this.conflicts = this.table('conflicts');
    this.auditLog = this.table('auditLog');
  }

  /**
   * Clear all data (for testing/debugging)
   * Uses a transaction to prevent PrematureCommitError in tests
   */
  async clearAllData(): Promise<void> {
    try {
      await this.transaction(
        'rw',
        [this.readings, this.syncQueue, this.appointments, this.conflicts, this.auditLog],
        async () => {
          await this.readings.clear();
          await this.syncQueue.clear();
          await this.appointments.clear();
          await this.conflicts.clear();
          await this.auditLog.clear();
        }
      );
    } catch (error) {
      // Fallback for PrematureCommitError in fake-indexeddb test environments
      if ((error as Error).name === 'PrematureCommitError') {
        await this.readings.clear();
        await this.syncQueue.clear();
        await this.appointments.clear();
        await this.conflicts.clear();
        await this.auditLog.clear();
      } else {
        throw error;
      }
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [readingsCount, syncQueueCount, appointmentsCount, conflictsCount, auditLogCount] =
      await Promise.all([
        this.readings.count(),
        this.syncQueue.count(),
        this.appointments.count(),
        this.conflicts.count(),
        this.auditLog.count(),
      ]);

    return {
      readingsCount,
      syncQueueCount,
      appointmentsCount,
      conflictsCount,
      auditLogCount,
      databaseName: this.name,
      version: this.verno,
    };
  }

  /**
   * Prune old readings to free space (keeps last 90 days)
   */
  async pruneOldData(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTime = cutoffDate.toISOString();

    const deletedCount = await this.readings.where('time').below(cutoffTime).delete();

    return deletedCount;
  }

  /**
   * Handle quota exceeded by pruning old data and retrying
   */
  async handleQuotaExceeded(): Promise<void> {
    this.logger?.warn('Database', 'Storage quota exceeded, pruning old data');
    const deleted = await this.pruneOldData(60); // Keep 60 days when quota hit
    this.logger?.info('Database', `Pruned ${deleted} old readings to free space`);
  }

  /**
   * Safe add that handles quota exceeded
   */
  async safeAdd<T>(table: Table<T, string | number>, item: T): Promise<string | number> {
    try {
      return await table.add(item);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.handleQuotaExceeded();
        return await table.add(item); // Retry after pruning
      }
      throw error;
    }
  }
}

// Singleton instance
export const db = new DiabetacticDatabase();

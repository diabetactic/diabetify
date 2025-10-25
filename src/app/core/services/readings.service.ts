/**
 * ReadingsService - Manages glucose readings with IndexedDB persistence
 * Provides CRUD operations, offline queue, and statistics calculation
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { liveQuery } from 'dexie';
import {
  LocalGlucoseReading,
  GlucoseReading,
  GlucoseQueryParams,
  GlucoseStatistics,
  GlucoseType,
  GlucoseUnit,
} from '../models';
import { db, SyncQueueItem } from './database.service';

/**
 * Pagination result for readings
 */
export interface PaginatedReadings {
  readings: LocalGlucoseReading[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReadingsService {
  private readonly SYNC_RETRY_LIMIT = 3;

  // Observable for all readings (reactive)
  private _readings$ = new BehaviorSubject<LocalGlucoseReading[]>([]);
  public readonly readings$ = this._readings$.asObservable();

  // Observable for sync queue count
  private _pendingSyncCount$ = new BehaviorSubject<number>(0);
  public readonly pendingSyncCount$ = this._pendingSyncCount$.asObservable();

  constructor() {
    this.initializeObservables();
  }

  /**
   * Initialize reactive observables using Dexie's liveQuery
   */
  private initializeObservables(): void {
    // Subscribe to readings changes
    liveQuery(() => db.readings.orderBy('time').reverse().toArray()).subscribe(readings =>
      this._readings$.next(readings)
    );

    // Subscribe to sync queue changes
    liveQuery(() => db.syncQueue.count()).subscribe(count => this._pendingSyncCount$.next(count));
  }

  /**
   * Get all readings with optional pagination
   */
  async getAllReadings(limit?: number, offset: number = 0): Promise<PaginatedReadings> {
    const total = await db.readings.count();

    let query = db.readings.orderBy('time').reverse();

    if (offset > 0) {
      query = query.offset(offset);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const readings = await query.toArray();

    return {
      readings,
      total,
      hasMore: offset + readings.length < total,
      offset,
      limit: limit || total,
    };
  }

  /**
   * Get readings by date range
   */
  async getReadingsByDateRange(
    startDate: Date,
    endDate: Date,
    type?: GlucoseType
  ): Promise<LocalGlucoseReading[]> {
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    let query = db.readings.where('time').between(startTime, endTime, true, true);

    const readings = await query.toArray();

    // Filter by type if specified
    if (type) {
      return readings.filter(r => r.type === type);
    }

    return readings;
  }

  /**
   * Get reading by ID
   */
  async getReadingById(id: string): Promise<LocalGlucoseReading | undefined> {
    return await db.readings.get(id);
  }

  /**
   * Add a new reading
   */
  async addReading(reading: GlucoseReading, userId?: string): Promise<LocalGlucoseReading> {
    const localReading: LocalGlucoseReading = {
      ...reading,
      localId: this.generateLocalId(),
      synced: false,
      userId: userId || reading.id, // Use reading.id as fallback
      localStoredAt: new Date().toISOString(),
      isLocalOnly: !reading.id || reading.id.startsWith('local_'),
    };

    // Calculate status based on value and unit
    localReading.status = this.calculateGlucoseStatus(localReading.value, localReading.units);

    await db.readings.add(localReading);

    // Add to sync queue if not synced
    if (!localReading.synced) {
      await this.addToSyncQueue('create', localReading);
    }

    return localReading;
  }

  /**
   * Update an existing reading
   */
  async updateReading(
    id: string,
    updates: Partial<LocalGlucoseReading>
  ): Promise<LocalGlucoseReading | undefined> {
    const existing = await db.readings.get(id);

    if (!existing) {
      throw new Error(`Reading with id ${id} not found`);
    }

    const updated: LocalGlucoseReading = {
      ...existing,
      ...updates,
      // Recalculate status if value or unit changed
      status:
        updates.value || updates.units
          ? this.calculateGlucoseStatus(
              updates.value || existing.value,
              updates.units || existing.units
            )
          : existing.status,
    };

    await db.readings.update(id, updated);

    // Add to sync queue
    if (!updated.synced) {
      await this.addToSyncQueue('update', updated);
    }

    return updated;
  }

  /**
   * Delete a reading
   */
  async deleteReading(id: string): Promise<void> {
    const reading = await db.readings.get(id);

    if (!reading) {
      throw new Error(`Reading with id ${id} not found`);
    }

    await db.readings.delete(id);

    // Add to sync queue if it was synced before
    if (reading.synced) {
      await this.addToSyncQueue('delete', reading);
    }
  }

  /**
   * Get unsynced readings
   */
  async getUnsyncedReadings(): Promise<LocalGlucoseReading[]> {
    return await db.readings.where('synced').equals(0).toArray();
  }

  /**
   * Mark reading as synced
   */
  async markAsSynced(id: string): Promise<void> {
    await db.readings.update(id, { synced: true });
  }

  /**
   * Get readings query as Observable
   */
  getReadingsObservable(params?: GlucoseQueryParams): Observable<LocalGlucoseReading[]> {
    return from(this.queryReadings(params));
  }

  /**
   * Query readings with parameters
   */
  private async queryReadings(params?: GlucoseQueryParams): Promise<LocalGlucoseReading[]> {
    if (!params) {
      return await db.readings.orderBy('time').reverse().toArray();
    }

    let query = db.readings.toCollection();

    // Date range filter
    if (params.startDate && params.endDate) {
      query = db.readings.where('time').between(params.startDate, params.endDate, true, true);
    }

    let results = await query.toArray();

    // Type filter
    if (params.type) {
      const types = Array.isArray(params.type) ? params.type : [params.type];
      results = results.filter(r => types.includes(r.type));
    }

    // Sort
    const sortOrder = params.sort || 'desc';
    results.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    // Pagination
    const offset = params.offset || 0;
    const limit = params.limit;

    if (limit) {
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  /**
   * Calculate statistics for a period
   */
  async getStatistics(
    period: 'day' | 'week' | 'month' | 'all',
    targetMin: number = 70,
    targetMax: number = 180,
    unit: GlucoseUnit = 'mg/dL'
  ): Promise<GlucoseStatistics> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }

    const readings = await this.getReadingsByDateRange(startDate, now);

    if (readings.length === 0) {
      return this.getEmptyStatistics();
    }

    // Convert all values to the target unit
    const values = readings.map(r => this.convertToUnit(r.value, r.units, unit));

    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = this.calculateMedian(sortedValues);
    const standardDeviation = this.calculateStandardDeviation(values, average);
    const coefficientOfVariation = (standardDeviation / average) * 100;

    // Time in range calculations
    const inRange = values.filter(v => v >= targetMin && v <= targetMax).length;
    const aboveRange = values.filter(v => v > targetMax).length;
    const belowRange = values.filter(v => v < targetMin).length;

    const timeInRange = (inRange / values.length) * 100;
    const timeAboveRange = (aboveRange / values.length) * 100;
    const timeBelowRange = (belowRange / values.length) * 100;

    // Estimated A1C (using ADAG formula)
    const estimatedA1C = this.calculateEstimatedA1C(average, unit);
    const gmi = estimatedA1C; // GMI is essentially the same as eA1C

    return {
      average: Math.round(average * 10) / 10,
      median: Math.round(median * 10) / 10,
      standardDeviation: Math.round(standardDeviation * 10) / 10,
      coefficientOfVariation: Math.round(coefficientOfVariation * 10) / 10,
      timeInRange: Math.round(timeInRange * 10) / 10,
      timeAboveRange: Math.round(timeAboveRange * 10) / 10,
      timeBelowRange: Math.round(timeBelowRange * 10) / 10,
      totalReadings: readings.length,
      estimatedA1C: Math.round(estimatedA1C * 10) / 10,
      gmi: Math.round(gmi * 10) / 10,
    };
  }

  /**
   * Add operation to sync queue
   */
  private async addToSyncQueue(
    operation: 'create' | 'update' | 'delete',
    reading: LocalGlucoseReading
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      operation,
      readingId: reading.id,
      reading: operation !== 'delete' ? reading : undefined,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await db.syncQueue.add(queueItem);
  }

  /**
   * Process sync queue
   */
  async syncPendingReadings(): Promise<{ success: number; failed: number }> {
    const queueItems = await db.syncQueue.toArray();
    let success = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        // TODO: Implement actual API sync logic here
        // For now, we'll just simulate success
        console.log(`Syncing ${item.operation} for reading ${item.readingId}`);

        // Remove from queue on success
        await db.syncQueue.delete(item.id!);

        // Mark reading as synced if it was create/update
        if (item.operation !== 'delete') {
          await this.markAsSynced(item.readingId);
        }

        success++;
      } catch (error) {
        failed++;

        // Increment retry count
        const retryCount = item.retryCount + 1;

        if (retryCount >= this.SYNC_RETRY_LIMIT) {
          // Remove from queue after max retries
          await db.syncQueue.delete(item.id!);
        } else {
          // Update retry count
          await db.syncQueue.update(item.id!, {
            retryCount,
            lastError: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return { success, failed };
  }

  /**
   * Clear all local readings (use with caution)
   */
  async clearAllReadings(): Promise<void> {
    await db.readings.clear();
    await db.syncQueue.clear();
  }

  // === Helper Methods ===

  /**
   * Generate a local ID for readings
   */
  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate glucose status based on value and ranges
   */
  private calculateGlucoseStatus(
    value: number,
    unit: GlucoseUnit
  ): 'low' | 'normal' | 'high' | 'critical-low' | 'critical-high' {
    // Convert to mg/dL for consistent comparison
    const mgdl = unit === 'mmol/L' ? value * 18.0182 : value;

    if (mgdl < 54) return 'critical-low';
    if (mgdl < 70) return 'low';
    if (mgdl > 250) return 'critical-high';
    if (mgdl > 180) return 'high';
    return 'normal';
  }

  /**
   * Convert glucose value between units
   */
  private convertToUnit(value: number, from: GlucoseUnit, to: GlucoseUnit): number {
    if (from === to) return value;

    if (from === 'mmol/L' && to === 'mg/dL') {
      return value * 18.0182;
    } else if (from === 'mg/dL' && to === 'mmol/L') {
      return value / 18.0182;
    }

    return value;
  }

  /**
   * Calculate median from sorted array
   */
  private calculateMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[], mean: number): number {
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate estimated A1C using ADAG formula
   * eA1C(%) = (average glucose mg/dL + 46.7) / 28.7
   */
  private calculateEstimatedA1C(average: number, unit: GlucoseUnit): number {
    const mgdl = unit === 'mmol/L' ? average * 18.0182 : average;
    return (mgdl + 46.7) / 28.7;
  }

  /**
   * Get empty statistics object
   */
  private getEmptyStatistics(): GlucoseStatistics {
    return {
      average: 0,
      median: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      timeInRange: 0,
      timeAboveRange: 0,
      timeBelowRange: 0,
      totalReadings: 0,
      estimatedA1C: 0,
      gmi: 0,
    };
  }
}

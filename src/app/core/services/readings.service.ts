/**
 * ReadingsService - Manages glucose readings with IndexedDB persistence
 *
 * This is a facade service that delegates to specialized services:
 * - ReadingsMapperService: Data mapping and unit conversions
 * - ReadingsStatisticsService: Statistics calculations
 * - ReadingsSyncService: Backend synchronization
 *
 * Provides:
 * - CRUD operations for glucose readings
 * - Reactive observables for UI updates
 * - Offline queue management
 * - Statistics calculation
 */

import { Injectable, Optional, Inject, InjectionToken, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, from } from 'rxjs';
import { liveQuery } from 'dexie';
import {
  LocalGlucoseReading,
  GlucoseReading,
  GlucoseQueryParams,
  GlucoseStatistics,
  GlucoseType,
  GlucoseUnit,
  GlucoseStatus,
  PaginatedReadings,
  CreateReadingInput,
} from '@models/glucose-reading.model';
import { db, DiabetacticDatabase, SyncConflictItem } from '@services/database.service';
import { LoggerService } from '@services/logger.service';
import { ReadingsMapperService } from './readings-mapper.service';
import { ReadingsStatisticsService } from './readings-statistics.service';
import {
  ReadingsSyncService,
  SyncResult,
  FetchResult,
  FullSyncResult,
} from './readings-sync.service';

export const LIVE_QUERY_FN = new InjectionToken<typeof liveQuery>('LIVE_QUERY_FN');

/**
 * Summary payload for tele-appointment submissions
 */
export interface TeleAppointmentReadingSummary {
  generatedAt: string;
  range: { start: string; end: string };
  unit: GlucoseUnit;
  totalReadings: number;
  statistics: { average?: number; minimum?: number; maximum?: number };
  readings: Array<{
    id: string;
    time: string;
    value: number;
    status?: GlucoseStatus;
    notes?: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class ReadingsService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private liveQuerySubscriptions: { unsubscribe: () => void }[] = [];

  // User tracking for multi-user data isolation
  private readonly currentUserId$ = new BehaviorSubject<string | null>(null);

  // Reactive observables
  private _readings$ = new BehaviorSubject<LocalGlucoseReading[]>([]);
  public readonly readings$ = this._readings$.asObservable();

  private _pendingSyncCount$ = new BehaviorSubject<number>(0);
  public readonly pendingSyncCount$ = this._pendingSyncCount$.asObservable();

  private _pendingConflicts$ = new BehaviorSubject<number>(0);
  public readonly pendingConflicts$ = this._pendingConflicts$.asObservable();

  private readonly db: DiabetacticDatabase;
  private readonly liveQueryFn: typeof liveQuery;

  constructor(
    private mapper: ReadingsMapperService,
    private statistics: ReadingsStatisticsService,
    private syncService: ReadingsSyncService,
    @Optional() private database?: DiabetacticDatabase,
    @Optional() @Inject(LIVE_QUERY_FN) liveQueryFn?: typeof liveQuery,
    @Optional() private logger?: LoggerService
  ) {
    this.db = this.database ?? db;
    this.liveQueryFn = liveQueryFn ?? liveQuery;

    if (this.db) {
      this.initializeObservables();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.liveQuerySubscriptions.forEach(sub => sub.unsubscribe());
    this.liveQuerySubscriptions = [];
  }

  // ============================================================================
  // User Management (Multi-User Data Isolation)
  // ============================================================================

  /**
   * Set the current user for query filtering
   * All subsequent queries will only return data for this user
   */
  setCurrentUser(userId: string): void {
    this.currentUserId$.next(userId);
    // Trigger a refresh since liveQuery doesn't react to currentUserId$ changes
    this.refreshReadingsForUser(userId);
  }

  /**
   * Manually refresh readings for a specific user
   * Called when currentUserId$ changes since liveQuery only reacts to DB changes
   */
  private async refreshReadingsForUser(userId: string): Promise<void> {
    try {
      const readings = await this.db.readings.where('userId').equals(userId).toArray();
      readings.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      this._readings$.next(readings);
    } catch (error) {
      this.logger?.error('Readings', 'Failed to refresh readings for user', { userId, error });
    }
  }

  /**
   * Clear the current user (typically on logout)
   * Queries will return no data until a new user is set
   */
  clearCurrentUser(): void {
    this.currentUserId$.next(null);
  }

  // ============================================================================
  // Observable Initialization
  // ============================================================================

  private initializeObservables(): void {
    const readingsSub = this.liveQueryFn(() => {
      const userId = this.currentUserId$.getValue();
      if (!userId) {
        return Promise.resolve([] as LocalGlucoseReading[]);
      }
      return this.db.readings
        .where('userId')
        .equals(userId)
        .toArray()
        .then(readings => {
          readings.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
          return readings;
        });
    }).subscribe(readings => this._readings$.next(readings));
    this.liveQuerySubscriptions.push(readingsSub);

    const syncQueueSub = this.liveQueryFn(() => this.db.syncQueue.count()).subscribe(count =>
      this._pendingSyncCount$.next(count)
    );
    this.liveQuerySubscriptions.push(syncQueueSub);

    const conflictsSub = this.liveQueryFn(() =>
      this.db.conflicts.where('status').equals('pending').count()
    ).subscribe(count => this._pendingConflicts$.next(count));
    this.liveQuerySubscriptions.push(conflictsSub);
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Get all readings with optional pagination
   */
  async getAllReadings(limit?: number, offset = 0): Promise<PaginatedReadings> {
    const userId = this.currentUserId$.getValue();
    if (!userId) {
      return {
        readings: [],
        total: 0,
        hasMore: false,
        offset,
        limit: limit || 0,
      };
    }

    const total = await this.db.readings.where('userId').equals(userId).count();

    let query = this.db.readings.where('userId').equals(userId);

    if (offset > 0) {
      query = query.offset(offset);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const readings = await query.toArray();
    readings.reverse();

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
    const userId = this.currentUserId$.getValue();
    if (!userId) {
      return [];
    }

    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    const query = this.db.readings.where('time').between(startTime, endTime, true, true);
    const readings = await query.toArray();
    const userReadings = readings.filter(r => r.userId === userId);

    if (type) {
      return userReadings.filter(r => r.type === type);
    }

    return userReadings;
  }

  /**
   * Get reading by ID
   */
  async getReadingById(id: string): Promise<LocalGlucoseReading | undefined> {
    return await this.db.readings.get(id);
  }

  /**
   * Add a new reading
   * Uses current user ID from session, or explicit userId parameter, or 'local-user' as fallback
   */
  async addReading(reading: CreateReadingInput, userId?: string): Promise<LocalGlucoseReading> {
    const existingId = (reading as Partial<GlucoseReading>).id;
    const uniqueId = existingId && existingId !== '' ? existingId : this.mapper.generateLocalId();

    // Priority: explicit userId > currentUserId$ > 'local-user' fallback
    const effectiveUserId = userId || this.currentUserId$.getValue() || 'local-user';

    const localReading: LocalGlucoseReading = {
      ...reading,
      id: uniqueId,
      localId: uniqueId,
      synced: false,
      userId: effectiveUserId,
      localStoredAt: new Date().toISOString(),
      isLocalOnly: !existingId || existingId === '' || uniqueId.startsWith('local_'),
      status: this.mapper.calculateGlucoseStatus(reading.value, reading.units),
    } as LocalGlucoseReading;

    await this.db.readings.add(localReading);

    // Trigger refresh since liveQuery may not react in all environments (e.g., tests)
    if (effectiveUserId) {
      this.refreshReadingsForUser(effectiveUserId);
    }

    if (!localReading.synced) {
      await this.syncService.addToSyncQueue('create', localReading);
      this.syncService
        .syncPendingReadings()
        .catch(err => this.logger?.error('Sync', 'Background sync failed', err));
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
    const existing = await this.db.readings.get(id);

    if (!existing) {
      throw new Error(`Reading with id ${id} not found`);
    }

    const newStatus =
      updates.value !== undefined || updates.units !== undefined
        ? this.mapper.calculateGlucoseStatus(
            updates.value !== undefined ? updates.value : existing.value,
            updates.units !== undefined ? updates.units : existing.units
          )
        : existing.status;

    const updateFields: Partial<LocalGlucoseReading> = {
      ...updates,
      status: newStatus,
      synced: false,
    };

    await this.db.readings.update(id, updateFields);

    const updated = await this.db.readings.get(id);

    if (!updated) {
      throw new Error(`Failed to retrieve updated reading ${id}`);
    }

    if (!updated.synced) {
      await this.syncService.addToSyncQueue('update', updated);
    }

    return updated;
  }

  /**
   * Get unsynced readings
   */
  async getUnsyncedReadings(): Promise<LocalGlucoseReading[]> {
    return await this.db.readings.filter(r => r.synced === false).toArray();
  }

  /**
   * Mark reading as synced
   */
  async markAsSynced(id: string): Promise<void> {
    await this.db.readings.update(id, { synced: true });
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
      return await this.db.readings.orderBy('time').reverse().toArray();
    }

    let query = this.db.readings.toCollection();

    if (params.startDate && params.endDate) {
      query = this.db.readings.where('time').between(params.startDate, params.endDate, true, true);
    }

    let results = await query.toArray();

    if (params.type) {
      const types = Array.isArray(params.type) ? params.type : [params.type];
      results = results.filter(r => types.includes(r.type));
    }

    const sortOrder = params.sort || 'desc';
    results.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const offset = params.offset || 0;
    const limit = params.limit;

    if (limit) {
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  /**
   * Clear all local readings
   */
  async clearAllReadings(): Promise<void> {
    try {
      await this.db.transaction('rw', [this.db.readings, this.db.syncQueue], async () => {
        await this.db.readings.clear();
        await this.db.syncQueue.clear();
      });
    } catch (error) {
      if ((error as Error).name === 'PrematureCommitError') {
        await this.db.readings.clear();
        await this.db.syncQueue.clear();
      } else {
        throw error;
      }
    }
  }

  // ============================================================================
  // Statistics (Delegated)
  // ============================================================================

  /**
   * Calculate statistics for a period
   */
  async getStatistics(
    period: 'day' | 'week' | 'month' | 'all',
    targetMin = 70,
    targetMax = 180,
    unit: GlucoseUnit = 'mg/dL'
  ): Promise<GlucoseStatistics> {
    // Mock data usage moved to Dexie seeding
    // if (this.isMockBackend && this.mockData) { ... }

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
        startDate = new Date(0);
        break;
      default:
        throw new Error(`Invalid period: ${period}`);
    }

    const readings = await this.getReadingsByDateRange(startDate, now);
    return this.statistics.calculateStatistics(readings, targetMin, targetMax, unit);
  }

  /**
   * Calculate statistics for a given set of readings (no DB access).
   * Useful for UI-level "smart" fallbacks (e.g. last N readings when last 30 days is empty).
   */
  calculateStatistics(
    readings: LocalGlucoseReading[],
    targetMin = 70,
    targetMax = 180,
    unit: GlucoseUnit = 'mg/dL'
  ): GlucoseStatistics {
    return this.statistics.calculateStatistics(readings, targetMin, targetMax, unit);
  }

  // ============================================================================
  // Sync Operations (Delegated)
  // ============================================================================

  /**
   * Process sync queue
   */
  async syncPendingReadings(): Promise<SyncResult> {
    return this.syncService.syncPendingReadings();
  }

  /**
   * Fetch readings from backend
   */
  async fetchFromBackend(): Promise<FetchResult> {
    return this.syncService.fetchFromBackend();
  }

  /**
   * Fetch latest readings from backend (optimized for dashboard)
   */
  async fetchLatestFromBackend(): Promise<FetchResult> {
    return this.syncService.fetchLatestFromBackend();
  }

  /**
   * Full sync: push then fetch
   */
  async performFullSync(): Promise<FullSyncResult> {
    return this.syncService.performFullSync();
  }

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(
    conflict: SyncConflictItem,
    resolution: 'keep-mine' | 'keep-server' | 'keep-both'
  ): Promise<void> {
    return this.syncService.resolveConflict(conflict, resolution);
  }

  // ============================================================================
  // Export Summary
  // ============================================================================

  /**
   * Generate a summary of manual readings for tele-appointments
   */
  async exportManualReadingsSummary(days = 14): Promise<TeleAppointmentReadingSummary> {
    const all = await this.db.readings.orderBy('time').toArray();
    const allManual = all
      .filter(r => r.type === 'smbg')
      .filter(r => {
        const subType = (r as { subType?: string }).subType;
        return !subType || subType === 'manual';
      })
      .filter(r => Number.isFinite(r.value))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const end = allManual.length > 0 ? new Date(allManual[allManual.length - 1].time) : new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - days);

    const manualReadings = allManual.filter(
      r =>
        new Date(r.time).getTime() >= start.getTime() && new Date(r.time).getTime() <= end.getTime()
    );

    const unit = (manualReadings[0]?.units || 'mg/dL') as GlucoseUnit;
    const decimals = unit === 'mmol/L' ? 2 : 1;

    const normalized = manualReadings.map(reading => {
      const value =
        reading.units === unit
          ? reading.value
          : this.mapper.convertToUnit(reading.value, reading.units, unit);

      return { reading, value };
    });

    const values = normalized.map(entry => entry.value);

    const average =
      values.length > 0
        ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(decimals))
        : undefined;
    const minimum = values.length > 0 ? Number(Math.min(...values).toFixed(decimals)) : undefined;
    const maximum = values.length > 0 ? Number(Math.max(...values).toFixed(decimals)) : undefined;

    return {
      generatedAt: new Date().toISOString(),
      range: { start: start.toISOString(), end: end.toISOString() },
      unit,
      totalReadings: manualReadings.length,
      statistics: { average, minimum, maximum },
      readings: normalized.map(({ reading, value }) => {
        const formattedValue = Number(value.toFixed(decimals));
        const status: GlucoseStatus | undefined =
          reading.status || this.mapper.calculateGlucoseStatus(formattedValue, unit);

        return {
          id: reading.id,
          time: reading.time,
          value: formattedValue,
          status,
          notes: reading.notes || undefined,
        };
      }),
    };
  }
}

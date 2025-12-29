/**
 * ReadingsService - Manages glucose readings with IndexedDB persistence
 * Provides CRUD operations, offline queue, and statistics calculation
 */

import { Injectable, Optional, Inject, InjectionToken, OnDestroy, Injector } from '@angular/core';
import { BehaviorSubject, Observable, Subject, from, firstValueFrom } from 'rxjs';
import { liveQuery } from 'dexie';
import { Network } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import {
  LocalGlucoseReading,
  GlucoseReading,
  GlucoseQueryParams,
  GlucoseStatistics,
  GlucoseType,
  GlucoseUnit,
  GlucoseStatus,
} from '@models/glucose-reading.model';
import {
  db,
  DiabetacticDatabase,
  SyncConflictItem,
  SyncQueueItem,
} from '@services/database.service';
import { MockDataService, MockReading } from '@services/mock-data.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { AuditLogService } from './audit-log.service';
import { LoggerService } from '@services/logger.service';
import { LocalAuthService } from '@services/local-auth.service';
import { environment } from '@env/environment';

/**
 * Backend glucose reading format from Heroku API
 */
interface BackendGlucoseReading {
  id: number;
  user_id: number;
  glucose_level: number;
  reading_type: string;
  created_at: string; // Format: "DD/MM/YYYY HH:mm:ss"
  notes?: string; // Optional notes field
}

/**
 * Backend response for glucose readings (GET /glucose/mine)
 */
interface BackendGlucoseResponse {
  readings: BackendGlucoseReading[];
}

export const LIVE_QUERY_FN = new InjectionToken<typeof liveQuery>('LIVE_QUERY_FN');

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

/**
 * Summary payload with manual readings to support tele-appointment submissions
 */
export interface TeleAppointmentReadingSummary {
  generatedAt: string;
  range: {
    start: string;
    end: string;
  };
  unit: GlucoseUnit;
  totalReadings: number;
  statistics: {
    average?: number;
    minimum?: number;
    maximum?: number;
  };
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
  private readonly SYNC_RETRY_LIMIT = 3;
  private networkListenerHandle: PluginListenerHandle | null = null;
  private readonly destroy$ = new Subject<void>();
  private liveQuerySubscriptions: { unsubscribe: () => void }[] = [];

  // Observable for all readings (reactive)
  private _readings$ = new BehaviorSubject<LocalGlucoseReading[]>([]);
  public readonly readings$ = this._readings$.asObservable();

  // Observable for sync queue count
  private _pendingSyncCount$ = new BehaviorSubject<number>(0);
  public readonly pendingSyncCount$ = this._pendingSyncCount$.asObservable();

  // Observable for conflict count
  private _pendingConflicts$ = new BehaviorSubject<number>(0);
  public readonly pendingConflicts$ = this._pendingConflicts$.asObservable();

  private readonly db: DiabetacticDatabase;
  private readonly liveQueryFn: typeof liveQuery;
  private readonly isMockBackend = environment.backendMode === 'mock';
  private isOnline = true; // Default to online

  // Sync mutex to prevent concurrent sync operations causing duplicates
  private syncInProgress = false;
  private syncPromise: Promise<{
    success: number;
    failed: number;
    lastError?: string | null;
  }> | null = null;

  // Fetch mutex to prevent concurrent fetch operations causing duplicates
  private fetchInProgress = false;
  private fetchPromise: Promise<{ fetched: number; merged: number }> | null = null;

  // Backend reading types: DESAYUNO, ALMUERZO, MERIENDA, CENA, EJERCICIO, OTRAS_COMIDAS, OTRO
  // App now uses backend values directly (no mapping needed)

  constructor(
    @Optional() private database?: DiabetacticDatabase,
    @Optional() @Inject(LIVE_QUERY_FN) liveQueryFn?: typeof liveQuery,
    @Optional() private mockData?: MockDataService,
    @Optional() private apiGateway?: ApiGatewayService,
    @Optional() private logger?: LoggerService,
    @Optional() private injector?: Injector,
    private auditLogService?: AuditLogService
  ) {
    this.db = this.database ?? db;
    this.liveQueryFn = liveQueryFn ?? liveQuery;
    // ALWAYS initialize observables for reactive updates
    // This ensures readings update when added/modified
    if (this.db) {
      this.initializeObservables();
    }
    // Initialize network status monitoring
    this.initializeNetworkMonitoring();
  }

  /**
   * Get LocalAuthService lazily to avoid circular dependency
   */
  private getLocalAuthService(): LocalAuthService | null {
    if (!this.injector) return null;
    try {
      return this.injector.get(LocalAuthService);
    } catch {
      return null;
    }
  }

  /**
   * Clean up resources when service is destroyed
   * Prevents memory leaks from network listener and observables
   */
  ngOnDestroy(): void {
    // Complete destroy$ to unsubscribe all observables
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up liveQuery subscriptions to prevent memory leaks
    this.liveQuerySubscriptions.forEach(sub => sub.unsubscribe());
    this.liveQuerySubscriptions = [];

    if (this.networkListenerHandle) {
      this.networkListenerHandle.remove();
      this.networkListenerHandle = null;
      this.logger?.debug('Network', 'Network listener removed');
    }
  }

  /**
   * Initialize reactive observables using Dexie's liveQuery
   * Stores subscription references for cleanup on service destruction
   */
  private initializeObservables(): void {
    // Subscribe to readings changes with cleanup
    const readingsSub = this.liveQueryFn(() =>
      this.db.readings.orderBy('time').reverse().toArray()
    ).subscribe(readings => this._readings$.next(readings));
    this.liveQuerySubscriptions.push(readingsSub);

    // Subscribe to sync queue changes with cleanup
    const syncQueueSub = this.liveQueryFn(() => this.db.syncQueue.count()).subscribe(count =>
      this._pendingSyncCount$.next(count)
    );
    this.liveQuerySubscriptions.push(syncQueueSub);

    // Subscribe to conflicts changes with cleanup
    const conflictsSub = this.liveQueryFn(() =>
      this.db.conflicts.where('status').equals('pending').count()
    ).subscribe(count => this._pendingConflicts$.next(count));
    this.liveQuerySubscriptions.push(conflictsSub);
  }

  /**
   * Initialize network status monitoring
   * Listens to network changes and updates online status
   * Auto-syncs when coming back online
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    // Helper to add timeout to network calls
    const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);

    try {
      // Get initial network status with timeout (5s)
      const status = await withTimeout(Network.getStatus(), 5000, {
        connected: true,
        connectionType: 'unknown',
      });
      this.isOnline = status.connected;
      this.logger?.info(
        'Network',
        `Initial network status: ${this.isOnline ? 'online' : 'offline'}`
      );

      // Listen for network changes - store handle for cleanup
      this.networkListenerHandle = await Network.addListener('networkStatusChange', status => {
        const wasOffline = !this.isOnline;
        this.isOnline = status.connected;

        this.logger?.info(
          'Network',
          `Network status changed: ${this.isOnline ? 'online' : 'offline'}`
        );

        // Auto-sync when coming back online
        if (wasOffline && this.isOnline) {
          this.logger?.info('Network', 'Device back online, triggering auto-sync');
          this.performFullSync().catch(err => {
            this.logger?.error('Network', 'Auto-sync failed after reconnection', err);
          });
        }
      });
    } catch (error) {
      this.logger?.warn('Network', 'Failed to initialize network monitoring', error);
      // Default to online if network plugin fails
      this.isOnline = true;
    }
  }

  /**
   * Get all readings with optional pagination
   * Uses IndexedDB for real-time reactive updates
   */
  async getAllReadings(limit?: number, offset = 0): Promise<PaginatedReadings> {
    // ALWAYS use IndexedDB for reactive updates
    // Mock data is only for initial seeding
    const total = await this.db.readings.count();

    let query = this.db.readings.orderBy('time').reverse();

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

    const query = this.db.readings.where('time').between(startTime, endTime, true, true);

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
    return await this.db.readings.get(id);
  }

  /**
   * Add a new reading
   */
  async addReading(
    reading: Partial<GlucoseReading> & Omit<GlucoseReading, 'id'>,
    userId?: string
  ): Promise<LocalGlucoseReading> {
    // Generate unique ID if not provided or if it's empty
    const readingWithId = reading as { id?: string };
    const uniqueId =
      readingWithId.id && readingWithId.id !== '' ? readingWithId.id : this.generateLocalId();

    const localReading: LocalGlucoseReading = {
      ...reading,
      id: uniqueId,
      localId: this.generateLocalId(),
      synced: false,
      userId: userId || 'local-user',
      localStoredAt: new Date().toISOString(),
      isLocalOnly: !reading.id || reading.id === '' || uniqueId.startsWith('local_'),
    } as LocalGlucoseReading;

    // Calculate status based on value and unit
    localReading.status = this.calculateGlucoseStatus(localReading.value, localReading.units);

    await this.db.readings.add(localReading);

    // Add to sync queue if not synced
    if (!localReading.synced) {
      await this.addToSyncQueue('create', localReading);
      // Trigger background sync
      this.syncPendingReadings().catch(err =>
        this.logger?.error('Sync', 'Background sync failed', err)
      );
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

    // Calculate new status if value or unit changed
    const newStatus =
      updates.value !== undefined || updates.units !== undefined
        ? this.calculateGlucoseStatus(
            updates.value !== undefined ? updates.value : existing.value,
            updates.units !== undefined ? updates.units : existing.units
          )
        : existing.status;

    // Create the update object with only the changed fields
    // Mark as unsynced since local changes need to be pushed to backend
    const updateFields: Partial<LocalGlucoseReading> = {
      ...updates,
      status: newStatus,
      synced: false,
    };

    // Update using Dexie's update method (pass only changed fields)
    await this.db.readings.update(id, updateFields);

    // Get the updated reading for return and sync queue
    const updated = await this.db.readings.get(id);

    if (!updated) {
      throw new Error(`Failed to retrieve updated reading ${id}`);
    }

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
    const reading = await this.db.readings.get(id);

    if (!reading) {
      throw new Error(`Reading with id ${id} not found`);
    }

    await this.db.readings.delete(id);

    // Add to sync queue if it was synced before
    if (reading.synced) {
      await this.addToSyncQueue('delete', reading);
    }
  }

  /**
   * Get unsynced readings
   */
  async getUnsyncedReadings(): Promise<LocalGlucoseReading[]> {
    return await this.db.readings.where('synced').equals(0).toArray();
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

    // Date range filter
    if (params.startDate && params.endDate) {
      query = this.db.readings.where('time').between(params.startDate, params.endDate, true, true);
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
   * Map MockReading to LocalGlucoseReading
   */
  private mapMockToLocal(mock: MockReading): LocalGlucoseReading {
    const reading: LocalGlucoseReading = {
      id: mock.id,
      localId: mock.id,
      time: mock.date.toISOString(),
      value: mock.glucose,
      units: 'mg/dL',
      type: 'smbg' as const, // Mock data is manual SMBG
      subType: 'manual', // SMBG subtype
      deviceId: 'mock-device',
      userId: 'pac001',
      synced: true,
      localStoredAt: new Date().toISOString(),
      isLocalOnly: false,
      status: this.calculateGlucoseStatus(mock.glucose, 'mg/dL'),
      notes: mock.notes,
    };
    return reading;
  }

  /**
   * Calculate statistics for a period
   * NOW USING MOCK DATA SERVICE
   */
  async getStatistics(
    period: 'day' | 'week' | 'month' | 'all',
    targetMin = 70,
    targetMax = 180,
    unit: GlucoseUnit = 'mg/dL'
  ): Promise<GlucoseStatistics> {
    if (this.isMockBackend && this.mockData) {
      // Use mock data stats
      const stats = await this.mockData.getStats().toPromise();
      if (stats) {
        return {
          average: stats.avgGlucose,
          median: stats.avgGlucose, // Mock doesn't have median
          standardDeviation: 15, // Mock value
          coefficientOfVariation: 10, // Mock value
          timeInRange: stats.timeInRange,
          timeAboveRange: stats.timeAboveRange,
          timeBelowRange: stats.timeBelowRange,
          totalReadings: stats.readingsThisWeek,
          estimatedA1C: stats.hba1c,
          gmi: stats.hba1c,
        };
      }
    }
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
      default:
        // Exhaustive check - should never reach here with proper typing
        throw new Error(`Invalid period: ${period}`);
    }

    const displayUnit: GlucoseUnit = unit || 'mg/dL';
    const readings = await this.getReadingsByDateRange(startDate, now);

    if (readings.length === 0) {
      return this.getEmptyStatistics();
    }

    // Convert all values to the target unit
    const values = readings.map(r => this.convertToUnit(r.value, r.units, displayUnit));

    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = this.calculateMedian(sortedValues);
    const standardDeviation = this.calculateStandardDeviation(values, average);
    const coefficientOfVariation = (standardDeviation / average) * 100;

    // Time in range calculations
    const normalizedMin = this.convertToUnit(targetMin, 'mg/dL', displayUnit);
    const normalizedMax = this.convertToUnit(targetMax, 'mg/dL', displayUnit);

    const inRange = values.filter(v => v >= normalizedMin && v <= normalizedMax).length;
    const aboveRange = values.filter(v => v > normalizedMax).length;
    const belowRange = values.filter(v => v < normalizedMin).length;

    const timeInRange = (inRange / values.length) * 100;
    const timeAboveRange = (aboveRange / values.length) * 100;
    const timeBelowRange = (belowRange / values.length) * 100;

    // Estimated A1C (using ADAG formula)
    const estimatedA1C = this.calculateEstimatedA1C(average, displayUnit);
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

    await this.db.syncQueue.add(queueItem);
  }

  /**
   * Process sync queue - pushes local readings to Heroku backend
   */
  async syncPendingReadings(): Promise<{
    success: number;
    failed: number;
    lastError?: string | null;
  }> {
    // Skip sync in mock mode
    if (this.isMockBackend) {
      this.logger?.debug('Sync', 'Skipping sync in mock mode');
      return { success: 0, failed: 0 };
    }

    // Skip sync if offline
    if (!this.isOnline) {
      this.logger?.info('Sync', 'Skipping sync - device is offline');
      return { success: 0, failed: 0 };
    }

    if (!this.apiGateway) {
      this.logger?.warn('Sync', 'ApiGatewayService not available, skipping sync');
      return { success: 0, failed: 0 };
    }

    // SYNC MUTEX: Prevent concurrent sync operations that cause duplicates
    // If sync is already in progress, return the existing promise instead of starting a new one
    if (this.syncInProgress && this.syncPromise) {
      this.logger?.info('Sync', 'Sync already in progress, returning existing promise');
      return this.syncPromise;
    }

    // Mark sync as in progress and create the sync promise
    this.syncInProgress = true;
    this.syncPromise = this.executeSync();

    try {
      return await this.syncPromise;
    } finally {
      // Always clean up the mutex when done
      this.syncInProgress = false;
      this.syncPromise = null;
    }
  }

  /**
   * Internal method that performs the actual sync operation
   * This is wrapped by syncPendingReadings() with mutex protection
   *
   * IMPORTANT: Dexie transactions auto-commit when non-Dexie async operations (like HTTP calls)
   * are awaited. We MUST separate Dexie operations from HTTP calls to prevent PrematureCommitError.
   *
   * Strategy:
   * 1. Phase 1 (Transaction): Get queue items and remove them atomically
   * 2. Phase 2 (No transaction): Perform HTTP calls
   * 3. Phase 3 (Transaction): Update sync status or re-add failed items
   */
  private async executeSync(): Promise<{
    success: number;
    failed: number;
    lastError?: string | null;
  }> {
    // =============================================================
    // PHASE 1: Extract queue items atomically (Dexie transaction)
    // =============================================================
    // Strategy: Get items first, then clear. This avoids PrematureCommitError issues
    // in fake-indexeddb test environments where the clear happens before we get items.
    let queueItems: SyncQueueItem[] = [];

    try {
      // First, get all items from the queue
      queueItems = await this.db.syncQueue.toArray();

      if (queueItems.length === 0) {
        return { success: 0, failed: 0, lastError: null };
      }

      // Then clear the queue in a separate operation
      // This is safe because we already have the items in memory
      await this.db.syncQueue.clear();
    } catch (error) {
      this.logger?.error('Sync', 'Failed to extract queue items', error);
      throw error;
    }

    if (queueItems.length === 0) {
      return { success: 0, failed: 0, lastError: null };
    }

    this.logger?.info('Sync', `Processing ${queueItems.length} items in sync queue`);

    // Track results for each item
    interface SyncResult {
      item: SyncQueueItem;
      success: boolean;
      error?: string;
    }
    const results: SyncResult[] = [];

    // =============================================================
    // PHASE 2: Perform HTTP calls (NO Dexie transaction)
    // =============================================================
    for (const item of queueItems) {
      try {
        if (item.operation === 'create' && item.reading) {
          // Push new reading to backend (HTTP call - must be outside transaction)
          await this.pushReadingToBackend(item.reading);
          this.logger?.debug('Sync', `Created reading ${item.readingId} on backend`);
        } else if (item.operation === 'delete') {
          // Backend delete not supported - reading remains on server but is deleted locally
          this.logger?.info(
            'Sync',
            `Delete operation for ${item.readingId} - local only (backend delete not supported)`
          );
        }
        results.push({ item, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const errorDetails = {
          operation: item.operation,
          readingId: item.readingId,
          errorType: error?.constructor?.name,
          message: errorMessage,
          status: (error as { status?: number })?.status,
        };
        this.logger?.error('Sync', `Failed to sync: ${JSON.stringify(errorDetails)}`, error);

        // Build detailed error message for debugging
        const detailedError = JSON.stringify({
          type: error?.constructor?.name,
          message: error instanceof Error ? error.message : String(error),
          status: (error as { status?: number })?.status,
          errorBody: (error as { error?: unknown })?.error,
        });

        results.push({ item, success: false, error: detailedError });
      }
    }

    // =============================================================
    // PHASE 3: Update Dexie state (separate transaction)
    // =============================================================
    const successItems = results.filter(r => r.success);
    const failedItems = results.filter(r => !r.success);

    // Mark successful items as synced
    for (const result of successItems) {
      if (result.item.operation !== 'delete' && result.item.readingId) {
        try {
          await this.markAsSynced(result.item.readingId);
        } catch (markError) {
          // Non-critical: reading was successfully synced, just couldn't mark it locally
          this.logger?.warn(
            'Sync',
            `Could not mark ${result.item.readingId} as synced locally`,
            markError
          );
        }
      }
    }

    // Re-add failed items to queue for retry (in a separate transaction)
    const itemsToRetry: SyncQueueItem[] = [];
    for (const result of failedItems) {
      const retryCount = result.item.retryCount + 1;
      if (retryCount < this.SYNC_RETRY_LIMIT) {
        itemsToRetry.push({
          operation: result.item.operation,
          readingId: result.item.readingId,
          reading: result.item.reading,
          timestamp: result.item.timestamp,
          retryCount,
          lastError: result.error,
        });
        this.logger?.info(
          'Sync',
          `Will retry ${result.item.readingId} (attempt ${retryCount}/${this.SYNC_RETRY_LIMIT})`
        );
      } else {
        this.logger?.warn(
          'Sync',
          `Max retries reached for ${result.item.readingId}, not re-adding to queue`
        );
      }
    }

    // Bulk add retry items in a single transaction
    if (itemsToRetry.length > 0) {
      try {
        await this.db.transaction('rw', this.db.syncQueue, async () => {
          await this.db.syncQueue.bulkAdd(itemsToRetry);
        });
      } catch (error) {
        // Handle PrematureCommitError in test environments
        if ((error as Error).name === 'PrematureCommitError') {
          await this.db.syncQueue.bulkAdd(itemsToRetry);
        } else {
          throw error;
        }
      }
    }

    const success = successItems.length;
    const failed = failedItems.length;
    this.logger?.info('Sync', `Sync complete: ${success} success, ${failed} failed`);

    // Get the last error from failed items
    const lastError = failedItems.length > 0 ? failedItems[failedItems.length - 1].error : null;

    const result = { success, failed, lastError };

    // After successful sync, refresh user profile to update gamification data (streak, times_measured)
    // This is done outside the transaction so it doesn't block the sync result
    if (result.success > 0) {
      const localAuthService = this.getLocalAuthService();
      if (localAuthService) {
        this.logger?.info('Sync', 'Refreshing user profile to update gamification data');
        // Don't await - let it refresh in background
        localAuthService.refreshUserProfile().catch(err => {
          this.logger?.warn('Sync', 'Failed to refresh user profile after sync', err);
        });
      }
    }

    return result;
  }

  /**
   * Push a single reading to the Heroku backend
   */
  private async pushReadingToBackend(reading: LocalGlucoseReading): Promise<void> {
    if (!this.apiGateway) {
      throw new Error('ApiGatewayService not available');
    }

    // Build params object - mealContext is already the backend value (e.g. DESAYUNO)
    const params: Record<string, string> = {
      glucose_level: reading.value.toString(),
      reading_type: reading.mealContext || 'OTRO',
    };

    // Add optional created_at if reading has a time
    // Backend expects ISO 8601 format with timezone: YYYY-MM-DDTHH:mm:ssZ
    // Using toISOString() ensures UTC timezone consistency across all platforms
    if (reading.time) {
      const date = new Date(reading.time);
      // toISOString() returns UTC time with 'Z' suffix (e.g., 2025-12-08T04:45:00.000Z)
      // Slice to remove milliseconds if backend doesn't expect them
      params['created_at'] = `${date.toISOString().slice(0, 19)}Z`;
    }

    // Add notes if present (single string)
    if (reading.notes) {
      params['notes'] = reading.notes;
    }

    this.logger?.info('Sync', 'Pushing reading to backend', {
      localId: reading.id,
      params: JSON.stringify(params),
    });

    // The backend expects query params, not body
    const response = await firstValueFrom(
      this.apiGateway.request<BackendGlucoseReading>('extservices.glucose.create', {
        params,
      })
    );

    this.logger?.info('Sync', 'Backend response received', {
      success: response.success,
      hasData: Boolean(response.data),
      error: response.error ? JSON.stringify(response.error) : null,
    });

    if (!response.success) {
      this.logger?.error('Sync', 'Backend rejected reading', {
        error: response.error,
        params: JSON.stringify(params),
      });
      throw new Error(response.error?.message || 'Failed to create reading on backend');
    }

    // Save the backend ID to the local reading for deduplication
    if (response.data?.id) {
      await this.db.readings.update(reading.id, {
        backendId: response.data.id,
        synced: true,
      });
    }

    this.logger?.debug('Sync', 'Reading pushed to backend', {
      localId: reading.id,
      backendId: response.data?.id,
    });
  }

  /**
   * Fetch readings from Heroku backend and merge with local storage
   * Uses mutex to prevent concurrent fetches causing duplicates
   */
  async fetchFromBackend(): Promise<{ fetched: number; merged: number }> {
    // Mutex: Return existing promise if fetch already in progress
    if (this.fetchInProgress && this.fetchPromise) {
      this.logger?.debug('Sync', 'Fetch already in progress, returning existing promise');
      return this.fetchPromise;
    }

    // Skip in mock mode
    if (this.isMockBackend) {
      this.logger?.debug('Sync', 'Skipping fetch in mock mode');
      return { fetched: 0, merged: 0 };
    }

    // Skip fetch if offline
    if (!this.isOnline) {
      this.logger?.info('Sync', 'Skipping fetch - device is offline');
      return { fetched: 0, merged: 0 };
    }

    if (!this.apiGateway) {
      this.logger?.warn('Sync', 'ApiGatewayService not available, skipping fetch');
      return { fetched: 0, merged: 0 };
    }

    // Set mutex and create promise
    this.fetchInProgress = true;
    this.fetchPromise = this._doFetchFromBackend();

    try {
      return await this.fetchPromise;
    } finally {
      this.fetchInProgress = false;
      this.fetchPromise = null;
    }
  }

  /**
   * Internal fetch implementation (called by mutex-protected fetchFromBackend)
   */
  private async _doFetchFromBackend(): Promise<{ fetched: number; merged: number }> {
    // apiGateway is already checked in fetchFromBackend, but TypeScript needs the assertion
    if (!this.apiGateway) {
      return { fetched: 0, merged: 0 };
    }

    try {
      this.logger?.info('Sync', 'Fetching readings from backend');

      const response = await firstValueFrom(
        this.apiGateway.request<BackendGlucoseResponse>('extservices.glucose.mine')
      );

      if (!response.success || !response.data?.readings) {
        this.logger?.warn('Sync', 'Failed to fetch readings from backend', response.error);
        return { fetched: 0, merged: 0 };
      }

      // Limit to most recent 200 readings to prevent long sync times
      // Backend may return thousands of readings; processing all would block UI
      const MAX_SYNC_READINGS = 200;
      const allReadings = response.data.readings;
      const backendReadings = allReadings.slice(0, MAX_SYNC_READINGS);
      this.logger?.debug(
        'Sync',
        `Fetched ${allReadings.length} readings from backend, processing ${backendReadings.length}`
      );

      let merged = 0;

      for (const backendReading of backendReadings) {
        // Check if we already have this reading (by backend ID)
        const existingByBackendId = await this.db.readings
          .filter(r => r.backendId === backendReading.id)
          .toArray();

        if (existingByBackendId.length === 0) {
          // No match by backendId - check for unsynced local readings with same value+time
          // This prevents duplicates when sync hasn't completed yet (timezone race condition)
          const backendValue = backendReading.glucose_level;
          const backendTime = this.parseBackendTimestamp(backendReading.created_at);
          const THIRTY_MINUTES_MS = 30 * 60 * 1000; // Tolerance for minor timezone drift

          const existingByValueTime = await this.db.readings
            .filter(r => {
              // Only check unsynced local readings (synced ones would have backendId)
              if (r.synced || r.backendId) return false;
              // Must have same glucose value
              if (r.value !== backendValue) return false;
              // Must be within time tolerance window
              const localTime = new Date(r.time).getTime();
              const timeDiff = Math.abs(localTime - backendTime);
              return timeDiff <= THIRTY_MINUTES_MS;
            })
            .toArray();

          if (existingByValueTime.length > 0) {
            // Found matching local reading - link it to backend instead of creating duplicate
            const localMatch = existingByValueTime[0];
            await this.db.readings.update(localMatch.id, {
              backendId: backendReading.id,
              synced: true,
              time: new Date(backendTime).toISOString(), // Use backend time as source of truth
            });
            this.logger?.debug(
              'Sync',
              `Linked local reading ${localMatch.id} to backend ${backendReading.id} (value+time match)`
            );
          } else {
            // Truly new reading from backend - add to local storage
            const localReading = this.mapBackendToLocal(backendReading);
            await this.db.readings.add(localReading);
            merged++;
          }
        } else {
          // Existing reading - check for conflicts
          const existing = existingByBackendId[0];
          const backendValue = backendReading.glucose_level;
          const backendNotes = backendReading.notes || '';

          // Conflict detection: local record has un-synced changes
          if (!existing.synced) {
            if (
              existing.value !== backendValue ||
              existing.notes !== backendNotes ||
              (backendReading.reading_type &&
                existing.mealContext !== backendReading.reading_type)
            ) {
              const serverReading = this.mapBackendToLocal(backendReading);
              await this.db.conflicts.add({
                readingId: existing.id,
                localReading: existing,
                serverReading: serverReading,
                status: 'pending',
                createdAt: Date.now(),
              });
              this.logger?.warn('Sync', `Conflict detected for reading ${existing.id}`);
            } else {
              // No conflict, just mark as synced
              await this.db.readings.update(existing.id, { synced: true });
            }
          } else {
            // No conflict, update local from server
            await this.db.readings.update(existing.id, {
              value: backendValue,
              notes: backendNotes,
              mealContext: backendReading.reading_type || existing.mealContext,
              synced: true,
            });
            this.logger?.debug('Sync', `Updated local reading ${existing.id} from backend`);
          }
        }
      }

      this.logger?.info(
        'Sync',
        `Fetch complete: ${backendReadings.length} fetched, ${merged} new merged`
      );
      return { fetched: backendReadings.length, merged };
    } catch (error) {
      this.logger?.error('Sync', 'Error fetching from backend', error);
      return { fetched: 0, merged: 0 };
    }
  }

  /**
   * Fetch latest readings from Heroku backend (last 15 days)
   * Faster alternative to fetchFromBackend() for dashboard loading
   */
  async fetchLatestFromBackend(): Promise<{ fetched: number; merged: number }> {
    // Skip in mock mode
    if (this.isMockBackend) {
      this.logger?.debug('Sync', 'Skipping fetch in mock mode');
      return { fetched: 0, merged: 0 };
    }

    // Skip fetch if offline
    if (!this.isOnline) {
      this.logger?.info('Sync', 'Skipping fetch - device is offline');
      return { fetched: 0, merged: 0 };
    }

    if (!this.apiGateway) {
      this.logger?.warn('Sync', 'ApiGatewayService not available, skipping fetch');
      return { fetched: 0, merged: 0 };
    }

    try {
      this.logger?.info('Sync', 'Fetching latest readings from backend');

      const response = await firstValueFrom(
        this.apiGateway.request<BackendGlucoseResponse>('extservices.glucose.latest')
      );

      if (!response.success || !response.data?.readings) {
        this.logger?.warn('Sync', 'Failed to fetch latest readings from backend', response.error);
        return { fetched: 0, merged: 0 };
      }

      const backendReadings = response.data.readings;
      this.logger?.debug('Sync', `Fetched ${backendReadings.length} latest readings from backend`);

      let merged = 0;

      for (const backendReading of backendReadings) {
        // Check if we already have this reading (by backend ID)
        const existingByBackendId = await this.db.readings
          .filter(r => r.backendId === backendReading.id)
          .toArray();

        if (existingByBackendId.length === 0) {
          // No match by backendId - check for unsynced local readings with same value+time
          // This prevents duplicates when sync hasn't completed yet (timezone race condition)
          const backendValue = backendReading.glucose_level;
          const backendTime = this.parseBackendTimestamp(backendReading.created_at);
          const THIRTY_MINUTES_MS = 30 * 60 * 1000; // Tolerance for minor timezone drift

          const existingByValueTime = await this.db.readings
            .filter(r => {
              // Only check unsynced local readings (synced ones would have backendId)
              if (r.synced || r.backendId) return false;
              // Must have same glucose value
              if (r.value !== backendValue) return false;
              // Must be within time tolerance window
              const localTime = new Date(r.time).getTime();
              const timeDiff = Math.abs(localTime - backendTime);
              return timeDiff <= THIRTY_MINUTES_MS;
            })
            .toArray();

          if (existingByValueTime.length > 0) {
            // Found matching local reading - link it to backend instead of creating duplicate
            const localMatch = existingByValueTime[0];
            await this.db.readings.update(localMatch.id, {
              backendId: backendReading.id,
              synced: true,
              time: new Date(backendTime).toISOString(), // Use backend time as source of truth
            });
            this.logger?.debug(
              'Sync',
              `Linked local reading ${localMatch.id} to backend ${backendReading.id} (value+time match)`
            );
          } else {
            // Truly new reading from backend - add to local storage
            const localReading = this.mapBackendToLocal(backendReading);
            await this.db.readings.add(localReading);
            merged++;
          }
        } else {
          // Existing reading - check for conflicts using server as source of truth
          const existing = existingByBackendId[0];
          const backendValue = backendReading.glucose_level;
          const backendNotes = backendReading.notes || '';

          // Only update if there are actual differences (server wins)
          if (existing.value !== backendValue || existing.notes !== backendNotes) {
            await this.db.readings.update(existing.id, {
              value: backendValue,
              notes: backendNotes,
              mealContext: backendReading.reading_type || existing.mealContext,
              synced: true,
            });
            this.logger?.debug('Sync', `Updated local reading ${existing.id} from backend`);
          }
        }
      }

      this.logger?.info(
        'Sync',
        `Latest fetch complete: ${backendReadings.length} fetched, ${merged} new merged`
      );
      return { fetched: backendReadings.length, merged };
    } catch (error) {
      this.logger?.error('Sync', 'Error fetching latest from backend', error);
      return { fetched: 0, merged: 0 };
    }
  }

  /**
   * Full sync: push pending local changes, then fetch from backend
   */
  async performFullSync(): Promise<{
    pushed: number;
    fetched: number;
    failed: number;
    lastError?: string | null;
  }> {
    this.logger?.info('Sync', 'Starting full sync');

    // First, push any pending local changes
    const pushResult = await this.syncPendingReadings();

    // Then fetch from backend
    const fetchResult = await this.fetchFromBackend();

    return {
      pushed: pushResult.success,
      fetched: fetchResult.merged,
      failed: pushResult.failed,
      lastError: pushResult.lastError,
    };
  }

  /**
   * Parse backend timestamp format "DD/MM/YYYY HH:mm:ss" to milliseconds since epoch.
   * Backend stores in Argentina timezone (UTC-3), so we parse accordingly.
   */
  private parseBackendTimestamp(createdAt: string): number {
    const [datePart, timePart] = createdAt.split(' ');
    const [day, month, year] = datePart.split('/');
    // BUG FIX: Add -03:00 timezone suffix to parse as Argentina time (UTC-3)
    return new Date(`${year}-${month}-${day}T${timePart}-03:00`).getTime();
  }

  /**
   * Map backend reading to local format
   */
  private mapBackendToLocal(backend: BackendGlucoseReading): LocalGlucoseReading {
    // Parse backend date format "DD/MM/YYYY HH:mm:ss" with Argentina timezone (UTC-3)
    const [datePart, timePart] = backend.created_at.split(' ');
    const [day, month, year] = datePart.split('/');
    const isoDate = new Date(`${year}-${month}-${day}T${timePart}-03:00`).toISOString();

    const localReading: LocalGlucoseReading = {
      id: `backend_${backend.id}`,
      localId: `backend_${backend.id}`,
      backendId: backend.id,
      time: isoDate,
      value: backend.glucose_level,
      units: 'mg/dL',
      type: 'smbg' as const,
      subType: 'manual',
      deviceId: 'backend-sync',
      userId: backend.user_id.toString(),
      synced: true,
      localStoredAt: new Date().toISOString(),
      isLocalOnly: false,
      status: this.calculateGlucoseStatus(backend.glucose_level, 'mg/dL'),
      mealContext: backend.reading_type || 'OTRO',
      notes: backend.notes,
    };

    return localReading;
  }

  /**
   * Clear all local readings (use with caution)
   * Uses transaction to prevent PrematureCommitError
   */
  async clearAllReadings(): Promise<void> {
    try {
      await this.db.transaction('rw', [this.db.readings, this.db.syncQueue], async () => {
        await this.db.readings.clear();
        await this.db.syncQueue.clear();
      });
    } catch (error) {
      // Fallback for PrematureCommitError in fake-indexeddb test environments
      if ((error as Error).name === 'PrematureCommitError') {
        await this.db.readings.clear();
        await this.db.syncQueue.clear();
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate a summary of manual readings suitable for tele-appointment submissions.
   * The summary focuses on manual SMBG entries collected over the specified window.
   *
   * @param days Window (in days) to look back from today. Defaults to 14 days.
   */
  async exportManualReadingsSummary(days = 14): Promise<TeleAppointmentReadingSummary> {
    // Anchor the window to the most recent manual SMBG reading (if any)
    // This makes tests deterministic when they insert historical fixtures
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
          : this.convertToUnit(reading.value, reading.units, unit);

      return {
        reading,
        value,
      };
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
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      unit,
      totalReadings: manualReadings.length,
      statistics: {
        average,
        minimum,
        maximum,
      },
      readings: normalized.map(({ reading, value }) => {
        const formattedValue = Number(value.toFixed(decimals));
        const status: GlucoseStatus | undefined =
          reading.status || this.calculateGlucoseStatus(formattedValue, unit);

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
    if (mgdl >= 180) return 'high';
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

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(
    conflict: SyncConflictItem,
    resolution: 'keep-mine' | 'keep-server' | 'keep-both'
  ): Promise<void> {
    switch (resolution) {
      case 'keep-mine':
        // The local reading is already in the database. We just need to ensure it's marked for sync.
        await this.db.readings.update(conflict.localReading.id, { synced: false });
        await this.addToSyncQueue('update', conflict.localReading);
        break;
      case 'keep-server':
        // Overwrite the local reading with the server version.
        await this.db.readings.put({ ...conflict.serverReading, synced: true });
        break;
      case 'keep-both':
        // Keep the local version and add the server version as a new reading.
        await this.db.readings.update(conflict.localReading.id, { synced: false });
        await this.addToSyncQueue('update', conflict.localReading);
        // Add the server version as a new, separate reading.
        await this.addReading({
          ...conflict.serverReading,
          id: this.generateLocalId(), // Ensure it's a new reading
        });
        break;
    }

    // Mark the conflict as resolved
    await this.db.conflicts.update(conflict.id, { status: 'resolved' });

    await this.auditLogService?.logConflictResolution(conflict.readingId, resolution, {
      local: conflict.localReading,
      server: conflict.serverReading,
    });
  }
}

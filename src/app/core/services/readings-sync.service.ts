/**
 * ReadingsSyncService - Handles synchronization between local IndexedDB and backend API
 *
 * Responsibilities:
 * - Push local readings to backend (sync queue processing)
 * - Fetch readings from backend and merge with local
 * - Conflict detection and resolution
 * - Network status monitoring
 * - Mutex protection for concurrent operations
 */

import { Injectable, Optional, Injector, OnDestroy } from '@angular/core';
import { Subject, firstValueFrom, BehaviorSubject } from 'rxjs';
import { Network } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import { LocalGlucoseReading, MealContext, MEAL_CONTEXTS } from '@models/glucose-reading.model';
import {
  DiabetacticDatabase,
  SyncConflictItem,
  SyncQueueItem,
  db,
} from '@services/database.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { AuthSessionService } from '@services/auth-session.service';
import { LocalAuthService } from '@services/local-auth.service';
import { AuditLogService } from './audit-log.service';
import {
  ReadingsMapperService,
  BackendGlucoseReading,
  BackendGlucoseResponse,
} from './readings-mapper.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: number;
  failed: number;
  lastError?: string | null;
}

/**
 * Result of a fetch operation
 */
export interface FetchResult {
  fetched: number;
  merged: number;
}

/**
 * Result of a full sync (push + fetch)
 */
export interface FullSyncResult {
  pushed: number;
  fetched: number;
  failed: number;
  lastError?: string | null;
}

/** Time tolerance for matching local and backend readings (30 minutes) */
const SYNC_TIME_TOLERANCE_MS = 30 * 60 * 1000;

/** Maximum readings to process per sync to prevent UI blocking */
const MAX_SYNC_READINGS = 200;

/** Maximum retry attempts for failed sync operations */
const SYNC_RETRY_LIMIT = 3;

/** Time threshold for considering a 'processing' item as stale (5 minutes) */
const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Tolerance for glucose value comparison when matching local and backend readings.
 * Accounts for floating point rounding errors from unit conversions.
 * e.g., 5.5 mmol/L → 99.1001 mg/dL, should match backend's rounded 99 mg/dL
 */
const VALUE_TOLERANCE_MGDL = 1.5;

/**
 * Event emitted when a reading permanently fails to sync after all retries
 */
export interface SyncFailureEvent {
  readingId: string;
  error: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReadingsSyncService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private networkListenerHandle: PluginListenerHandle | null = null;
  private isOnline = true;

  // Mutex protection for concurrent operations
  private syncInProgress = false;
  private syncPromise: Promise<SyncResult> | null = null;
  private fetchInProgress = false;
  private fetchPromise: Promise<FetchResult> | null = null;

  /**
   * Emits when a reading permanently fails to sync (exhausted all retries).
   * Subscribe to this to show user notifications about sync failures.
   */
  private _syncFailure$ = new Subject<SyncFailureEvent>();
  public readonly syncFailure$ = this._syncFailure$.asObservable();

  /**
   * Count of readings that failed to sync permanently (exhausted retries).
   * These readings are stuck with synced=false and no queue entry.
   */
  private _permanentlyFailedCount$ = new BehaviorSubject<number>(0);
  public readonly permanentlyFailedCount$ = this._permanentlyFailedCount$.asObservable();

  private readonly db: DiabetacticDatabase;
  private envConfig?: EnvironmentConfigService;

  get isMockBackend(): boolean {
    return this.envConfig?.isMockMode ?? false;
  }

  constructor(
    private mapper: ReadingsMapperService,
    @Optional() private authSession?: AuthSessionService,
    @Optional() private database?: DiabetacticDatabase,
    @Optional() private apiGateway?: ApiGatewayService,
    @Optional() private logger?: LoggerService,
    @Optional() private injector?: Injector,
    @Optional() private auditLogService?: AuditLogService,
    @Optional() envConfig?: EnvironmentConfigService
  ) {
    this.envConfig = envConfig;
    this.db = this.database ?? db;
    this.initializeNetworkMonitoring();
    this.recoverStaleProcessingItems();
    this.updatePermanentlyFailedCount();
  }

  // ============================================================================
  // User Identity Helper
  // ============================================================================

  private getCurrentUserDni(): string | null {
    return this.authSession?.getCurrentUserId() ?? null;
  }

  /**
   * Count readings that are unsynced but NOT in the sync queue (permanently failed).
   * These are readings where all retries were exhausted.
   */
  private async updatePermanentlyFailedCount(): Promise<void> {
    try {
      // Get all unsynced readings
      const unsyncedReadings = await this.db.readings.filter(r => r.synced === false).toArray();
      // Get all readings currently in sync queue
      const queueReadingIds = new Set(
        (await this.db.syncQueue.toArray()).map(item => item.readingId)
      );
      // Count unsynced readings that are NOT in the queue (permanently failed)
      const permanentlyFailed = unsyncedReadings.filter(r => !queueReadingIds.has(r.id));
      this._permanentlyFailedCount$.next(permanentlyFailed.length);
    } catch (error) {
      this.logger?.warn('Sync', 'Failed to count permanently failed readings', error);
    }
  }

  /**
   * Recover items that were left in 'processing' state due to app crash.
   * Items older than STALE_PROCESSING_THRESHOLD_MS are reset to 'pending'.
   */
  private async recoverStaleProcessingItems(): Promise<void> {
    try {
      const staleThreshold = Date.now() - STALE_PROCESSING_THRESHOLD_MS;
      const staleItems = await this.db.syncQueue
        .filter(
          item =>
            item.status === 'processing' &&
            item.processingStartedAt !== undefined &&
            item.processingStartedAt < staleThreshold
        )
        .toArray();

      if (staleItems.length === 0) return;

      this.logger?.warn(
        'Sync',
        `Recovering ${staleItems.length} stale processing items (possible crash recovery)`
      );

      for (const item of staleItems) {
        if (item.id !== undefined) {
          await this.db.syncQueue.update(item.id, {
            status: 'pending',
            processingStartedAt: undefined,
          });
        }
      }

      this.logger?.info('Sync', `Recovered ${staleItems.length} items, will retry on next sync`);
    } catch (error) {
      this.logger?.error('Sync', 'Failed to recover stale processing items', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.networkListenerHandle) {
      this.networkListenerHandle.remove();
      this.networkListenerHandle = null;
    }
  }

  // ============================================================================
  // Network Monitoring
  // ============================================================================

  /**
   * Initialize network status monitoring
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);

    try {
      const status = await withTimeout(Network.getStatus(), 5000, {
        connected: true,
        connectionType: 'unknown',
      });
      this.isOnline = status.connected;
      this.logger?.info(
        'Network',
        `Initial network status: ${this.isOnline ? 'online' : 'offline'}`
      );

      this.networkListenerHandle = await Network.addListener('networkStatusChange', status => {
        const wasOffline = !this.isOnline;
        this.isOnline = status.connected;

        this.logger?.info(
          'Network',
          `Network status changed: ${this.isOnline ? 'online' : 'offline'}`
        );

        if (wasOffline && this.isOnline) {
          this.logger?.info('Network', 'Back online, triggering auto-sync');
          this.performFullSync().catch(err => {
            this.logger?.error('Network', 'Auto-sync failed', err);
          });
        }
      });
    } catch (error) {
      this.logger?.warn('Network', 'Failed to initialize monitoring', error);
      this.isOnline = true;
    }
  }

  /**
   * Check if device is online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  // ============================================================================
  // Sync Queue Operations
  // ============================================================================

  /**
   * Add operation to sync queue
   */
  async addToSyncQueue(
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
   * Process sync queue - pushes local readings to backend
   * Uses mutex to prevent concurrent sync operations
   */
  async syncPendingReadings(): Promise<SyncResult> {
    if (this.isMockBackend) {
      this.logger?.debug('Sync', 'Skipping in mock mode');
      return { success: 0, failed: 0 };
    }

    if (!this.isOnline) {
      this.logger?.info('Sync', 'Skipping sync - device is offline');
      return { success: 0, failed: 0 };
    }

    if (!this.apiGateway) {
      this.logger?.warn('Sync', 'ApiGatewayService not available');
      return { success: 0, failed: 0 };
    }

    // Mutex: Return existing promise if sync already in progress
    if (this.syncInProgress && this.syncPromise) {
      this.logger?.info('Sync', 'Already in progress, returning existing promise');
      return this.syncPromise;
    }

    this.syncInProgress = true;
    this.syncPromise = (async () => {
      // Crash recovery: if some items became stale while the app stayed open,
      // periodically re-check and re-queue them (instead of only doing this in the constructor).
      await this.recoverStaleProcessingItems();
      return this.executeSync();
    })();

    try {
      return await this.syncPromise;
    } finally {
      this.syncInProgress = false;
      this.syncPromise = null;
    }
  }

  /**
   * Execute the actual sync operation (called by syncPendingReadings with mutex)
   *
   * CRASH-SAFE DESIGN:
   * Instead of clearing the queue before processing (which loses data on crash),
   * we mark items as 'processing' and only delete them after successful sync.
   * If the app crashes mid-sync, items remain in the queue with status='processing'
   * and are recovered on next startup via recoverStaleProcessingItems().
   */
  private async executeSync(): Promise<SyncResult> {
    // Phase 1: Get pending items and mark them as processing (atomic)
    let queueItems: SyncQueueItem[] = [];
    const processingStartedAt = Date.now();

    try {
      // Get only pending items (not already processing)
      queueItems = await this.db.syncQueue
        .filter(item => !item.status || item.status === 'pending')
        .toArray();

      if (queueItems.length === 0) {
        return { success: 0, failed: 0, lastError: null };
      }

      // Mark items as 'processing' - they stay in queue until confirmed success
      await this.db.transaction('rw', this.db.syncQueue, async () => {
        for (const item of queueItems) {
          if (item.id !== undefined) {
            await this.db.syncQueue.update(item.id, {
              status: 'processing',
              processingStartedAt,
            });
          }
        }
      });
    } catch (error) {
      this.logger?.error('Sync', 'Failed to claim queue items', error);
      throw error;
    }

    this.logger?.info('Sync', `Processing ${queueItems.length} items`);

    interface ItemResult {
      item: SyncQueueItem;
      success: boolean;
      error?: string;
    }
    const results: ItemResult[] = [];

    // Phase 2: Perform HTTP calls (outside transaction)
    for (const item of queueItems) {
      try {
        if (item.operation === 'create' && item.reading) {
          await this.pushReadingToBackend(item.reading);
          this.logger?.debug('Sync', `Created ${item.readingId} on backend`);
        } else if (item.operation === 'update') {
          // Backend doesn't support update endpoint - mark as synced locally
          // The reading is already updated in local IndexedDB
          this.logger?.info(
            'Sync',
            `Update for ${item.readingId} - local only (no backend endpoint)`
          );
        } else if (item.operation === 'delete') {
          this.logger?.info('Sync', `Delete for ${item.readingId} - local only`);
        }
        results.push({ item, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        this.logger?.error('Sync', `Failed: ${item.readingId}`, error);
        results.push({ item, success: false, error: errorMessage });
      }
    }

    // Phase 3: Update local state and queue
    const successItems = results.filter(r => r.success);
    const failedItems = results.filter(r => !r.success);

    // Mark successful items as synced in readings table AND remove from queue
    for (const result of successItems) {
      try {
        // Mark reading as synced
        if (result.item.operation !== 'delete' && result.item.readingId) {
          await this.db.readings.update(result.item.readingId, { synced: true });
        }
        // Remove from sync queue (item successfully processed)
        if (result.item.id !== undefined) {
          await this.db.syncQueue.delete(result.item.id);
        }
      } catch (markError) {
        this.logger?.warn('Sync', `Could not finalize ${result.item.readingId}`, markError);
      }
    }

    // Update failed items: reset to 'pending' with incremented retry count
    for (const result of failedItems) {
      const retryCount = result.item.retryCount + 1;
      if (result.item.id === undefined) continue;

      if (retryCount < SYNC_RETRY_LIMIT) {
        // Reset to pending for retry
        try {
          await this.db.syncQueue.update(result.item.id, {
            status: 'pending',
            retryCount,
            lastError: result.error,
            processingStartedAt: undefined,
          });
        } catch (error) {
          this.logger?.warn('Sync', `Could not reset ${result.item.readingId} for retry`, error);
        }
        this.logger?.info(
          'Sync',
          `Will retry ${result.item.readingId} (${retryCount}/${SYNC_RETRY_LIMIT})`
        );
      } else {
        // Max retries reached - remove from queue (data loss prevention: keep reading as unsynced)
        this.logger?.warn(
          'Sync',
          `Max retries reached for ${result.item.readingId}, removing from queue`
        );
        try {
          await this.db.syncQueue.delete(result.item.id);
          if (result.item.readingId) {
            this._syncFailure$.next({
              readingId: result.item.readingId,
              error: result.error ?? 'Sync failed after multiple retries',
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          this.logger?.warn(
            'Sync',
            `Could not remove exhausted item ${result.item.readingId}`,
            error
          );
        }
      }
    }

    // Update count of permanently failed readings after processing
    if (failedItems.length > 0) {
      this.updatePermanentlyFailedCount();
    }

    const success = successItems.length;
    const failed = failedItems.length;
    const lastError = failedItems.length > 0 ? failedItems[failedItems.length - 1].error : null;

    this.logger?.info('Sync', `Complete: ${success} success, ${failed} failed`);

    // Refresh user profile for gamification data
    if (success > 0) {
      this.refreshUserProfile();
    }

    return { success, failed, lastError };
  }

  /**
   * Push a single reading to the backend
   */
  private async pushReadingToBackend(reading: LocalGlucoseReading): Promise<void> {
    if (!this.apiGateway) {
      throw new Error('ApiGatewayService not available');
    }

    const params = this.mapper.buildBackendCreateParams(reading);

    this.logger?.info('Sync', 'Pushing reading', {
      localId: reading.id,
      params,
    });

    const response = await firstValueFrom(
      this.apiGateway.request<BackendGlucoseReading>('extservices.glucose.create', { params })
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create reading on backend');
    }

    if (response.data?.id) {
      await this.db.readings.update(reading.id, {
        backendId: response.data.id,
        synced: true,
      });
    }

    this.logger?.debug('Sync', 'Pushed to backend', {
      localId: reading.id,
      backendId: response.data?.id,
    });
  }

  /**
   * Refresh user profile after successful sync
   */
  private refreshUserProfile(): void {
    if (!this.injector) return;
    try {
      const localAuthService = this.injector.get(LocalAuthService);
      this.logger?.info('Sync', 'Refreshing user profile for gamification data');
      localAuthService.refreshUserProfile().catch(err => {
        this.logger?.warn('Sync', 'Failed to refresh user profile', err);
      });
    } catch {
      // LocalAuthService not available
    }
  }

  // ============================================================================
  // Fetch from Backend
  // ============================================================================

  /**
   * Fetch readings from backend and merge with local storage
   * Uses mutex to prevent concurrent fetches
   */
  async fetchFromBackend(): Promise<FetchResult> {
    if (this.fetchInProgress && this.fetchPromise) {
      this.logger?.debug('Sync', 'Fetch already in progress');
      return this.fetchPromise;
    }

    if (this.isMockBackend) {
      return { fetched: 0, merged: 0 };
    }

    if (!this.isOnline) {
      this.logger?.info('Sync', 'Skipping fetch - device is offline');
      return { fetched: 0, merged: 0 };
    }

    if (!this.apiGateway) {
      return { fetched: 0, merged: 0 };
    }

    this.fetchInProgress = true;
    this.fetchPromise = this.executeFetch();

    try {
      return await this.fetchPromise;
    } finally {
      this.fetchInProgress = false;
      this.fetchPromise = null;
    }
  }

  /**
   * Execute the actual fetch operation
   */
  private async executeFetch(): Promise<FetchResult> {
    if (!this.apiGateway) {
      return { fetched: 0, merged: 0 };
    }

    try {
      this.logger?.info('Sync', 'Fetching from backend');

      const response = await firstValueFrom(
        this.apiGateway.request<BackendGlucoseResponse>('extservices.glucose.mine')
      );

      if (!response.success || !response.data?.readings) {
        this.logger?.warn('Sync', 'Failed to fetch', response.error);
        return { fetched: 0, merged: 0 };
      }

      const allReadings = response.data.readings;
      // Take the LAST N readings (most recent) since backend returns oldest first
      const backendReadings = allReadings.slice(-MAX_SYNC_READINGS);
      this.logger?.debug(
        'Sync',
        `Fetched ${allReadings.length}, processing ${backendReadings.length} (latest)`
      );

      let merged = 0;
      for (const backendReading of backendReadings) {
        const result = await this.syncSingleReading(backendReading);
        if (result.action === 'created') {
          merged++;
        }
      }

      this.logger?.info(
        'Sync',
        `Fetch complete: ${backendReadings.length} fetched, ${merged} merged`
      );
      return { fetched: backendReadings.length, merged };
    } catch (error) {
      this.logger?.error('Sync', 'Error fetching', error);
      return { fetched: 0, merged: 0 };
    }
  }

  /**
   * Sync a single backend reading to local storage
   */
  private async syncSingleReading(
    backendReading: BackendGlucoseReading
  ): Promise<{ action: 'created' | 'linked' | 'conflict' | 'updated' | 'unchanged' }> {
    const existing = await this.findReadingByBackendId(backendReading.id);
    const backendValue = backendReading.glucose_level;
    const backendNotes = backendReading.notes || '';
    const backendTime = this.mapper.parseBackendTimestamp(backendReading.created_at);

    if (!existing) {
      // Check for unsynced local readings with same value+time
      const unsyncedMatch = await this.findMatchingUnsyncedReading(backendValue, backendTime);

      if (unsyncedMatch) {
        await this.linkLocalToBackend(unsyncedMatch.id, backendReading.id, backendTime);
        this.logger?.debug('Sync', `Linked ${unsyncedMatch.id} to backend ${backendReading.id}`);
        return { action: 'linked' };
      }

      // Truly new reading - add to local with correct userId
      const localReading = this.mapper.mapBackendToLocal(backendReading);
      const currentUserDni = this.getCurrentUserDni();
      if (currentUserDni) {
        localReading.userId = currentUserDni;
      }
      await this.db.readings.add(localReading);
      return { action: 'created' };
    }

    // Handle potential conflicts
    const hasChanges = this.hasReadingChanges(
      existing,
      backendValue,
      backendNotes,
      backendReading.reading_type
    );

    if (!existing.synced && hasChanges) {
      await this.createSyncConflict(existing, backendReading);
      return { action: 'conflict' };
    }

    if (!existing.synced) {
      await this.db.readings.update(existing.id, { synced: true });
      return { action: 'unchanged' };
    }

    if (hasChanges) {
      await this.updateLocalFromBackend(
        existing,
        backendValue,
        backendNotes,
        backendReading.reading_type
      );
      this.logger?.debug('Sync', `Updated ${existing.id} from backend`);
      return { action: 'updated' };
    }

    return { action: 'unchanged' };
  }

  // ============================================================================
  // Fetch Latest (Optimized for Dashboard)
  // ============================================================================

  /**
   * Fetch latest readings from backend (last 15 days)
   * Faster alternative for dashboard loading
   */
  async fetchLatestFromBackend(): Promise<FetchResult> {
    if (this.isMockBackend || !this.isOnline || !this.apiGateway) {
      return { fetched: 0, merged: 0 };
    }

    try {
      this.logger?.info('Sync', 'Fetching latest from backend');

      const response = await firstValueFrom(
        this.apiGateway.request<BackendGlucoseResponse>('extservices.glucose.latest')
      );

      if (!response.success || !response.data?.readings) {
        return { fetched: 0, merged: 0 };
      }

      const backendReadings = response.data.readings;
      let merged = 0;

      for (const backendReading of backendReadings) {
        const existingByBackendId = await this.db.readings
          .where('backendId')
          .equals(backendReading.id)
          .first();

        if (!existingByBackendId) {
          const backendValue = backendReading.glucose_level;
          const backendTime = this.mapper.parseBackendTimestamp(backendReading.created_at);

          const unsyncedMatch = await this.findMatchingUnsyncedReading(backendValue, backendTime);

          if (unsyncedMatch) {
            await this.linkLocalToBackend(unsyncedMatch.id, backendReading.id, backendTime);
          } else {
            const localReading = this.mapper.mapBackendToLocal(backendReading);
            const currentUserDni = this.getCurrentUserDni();
            if (currentUserDni) {
              localReading.userId = currentUserDni;
            }
            await this.db.readings.add(localReading);
            merged++;
          }
        } else {
          const backendValueMgDl = backendReading.glucose_level;
          const backendNotes = backendReading.notes || '';

          // Convert local value to mg/dL for comparison (backend always uses mg/dL)
          const localValueMgDl = this.mapper.toMgDl(
            existingByBackendId.value,
            existingByBackendId.units
          );
          const valuesDiffer = Math.abs(localValueMgDl - backendValueMgDl) > VALUE_TOLERANCE_MGDL;

          if (valuesDiffer || existingByBackendId.notes !== backendNotes) {
            const backendType = backendReading.reading_type;
            const validMealContext =
              backendType && (MEAL_CONTEXTS as readonly string[]).includes(backendType)
                ? (backendType as MealContext)
                : existingByBackendId.mealContext;

            // Convert backend value to local units to preserve user's unit preference
            const newValue = this.mapper.convertToUnit(
              backendValueMgDl,
              'mg/dL',
              existingByBackendId.units
            );

            await this.db.readings.update(existingByBackendId.id, {
              value: newValue,
              notes: backendNotes,
              mealContext: validMealContext,
              synced: true,
            });
          }
        }
      }

      this.logger?.info(
        'Sync',
        `Latest fetch: ${backendReadings.length} fetched, ${merged} merged`
      );
      return { fetched: backendReadings.length, merged };
    } catch (error) {
      this.logger?.error('Sync', 'Error fetching latest', error);
      return { fetched: 0, merged: 0 };
    }
  }

  // ============================================================================
  // Full Sync
  // ============================================================================

  /**
   * Full sync: push pending local changes, then fetch from backend
   */
  async performFullSync(): Promise<FullSyncResult> {
    this.logger?.info('Sync', 'Starting full sync');

    const pushResult = await this.syncPendingReadings();
    const fetchResult = await this.fetchFromBackend();

    return {
      pushed: pushResult.success,
      fetched: fetchResult.merged,
      failed: pushResult.failed,
      lastError: pushResult.lastError,
    };
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(
    conflict: SyncConflictItem,
    resolution: 'keep-mine' | 'keep-server' | 'keep-both'
  ): Promise<void> {
    switch (resolution) {
      case 'keep-mine':
        await this.db.readings.update(conflict.localReading.id, { synced: false });
        await this.addToSyncQueue('update', conflict.localReading);
        break;

      case 'keep-server':
        // Update the existing local reading with server data instead of creating duplicate
        // This preserves the local ID while replacing content with server version
        await this.db.readings.update(conflict.localReading.id, {
          value: conflict.serverReading.value,
          units: conflict.serverReading.units,
          time: conflict.serverReading.time,
          notes: conflict.serverReading.notes,
          mealContext: conflict.serverReading.mealContext,
          backendId: conflict.serverReading.backendId,
          synced: true,
        });
        break;

      case 'keep-both':
        // Keep local version and mark for re-sync
        await this.db.readings.update(conflict.localReading.id, { synced: false });
        await this.addToSyncQueue('update', conflict.localReading);
        // Add server version as new reading WITHOUT backendId to avoid duplicate backendId
        // The local version will be synced and get its own backendId from backend
        const newId = this.mapper.generateLocalId();
        await this.db.readings.add({
          ...conflict.serverReading,
          id: newId,
          localId: newId,
          backendId: undefined, // Remove backendId to prevent duplicate reference
          synced: true, // Server data is already synced
        });
        break;
    }

    if (conflict.id !== undefined) {
      await this.db.conflicts.update(conflict.id, { status: 'resolved' });
    }

    await this.auditLogService?.logConflictResolution(conflict.readingId, resolution, {
      local: conflict.localReading,
      server: conflict.serverReading,
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Find a local reading by its backend ID
   * @param backendId - Backend reading ID to search for
   * @returns Local reading if found, null otherwise
   */
  private async findReadingByBackendId(backendId: number): Promise<LocalGlucoseReading | null> {
    const match = await this.db.readings.where('backendId').equals(backendId).first();
    return match || null;
  }

  /**
   * Find an unsynced local reading that matches backend data within time tolerance
   * Used to link locally-created readings with their backend counterparts
   * @param backendValue - Glucose value from backend (always mg/dL)
   * @param backendTime - Timestamp from backend (milliseconds)
   * @returns Matching unsynced local reading if found, null otherwise
   *
   * NOTE: Local readings may be stored in mg/dL or mmol/L depending on user preference.
   * We convert local values to mg/dL before comparing to handle unit differences.
   * Uses VALUE_TOLERANCE_MGDL to account for floating point rounding in unit conversions.
   */
  private async findMatchingUnsyncedReading(
    backendValue: number,
    backendTime: number
  ): Promise<LocalGlucoseReading | null> {
    const matches = await this.db.readings
      .filter(r => {
        if (r.synced || r.backendId) return false;

        // Convert local value to mg/dL for comparison (backend always uses mg/dL)
        const localValueMgDl = this.mapper.toMgDl(r.value, r.units);

        // Use tolerance to handle floating point rounding from unit conversions
        // e.g., 5.5 mmol/L → 99.1001 mg/dL, should match backend's 99 mg/dL
        if (Math.abs(localValueMgDl - backendValue) > VALUE_TOLERANCE_MGDL) return false;

        const localTime = new Date(r.time).getTime();
        return Math.abs(localTime - backendTime) <= SYNC_TIME_TOLERANCE_MS;
      })
      .toArray();
    return matches[0] || null;
  }

  /**
   * Link a local reading to its backend counterpart after successful sync
   * Updates the reading with backend ID, marks as synced, and syncs timestamp
   * @param localId - Local reading ID to update
   * @param backendId - Backend ID to associate
   * @param backendTime - Canonical timestamp from backend (milliseconds)
   */
  private async linkLocalToBackend(
    localId: string,
    backendId: number,
    backendTime: number
  ): Promise<void> {
    await this.db.readings.update(localId, {
      backendId,
      synced: true,
      time: new Date(backendTime).toISOString(),
    });
  }

  /**
   * Check if a local reading has changes compared to backend data
   * Used for conflict detection during sync
   * @param local - Local reading to compare
   * @param backendValue - Glucose value from backend (always mg/dL)
   * @param backendNotes - Notes from backend
   * @param backendType - Optional meal context type from backend
   * @returns true if there are differences, false if identical
   *
   * NOTE: Converts local value to mg/dL before comparing since backend always uses mg/dL.
   * Uses VALUE_TOLERANCE_MGDL to account for floating point rounding in unit conversions.
   */
  private hasReadingChanges(
    local: LocalGlucoseReading,
    backendValue: number,
    backendNotes: string,
    backendType?: string
  ): boolean {
    // Convert local value to mg/dL for comparison (backend always uses mg/dL)
    const localValueMgDl = this.mapper.toMgDl(local.value, local.units);
    const valuesDiffer = Math.abs(localValueMgDl - backendValue) > VALUE_TOLERANCE_MGDL;

    return (
      valuesDiffer ||
      local.notes !== backendNotes ||
      (!!backendType && local.mealContext !== backendType)
    );
  }

  /**
   * Create a sync conflict record when local and backend versions differ
   * Stores both versions for user resolution
   * @param existing - Local reading with conflicting data
   * @param backendReading - Backend reading data
   */
  private async createSyncConflict(
    existing: LocalGlucoseReading,
    backendReading: BackendGlucoseReading
  ): Promise<void> {
    const serverReading = this.mapper.mapBackendToLocal(backendReading);
    const currentUserDni = this.getCurrentUserDni();
    if (currentUserDni) {
      serverReading.userId = currentUserDni;
    }
    await this.db.conflicts.add({
      readingId: existing.id,
      localReading: existing,
      serverReading: serverReading,
      status: 'pending',
      createdAt: Date.now(),
    });
    this.logger?.warn('Sync', `Conflict detected for ${existing.id}`);
  }

  /**
   * Update local reading with backend data
   * Used when backend version is considered authoritative (e.g., synced reading changed on server)
   *
   * NOTE: Backend always uses mg/dL. This method converts to the local reading's unit
   * to preserve the user's unit preference.
   *
   * @param existing - Local reading to update (used for ID and unit info)
   * @param backendValueMgDl - Glucose value from backend (always mg/dL)
   * @param backendNotes - Notes from backend
   * @param backendType - Optional meal context type from backend
   */
  private async updateLocalFromBackend(
    existing: LocalGlucoseReading,
    backendValueMgDl: number,
    backendNotes: string,
    backendType: string | undefined
  ): Promise<void> {
    const validMealContext =
      backendType && (MEAL_CONTEXTS as readonly string[]).includes(backendType)
        ? (backendType as MealContext)
        : existing.mealContext;

    // Convert backend value (mg/dL) to local units to preserve user's unit preference
    const newValue = this.mapper.convertToUnit(backendValueMgDl, 'mg/dL', existing.units);

    await this.db.readings.update(existing.id, {
      value: newValue,
      notes: backendNotes,
      mealContext: validMealContext,
      synced: true,
    });
  }
}

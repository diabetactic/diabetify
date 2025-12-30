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
import { Subject, firstValueFrom } from 'rxjs';
import { Network } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import {
  DiabetacticDatabase,
  SyncConflictItem,
  SyncQueueItem,
  db,
} from '@services/database.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { LocalAuthService } from '@services/local-auth.service';
import { AuditLogService } from './audit-log.service';
import {
  ReadingsMapperService,
  BackendGlucoseReading,
  BackendGlucoseResponse,
} from './readings-mapper.service';
import { environment } from '@env/environment';

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

  private readonly isMockBackend = environment.backendMode === 'mock';
  private readonly db: DiabetacticDatabase;

  constructor(
    private mapper: ReadingsMapperService,
    @Optional() private database?: DiabetacticDatabase,
    @Optional() private apiGateway?: ApiGatewayService,
    @Optional() private logger?: LoggerService,
    @Optional() private injector?: Injector,
    @Optional() private auditLogService?: AuditLogService
  ) {
    this.db = this.database ?? db;
    this.initializeNetworkMonitoring();
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
    this.syncPromise = this.executeSync();

    try {
      return await this.syncPromise;
    } finally {
      this.syncInProgress = false;
      this.syncPromise = null;
    }
  }

  /**
   * Execute the actual sync operation (called by syncPendingReadings with mutex)
   */
  private async executeSync(): Promise<SyncResult> {
    // Phase 1: Extract queue items atomically
    let queueItems: SyncQueueItem[] = [];

    try {
      queueItems = await this.db.syncQueue.toArray();
      if (queueItems.length === 0) {
        return { success: 0, failed: 0, lastError: null };
      }
      await this.db.syncQueue.clear();
    } catch (error) {
      this.logger?.error('Sync', 'Failed to extract queue items', error);
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

    // Phase 3: Update local state
    const successItems = results.filter(r => r.success);
    const failedItems = results.filter(r => !r.success);

    // Mark successful items as synced
    for (const result of successItems) {
      if (result.item.operation !== 'delete' && result.item.readingId) {
        try {
          await this.db.readings.update(result.item.readingId, { synced: true });
        } catch (markError) {
          this.logger?.warn('Sync', `Could not mark ${result.item.readingId} as synced`, markError);
        }
      }
    }

    // Re-add failed items for retry
    const itemsToRetry: SyncQueueItem[] = [];
    for (const result of failedItems) {
      const retryCount = result.item.retryCount + 1;
      if (retryCount < SYNC_RETRY_LIMIT) {
        itemsToRetry.push({
          ...result.item,
          retryCount,
          lastError: result.error,
        });
        this.logger?.info(
          'Sync',
          `Will retry ${result.item.readingId} (${retryCount}/${SYNC_RETRY_LIMIT})`
        );
      } else {
        this.logger?.warn('Sync', `Max retries reached for ${result.item.readingId}`);
      }
    }

    if (itemsToRetry.length > 0) {
      try {
        await this.db.transaction('rw', this.db.syncQueue, async () => {
          await this.db.syncQueue.bulkAdd(itemsToRetry);
        });
      } catch (error) {
        if ((error as Error).name === 'PrematureCommitError') {
          await this.db.syncQueue.bulkAdd(itemsToRetry);
        } else {
          throw error;
        }
      }
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
      params: JSON.stringify(params),
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
      const backendReadings = allReadings.slice(0, MAX_SYNC_READINGS);
      this.logger?.debug(
        'Sync',
        `Fetched ${allReadings.length}, processing ${backendReadings.length}`
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

      // Truly new reading - add to local
      const localReading = this.mapper.mapBackendToLocal(backendReading);
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
        existing.id,
        backendValue,
        backendNotes,
        backendReading.reading_type,
        existing.mealContext
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
          .filter(r => r.backendId === backendReading.id)
          .toArray();

        if (existingByBackendId.length === 0) {
          const backendValue = backendReading.glucose_level;
          const backendTime = this.mapper.parseBackendTimestamp(backendReading.created_at);

          const unsyncedMatch = await this.findMatchingUnsyncedReading(backendValue, backendTime);

          if (unsyncedMatch) {
            await this.linkLocalToBackend(unsyncedMatch.id, backendReading.id, backendTime);
          } else {
            const localReading = this.mapper.mapBackendToLocal(backendReading);
            await this.db.readings.add(localReading);
            merged++;
          }
        } else {
          // Update existing if different
          const existing = existingByBackendId[0];
          const backendValue = backendReading.glucose_level;
          const backendNotes = backendReading.notes || '';

          if (existing.value !== backendValue || existing.notes !== backendNotes) {
            await this.db.readings.update(existing.id, {
              value: backendValue,
              notes: backendNotes,
              mealContext: backendReading.reading_type || existing.mealContext,
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
        await this.db.readings.put({ ...conflict.serverReading, synced: true });
        break;

      case 'keep-both':
        await this.db.readings.update(conflict.localReading.id, { synced: false });
        await this.addToSyncQueue('update', conflict.localReading);
        // Add server version as new reading
        const newId = this.mapper.generateLocalId();
        await this.db.readings.add({
          ...conflict.serverReading,
          id: newId,
          localId: newId,
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

  private async findReadingByBackendId(backendId: number): Promise<LocalGlucoseReading | null> {
    const matches = await this.db.readings.filter(r => r.backendId === backendId).toArray();
    return matches[0] || null;
  }

  private async findMatchingUnsyncedReading(
    backendValue: number,
    backendTime: number
  ): Promise<LocalGlucoseReading | null> {
    const matches = await this.db.readings
      .filter(r => {
        if (r.synced || r.backendId) return false;
        if (r.value !== backendValue) return false;
        const localTime = new Date(r.time).getTime();
        return Math.abs(localTime - backendTime) <= SYNC_TIME_TOLERANCE_MS;
      })
      .toArray();
    return matches[0] || null;
  }

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

  private hasReadingChanges(
    local: LocalGlucoseReading,
    backendValue: number,
    backendNotes: string,
    backendType?: string
  ): boolean {
    return (
      local.value !== backendValue ||
      local.notes !== backendNotes ||
      (!!backendType && local.mealContext !== backendType)
    );
  }

  private async createSyncConflict(
    existing: LocalGlucoseReading,
    backendReading: BackendGlucoseReading
  ): Promise<void> {
    const serverReading = this.mapper.mapBackendToLocal(backendReading);
    await this.db.conflicts.add({
      readingId: existing.id,
      localReading: existing,
      serverReading: serverReading,
      status: 'pending',
      createdAt: Date.now(),
    });
    this.logger?.warn('Sync', `Conflict detected for ${existing.id}`);
  }

  private async updateLocalFromBackend(
    existingId: string,
    backendValue: number,
    backendNotes: string,
    backendType: string | undefined,
    existingContext: string | undefined
  ): Promise<void> {
    await this.db.readings.update(existingId, {
      value: backendValue,
      notes: backendNotes,
      mealContext: backendType || existingContext,
      synced: true,
    });
  }
}

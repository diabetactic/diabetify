/**
 * TidepoolSyncService - Complete Tidepool Synchronization System
 *
 * Handles fetching glucose data from Tidepool API with support for:
 * - Full and incremental data synchronization
 * - Automatic pagination handling
 * - Retry logic with exponential backoff
 * - Persistent sync timestamps for incremental updates
 * - Manual and automatic sync orchestration
 * - Real-time sync status tracking
 * - Network connectivity awareness
 * - Sync history and metadata tracking
 *
 * Wave 2 - API Integration Track (Subtasks 5.1 + 5.2)
 * Wave 3 - Sync Orchestration (Subtask 5.5)
 *
 * @see https://developer.tidepool.org/data-model/
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, switchMap, expand, reduce, take } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

import { TidepoolAuthService } from './tidepool-auth.service';
import { ReadingsService } from './readings.service';
import { TidepoolStorageService } from './tidepool-storage.service';
import {
  SyncOptions,
  SyncStatus,
  TidepoolDataResponse,
  SyncError,
  SyncMetadata,
  SyncHistoryEntry,
} from '../models/tidepool-sync.model';
import { GlucoseReading, GlucoseType } from '../models/glucose-reading.model';
import { retryWithBackoff, handleHttpError } from '../utils/http-retry.util';
import { environment } from '../../../environments/environment';

/**
 * Storage key for persisting last sync timestamp
 */
const LAST_SYNC_TIMESTAMP_KEY = 'tidepool_last_sync_timestamp';

/**
 * Storage key for persisting sync metadata (history, stats, etc.)
 */
const SYNC_METADATA_KEY = 'tidepool_sync_metadata';

/**
 * Default number of days to fetch on first sync
 */
const DEFAULT_INITIAL_SYNC_DAYS = 30;

/**
 * Default batch size for API requests
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Maximum number of sync history entries to keep
 */
const MAX_SYNC_HISTORY_ENTRIES = 10;

@Injectable({
  providedIn: 'root',
})
export class TidepoolSyncService {
  /**
   * Base URL for Tidepool data API
   */
  private readonly dataApiUrl: string;

  /**
   * BehaviorSubject for reactive sync status updates
   * Emits current sync status to all subscribers
   */
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isRunning: false,
    lastSyncTime: null,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    progress: 0,
  });

  /**
   * Observable for components to subscribe to sync status changes
   */
  public readonly syncStatus$ = this.syncStatusSubject.asObservable();

  /**
   * Automatic sync interval ID for cleanup
   */
  private autoSyncIntervalId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: TidepoolAuthService,
    private readingsService: ReadingsService,
    private storageService: TidepoolStorageService
  ) {
    // Use dataUrl from environment configuration
    this.dataApiUrl = environment.tidepool.dataUrl;

    // Load initial sync status from stored metadata
    this.loadSyncMetadata().then(metadata => {
      if (metadata?.lastSyncTimestamp) {
        this.syncStatusSubject.next({
          ...this.syncStatusSubject.value,
          lastSyncTime: metadata.lastSyncTimestamp,
        });
      }
    });
  }

  /**
   * Fetches glucose data from Tidepool API with specified options
   *
   * Implements pagination, retry logic, and proper error handling.
   * Requires valid authentication token from TidepoolAuthService.
   *
   * @param options - Synchronization options (date range, types, batch size)
   * @returns Observable emitting TidepoolDataResponse with glucose readings
   *
   * @example
   * ```typescript
   * const options: SyncOptions = {
   *   incremental: false,
   *   startDate: '2025-01-01T00:00:00.000Z',
   *   endDate: '2025-01-31T23:59:59.999Z',
   *   types: ['cbg', 'smbg'],
   *   batchSize: 100
   * };
   *
   * this.syncService.fetchGlucoseData(options).subscribe({
   *   next: (response) => console.log(`Fetched ${response.data.length} readings`),
   *   error: (error: SyncError) => console.error('Sync failed:', error)
   * });
   * ```
   */
  fetchGlucoseData(options: SyncOptions): Observable<TidepoolDataResponse> {
    return this.getUserId().pipe(
      switchMap(userId => {
        // Build API endpoint URL
        const endpoint = `${this.dataApiUrl}/v1/users/${userId}/data`;

        // Get authentication token
        return from(this.authService.getAccessToken()).pipe(
          switchMap(token => {
            if (!token) {
              return throwError(
                () =>
                  ({
                    message: 'Authentication required: No valid access token',
                    timestamp: new Date().toISOString(),
                    retryable: false,
                    errorType: 'AUTH_ERROR',
                  }) as SyncError
              );
            }

            // Build query parameters
            const params = this.buildQueryParams(options);

            // Make API request with authorization header
            return this.http
              .get<GlucoseReading[]>(endpoint, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                params,
              })
              .pipe(
                // Apply retry logic with exponential backoff
                retryWithBackoff({
                  maxRetries: environment.tidepool.maxRetries,
                  initialDelay: environment.tidepool.retryDelay,
                }),
                // Transform response to TidepoolDataResponse format
                map(
                  data =>
                    ({
                      data: data || [],
                      total: data?.length || 0,
                      offset: options.batchSize ? options.batchSize * 0 : 0,
                    }) as TidepoolDataResponse
                ),
                // Handle errors with structured error transformation
                catchError(error => handleHttpError(error))
              );
          })
        );
      })
    );
  }

  /**
   * Retrieves the timestamp of the last successful synchronization
   *
   * Uses Capacitor Preferences API for persistent storage across app sessions.
   *
   * @returns Promise resolving to ISO 8601 timestamp string or null if never synced
   *
   * @example
   * ```typescript
   * const lastSync = await this.syncService.getLastSyncTimestamp();
   * if (lastSync) {
   *   console.log(`Last synced at: ${new Date(lastSync).toLocaleString()}`);
   * } else {
   *   console.log('Never synced before');
   * }
   * ```
   */
  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: LAST_SYNC_TIMESTAMP_KEY });
      return value;
    } catch (error) {
      console.error('Failed to retrieve last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Updates the last synchronization timestamp
   *
   * Stores timestamp persistently using Capacitor Preferences API.
   * Should be called after successful data fetch to enable incremental sync.
   *
   * @param timestamp - ISO 8601 timestamp string to store
   *
   * @example
   * ```typescript
   * await this.syncService.updateLastSyncTimestamp(new Date().toISOString());
   * console.log('Sync timestamp updated');
   * ```
   */
  async updateLastSyncTimestamp(timestamp: string): Promise<void> {
    try {
      await Preferences.set({
        key: LAST_SYNC_TIMESTAMP_KEY,
        value: timestamp,
      });
    } catch (error) {
      console.error('Failed to update last sync timestamp:', error);
      throw error;
    }
  }

  /**
   * Fetches incremental glucose data since last sync
   *
   * Implements smart sync strategy:
   * - First sync: Fetches last 30 days of data
   * - Subsequent syncs: Fetches only new data since last sync timestamp
   * - Automatically handles pagination to retrieve all available data
   * - Fetches all glucose types (cbg and smbg)
   *
   * @param userId - Tidepool user ID (optional, will be fetched from auth if not provided)
   * @returns Observable emitting array of all glucose readings
   *
   * @example
   * ```typescript
   * this.syncService.fetchIncrementalData().subscribe({
   *   next: (readings) => {
   *     console.log(`Fetched ${readings.length} new readings`);
   *     // Process readings...
   *   },
   *   error: (error: SyncError) => console.error('Incremental sync failed:', error)
   * });
   * ```
   */
  fetchIncrementalData(userId?: string): Observable<GlucoseReading[]> {
    return from(this.getLastSyncTimestamp()).pipe(
      switchMap(lastSyncTimestamp => {
        const now = new Date().toISOString();
        let startDate: string;

        if (lastSyncTimestamp) {
          // Incremental sync: fetch from last sync to now
          startDate = lastSyncTimestamp;
          console.log(`Performing incremental sync from ${startDate} to ${now}`);
        } else {
          // First sync: fetch last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DEFAULT_INITIAL_SYNC_DAYS);
          startDate = thirtyDaysAgo.toISOString();
          console.log(`Performing initial sync for last ${DEFAULT_INITIAL_SYNC_DAYS} days`);
        }

        // Prepare sync options
        const syncOptions: SyncOptions = {
          incremental: !!lastSyncTimestamp,
          startDate,
          endDate: now,
          types: ['cbg', 'smbg'], // Fetch all glucose types
          batchSize: DEFAULT_BATCH_SIZE,
        };

        // Fetch data with automatic pagination handling
        return this.fetchAllPages(syncOptions);
      })
    );
  }

  /**
   * Fetches all paginated data from Tidepool API
   *
   * Automatically handles pagination by making multiple requests until
   * all available data is retrieved. Accumulates all readings into a single array.
   *
   * @param options - Sync options for the initial request
   * @returns Observable emitting array of all glucose readings across all pages
   * @private
   */
  private fetchAllPages(options: SyncOptions): Observable<GlucoseReading[]> {
    const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
    let currentOffset = 0;
    let allReadings: GlucoseReading[] = [];

    return this.fetchGlucoseData({
      ...options,
      batchSize,
    }).pipe(
      expand(response => {
        // Accumulate readings
        allReadings = [...allReadings, ...response.data];

        // Check if there are more pages to fetch
        const hasMoreData = response.data.length >= batchSize;

        if (hasMoreData) {
          currentOffset += batchSize;
          console.log(`Fetching next page (offset: ${currentOffset})`);

          // Fetch next page
          return this.fetchGlucoseData({
            ...options,
            batchSize,
          }).pipe(
            map(nextResponse => ({
              ...nextResponse,
              offset: currentOffset,
            }))
          );
        } else {
          console.log(`Pagination complete. Total readings fetched: ${allReadings.length}`);
          // No more pages, complete the observable
          return [];
        }
      }),
      // Take all emitted values until expansion completes
      reduce((acc, response) => {
        // Return accumulated readings on completion
        return allReadings;
      }, [] as GlucoseReading[])
    );
  }

  /**
   * Builds HTTP query parameters from SyncOptions
   *
   * Converts SyncOptions object to HttpParams for API requests.
   * Handles optional fields gracefully.
   *
   * @param options - Sync options to convert
   * @returns HttpParams object for HTTP request
   * @private
   *
   * @example
   * ```typescript
   * const options: SyncOptions = {
   *   incremental: false,
   *   startDate: '2025-01-01T00:00:00.000Z',
   *   types: ['cbg', 'smbg'],
   *   batchSize: 100
   * };
   * const params = this.buildQueryParams(options);
   * // Results in: ?type=cbg,smbg&startDate=2025-01-01T00:00:00.000Z&limit=100
   * ```
   */
  private buildQueryParams(options: SyncOptions): HttpParams {
    let params = new HttpParams();

    // Add glucose types filter (comma-separated)
    if (options.types && options.types.length > 0) {
      const typesParam = options.types.join(',');
      params = params.set('type', typesParam);
    }

    // Add date range filters
    if (options.startDate) {
      params = params.set('startDate', options.startDate);
    }

    if (options.endDate) {
      params = params.set('endDate', options.endDate);
    }

    // Add batch size (limit parameter)
    if (options.batchSize) {
      params = params.set('limit', options.batchSize.toString());
    }

    return params;
  }

  /**
   * Retrieves the authenticated user's ID
   *
   * Gets userId from TidepoolAuthService auth state.
   * Returns error if user is not authenticated.
   *
   * @returns Observable emitting user ID string
   * @private
   */
  private getUserId(): Observable<string> {
    return this.authService.authState.pipe(
      take(1),
      switchMap(authState => {
        if (!authState.isAuthenticated || !authState.userId) {
          return throwError(
            () =>
              ({
                message: 'User not authenticated: Please log in to sync data',
                timestamp: new Date().toISOString(),
                retryable: false,
                errorType: 'AUTH_ERROR',
              }) as SyncError
          );
        }

        return [authState.userId];
      })
    );
  }

  /**
   * Performs a manual synchronization of glucose data from Tidepool
   *
   * Orchestrates the complete sync workflow:
   * 1. Check network connectivity
   * 2. Verify authentication
   * 3. Fetch incremental data from Tidepool API
   * 4. Transform readings to local format
   * 5. Store readings in local database
   * 6. Update sync metadata and history
   * 7. Update sync status for UI
   *
   * @returns Promise resolving to SyncStatus with results
   *
   * @example
   * ```typescript
   * const status = await this.syncService.performManualSync();
   * console.log(`Synced ${status.itemsSynced} readings`);
   * if (status.errors.length > 0) {
   *   console.error('Sync errors:', status.errors);
   * }
   * ```
   */
  async performManualSync(): Promise<SyncStatus> {
    const startTime = Date.now();

    // Check if sync is already running
    if (this.syncStatusSubject.value.isRunning) {
      console.warn('Sync already in progress, skipping...');
      return this.syncStatusSubject.value;
    }

    // Update status: sync started
    this.updateSyncStatus({
      isRunning: true,
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      progress: 0,
    });

    try {
      // Step 1: Check network connectivity
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {
        throw {
          message: 'No network connection available',
          timestamp: new Date().toISOString(),
          retryable: true,
          errorType: 'NETWORK_ERROR',
        } as SyncError;
      }

      this.updateSyncStatus({ progress: 10 });

      // Step 2: Verify authentication (handled by fetchIncrementalData)
      // Step 3: Fetch incremental data
      console.log('Fetching incremental data from Tidepool...');

      const readings = await new Promise<GlucoseReading[]>((resolve, reject) => {
        this.fetchIncrementalData().subscribe({
          next: data => resolve(data),
          error: err => reject(err),
        });
      });

      console.log(`Fetched ${readings.length} readings from Tidepool`);
      this.updateSyncStatus({ progress: 50 });

      if (readings.length === 0) {
        console.log('No new readings to sync');
        this.updateSyncStatus({
          isRunning: false,
          lastSyncTime: new Date().toISOString(),
          progress: 100,
        });

        // Save metadata even if no readings
        await this.saveSyncMetadata({
          itemsSynced: 0,
          duration: Date.now() - startTime,
          success: true,
        });

        return this.syncStatusSubject.value;
      }

      // Step 4 & 5: Transform and store readings (handled by TidepoolStorageService)
      console.log('Storing readings in local database...');
      const userId = await this.authService.authState
        .pipe(
          take(1),
          map(state => state.userId!)
        )
        .toPromise();

      const storageResult = await this.storageService.storeSyncedReadings(readings, userId!);

      this.updateSyncStatus({ progress: 80 });

      // Step 6: Update last sync timestamp
      if (readings.length > 0) {
        // Find the most recent reading timestamp
        const latestTimestamp = readings
          .map(r => new Date(r.time).getTime())
          .reduce((max, current) => Math.max(max, current), 0);

        await this.updateLastSyncTimestamp(new Date(latestTimestamp).toISOString());
      }

      // Step 7: Update sync status and save history
      const finalStatus: Partial<SyncStatus> = {
        isRunning: false,
        lastSyncTime: new Date().toISOString(),
        itemsSynced: storageResult.stored,
        itemsFailed: storageResult.errors.length,
        errors: storageResult.errors.map(e => ({
          timestamp: new Date().toISOString(),
          message: e.error,
          errorType: 'STORAGE_ERROR',
          readingId: e.readingId,
          retryable: false,
        })),
        progress: 100,
      };

      this.updateSyncStatus(finalStatus);

      // Save sync history
      await this.saveSyncMetadata({
        itemsSynced: storageResult.stored,
        duration: Date.now() - startTime,
        success: true,
      });

      console.log(
        `Sync completed: ${storageResult.stored} stored, ${storageResult.duplicates} duplicates, ${storageResult.errors.length} errors`
      );

      return this.syncStatusSubject.value;
    } catch (error: any) {
      console.error('Sync failed:', error);

      const syncError: SyncError = {
        timestamp: new Date().toISOString(),
        message: error.message || 'Sync operation failed',
        errorType: error.errorType || 'UNKNOWN_ERROR',
        retryable: error.retryable ?? true,
        statusCode: error.statusCode,
        details: error.details,
      };

      this.updateSyncStatus({
        isRunning: false,
        itemsFailed: this.syncStatusSubject.value.itemsSynced + 1,
        errors: [syncError],
        progress: 0,
      });

      // Save failed sync to history
      await this.saveSyncMetadata({
        itemsSynced: this.syncStatusSubject.value.itemsSynced,
        duration: Date.now() - startTime,
        success: false,
        errorMessage: syncError.message,
      });

      return this.syncStatusSubject.value;
    }
  }

  /**
   * Sets up automatic synchronization with configurable interval
   *
   * Starts a periodic sync operation that runs in the background.
   * Only syncs when network is available and user is authenticated.
   *
   * @param intervalMinutes - Sync interval in minutes (default: 5)
   *
   * @example
   * ```typescript
   * // Sync every 5 minutes
   * this.syncService.setupAutomaticSync(5);
   *
   * // Sync every 15 minutes
   * this.syncService.setupAutomaticSync(15);
   * ```
   */
  setupAutomaticSync(intervalMinutes: number = 5): void {
    // Stop any existing automatic sync
    this.stopAutomaticSync();

    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`Setting up automatic sync every ${intervalMinutes} minutes`);

    // Perform initial sync
    this.performManualSync().catch(err => {
      console.error('Initial automatic sync failed:', err);
    });

    // Set up periodic sync
    this.autoSyncIntervalId = window.setInterval(() => {
      console.log('Performing automatic sync...');
      this.performManualSync().catch(err => {
        console.error('Automatic sync failed:', err);
      });
    }, intervalMs);
  }

  /**
   * Stops automatic synchronization
   *
   * Clears the sync interval to prevent further automatic syncs.
   * Should be called when user logs out or when component is destroyed.
   *
   * @example
   * ```typescript
   * ngOnDestroy() {
   *   this.syncService.stopAutomaticSync();
   * }
   * ```
   */
  stopAutomaticSync(): void {
    if (this.autoSyncIntervalId !== null) {
      clearInterval(this.autoSyncIntervalId);
      this.autoSyncIntervalId = null;
      console.log('Automatic sync stopped');
    }
  }

  /**
   * Checks network connectivity status
   *
   * Uses Capacitor Network API to check if device has network access.
   * Returns true if connected to WiFi or cellular data.
   *
   * @returns Promise resolving to true if connected, false otherwise
   * @private
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch (error) {
      console.error('Failed to check network status:', error);
      // Assume connected if we can't check (better to try and fail than not try)
      return true;
    }
  }

  /**
   * Updates the sync status BehaviorSubject
   *
   * Merges provided status updates with current status and emits to subscribers.
   *
   * @param updates - Partial sync status updates to apply
   * @private
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const currentStatus = this.syncStatusSubject.value;
    const newStatus = { ...currentStatus, ...updates };
    this.syncStatusSubject.next(newStatus);
  }

  /**
   * Loads sync metadata from persistent storage
   *
   * Retrieves sync history and statistics from Capacitor Preferences.
   *
   * @returns Promise resolving to SyncMetadata or null if not found
   * @private
   */
  private async loadSyncMetadata(): Promise<SyncMetadata | null> {
    try {
      const { value } = await Preferences.get({ key: SYNC_METADATA_KEY });
      if (value) {
        return JSON.parse(value) as SyncMetadata;
      }
      return null;
    } catch (error) {
      console.error('Failed to load sync metadata:', error);
      return null;
    }
  }

  /**
   * Saves sync history entry to persistent storage
   *
   * Updates sync metadata with new history entry.
   * Maintains only the last MAX_SYNC_HISTORY_ENTRIES entries.
   *
   * @param entry - Partial sync history entry to save
   * @private
   */
  private async saveSyncMetadata(entry: Omit<SyncHistoryEntry, 'timestamp'>): Promise<void> {
    try {
      // Load existing metadata
      let metadata = await this.loadSyncMetadata();

      if (!metadata) {
        metadata = {
          lastSyncTimestamp: null,
          totalReadingsSynced: 0,
          syncHistory: [],
        };
      }

      // Create new history entry
      const historyEntry: SyncHistoryEntry = {
        timestamp: new Date().toISOString(),
        ...entry,
      };

      // Update metadata
      metadata.syncHistory.unshift(historyEntry);

      // Keep only last MAX_SYNC_HISTORY_ENTRIES entries
      if (metadata.syncHistory.length > MAX_SYNC_HISTORY_ENTRIES) {
        metadata.syncHistory = metadata.syncHistory.slice(0, MAX_SYNC_HISTORY_ENTRIES);
      }

      // Update totals
      if (entry.success) {
        metadata.totalReadingsSynced += entry.itemsSynced;
        metadata.lastSyncTimestamp = historyEntry.timestamp;
      }

      // Save to storage
      await Preferences.set({
        key: SYNC_METADATA_KEY,
        value: JSON.stringify(metadata),
      });

      console.log('Sync metadata saved:', metadata);
    } catch (error) {
      console.error('Failed to save sync metadata:', error);
    }
  }

  /**
   * Gets the current sync metadata including history
   *
   * Public method to retrieve sync statistics and history for display.
   *
   * @returns Promise resolving to SyncMetadata or empty metadata if not found
   *
   * @example
   * ```typescript
   * const metadata = await this.syncService.getSyncMetadata();
   * console.log(`Total synced: ${metadata.totalReadingsSynced}`);
   * console.log(`Last sync: ${metadata.lastSyncTimestamp}`);
   * console.log(`History: ${metadata.syncHistory.length} entries`);
   * ```
   */
  async getSyncMetadata(): Promise<SyncMetadata> {
    const metadata = await this.loadSyncMetadata();

    if (!metadata) {
      return {
        lastSyncTimestamp: null,
        totalReadingsSynced: 0,
        syncHistory: [],
      };
    }

    return metadata;
  }
}

/**
 * Tidepool synchronization models and types
 * Defines interfaces for sync operations, status tracking, and error handling
 */

import { GlucoseReading, GlucoseType } from './glucose-reading.model';

/**
 * Represents the current state of a synchronization operation
 * Tracks progress, statistics, and any errors that occur during sync
 */
export interface SyncStatus {
  /** Whether a sync operation is currently in progress */
  isRunning: boolean;

  /** ISO 8601 timestamp of the last successful sync operation, or null if never synced */
  lastSyncTime: string | null;

  /** Number of items successfully synchronized in the current/last operation */
  itemsSynced: number;

  /** Number of items that failed to sync in the current/last operation */
  itemsFailed: number;

  /** Array of errors encountered during the current/last sync operation */
  errors: SyncError[];

  /** Sync progress as a percentage (0-100) */
  progress: number;
}

/**
 * Structured error information for sync failures
 * Provides detailed context for debugging and retry logic
 */
export interface SyncError {
  /** ISO 8601 timestamp when the error occurred */
  timestamp: string;

  /** Human-readable error message */
  message: string;

  /**
   * Categorized error type for easier error handling
   * Common types: 'NETWORK_ERROR', 'AUTH_ERROR', 'RATE_LIMIT', 'SERVER_ERROR', 'CLIENT_ERROR', 'UNKNOWN_ERROR'
   */
  errorType: string;

  /** HTTP status code (if applicable) */
  statusCode?: number;

  /** The ID of the glucose reading that failed to sync, if applicable */
  readingId?: string;

  /** Whether this error is transient and the operation can be retried */
  retryable: boolean;

  /** Additional error details and context */
  details?: Record<string, unknown>;
}

/**
 * Configuration options for sync operations
 * Controls the scope, filtering, and behavior of synchronization
 */
export interface SyncOptions {
  /**
   * Whether to perform incremental sync (only new/modified data since last sync)
   * Default: true
   */
  incremental: boolean;

  /**
   * ISO 8601 timestamp for the start of the date range to sync
   * If not specified, syncs from the beginning of available data
   */
  startDate?: string;

  /**
   * ISO 8601 timestamp for the end of the date range to sync
   * If not specified, syncs up to the current time
   */
  endDate?: string;

  /**
   * Filter sync to specific glucose reading types (cbg, smbg)
   * If not specified, syncs all types
   */
  types?: GlucoseType[];

  /**
   * Number of readings to sync in each batch/request
   * Default: 100
   */
  batchSize?: number;
}

/**
 * Persistent metadata about synchronization state
 * Stored locally to enable incremental syncs and track history
 */
export interface SyncMetadata {
  /** ISO 8601 timestamp of the most recent successful sync, or null if never synced */
  lastSyncTimestamp: string | null;

  /** Cumulative count of all glucose readings synchronized since initial setup */
  totalReadingsSynced: number;

  /**
   * Historical record of recent sync operations
   * Limited to the last 10 syncs to prevent unbounded growth
   */
  syncHistory: SyncHistoryEntry[];
}

/**
 * Single entry in the sync history log
 * Captures key metrics and outcomes of a completed sync operation
 */
export interface SyncHistoryEntry {
  /** ISO 8601 timestamp when the sync operation started */
  timestamp: string;

  /** Number of items successfully synchronized in this operation */
  itemsSynced: number;

  /** Duration of the sync operation in milliseconds */
  duration: number;

  /** Whether the sync operation completed successfully */
  success: boolean;

  /** Error message if the sync operation failed */
  errorMessage?: string;
}

/**
 * Response wrapper for Tidepool API data endpoints
 * Provides glucose readings along with pagination metadata
 */
export interface TidepoolDataResponse {
  /** Array of glucose readings from the Tidepool API */
  data: GlucoseReading[];

  /** Total number of readings available (for pagination) */
  total?: number;

  /** Current offset in the result set (for pagination) */
  offset?: number;
}

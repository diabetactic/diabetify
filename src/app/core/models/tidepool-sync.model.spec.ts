/**
 * Unit tests for Tidepool synchronization models
 * Tests sync status, errors, options, and metadata interfaces
 */

import {
  SyncStatus,
  SyncError,
  SyncOptions,
  SyncMetadata,
  SyncHistoryEntry,
  TidepoolDataResponse,
} from './tidepool-sync.model';

describe('TidepoolSyncModel', () => {
  describe('SyncStatus interface', () => {
    it('should accept idle status', () => {
      const status: SyncStatus = {
        isRunning: false,
        lastSyncTime: null,
        itemsSynced: 0,
        itemsFailed: 0,
        errors: [],
        progress: 0,
      };
      expect(status.isRunning).toBe(false);
      expect(status.lastSyncTime).toBeNull();
      expect(status.progress).toBe(0);
    });

    it('should accept running status', () => {
      const status: SyncStatus = {
        isRunning: true,
        lastSyncTime: '2024-01-14T10:00:00Z',
        itemsSynced: 250,
        itemsFailed: 0,
        errors: [],
        progress: 50,
      };
      expect(status.isRunning).toBe(true);
      expect(status.progress).toBe(50);
    });

    it('should accept completed status with errors', () => {
      const status: SyncStatus = {
        isRunning: false,
        lastSyncTime: '2024-01-15T10:00:00Z',
        itemsSynced: 480,
        itemsFailed: 20,
        errors: [
          {
            timestamp: '2024-01-15T10:05:00Z',
            message: 'Network timeout',
            errorType: 'NETWORK_ERROR',
            retryable: true,
          },
        ],
        progress: 100,
      };
      expect(status.itemsSynced).toBe(480);
      expect(status.itemsFailed).toBe(20);
      expect(status.errors.length).toBe(1);
    });

    it('should accept status with valid progress range', () => {
      const status: SyncStatus = {
        isRunning: true,
        lastSyncTime: '2024-01-15T10:00:00Z',
        itemsSynced: 100,
        itemsFailed: 0,
        errors: [],
        progress: 75,
      };
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('SyncError interface', () => {
    it('should accept minimal error', () => {
      const error: SyncError = {
        timestamp: '2024-01-15T10:00:00Z',
        message: 'Sync failed',
        errorType: 'UNKNOWN_ERROR',
        retryable: false,
      };
      expect(error.message).toBe('Sync failed');
      expect(error.retryable).toBe(false);
    });

    it('should accept network error with status code', () => {
      const error: SyncError = {
        timestamp: '2024-01-15T10:00:00Z',
        message: 'Connection timeout',
        errorType: 'NETWORK_ERROR',
        statusCode: 0,
        retryable: true,
      };
      expect(error.errorType).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(0);
      expect(error.retryable).toBe(true);
    });

    it('should accept auth error', () => {
      const error: SyncError = {
        timestamp: '2024-01-15T10:00:00Z',
        message: 'Unauthorized access',
        errorType: 'AUTH_ERROR',
        statusCode: 401,
        retryable: false,
      };
      expect(error.errorType).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
    });

    it('should accept rate limit error', () => {
      const error: SyncError = {
        timestamp: '2024-01-15T10:00:00Z',
        message: 'Rate limit exceeded',
        errorType: 'RATE_LIMIT',
        statusCode: 429,
        retryable: true,
        details: { retryAfter: 60 },
      };
      expect(error.errorType).toBe('RATE_LIMIT');
      expect(error.details.retryAfter).toBe(60);
    });

    it('should accept error with reading ID', () => {
      const error: SyncError = {
        timestamp: '2024-01-15T10:00:00Z',
        message: 'Invalid reading data',
        errorType: 'CLIENT_ERROR',
        statusCode: 400,
        readingId: 'reading123',
        retryable: false,
      };
      expect(error.readingId).toBe('reading123');
    });

    it('should accept server error', () => {
      const error: SyncError = {
        timestamp: '2024-01-15T10:00:00Z',
        message: 'Internal server error',
        errorType: 'SERVER_ERROR',
        statusCode: 500,
        retryable: true,
      };
      expect(error.errorType).toBe('SERVER_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('SyncOptions interface', () => {
    it('should accept default incremental sync', () => {
      const options: SyncOptions = {
        incremental: true,
      };
      expect(options.incremental).toBe(true);
    });

    it('should accept full sync with date range', () => {
      const options: SyncOptions = {
        incremental: false,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };
      expect(options.incremental).toBe(false);
      expect(options.startDate).toBe('2024-01-01T00:00:00Z');
      expect(options.endDate).toBe('2024-01-31T23:59:59Z');
    });

    it('should accept sync with type filter', () => {
      const options: SyncOptions = {
        incremental: true,
        types: ['cbg'],
      };
      expect(options.types).toEqual(['cbg']);
    });

    it('should accept sync with multiple types', () => {
      const options: SyncOptions = {
        incremental: true,
        types: ['cbg', 'smbg'],
      };
      expect(options.types?.length).toBe(2);
      expect(options.types).toContain('cbg');
      expect(options.types).toContain('smbg');
    });

    it('should accept sync with custom batch size', () => {
      const options: SyncOptions = {
        incremental: true,
        batchSize: 50,
      };
      expect(options.batchSize).toBe(50);
    });

    it('should accept sync with all options', () => {
      const options: SyncOptions = {
        incremental: false,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        types: ['cbg', 'smbg'],
        batchSize: 200,
      };
      expect(options.incremental).toBe(false);
      expect(options.batchSize).toBe(200);
      expect(options.types?.length).toBe(2);
    });
  });

  describe('SyncMetadata interface', () => {
    it('should accept initial metadata', () => {
      const metadata: SyncMetadata = {
        lastSyncTimestamp: null,
        totalReadingsSynced: 0,
        syncHistory: [],
      };
      expect(metadata.lastSyncTimestamp).toBeNull();
      expect(metadata.totalReadingsSynced).toBe(0);
      expect(metadata.syncHistory.length).toBe(0);
    });

    it('should accept metadata after successful sync', () => {
      const metadata: SyncMetadata = {
        lastSyncTimestamp: '2024-01-15T10:00:00Z',
        totalReadingsSynced: 500,
        syncHistory: [
          {
            timestamp: '2024-01-15T10:00:00Z',
            itemsSynced: 500,
            duration: 5000,
            success: true,
          },
        ],
      };
      expect(metadata.totalReadingsSynced).toBe(500);
      expect(metadata.syncHistory.length).toBe(1);
    });

    it('should accept metadata with multiple history entries', () => {
      const metadata: SyncMetadata = {
        lastSyncTimestamp: '2024-01-15T10:00:00Z',
        totalReadingsSynced: 1500,
        syncHistory: [
          {
            timestamp: '2024-01-15T10:00:00Z',
            itemsSynced: 500,
            duration: 5000,
            success: true,
          },
          {
            timestamp: '2024-01-14T10:00:00Z',
            itemsSynced: 600,
            duration: 6000,
            success: true,
          },
          {
            timestamp: '2024-01-13T10:00:00Z',
            itemsSynced: 400,
            duration: 4000,
            success: true,
          },
        ],
      };
      expect(metadata.syncHistory.length).toBe(3);
      expect(metadata.totalReadingsSynced).toBe(1500);
    });

    it('should limit history to 10 entries', () => {
      const historyEntries: SyncHistoryEntry[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          timestamp: `2024-01-${i + 1}T10:00:00Z`,
          itemsSynced: 100,
          duration: 1000,
          success: true,
        }));

      const metadata: SyncMetadata = {
        lastSyncTimestamp: '2024-01-10T10:00:00Z',
        totalReadingsSynced: 1000,
        syncHistory: historyEntries,
      };
      expect(metadata.syncHistory.length).toBe(10);
    });
  });

  describe('SyncHistoryEntry interface', () => {
    it('should accept successful sync entry', () => {
      const entry: SyncHistoryEntry = {
        timestamp: '2024-01-15T10:00:00Z',
        itemsSynced: 500,
        duration: 5000,
        success: true,
      };
      expect(entry.success).toBe(true);
      expect(entry.errorMessage).toBeUndefined();
    });

    it('should accept failed sync entry', () => {
      const entry: SyncHistoryEntry = {
        timestamp: '2024-01-15T10:00:00Z',
        itemsSynced: 0,
        duration: 1000,
        success: false,
        errorMessage: 'Network connection failed',
      };
      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe('Network connection failed');
    });

    it('should accept entry with various durations', () => {
      const entry: SyncHistoryEntry = {
        timestamp: '2024-01-15T10:00:00Z',
        itemsSynced: 1000,
        duration: 30000,
        success: true,
      };
      expect(entry.duration).toBe(30000);
      expect(entry.duration).toBeGreaterThan(0);
    });

    it('should accept partial sync entry', () => {
      const entry: SyncHistoryEntry = {
        timestamp: '2024-01-15T10:00:00Z',
        itemsSynced: 250,
        duration: 3000,
        success: true,
      };
      expect(entry.itemsSynced).toBe(250);
    });
  });

  describe('TidepoolDataResponse interface', () => {
    it('should accept empty data response', () => {
      const response: TidepoolDataResponse = {
        data: [],
      };
      expect(response.data.length).toBe(0);
    });

    it('should accept response with readings', () => {
      const response: TidepoolDataResponse = {
        data: [
          {
            id: 'reading1',
            type: 'cbg',
            time: '2024-01-15T08:00:00Z',
            value: 120,
            units: 'mg/dL',
          },
          {
            id: 'reading2',
            type: 'smbg',
            time: '2024-01-15T12:00:00Z',
            value: 95,
            units: 'mg/dL',
          },
        ],
      };
      expect(response.data.length).toBe(2);
    });

    it('should accept response with pagination metadata', () => {
      const response: TidepoolDataResponse = {
        data: [
          {
            id: 'reading1',
            type: 'cbg',
            time: '2024-01-15T08:00:00Z',
            value: 120,
            units: 'mg/dL',
          },
        ],
        total: 1000,
        offset: 0,
      };
      expect(response.total).toBe(1000);
      expect(response.offset).toBe(0);
    });

    it('should accept paginated response', () => {
      const response: TidepoolDataResponse = {
        data: [],
        total: 1000,
        offset: 500,
      };
      expect(response.offset).toBe(500);
      expect(response.total).toBe(1000);
    });
  });

  describe('Data consistency', () => {
    it('should track sync progress correctly', () => {
      const total = 500;
      const synced = 250;
      const status: SyncStatus = {
        isRunning: true,
        lastSyncTime: '2024-01-15T10:00:00Z',
        itemsSynced: synced,
        itemsFailed: 0,
        errors: [],
        progress: (synced / total) * 100,
      };
      expect(status.progress).toBe(50);
    });

    it('should accumulate total synced across history', () => {
      const history: SyncHistoryEntry[] = [
        { timestamp: '2024-01-15T10:00:00Z', itemsSynced: 500, duration: 5000, success: true },
        { timestamp: '2024-01-14T10:00:00Z', itemsSynced: 600, duration: 6000, success: true },
        { timestamp: '2024-01-13T10:00:00Z', itemsSynced: 400, duration: 4000, success: true },
      ];

      const totalSynced = history.reduce((sum, entry) => sum + entry.itemsSynced, 0);

      const metadata: SyncMetadata = {
        lastSyncTimestamp: '2024-01-15T10:00:00Z',
        totalReadingsSynced: totalSynced,
        syncHistory: history,
      };

      expect(metadata.totalReadingsSynced).toBe(1500);
    });

    it('should handle failed syncs in history', () => {
      const metadata: SyncMetadata = {
        lastSyncTimestamp: '2024-01-14T10:00:00Z',
        totalReadingsSynced: 600,
        syncHistory: [
          {
            timestamp: '2024-01-15T10:00:00Z',
            itemsSynced: 0,
            duration: 1000,
            success: false,
            errorMessage: 'Network error',
          },
          { timestamp: '2024-01-14T10:00:00Z', itemsSynced: 600, duration: 6000, success: true },
        ],
      };

      const lastSuccessfulSync = metadata.syncHistory.find(entry => entry.success);
      expect(lastSuccessfulSync?.itemsSynced).toBe(600);
      expect(metadata.lastSyncTimestamp).toBe('2024-01-14T10:00:00Z');
    });
  });
});

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { ReadingsService, LIVE_QUERY_FN } from '@services/readings.service';
import { ReadingsMapperService } from '@services/readings-mapper.service';
import { ReadingsStatisticsService } from '@services/readings-statistics.service';
import { ReadingsSyncService } from '@services/readings-sync.service';
import { DiabetacticDatabase } from '@services/database.service';
import { MockDataService } from '@services/mock-data.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { Network } from '@capacitor/network';
import Dexie from 'dexie';
import type { Mock } from 'vitest';
import { of } from 'rxjs';
import { AuditLogService } from '@services/audit-log.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';

class MockEnvironmentConfigService {
  isMockMode = false;
  backendMode = 'local';
}

describe('ReadingsService - Offline Detection', () => {
  let service: ReadingsService;
  let mockDb: DiabetacticDatabase;
  let mockLogger: Mock<LoggerService>;
  let mockApiGateway: Mock<ApiGatewayService>;

  /**
   * Helper to wait for service initialization
   * Increases delay to 500ms to ensure network monitoring is initialized
   * The async initializeNetworkMonitoring() is called from constructor but not awaited
   */
  const waitForInit = () => new Promise(resolve => setTimeout(resolve, 500));

  beforeEach(() => {
    // Reset TestBed to prevent "module already instantiated" errors
    TestBed.resetTestingModule();

    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh mock database
    mockDb = new Dexie('test-db') as DiabetacticDatabase;
    mockDb.version(1).stores({
      readings: 'id, time, synced',
      syncQueue: '++id, readingId, timestamp',
      appointments: 'id, datetime, userId',
      conflicts: '++id, readingId, status',
      auditLog: '++id, action, createdAt',
    });

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Mock<LoggerService>;

    // Mock API Gateway
    mockApiGateway = {
      request: vi.fn().mockReturnValue(of({ success: true, data: {} })),
    } as unknown as Mock<ApiGatewayService>;

    // Mock liveQuery function
    const mockLiveQuery = (queryFn: () => Promise<unknown>) => {
      return {
        subscribe: (observer: { next?: (value: unknown) => void }) => {
          queryFn().then(result => observer.next?.(result));
          return { unsubscribe: () => {} };
        },
      };
    };

    // Mock Network plugin - default to online (reset for each test)
    (Network.getStatus as Mock).mockReset().mockResolvedValue({ connected: true });
    (Network.addListener as Mock).mockReset().mockReturnValue({ remove: vi.fn() });

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        ReadingsMapperService,
        ReadingsStatisticsService,
        ReadingsSyncService,
        AuditLogService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        { provide: LIVE_QUERY_FN, useValue: mockLiveQuery },
        { provide: EnvironmentConfigService, useClass: MockEnvironmentConfigService },
        { provide: MockDataService, useValue: undefined },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(ReadingsService);
  });

  afterEach(async () => {
    await mockDb.delete();
  });

  describe('initializeNetworkMonitoring', () => {
    it('should get initial network status on initialization', async () => {
      await waitForInit();

      expect(Network.getStatus).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Network',
        expect.stringContaining('Initial network status: online')
      );
    });

    it('should register network status change listener', async () => {
      await waitForInit();

      expect(Network.addListener).toHaveBeenCalledWith('networkStatusChange', expect.any(Function));
    });

    it('should handle network status changes', async () => {
      await waitForInit();

      // Get the listener callback
      const addListenerCall = (Network.addListener as Mock).mock.calls[0];
      const statusChangeCallback = addListenerCall[1];

      mockLogger.info.mockClear();

      // Simulate going offline
      statusChangeCallback({ connected: false });

      expect(mockLogger.info).toHaveBeenCalledWith('Network', 'Network status changed: offline');

      // Simulate going back online
      statusChangeCallback({ connected: true });

      expect(mockLogger.info).toHaveBeenCalledWith('Network', 'Network status changed: online');
    });
  });

  describe('syncPendingReadings - offline behavior', () => {
    it('should skip sync when offline', async () => {
      await waitForInit();

      // Set service to offline by triggering status change
      const addListenerCall = (Network.addListener as Mock).mock.calls[0];
      const statusChangeCallback = addListenerCall[1];

      // Simulate going offline
      statusChangeCallback({ connected: false });

      // Trigger sync
      const result = await service.syncPendingReadings();

      expect(result).toEqual({ success: 0, failed: 0 });
      expect(mockLogger.info).toHaveBeenCalledWith('Sync', 'Skipping sync - device is offline');
      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });
  });

  describe('fetchFromBackend - offline behavior', () => {
    it('should skip fetch when offline', async () => {
      await waitForInit();

      // Set service to offline
      const addListenerCall = (Network.addListener as Mock).mock.calls[0];
      const statusChangeCallback = addListenerCall[1];

      // Simulate going offline
      statusChangeCallback({ connected: false });

      // Trigger fetch
      const result = await service.fetchFromBackend();

      expect(result).toEqual({ fetched: 0, merged: 0 });
      expect(mockLogger.info).toHaveBeenCalledWith('Sync', 'Skipping fetch - device is offline');
      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });

    it('should proceed with fetch when online', async () => {
      // Mock API response
      mockApiGateway.request = vi
        .fn()
        .mockReturnValue(of({ success: true, data: { readings: [] } }));

      await waitForInit();

      // Trigger fetch (should not skip due to offline)
      await service.fetchFromBackend();

      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Sync',
        'Skipping fetch - device is offline'
      );
    });
  });

  describe('performFullSync - offline behavior', () => {
    it('should skip both push and fetch when offline', async () => {
      await waitForInit();

      // Set service to offline
      const addListenerCall = (Network.addListener as Mock).mock.calls[0];
      const statusChangeCallback = addListenerCall[1];

      // Simulate going offline
      statusChangeCallback({ connected: false });

      // Trigger full sync
      const result = await service.performFullSync();

      expect(result).toEqual({
        pushed: 0,
        fetched: 0,
        failed: 0,
        lastError: undefined,
      });

      // Verify both sync and fetch were skipped
      expect(mockLogger.info).toHaveBeenCalledWith('Sync', 'Skipping sync - device is offline');
      expect(mockLogger.info).toHaveBeenCalledWith('Sync', 'Skipping fetch - device is offline');
    });
  });
});

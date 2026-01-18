// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import {
  ExternalServicesManager,
  ExternalService,
  HealthStatus,
} from '@services/external-services-manager.service';
import { LoggerService } from '@services/logger.service';
import { Network } from '@capacitor/network';
import { environment } from '@env/environment';
import type { Mock } from 'vitest';

// Note: @capacitor/network is already mocked in test-setup/index.ts

describe('ExternalServicesManager', () => {
  let service: ExternalServicesManager;
  let httpClient: Mock<HttpClient>;
  let networkListenerHandle: { remove: Mock };

  const mockNetworkStatus = { connected: true, connectionType: 'wifi' };

  beforeEach(async () => {
    // Mock environment with complete structure
    environment.backendServices = {
      ...environment.backendServices,
      apiGateway: {
        baseUrl: 'https://api-gateway.com',
        apiPath: '/api',
        requestTimeout: 30000,
      },
      glucoserver: {
        baseUrl: 'https://glucoserver.com',
        apiPath: '/api',
        requestTimeout: 30000,
      },
      appointments: {
        baseUrl: 'https://appointments.com',
        apiPath: '/api',
        requestTimeout: 30000,
      },
      auth: {
        baseUrl: 'https://auth.com',
        apiPath: '/api',
        requestTimeout: 15000,
      },
    };

    environment.tidepool = {
      ...environment.tidepool,
      baseUrl: 'https://tidepool.org',
      requestTimeout: 30000,
      maxRetries: 3,
    };

    environment.features = {
      ...environment.features,
      useTidepoolIntegration: true,
    };

    const httpClientMock = {
      get: vi.fn(),
      head: vi.fn(),
      post: vi.fn(),
    };

    (Network.getStatus as Mock).mockResolvedValue(mockNetworkStatus);
    networkListenerHandle = { remove: vi.fn() };
    (Network.addListener as Mock).mockImplementation(() => networkListenerHandle);

    TestBed.configureTestingModule({
      providers: [ExternalServicesManager, { provide: HttpClient, useValue: httpClientMock }],
    });

    service = TestBed.inject(ExternalServicesManager);
    httpClient = TestBed.inject(HttpClient) as Mock<HttpClient>;

    // Ensure the async initializer has populated circuit breakers before running tests.
    await firstValueFrom(
      service.state.pipe(
        filter(s => s.circuitBreakers.size > 0),
        take(1)
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize circuit breakers for all services', () =>
      new Promise<void>(resolve => {
        service.state.subscribe(state => {
          expect(state.circuitBreakers.size).toBeGreaterThan(0);
          expect(state.circuitBreakers.has(ExternalService.GLUCOSERVER)).toBe(true);
          expect(state.circuitBreakers.has(ExternalService.TIDEPOOL)).toBe(true);
          resolve();
        });
      }));

    it('should set up network monitoring', () => {
      expect(Network.getStatus).toHaveBeenCalled();
      expect(Network.addListener).toHaveBeenCalledWith('networkStatusChange', expect.any(Function));
    });

    it('should initialize with online state', () =>
      new Promise<void>(resolve => {
        service.state.subscribe(state => {
          expect(state.isOnline).toBe(true);
          resolve();
        });
      }));
  });

  describe('isServiceAvailable', () => {
    it('should return true for service with closed circuit breaker when online', () => {
      expect(service.isServiceAvailable(ExternalService.GLUCOSERVER)).toBe(true);
    });

    it('should return false when circuit breaker is open', async () => {
      httpClient.head.mockReturnValue(throwError(() => new Error('Network error')));
      const threshold =
        service.getServiceConfig(ExternalService.GLUCOSERVER)?.circuitBreakerThreshold ?? 3;

      for (let i = 0; i < threshold; i++) {
        await service.checkService(ExternalService.GLUCOSERVER);
      }

      expect(service.isServiceAvailable(ExternalService.GLUCOSERVER)).toBe(false);
    });

    it('should return false when offline and service does not support offline', () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1] as (s: {
        connected: boolean;
        connectionType?: string;
      }) => void;
      listener({ connected: false, connectionType: 'none' });

      // APPOINTMENTS doesn't support offline
      expect(service.isServiceAvailable(ExternalService.APPOINTMENTS)).toBe(false);
    });

    it('should return true when offline but service supports offline', () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1] as (s: {
        connected: boolean;
        connectionType?: string;
      }) => void;
      listener({ connected: false, connectionType: 'none' });

      // GLUCOSERVER supports offline
      expect(service.isServiceAvailable(ExternalService.GLUCOSERVER)).toBe(true);
    });

    it('should return true when health status is unknown', () => {
      expect(service.isServiceAvailable(ExternalService.GLUCOSERVER)).toBe(true);
    });
  });

  describe('performHealthCheck', () => {
    it('should check all configured services', async () => {
      httpClient.get.mockReturnValue(of({ status: 'ok' }));
      httpClient.head.mockReturnValue(of(null));

      const healthChecks = await service.performHealthCheck();

      expect(healthChecks.size).toBeGreaterThan(0);
      expect(healthChecks.has(ExternalService.GLUCOSERVER)).toBe(true);
    });

    it('should mark service as healthy on successful check', async () => {
      httpClient.get.mockReturnValue(of({ status: 'ok' }));
      httpClient.head.mockReturnValue(of(null));

      const healthChecks = await service.performHealthCheck();
      const glucoserverHealth = healthChecks.get(ExternalService.GLUCOSERVER);

      // Service has no healthEndpoint, so it uses HEAD request
      expect(glucoserverHealth?.status).toBe(HealthStatus.HEALTHY);
    });

    it('should update overall health status', async () => {
      httpClient.get.mockReturnValue(of({ status: 'ok' }));
      httpClient.head.mockReturnValue(of(null));

      await service.performHealthCheck();

      const state = await new Promise<any>(resolve => {
        service.state.subscribe(s => resolve(s));
      });

      expect(state.overallHealth).toBeDefined();
      expect(state.lastFullCheck).toBeDefined();
    });
  });

  describe('circuit breaker', () => {
    it('should increment failure count on error', async () => {
      httpClient.head.mockReturnValue(throwError(() => new Error('Network error')));

      await service.performHealthCheck();

      const circuitBreaker = service.getCircuitBreakerState(ExternalService.GLUCOSERVER);
      expect(circuitBreaker?.failureCount).toBeGreaterThan(0);
    });

    it('should open circuit breaker after threshold failures', async () => {
      httpClient.head.mockReturnValue(throwError(() => new Error('Network error')));

      const config = service.getServiceConfig(ExternalService.GLUCOSERVER);
      const threshold = config?.circuitBreakerThreshold || 3;

      // Trigger failures up to threshold
      for (let i = 0; i < threshold; i++) {
        await service.checkService(ExternalService.GLUCOSERVER);
      }

      const circuitBreaker = service.getCircuitBreakerState(ExternalService.GLUCOSERVER);
      expect(circuitBreaker?.state).toBe('OPEN');
    });

    it('should reset circuit breaker on successful request', async () => {
      // First fail
      httpClient.head.mockReturnValue(throwError(() => new Error('Network error')));
      await service.checkService(ExternalService.GLUCOSERVER);

      // Then succeed
      httpClient.head.mockReturnValue(of(null));
      await service.checkService(ExternalService.GLUCOSERVER);

      const circuitBreaker = service.getCircuitBreakerState(ExternalService.GLUCOSERVER);
      expect(circuitBreaker?.state).toBe('CLOSED');
      expect(circuitBreaker?.failureCount).toBe(0);
    });

    it('should manually reset circuit breaker', async () => {
      httpClient.head.mockReturnValue(throwError(() => new Error('Network error')));
      const threshold =
        service.getServiceConfig(ExternalService.GLUCOSERVER)?.circuitBreakerThreshold ?? 3;

      for (let i = 0; i < threshold; i++) {
        await service.checkService(ExternalService.GLUCOSERVER);
      }

      service.resetCircuitBreaker(ExternalService.GLUCOSERVER);

      const circuitBreaker = service.getCircuitBreakerState(ExternalService.GLUCOSERVER);
      expect(circuitBreaker?.state).toBe('CLOSED');
      expect(circuitBreaker?.failureCount).toBe(0);
    });
  });

  describe('executeRequest', () => {
    it('should execute request when service is available', async () => {
      const mockResult = { data: 'test' };
      const requestFn = vi.fn().mockResolvedValue(mockResult);

      const result = await service.executeRequest(ExternalService.GLUCOSERVER, requestFn);

      expect(result).toEqual(mockResult);
      expect(requestFn).toHaveBeenCalled();
    });

    it('should throw error when service is unavailable', async () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1] as (s: {
        connected: boolean;
        connectionType?: string;
      }) => void;
      listener({ connected: false, connectionType: 'none' });

      const requestFn = vi.fn();

      await expect(service.executeRequest(ExternalService.APPOINTMENTS, requestFn)).rejects.toThrow(
        'Service APPOINTMENTS is not available'
      );
    });

    it('should use fallback when service is unavailable', async () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1] as (s: {
        connected: boolean;
        connectionType?: string;
      }) => void;
      listener({ connected: false, connectionType: 'none' });

      const fallbackData = { data: 'fallback' };
      const requestFn = vi.fn();
      const fallbackFn = vi.fn().mockReturnValue(fallbackData);

      const result = await service.executeRequest(ExternalService.APPOINTMENTS, requestFn, {
        fallback: fallbackFn,
      });

      expect(result).toEqual(fallbackData);
      expect(fallbackFn).toHaveBeenCalled();
    });

    it('should return cached data when available', async () => {
      const mockResult = { data: 'test' };
      const requestFn = vi.fn().mockResolvedValue(mockResult);

      // First call - should execute request
      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
      });

      // Second call - should use cache
      const cachedResult = await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
      });

      expect(cachedResult).toEqual(mockResult);
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when forceRefresh is true', async () => {
      const mockResult = { data: 'test' };
      const requestFn = vi.fn().mockResolvedValue(mockResult);

      // First call
      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
      });

      // Second call with forceRefresh
      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
        forceRefresh: true,
      });

      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should reset circuit breaker on successful request', async () => {
      httpClient.head.mockReturnValue(throwError(() => new Error('Network error')));
      await service.checkService(ExternalService.GLUCOSERVER);
      await service.checkService(ExternalService.GLUCOSERVER);
      expect(service.getCircuitBreakerState(ExternalService.GLUCOSERVER)?.failureCount).toBe(2);

      // When offline, offline-capable services are considered available even if health is UNHEALTHY.
      const listener = (Network.addListener as Mock).mock.calls[0][1] as (s: {
        connected: boolean;
        connectionType?: string;
      }) => void;
      listener({ connected: false, connectionType: 'none' });

      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });
      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn);

      const circuitBreaker = service.getCircuitBreakerState(ExternalService.GLUCOSERVER);
      expect(circuitBreaker?.failureCount).toBe(0);
    });

    it('should use fallback on request failure', async () => {
      const requestFn = vi.fn().mockRejectedValue(new Error('Request failed'));
      const fallbackData = { data: 'fallback' };
      const fallbackFn = vi.fn().mockReturnValue(fallbackData);

      const result = await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        fallback: fallbackFn,
      });

      expect(result).toEqual(fallbackData);
    });
  });

  describe('cache management', () => {
    it('should cache data with service prefix', async () => {
      const glucoserverRequest = vi.fn().mockResolvedValue({ data: 'gluco' });
      const tidepoolRequest = vi.fn().mockResolvedValue({ data: 'tidepool' });

      await service.executeRequest(ExternalService.GLUCOSERVER, glucoserverRequest, {
        cacheKey: 'same-key',
      });
      await service.executeRequest(ExternalService.TIDEPOOL, tidepoolRequest, {
        cacheKey: 'same-key',
      });

      await service.executeRequest(ExternalService.GLUCOSERVER, glucoserverRequest, {
        cacheKey: 'same-key',
      });
      await service.executeRequest(ExternalService.TIDEPOOL, tidepoolRequest, {
        cacheKey: 'same-key',
      });

      // Cache should be isolated per service via key prefix (service:cacheKey)
      expect(glucoserverRequest).toHaveBeenCalledTimes(1);
      expect(tidepoolRequest).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after duration', async () => {
      // Override cache duration to 100ms for testing
      const config = service.getServiceConfig(ExternalService.GLUCOSERVER);
      if (config) {
        config.cacheDuration = 100;
      }

      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
      });

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should execute request again
      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
      });

      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should clear cache for specific service', async () => {
      const glucoserverRequest = vi.fn().mockResolvedValue({ data: 'gluco' });
      const tidepoolRequest = vi.fn().mockResolvedValue({ data: 'tidepool' });

      await service.executeRequest(ExternalService.GLUCOSERVER, glucoserverRequest, {
        cacheKey: 'shared-key',
      });
      await service.executeRequest(ExternalService.TIDEPOOL, tidepoolRequest, {
        cacheKey: 'shared-key',
      });

      service.clearCache(ExternalService.GLUCOSERVER);

      await service.executeRequest(ExternalService.GLUCOSERVER, glucoserverRequest, {
        cacheKey: 'shared-key',
      });
      await service.executeRequest(ExternalService.TIDEPOOL, tidepoolRequest, {
        cacheKey: 'shared-key',
      });

      expect(glucoserverRequest).toHaveBeenCalledTimes(2);
      expect(tidepoolRequest).toHaveBeenCalledTimes(1);
    });

    it('should clear all cache when no service specified', async () => {
      const glucoserverRequest = vi.fn().mockResolvedValue({ data: 'gluco' });
      const tidepoolRequest = vi.fn().mockResolvedValue({ data: 'tidepool' });

      await service.executeRequest(ExternalService.GLUCOSERVER, glucoserverRequest, {
        cacheKey: 'key1',
      });
      await service.executeRequest(ExternalService.TIDEPOOL, tidepoolRequest, { cacheKey: 'key2' });

      service.clearCache();

      await service.executeRequest(ExternalService.GLUCOSERVER, glucoserverRequest, {
        cacheKey: 'key1',
      });
      await service.executeRequest(ExternalService.TIDEPOOL, tidepoolRequest, { cacheKey: 'key2' });

      expect(glucoserverRequest).toHaveBeenCalledTimes(2);
      expect(tidepoolRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('network monitoring', () => {
    it('should update state when network status changes', async () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1];

      listener({ connected: false, connectionType: 'none' });

      const state = await firstValueFrom(service.state.pipe(take(1)));
      expect(state.isOnline).toBe(false);
    });

    // Note: Health check on network reconnect was disabled to prevent false positives
    // during network transitions. The service now relies on the periodic health check interval.
    // See: external-services-manager.service.ts lines 154-159 for context
    it('should NOT perform health check immediately when network reconnects (disabled)', () => {
      const performHealthCheckSpy = vi.spyOn(service, 'performHealthCheck');
      const listener = (Network.addListener as Mock).mock.calls[0][1];

      listener({ connected: true });

      // Health check is intentionally NOT called on reconnect to avoid
      // false positives during transient network state changes
      expect(performHealthCheckSpy).not.toHaveBeenCalled();
    });

    it('should mark all services unhealthy when network disconnects', async () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1];

      listener({ connected: false, connectionType: 'none' });

      const state = await firstValueFrom(service.state.pipe(take(1)));
      const glucoserverHealth = state.services.get(ExternalService.GLUCOSERVER);
      expect(glucoserverHealth?.status).toBe(HealthStatus.UNHEALTHY);
    });
  });

  describe('service configuration', () => {
    it('should get service configuration', () => {
      const config = service.getServiceConfig(ExternalService.GLUCOSERVER);

      expect(config).toBeDefined();
      expect(config?.name).toBe('Glucoserver');
      expect(config?.offlineSupport).toBe(true);
    });

    it('should return undefined for unknown service', () => {
      const config = service.getServiceConfig('UNKNOWN' as ExternalService);
      expect(config).toBeUndefined();
    });

    it('should configure Tidepool when enabled in environment', () => {
      const config = service.getServiceConfig(ExternalService.TIDEPOOL);

      expect(config).toBeDefined();
      expect(config?.name).toBe('Tidepool API');
    });

    it('should not configure Tidepool when disabled in environment', () => {
      environment.features!.useTidepoolIntegration = false;

      const logger = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as LoggerService;

      // Create new service instance (config map is built at construction time)
      const newService = new ExternalServicesManager(httpClient, logger);
      const config = newService.getServiceConfig(ExternalService.TIDEPOOL);

      expect(config).toBeUndefined();
      newService.ngOnDestroy();
    });
  });

  describe('getServiceHealth', () => {
    it('should get health check result', async () => {
      httpClient.head.mockReturnValue(of(null));

      await service.performHealthCheck();

      const health = service.getServiceHealth(ExternalService.GLUCOSERVER);
      expect(health).toBeDefined();
    });

    it('should return undefined for unchecked service', () => {
      const health = service.getServiceHealth(ExternalService.GLUCOSERVER);
      expect(health).toBeUndefined();
    });
  });

  describe('checkService', () => {
    it('should perform health check for specific service', async () => {
      httpClient.head.mockReturnValue(of(null));

      const health = await service.checkService(ExternalService.GLUCOSERVER);

      expect(health.service).toBe(ExternalService.GLUCOSERVER);
      expect(health.status).toBe(HealthStatus.HEALTHY);
    });

    it('should throw error for unknown service', async () => {
      await expect(service.checkService('UNKNOWN' as ExternalService)).rejects.toThrow(
        'Unknown service: UNKNOWN'
      );
    });
  });

  describe('ngOnDestroy', () => {
    it('should clean up subscriptions', () => {
      let completed = false;
      const sub = service.state.subscribe({
        complete: () => {
          completed = true;
        },
      });

      service.ngOnDestroy();

      expect(networkListenerHandle.remove).toHaveBeenCalled();
      expect(completed).toBe(true);
      sub.unsubscribe();
    });
  });
});

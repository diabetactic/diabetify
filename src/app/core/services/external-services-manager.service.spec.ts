// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { of, throwError } from 'rxjs';
import {
  ExternalServicesManager,
  ExternalService,
  HealthStatus,
} from '@services/external-services-manager.service';
import { Network } from '@capacitor/network';
import { environment } from '@env/environment';
import type { Mock } from 'vitest';

// Note: @capacitor/network is already mocked in test-setup/index.ts

describe('ExternalServicesManager', () => {
  let service: ExternalServicesManager;
  let httpClient: Mock<HttpClient>;
  let injector: Injector;

  const mockNetworkStatus = { connected: true, connectionType: 'wifi' };

  beforeEach(() => {
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
    (Network.addListener as Mock).mockImplementation(() => ({ remove: vi.fn() }));

    TestBed.configureTestingModule({
      providers: [ExternalServicesManager, { provide: HttpClient, useValue: httpClientMock }],
    });

    service = TestBed.inject(ExternalServicesManager);
    httpClient = TestBed.inject(HttpClient) as Mock<HttpClient>;
    injector = TestBed.inject(Injector);
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

    it('should return false when circuit breaker is open', () => {
      // Manually open circuit breaker
      // @ts-expect-error - private method access for testing
      service.updateCircuitBreaker(ExternalService.GLUCOSERVER, {
        state: 'OPEN',
        failureCount: 5,
      });

      expect(service.isServiceAvailable(ExternalService.GLUCOSERVER)).toBe(false);
    });

    it('should return false when offline and service does not support offline', () => {
      // @ts-expect-error - private method access for testing
      service.updateState({ isOnline: false });

      // APPOINTMENTS doesn't support offline
      expect(service.isServiceAvailable(ExternalService.APPOINTMENTS)).toBe(false);
    });

    it('should return true when offline but service supports offline', () => {
      // @ts-expect-error - private method access for testing
      service.updateState({ isOnline: false });

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

    it('should manually reset circuit breaker', () => {
      // @ts-expect-error - private method access for testing
      service.updateCircuitBreaker(ExternalService.GLUCOSERVER, {
        state: 'OPEN',
        failureCount: 5,
      });

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
      // Open circuit breaker
      // @ts-expect-error - private method access for testing
      service.updateCircuitBreaker(ExternalService.GLUCOSERVER, {
        state: 'OPEN',
        failureCount: 5,
      });

      const requestFn = vi.fn();

      await expect(service.executeRequest(ExternalService.GLUCOSERVER, requestFn)).rejects.toThrow(
        'Service GLUCOSERVER is not available'
      );
    });

    it('should use fallback when service is unavailable', async () => {
      // @ts-expect-error - private method access for testing
      service.updateCircuitBreaker(ExternalService.GLUCOSERVER, {
        state: 'OPEN',
        failureCount: 5,
      });

      const fallbackData = { data: 'fallback' };
      const requestFn = vi.fn();
      const fallbackFn = vi.fn().mockReturnValue(fallbackData);

      const result = await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
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
      // Set some failures
      // @ts-expect-error - private method access for testing
      service.updateCircuitBreaker(ExternalService.GLUCOSERVER, {
        state: 'CLOSED',
        failureCount: 2,
      });

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
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
      });

      // @ts-expect-error - private property access for testing
      const cache = service.responseCache;
      expect(cache.has('GLUCOSERVER:test-key')).toBe(true);
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
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'test-key',
      });

      service.clearCache(ExternalService.GLUCOSERVER);

      // @ts-expect-error - private property access for testing
      const cache = service.responseCache;
      expect(cache.has('GLUCOSERVER:test-key')).toBe(false);
    });

    it('should clear all cache when no service specified', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await service.executeRequest(ExternalService.GLUCOSERVER, requestFn, {
        cacheKey: 'key1',
      });
      await service.executeRequest(ExternalService.TIDEPOOL, requestFn, { cacheKey: 'key2' });

      service.clearCache();

      // @ts-expect-error - private property access for testing
      const cache = service.responseCache;
      expect(cache.size).toBe(0);
    });
  });

  describe('network monitoring', () => {
    it('should update state when network status changes', () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1];

      listener({ connected: false });

      // @ts-expect-error - private property access for testing
      const state = service.state$.value;
      expect(state.isOnline).toBe(false);
    });

    it('should perform health check when network reconnects', () => {
      const performHealthCheckSpy = vi.spyOn(service, 'performHealthCheck');
      const listener = (Network.addListener as Mock).mock.calls[0][1];

      listener({ connected: true });

      expect(performHealthCheckSpy).toHaveBeenCalled();
    });

    it('should mark all services unhealthy when network disconnects', () => {
      const listener = (Network.addListener as Mock).mock.calls[0][1];

      listener({ connected: false });

      // @ts-expect-error - private property access for testing
      const state = service.state$.value;
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

      // Create new service instance
      const newService = new ExternalServicesManager(httpClient, injector);
      const config = newService.getServiceConfig(ExternalService.TIDEPOOL);

      expect(config).toBeUndefined();
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
      // @ts-expect-error - private method access for testing
      const stopSpy = vi.spyOn(service, 'stopHealthCheckInterval');

      service.ngOnDestroy();

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});

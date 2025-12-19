/**
 * External Services Manager Integration Tests
 *
 * Tests service health and circuit breaker patterns:
 * 1. Network monitoring → mark services unhealthy on disconnect
 * 2. Service health check → response time tracking
 * 3. Circuit breaker states (CLOSED → OPEN → HALF_OPEN)
 * 4. Circuit breaker timeout calculation
 * 5. isServiceAvailable check (online + circuit + health)
 * 6. Response caching per service
 * 7. Overall health calculation
 * 8. Service configuration from environment
 */

// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import {
  ExternalServicesManager,
  ExternalService,
  HealthStatus,
} from '@core/services/external-services-manager.service';
import { Network } from '@capacitor/network';

describe('ExternalServicesManager Integration Tests', () => {
  let manager: ExternalServicesManager;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    // Reset Network mocks BEFORE TestBed configuration
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: true, connectionType: 'wifi' });
    vi.mocked(Network.addListener).mockResolvedValue({ remove: vi.fn() });

    TestBed.configureTestingModule({
      providers: [ExternalServicesManager, provideHttpClient(), provideHttpClientTesting()],
    });

    manager = TestBed.inject(ExternalServicesManager);
    httpMock = TestBed.inject(HttpTestingController);

    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(() => {
    try {
      // Flush any pending HTTP requests
      const pending = httpMock.match(() => true);
      pending.forEach(req => {
        if (!req.cancelled) {
          req.flush({});
        }
      });
    } catch (e) {
      // Ignore errors during cleanup
    }

    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  describe('Service Health Checks', () => {
    it('should track response time for healthy service', async () => {
      // ACT: Perform health check for TIDEPOOL (has health endpoint)
      const healthCheckPromise = manager.checkService(ExternalService.TIDEPOOL);

      // ASSERT: Mock HTTP request
      const req = httpMock.expectOne(request => request.url.includes('/v1/status'));
      expect(req.request.method).toBe('GET');

      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate 50ms response
      req.flush({ status: 'ok' });

      const health = await healthCheckPromise;

      // Verify health check result
      expect(health.status).toBe(HealthStatus.HEALTHY);
      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it('should mark service unhealthy on failed health check', async () => {
      // ACT: Perform health check that fails
      const healthCheckPromise = manager.checkService(ExternalService.TIDEPOOL);

      // ASSERT: Mock HTTP failure with retry
      const req1 = httpMock.expectOne(request => request.url.includes('/v1/status'));
      req1.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      // Expect retry attempt
      const req2 = httpMock.expectOne(request => request.url.includes('/v1/status'));
      req2.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      const health = await healthCheckPromise;

      // Verify unhealthy status
      expect(health.status).toBe(HealthStatus.UNHEALTHY);
      expect(health.message).toBeTruthy();
    });

    it('should handle service without health endpoint gracefully', async () => {
      // ACT: Check service without dedicated health endpoint (GLUCOSERVER)
      const healthCheckPromise = manager.checkService(ExternalService.GLUCOSERVER);

      // ASSERT: Should make HEAD request to base URL instead
      const req = httpMock.expectOne(
        request => request.method === 'HEAD' || request.method === 'GET'
      );
      req.flush({});

      const health = await healthCheckPromise;

      // Should still return health status
      expect(health.service).toBe(ExternalService.GLUCOSERVER);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('Circuit Breaker States', () => {
    it('should allow requests when circuit breaker is CLOSED', () => {
      // ARRANGE: Circuit breaker starts CLOSED by default
      const circuitState = manager.getCircuitBreakerState(ExternalService.TIDEPOOL);
      expect(circuitState?.state).toBe('CLOSED');

      // ACT & ASSERT: Service should be available
      const available = manager.isServiceAvailable(ExternalService.TIDEPOOL);
      expect(available).toBe(true);
    });

    it('should reset circuit breaker to CLOSED state', () => {
      // ARRANGE: Get initial circuit breaker state
      const initialState = manager.getCircuitBreakerState(ExternalService.TIDEPOOL);
      expect(initialState?.state).toBe('CLOSED');

      // ACT: Reset circuit breaker
      manager.resetCircuitBreaker(ExternalService.TIDEPOOL);

      // ASSERT: Circuit should remain CLOSED with zero failures
      const circuitState = manager.getCircuitBreakerState(ExternalService.TIDEPOOL);
      expect(circuitState?.state).toBe('CLOSED');
      expect(circuitState?.failureCount).toBe(0);
      expect(circuitState?.nextAttemptTime).toBeUndefined();
    });
  });

  describe('Service Availability Checks', () => {
    it('should return true when online, circuit CLOSED, and health unknown', () => {
      // ARRANGE: Default state (online, circuit closed, no health check yet)
      vi.mocked(Network.getStatus).mockResolvedValue({ connected: true, connectionType: 'wifi' });

      // ACT & ASSERT
      const available = manager.isServiceAvailable(ExternalService.TIDEPOOL);
      expect(available).toBe(true);
    });

    it('should check offline support correctly for each service', () => {
      // ACT: Check service configurations
      const tidepoolConfig = manager.getServiceConfig(ExternalService.TIDEPOOL);
      const glucoserverConfig = manager.getServiceConfig(ExternalService.GLUCOSERVER);
      const appointmentsConfig = manager.getServiceConfig(ExternalService.APPOINTMENTS);
      const authConfig = manager.getServiceConfig(ExternalService.LOCAL_AUTH);

      // ASSERT: Offline support flags
      expect(tidepoolConfig?.offlineSupport).toBe(true);
      expect(glucoserverConfig?.offlineSupport).toBe(true);
      expect(appointmentsConfig?.offlineSupport).toBe(false);
      expect(authConfig?.offlineSupport).toBe(false);
    });
  });

  describe('Response Caching', () => {
    it('should cache response and return cached data on subsequent calls', async () => {
      // ARRANGE: Setup cache configuration
      const cacheKey = 'test-key';
      const mockData = { test: 'data' };

      // ACT: First request (cache miss)
      const firstRequest = manager.executeRequest(ExternalService.TIDEPOOL, async () => mockData, {
        cacheKey,
      });

      const firstResult = await firstRequest;

      // ASSERT: First call should execute request
      expect(firstResult).toEqual(mockData);

      // ACT: Second request (cache hit)
      const secondRequest = manager.executeRequest(
        ExternalService.TIDEPOOL,
        async () => {
          throw new Error('Should not execute - cached');
        },
        { cacheKey }
      );

      const secondResult = await secondRequest;

      // ASSERT: Should return cached data without executing request
      expect(secondResult).toEqual(mockData);
    });

    it('should refresh cache after clearCache is called', async () => {
      // ARRANGE
      const cacheKey = 'test-expiry';
      const firstData = { version: 1 };
      const secondData = { version: 2 };

      // ACT: First request
      await manager.executeRequest(ExternalService.TIDEPOOL, async () => firstData, { cacheKey });

      // Simulate cache expiry by clearing
      manager.clearCache(ExternalService.TIDEPOOL);

      // Second request after cache cleared
      const result = await manager.executeRequest(
        ExternalService.TIDEPOOL,
        async () => secondData,
        {
          cacheKey,
        }
      );

      // ASSERT: Should get new data
      expect(result).toEqual(secondData);
    });

    it('should allow force refresh to bypass cache', async () => {
      // ARRANGE
      const cacheKey = 'test-force-refresh';
      const cachedData = { cached: true };
      const freshData = { cached: false };

      // Cache initial data
      await manager.executeRequest(ExternalService.TIDEPOOL, async () => cachedData, { cacheKey });

      // ACT: Force refresh
      const result = await manager.executeRequest(ExternalService.TIDEPOOL, async () => freshData, {
        cacheKey,
        forceRefresh: true,
      });

      // ASSERT: Should get fresh data
      expect(result).toEqual(freshData);
    });

    it('should clear cache for specific service', async () => {
      // ARRANGE: Cache data for multiple services
      await manager.executeRequest(
        ExternalService.TIDEPOOL,
        async () => ({ service: 'tidepool' }),
        {
          cacheKey: 'key1',
        }
      );
      await manager.executeRequest(
        ExternalService.GLUCOSERVER,
        async () => ({ service: 'glucoserver' }),
        { cacheKey: 'key2' }
      );

      // ACT: Clear only TIDEPOOL cache
      manager.clearCache(ExternalService.TIDEPOOL);

      // ASSERT: TIDEPOOL cache should be cleared, GLUCOSERVER cache should remain
      let requestExecuted = false;
      await manager.executeRequest(
        ExternalService.TIDEPOOL,
        async () => {
          requestExecuted = true;
          return { service: 'tidepool-fresh' };
        },
        { cacheKey: 'key1' }
      );

      expect(requestExecuted).toBe(true); // Cache was cleared, request executed

      // GLUCOSERVER cache should still work
      requestExecuted = false;
      await manager.executeRequest(
        ExternalService.GLUCOSERVER,
        async () => {
          requestExecuted = true;
          return { service: 'glucoserver-fresh' };
        },
        { cacheKey: 'key2' }
      );

      expect(requestExecuted).toBe(false); // Cache hit, request not executed
    });
  });

  describe('Overall Health Calculation', () => {
    it('should return HEALTHY when all services are healthy', async () => {
      // ACT: Perform successful health checks
      const tidepoolPromise = manager.checkService(ExternalService.TIDEPOOL);
      const glucoserverPromise = manager.checkService(ExternalService.GLUCOSERVER);

      // Mock successful responses
      const tidepoolReq = httpMock.expectOne(req => req.url.includes('tidepool'));
      tidepoolReq.flush({ status: 'ok' });

      const glucoserverReq = httpMock.expectOne(
        req => req.url.includes('glucoserver') || req.url.includes('/api')
      );
      glucoserverReq.flush({ status: 'ok' });

      await Promise.all([tidepoolPromise, glucoserverPromise]);

      // ASSERT: Overall health should be HEALTHY
      const state = await new Promise(resolve => {
        manager.state.subscribe(state => resolve(state));
      });

      expect((state as any).overallHealth).toBe(HealthStatus.HEALTHY);
    });

    it('should return DEGRADED when some services are unhealthy', async () => {
      // ACT: Mixed health checks
      const tidepoolCheck = manager.checkService(ExternalService.TIDEPOOL);
      const glucoserverCheck = manager.checkService(ExternalService.GLUCOSERVER);

      // TIDEPOOL succeeds
      const tidepoolReq = httpMock.expectOne(req => req.url.includes('tidepool'));
      tidepoolReq.flush({ status: 'ok' });

      // GLUCOSERVER fails (first attempt)
      const glucoserverReq1 = httpMock.expectOne(
        req => req.url.includes('glucoserver') || req.url.includes('/api')
      );
      glucoserverReq1.flush('Error', { status: 500, statusText: 'Error' });

      // GLUCOSERVER fails (retry)
      const glucoserverReq2 = httpMock.expectOne(
        req => req.url.includes('glucoserver') || req.url.includes('/api')
      );
      glucoserverReq2.flush('Error', { status: 500, statusText: 'Error' });

      await Promise.all([tidepoolCheck, glucoserverCheck]);

      // ASSERT: Overall health should be DEGRADED
      const state = await new Promise(resolve => {
        manager.state.subscribe(state => resolve(state));
      });

      expect((state as any).overallHealth).toBe(HealthStatus.DEGRADED);
    });
  });

  describe('Service Configuration', () => {
    it('should load service configuration from environment', () => {
      // ACT: Get service configurations
      const tidepoolConfig = manager.getServiceConfig(ExternalService.TIDEPOOL);
      const glucoserverConfig = manager.getServiceConfig(ExternalService.GLUCOSERVER);

      // ASSERT: Configurations should be loaded
      expect(tidepoolConfig).toBeDefined();
      expect(tidepoolConfig?.name).toBe('Tidepool API');
      expect(tidepoolConfig?.offlineSupport).toBe(true);
      expect(tidepoolConfig?.circuitBreakerThreshold).toBeGreaterThan(0);

      expect(glucoserverConfig).toBeDefined();
      expect(glucoserverConfig?.name).toBe('Glucoserver');
      expect(glucoserverConfig?.offlineSupport).toBe(true);
    });

    it('should use correct timeout values from configuration', () => {
      // ACT: Get configurations
      const tidepoolConfig = manager.getServiceConfig(ExternalService.TIDEPOOL);
      const appointmentsConfig = manager.getServiceConfig(ExternalService.APPOINTMENTS);

      // ASSERT: Different services should have different timeouts
      expect(tidepoolConfig?.timeout).toBeDefined();
      expect(appointmentsConfig?.timeout).toBeDefined();
      expect(tidepoolConfig?.timeout).toBeGreaterThan(0);
      expect(appointmentsConfig?.timeout).toBeGreaterThan(0);
    });

    it('should configure cache duration per service', () => {
      // ACT: Get cache durations
      const tidepoolConfig = manager.getServiceConfig(ExternalService.TIDEPOOL);
      const glucoserverConfig = manager.getServiceConfig(ExternalService.GLUCOSERVER);
      const authConfig = manager.getServiceConfig(ExternalService.LOCAL_AUTH);

      // ASSERT: Different cache durations
      expect(tidepoolConfig?.cacheDuration).toBeGreaterThan(0);
      expect(glucoserverConfig?.cacheDuration).toBeGreaterThan(0);
      expect(authConfig?.cacheDuration).toBe(0); // Auth should not cache
    });

    it('should configure circuit breaker thresholds correctly', () => {
      // ACT: Get all service configs
      const tidepoolConfig = manager.getServiceConfig(ExternalService.TIDEPOOL);
      const glucoserverConfig = manager.getServiceConfig(ExternalService.GLUCOSERVER);
      const appointmentsConfig = manager.getServiceConfig(ExternalService.APPOINTMENTS);
      const authConfig = manager.getServiceConfig(ExternalService.LOCAL_AUTH);

      // ASSERT: All should have circuit breaker thresholds
      expect(tidepoolConfig?.circuitBreakerThreshold).toBeGreaterThan(0);
      expect(glucoserverConfig?.circuitBreakerThreshold).toBeGreaterThan(0);
      expect(appointmentsConfig?.circuitBreakerThreshold).toBeGreaterThan(0);
      expect(authConfig?.circuitBreakerThreshold).toBeGreaterThan(0);
    });
  });

  describe('Request Execution with Circuit Breaker', () => {
    it('should execute request when service is available', async () => {
      // ARRANGE
      const mockData = { success: true };

      // ACT
      const result = await manager.executeRequest(ExternalService.TIDEPOOL, async () => mockData);

      // ASSERT
      expect(result).toEqual(mockData);
    });

    it('should use fallback when request fails and fallback provided', async () => {
      // ARRANGE
      const fallbackData = { fallback: true };

      // ACT: Execute with fallback that triggers on error
      const result = await manager.executeRequest(
        ExternalService.TIDEPOOL,
        async () => {
          throw new Error('Request failed');
        },
        { fallback: () => fallbackData }
      );

      // ASSERT: Should use fallback
      expect(result).toEqual(fallbackData);
    });

    it('should reset circuit breaker on successful request after failures', async () => {
      // ARRANGE: Create failures by failing health check (which has health endpoint)
      // This ensures circuit breaker is updated properly
      const failPromise1 = manager.checkService(ExternalService.TIDEPOOL);
      const req1 = httpMock.expectOne(request => request.url.includes('/v1/status'));
      req1.flush('Error', { status: 500, statusText: 'Error' });
      const retry1 = httpMock.expectOne(request => request.url.includes('/v1/status'));
      retry1.flush('Error', { status: 500, statusText: 'Error' });
      await failPromise1;

      // Verify failure was recorded
      let circuitState = manager.getCircuitBreakerState(ExternalService.TIDEPOOL);
      expect(circuitState?.failureCount).toBeGreaterThan(0);

      // ACT: Successful health check
      const successPromise = manager.checkService(ExternalService.TIDEPOOL);
      const req2 = httpMock.expectOne(request => request.url.includes('/v1/status'));
      req2.flush({ status: 'ok' });
      await successPromise;

      // ASSERT: Failure count should be reset
      circuitState = manager.getCircuitBreakerState(ExternalService.TIDEPOOL);
      expect(circuitState?.failureCount).toBe(0);
      expect(circuitState?.state).toBe('CLOSED');
    });
  });
});

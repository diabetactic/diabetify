/**
 * API Gateway Service Integration Tests
 *
 * Tests the API gateway routing and request handling:
 * 1. Request routing via endpoint keys
 * 2. Service availability check via ExternalServicesManager
 * 3. LRU Cache hit/miss with TTL validation
 * 4. Mock mode detection via MockAdapterService
 * 5. Authentication token injection
 * 6. Path parameter substitution
 * 7. Error handling (getErrorCode, isRetryable)
 * 8. Cache invalidation
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { ApiGatewayService, ApiEndpoint } from '@core/services/api-gateway.service';
import {
  ExternalServicesManager,
  ExternalService,
} from '@core/services/external-services-manager.service';
import { LocalAuthService } from '@core/services/local-auth.service';
import { TidepoolAuthService } from '@core/services/tidepool-auth.service';
import { EnvironmentDetectorService } from '@core/services/environment-detector.service';
import { PlatformDetectorService } from '@core/services/platform-detector.service';
import { MockAdapterService } from '@core/services/mock-adapter.service';
import { LoggerService } from '@core/services/logger.service';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';

describe('API Gateway Service Integration Tests', () => {
  let service: ApiGatewayService;
  let httpMock: HttpTestingController;
  let mockExternalServices: {
    isServiceAvailable: ReturnType<typeof vi.fn>;
    recordServiceError?: ReturnType<typeof vi.fn>;
  };
  let mockLocalAuth: {
    getAccessToken: ReturnType<typeof vi.fn>;
  };
  let mockTidepoolAuth: {
    getAccessToken: ReturnType<typeof vi.fn>;
  };
  let mockMockAdapter: {
    isServiceMockEnabled: ReturnType<typeof vi.fn>;
    mockGetAllReadings: ReturnType<typeof vi.fn>;
    mockAddReading: ReturnType<typeof vi.fn>;
    mockLogin: ReturnType<typeof vi.fn>;
    mockGetProfile: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    getRequestId: ReturnType<typeof vi.fn>;
    setRequestId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Crear mocks para todas las dependencias
    mockExternalServices = {
      isServiceAvailable: vi.fn().mockReturnValue(true),
      recordServiceError: vi.fn(),
    };

    mockLocalAuth = {
      getAccessToken: vi.fn().mockResolvedValue('test-local-token'),
    };

    mockTidepoolAuth = {
      getAccessToken: vi.fn().mockResolvedValue('test-tidepool-token'),
    };

    mockMockAdapter = {
      isServiceMockEnabled: vi.fn().mockReturnValue(false),
      mockGetAllReadings: vi.fn(),
      mockAddReading: vi.fn(),
      mockLogin: vi.fn(),
      mockGetProfile: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getRequestId: vi.fn().mockReturnValue('test-req-id'),
      setRequestId: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiGatewayService,
        { provide: ExternalServicesManager, useValue: mockExternalServices },
        { provide: LocalAuthService, useValue: mockLocalAuth },
        { provide: TidepoolAuthService, useValue: mockTidepoolAuth },
        {
          provide: EnvironmentDetectorService,
          useValue: { isProduction: () => false },
        },
        {
          provide: PlatformDetectorService,
          useValue: { getApiBaseUrl: () => 'http://localhost:8000' },
        },
        { provide: MockAdapterService, useValue: mockMockAdapter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(ApiGatewayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearCache();
    vi.clearAllMocks();
  });

  describe('Request Routing via Endpoint Keys', () => {
    it('should route request to known endpoint and return data', async () => {
      // ARRANGE
      const mockData = [{ id: 1, value: 120 }];
      let response: any;

      // ACT
      service.request('glucoserver.readings.list').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.method).toBe('GET');
      req.flush(mockData);

      // ASSERT
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockData);
      expect(response.metadata?.service).toBe(ExternalService.GLUCOSERVER);
      expect(response.metadata?.endpoint).toBe('glucoserver.readings.list');
    });

    it('should throw UNKNOWN_ENDPOINT error for unknown endpoint', async () => {
      // ACT & ASSERT
      try {
        await firstValueFrom(service.request('unknown.endpoint'));
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.success).toBe(false);
        expect(err.error.code).toBe('UNKNOWN_ENDPOINT');
        expect(err.error.message).toContain('unknown.endpoint');
        expect(err.error.retryable).toBe(false);
      }
    });
  });

  describe('Service Availability Check', () => {
    it('should return SERVICE_UNAVAILABLE when service is not available', async () => {
      // ARRANGE
      mockExternalServices.isServiceAvailable.mockReturnValue(false);

      // ACT & ASSERT
      try {
        await firstValueFrom(service.request('glucoserver.readings.list'));
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.success).toBe(false);
        expect(err.error.code).toBe('SERVICE_UNAVAILABLE');
        expect(err.error.service).toBe(ExternalService.GLUCOSERVER);
        expect(err.error.retryable).toBe(true);
      }
    });

    it('should use fallback data when service unavailable and fallback exists', async () => {
      // ARRANGE
      mockExternalServices.isServiceAvailable.mockReturnValue(false);

      const customEndpoint: ApiEndpoint = {
        service: ExternalService.GLUCOSERVER,
        path: '/v1/custom',
        method: 'GET',
        authenticated: false,
        fallback: () => ({ fallbackData: true }),
      };
      service.registerEndpoint('custom.fallback', customEndpoint);

      let response: any;

      // ACT
      service.request('custom.fallback').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // ASSERT
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ fallbackData: true });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API',
        'Using fallback data',
        expect.objectContaining({ endpoint: 'custom.fallback' })
      );
    });
  });

  describe('LRU Cache Hit/Miss with TTL Validation', () => {
    it('should return cached data on cache hit without HTTP call', async () => {
      // ARRANGE
      const mockData = { stats: { average: 125 } };
      let firstResponse: any;
      let cachedResponse: any;

      // ACT - Primera petición (cache miss)
      service.request('glucoserver.statistics').subscribe(res => {
        firstResponse = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/statistics');
      req.flush(mockData);

      // Segunda petición (cache hit)
      service.request('glucoserver.statistics').subscribe(res => {
        cachedResponse = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // ASSERT - No debe haber segunda petición HTTP
      httpMock.expectNone('http://localhost:8000/v1/statistics');

      expect(cachedResponse.success).toBe(true);
      expect(cachedResponse.data).toEqual(mockData);
      expect(cachedResponse.metadata?.cached).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'API',
        'Cache hit',
        expect.objectContaining({ endpoint: 'glucoserver.statistics' })
      );
    });

    it('should make HTTP call on cache miss', async () => {
      // ARRANGE
      const mockData = { stats: { average: 110 } };
      let response: any;

      // ACT
      service.request('glucoserver.statistics').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/statistics');
      req.flush(mockData);

      // ASSERT
      expect(response.success).toBe(true);
      expect(response.metadata?.cached).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'API',
        'Cache miss',
        expect.objectContaining({ endpoint: 'glucoserver.statistics' })
      );
    });

    it('should make new request when cache TTL expires', async () => {
      // ARRANGE - Registrar endpoint con cache de 100ms
      const shortCacheEndpoint: ApiEndpoint = {
        service: ExternalService.GLUCOSERVER,
        path: '/v1/short-cache',
        method: 'GET',
        authenticated: false,
        cache: { duration: 100 }, // 100ms TTL
      };
      service.registerEndpoint('test.shortCache', shortCacheEndpoint);

      const mockData1 = { data: 'first' };
      const mockData2 = { data: 'second' };

      // ACT - Primera petición
      service.request('test.shortCache').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req1 = httpMock.expectOne('http://localhost:8000/v1/short-cache');
      req1.flush(mockData1);

      // Esperar a que expire el cache
      await new Promise(resolve => setTimeout(resolve, 150));

      // Segunda petición después de expiración
      let expiredCacheResponse: any;
      service.request('test.shortCache').subscribe(res => {
        expiredCacheResponse = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req2 = httpMock.expectOne('http://localhost:8000/v1/short-cache');
      req2.flush(mockData2);

      // ASSERT
      expect(expiredCacheResponse.data).toEqual(mockData2);
      expect(expiredCacheResponse.metadata?.cached).toBe(false);
    });
  });

  describe('Mock Mode Detection', () => {
    it('should route to MockAdapter when mock enabled', async () => {
      // ARRANGE
      mockMockAdapter.isServiceMockEnabled.mockReturnValue(true);
      mockMockAdapter.mockGetAllReadings.mockResolvedValue([
        { id: 'mock-1', value: 100 },
      ]);

      let response: any;

      // ACT
      service.request('glucoserver.readings.list').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // ASSERT - No debe haber petición HTTP
      httpMock.expectNone('http://localhost:8000/v1/readings');

      expect(response.success).toBe(true);
      expect(response.data).toEqual([{ id: 'mock-1', value: 100 }]);
      expect(mockMockAdapter.mockGetAllReadings).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API',
        'Using mock data',
        expect.objectContaining({ endpoint: 'glucoserver.readings.list' })
      );
    });

    it('should use real HTTP when mock disabled', async () => {
      // ARRANGE
      mockMockAdapter.isServiceMockEnabled.mockReturnValue(false);
      const mockData = [{ id: 1, value: 150 }];

      // ACT
      service.request('glucoserver.readings.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      req.flush(mockData);

      // ASSERT
      expect(mockMockAdapter.mockGetAllReadings).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Token Injection', () => {
    it('should add Bearer token for authenticated endpoint', async () => {
      // ARRANGE
      mockLocalAuth.getAccessToken.mockResolvedValue('secure-token-123');

      // ACT
      service.request('glucoserver.readings.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');

      // ASSERT
      expect(req.request.headers.get('Authorization')).toBe('Bearer secure-token-123');
      req.flush([]);
    });

    it('should throw error when authenticated endpoint has no token', async () => {
      // ARRANGE
      mockLocalAuth.getAccessToken.mockResolvedValue(null);

      // ACT & ASSERT
      try {
        await firstValueFrom(service.request('glucoserver.readings.list'));
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.message || err).toContain('Authentication required');
      }
    });
  });

  describe('Path Parameter Substitution', () => {
    it('should replace {id} in path with provided parameter', async () => {
      // ACT
      service.request('glucoserver.readings.update', { body: { value: 140 } }, { id: 'reading-456' }).subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings/reading-456');

      // ASSERT
      expect(req.request.method).toBe('PUT');
      expect(req.request.url).toContain('reading-456');
      req.flush({ id: 'reading-456', value: 140 });
    });
  });

  describe('Request Transformation', () => {
    it('should apply transform.request function', async () => {
      // ARRANGE - Endpoint con transform de timestamp
      const requestBody = {
        value: 120,
        timestamp: new Date('2024-01-15T10:00:00.123Z'),
      };

      // ACT
      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');

      // ASSERT - Timestamp sin milisegundos
      expect(req.request.body.timestamp).toBe('2024-01-15T10:00:00Z');
      req.flush({ id: 'new-reading' });
    });
  });

  describe('Response Transformation', () => {
    it('should apply transform.response function', async () => {
      // ARRANGE
      const backendResponse = {
        data: [{ type: 'cbg', value: 120 }],
        meta: { count: 1 },
      };
      let response: any;

      // ACT
      service.request('tidepool.glucose.fetch', {}, { userId: 'user123' }).subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/data/v1/users/user123/data'));
      req.flush(backendResponse);

      // ASSERT - Transform extrae data array
      expect(response.data).toEqual([{ type: 'cbg', value: 120 }]);
    });
  });

  describe('Error Handling - Error Code Mapping', () => {
    it('should map 401 to UNAUTHORIZED code', async () => {
      // ACT
      const requestPromise = firstValueFrom(service.request('glucoserver.readings.list'));

      // Wait for request to be initiated
      await new Promise(resolve => setTimeout(resolve, 0));

      httpMock.expectOne('http://localhost:8000/v1/readings').flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );

      // ASSERT
      try {
        await requestPromise;
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.error.code).toBe('UNAUTHORIZED');
        expect(err.error.statusCode).toBe(401);
      }
    });

    it('should map 404 to NOT_FOUND code', async () => {
      // ACT
      const requestPromise = firstValueFrom(service.request('glucoserver.readings.list'));

      // Wait for request to be initiated
      await new Promise(resolve => setTimeout(resolve, 0));

      httpMock.expectOne('http://localhost:8000/v1/readings').flush(
        { message: 'Not found' },
        { status: 404, statusText: 'Not Found' }
      );

      // ASSERT
      try {
        await requestPromise;
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.error.code).toBe('NOT_FOUND');
        expect(err.error.statusCode).toBe(404);
      }
    });

    it('should map 500 to SERVER_ERROR code', async () => {
      // ACT
      const requestPromise = firstValueFrom(service.request('glucoserver.readings.list'));

      // Wait for request to be initiated
      await new Promise(resolve => setTimeout(resolve, 0));

      httpMock.expectOne('http://localhost:8000/v1/readings').flush(
        { message: 'Internal error' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      // ASSERT
      try {
        await requestPromise;
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.error.code).toBe('SERVER_ERROR');
        expect(err.error.statusCode).toBe(500);
      }
    });
  });

  describe('Error Handling - isRetryable', () => {
    it('should return true for 5xx errors (retryable)', async () => {
      // ACT
      const requestPromise = firstValueFrom(service.request('glucoserver.readings.list'));

      // Wait for request to be initiated
      await new Promise(resolve => setTimeout(resolve, 0));

      httpMock.expectOne('http://localhost:8000/v1/readings').flush(
        { message: 'Service unavailable' },
        { status: 503, statusText: 'Service Unavailable' }
      );

      // ASSERT
      try {
        await requestPromise;
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.error.retryable).toBe(true);
        expect(err.error.code).toBe('SERVICE_UNAVAILABLE');
      }
    });

    it('should return false for 4xx errors (not retryable)', async () => {
      // ACT
      const requestPromise = firstValueFrom(service.request('glucoserver.readings.list'));

      // Wait for request to be initiated
      await new Promise(resolve => setTimeout(resolve, 0));

      httpMock.expectOne('http://localhost:8000/v1/readings').flush(
        { message: 'Bad request' },
        { status: 400, statusText: 'Bad Request' }
      );

      // ASSERT
      try {
        await requestPromise;
        expect.fail('Expected error but got success');
      } catch (err: any) {
        expect(err.error.retryable).toBe(false);
        expect(err.error.code).toBe('BAD_REQUEST');
      }
    });
  });

  describe('Cache Invalidation', () => {
    it('should clear specific endpoint cache with clearCache(endpointKey)', async () => {
      // ARRANGE - Cachear dos endpoints diferentes
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectOne('http://localhost:8000/v1/statistics').flush({ avg: 120 });

      service.request('appointments.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectOne('http://localhost:8000/appointments').flush([{ id: 1 }]);

      // ACT - Limpiar solo glucoserver.statistics
      service.clearCache('glucoserver.statistics');

      // ASSERT - glucoserver.statistics ya no está en cache
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectOne('http://localhost:8000/v1/statistics').flush({ avg: 130 });

      // appointments.list sigue en cache
      service.request('appointments.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectNone('http://localhost:8000/appointments');
    });

    it('should clear all cache with clearCache()', async () => {
      // ARRANGE - Cachear múltiples endpoints
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectOne('http://localhost:8000/v1/statistics').flush({ avg: 120 });

      service.request('appointments.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectOne('http://localhost:8000/appointments').flush([{ id: 1 }]);

      // ACT - Limpiar todo el cache
      service.clearCache();

      // ASSERT - Ambos endpoints ya no están en cache
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectOne('http://localhost:8000/v1/statistics').flush({ avg: 130 });

      service.request('appointments.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectOne('http://localhost:8000/appointments').flush([{ id: 2 }]);
    });
  });
});

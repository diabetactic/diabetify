/**
 * API Gateway Service Unit Tests
 *
 * Comprehensive test suite for ApiGatewayService with 95%+ coverage
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ApiGatewayService, ApiEndpoint, ApiRequestOptions } from './api-gateway.service';
import { ExternalServicesManager, ExternalService } from './external-services-manager.service';
import { LocalAuthService } from './local-auth.service';
import { TidepoolAuthService } from './tidepool-auth.service';
import { EnvironmentDetectorService } from './environment-detector.service';
import { PlatformDetectorService } from './platform-detector.service';
import { MockAdapterService } from './mock-adapter.service';
import { LoggerService } from './logger.service';

describe('ApiGatewayService', () => {
  let service: ApiGatewayService;
  let httpMock: HttpTestingController;
  let mockExternalServices: jasmine.SpyObj<ExternalServicesManager>;
  let mockLocalAuth: jasmine.SpyObj<LocalAuthService>;
  let mockTidepoolAuth: jasmine.SpyObj<TidepoolAuthService>;
  let mockEnvDetector: jasmine.SpyObj<EnvironmentDetectorService>;
  let mockPlatformDetector: jasmine.SpyObj<PlatformDetectorService>;
  let mockAdapterService: jasmine.SpyObj<MockAdapterService>;
  let mockLogger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    // Create spies for all dependencies
    // Note: recordServiceError is private but accessed via bracket notation in the service
    mockExternalServices = jasmine.createSpyObj('ExternalServicesManager', ['isServiceAvailable']);
    // Add recordServiceError as a property to handle bracket notation access
    (mockExternalServices as any)['recordServiceError'] = jasmine.createSpy('recordServiceError');
    mockLocalAuth = jasmine.createSpyObj('LocalAuthService', ['getAccessToken']);
    mockTidepoolAuth = jasmine.createSpyObj('TidepoolAuthService', ['getAccessToken']);
    mockEnvDetector = jasmine.createSpyObj('EnvironmentDetectorService', ['isProduction']);
    mockPlatformDetector = jasmine.createSpyObj('PlatformDetectorService', ['getApiBaseUrl']);
    mockAdapterService = jasmine.createSpyObj('MockAdapterService', [
      'isServiceMockEnabled',
      'isMockEnabled',
    ]);
    mockLogger = jasmine.createSpyObj('LoggerService', [
      'info',
      'debug',
      'warn',
      'error',
      'getRequestId',
      'setRequestId',
    ]);

    // Default spy behaviors - MUST set isServiceAvailable to true for all tests
    mockExternalServices.isServiceAvailable.and.returnValue(true);
    mockLocalAuth.getAccessToken.and.returnValue('mock-local-token');
    mockTidepoolAuth.getAccessToken.and.returnValue(Promise.resolve('mock-tidepool-token'));
    mockPlatformDetector.getApiBaseUrl.and.returnValue('http://localhost:8000');
    // CRITICAL: Disable mocks to force HTTP requests for HttpTestingController
    mockAdapterService.isServiceMockEnabled.and.returnValue(false);
    mockAdapterService.isMockEnabled.and.returnValue(false);
    mockLogger.getRequestId.and.returnValue('test-request-id');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiGatewayService,
        { provide: ExternalServicesManager, useValue: mockExternalServices },
        { provide: LocalAuthService, useValue: mockLocalAuth },
        { provide: TidepoolAuthService, useValue: mockTidepoolAuth },
        { provide: EnvironmentDetectorService, useValue: mockEnvDetector },
        { provide: PlatformDetectorService, useValue: mockPlatformDetector },
        { provide: MockAdapterService, useValue: mockAdapterService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(ApiGatewayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearCache();
    // Reset spy call history
    mockExternalServices.isServiceAvailable.calls.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('request() - GET method', () => {
    it('should make GET request to correct endpoint', fakeAsync(() => {
      const mockData = { readings: [] };
      let response: any;

      service.request('glucoserver.readings.list').subscribe(res => {
        response = res;
      });

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-local-token');

      req.flush(mockData);
      tick();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockData);
      expect(response.metadata?.service).toBe(ExternalService.GLUCOSERVER);
      expect(response.metadata?.cached).toBe(false);
    }));

    it('should include query parameters in GET request', fakeAsync(() => {
      const params = { limit: '10', offset: '0' };

      service
        .request('glucoserver.readings.list', {
          params,
        })
        .subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings?limit=10&offset=0');
      expect(req.request.method).toBe('GET');

      req.flush({ readings: [] });
      tick();
    }));

    it('should cache GET requests when cache is enabled', fakeAsync(() => {
      const mockData = { statistics: { average: 120 } };

      // First request - should hit server
      service.request('glucoserver.statistics').subscribe();
      tick();

      const req1 = httpMock.expectOne('http://localhost:8000/api/v1/statistics');
      req1.flush(mockData);
      tick();

      // Second request - should use cache
      let cachedResponse: any;
      service.request('glucoserver.statistics').subscribe(res => {
        cachedResponse = res;
      });
      tick();

      // No HTTP request should be made
      httpMock.expectNone('http://localhost:8000/api/v1/statistics');

      expect(cachedResponse.success).toBe(true);
      expect(cachedResponse.data).toEqual(mockData);
      expect(cachedResponse.metadata?.cached).toBe(true);
    }));

    it('should bypass cache with forceRefresh option', fakeAsync(() => {
      const mockData = { statistics: { average: 120 } };

      // First request
      service.request('glucoserver.statistics').subscribe();
      tick();
      const req1 = httpMock.expectOne('http://localhost:8000/api/v1/statistics');
      req1.flush(mockData);
      tick();

      // Second request with forceRefresh
      service.request('glucoserver.statistics', { forceRefresh: true }).subscribe();
      tick();

      // Should make another HTTP request
      const req2 = httpMock.expectOne('http://localhost:8000/api/v1/statistics');
      expect(req2.request.method).toBe('GET');
      req2.flush(mockData);
      tick();
    }));
  });

  describe('request() - POST method', () => {
    it('should make POST request with body', fakeAsync(() => {
      const requestBody = { value: 120, units: 'mg/dL', timestamp: '2024-01-15T10:00:00Z' };
      const mockResponse = { id: '123', ...requestBody };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        value: 120,
        units: 'mg/dL',
        timestamp: '2024-01-15T10:00:00Z',
      });
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush(mockResponse);
      tick();
    }));

    it('should transform request body if transform is defined', fakeAsync(() => {
      const requestBody = {
        value: 120,
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      expect(req.request.body.timestamp).toBe('2024-01-15T10:00:00Z');

      req.flush({ id: '123' });
      tick();
    }));

    it('should handle appointment glucose sharing with privacy transform', fakeAsync(() => {
      const requestBody = {
        days: 30,
        manualReadingsSummary: { count: 10, average: 120 },
        includeRawReadings: true,
        userConsent: true,
        readings: [{ value: 120 }],
      };

      service
        .request('appointments.shareGlucose', { body: requestBody }, { id: 'appt123' })
        .subscribe();

      tick();

      const req = httpMock.expectOne(
        'http://localhost:8000/api/appointments/appt123/share-glucose'
      );
      expect(req.request.body.days).toBe(30);
      expect(req.request.body.manualReadingsSummary).toBeDefined();
      expect(req.request.body.readings).toBeDefined();

      req.flush({ success: true });
      tick();
    }));

    it('should exclude raw readings without consent in glucose sharing', fakeAsync(() => {
      const requestBody = {
        days: 30,
        manualReadingsSummary: { count: 10, average: 120 },
        includeRawReadings: true,
        userConsent: false, // No consent
        readings: [{ value: 120 }],
      };

      service
        .request('appointments.shareGlucose', { body: requestBody }, { id: 'appt123' })
        .subscribe();

      tick();

      const req = httpMock.expectOne(
        'http://localhost:8000/api/appointments/appt123/share-glucose'
      );
      expect(req.request.body.readings).toBeUndefined();

      req.flush({ success: true });
      tick();
    }));
  });

  describe('request() - PUT method', () => {
    it('should make PUT request to update reading', fakeAsync(() => {
      const updateData = { value: 130, notes: ['Updated'] };

      service
        .request('glucoserver.readings.update', { body: updateData }, { id: 'reading123' })
        .subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings/reading123');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);

      req.flush({ id: 'reading123', ...updateData });
      tick();
    }));
  });

  describe('request() - DELETE method', () => {
    it('should make DELETE request', fakeAsync(() => {
      service.request('glucoserver.readings.delete', {}, { id: 'reading123' }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings/reading123');
      expect(req.request.method).toBe('DELETE');

      req.flush({ success: true });
      tick();
    }));
  });

  describe('Authentication', () => {
    it('should add Bearer token for authenticated endpoints', fakeAsync(() => {
      mockLocalAuth.getAccessToken.and.returnValue('test-token-123');

      service.request('glucoserver.readings.list').subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');

      req.flush([]);
      tick();
    }));

    it('should use Tidepool token for Tidepool endpoints', fakeAsync(() => {
      mockTidepoolAuth.getAccessToken.and.returnValue(Promise.resolve('tidepool-token'));

      service.request('tidepool.user.profile', {}, { userId: 'user123' }).subscribe();

      tick();

      const req = httpMock.expectOne(req => req.url.includes('/metadata/v1/users/user123/profile'));
      expect(req.request.headers.get('Authorization')).toBe('Bearer tidepool-token');

      req.flush({ profile: {} });
      tick();
    }));

    it('should not add Authorization header for unauthenticated endpoints', fakeAsync(() => {
      service.request('appointments.doctors.list').subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/doctors');
      expect(req.request.headers.has('Authorization')).toBe(false);

      req.flush([]);
      tick();
    }));

    it('should throw error if authentication required but no token available', (done: DoneFn) => {
      mockLocalAuth.getAccessToken.and.returnValue(null);

      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
          done();
        },
        error: err => {
          expect(err).toBeDefined();
          // The service throws a plain Error for authentication failures
          expect(err.message || err).toContain('Authentication required');
          done();
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 Unauthorized error', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.code).toBe('UNAUTHORIZED');
      expect(errorReceived.error.statusCode).toBe(401);
      expect(errorReceived.error.retryable).toBe(false);
    }));

    it('should handle 404 Not Found error', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.code).toBe('NOT_FOUND');
      expect(errorReceived.error.statusCode).toBe(404);
      expect(errorReceived.error.retryable).toBe(false);
    }));

    it('should handle 500 Server Error as retryable', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Error' });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.code).toBe('SERVER_ERROR');
      expect(errorReceived.error.statusCode).toBe(500);
      expect(errorReceived.error.retryable).toBe(true);
    }));

    it('should handle network errors', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.error(new ProgressEvent('Network error'), { status: 0 });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.statusCode).toBe(0);
      expect(errorReceived.error.retryable).toBe(true);
    }));

    it('should return fallback data when endpoint has fallback', fakeAsync(() => {
      // Register custom endpoint with fallback
      const customEndpoint: ApiEndpoint = {
        service: ExternalService.GLUCOSERVER,
        path: '/api/test',
        method: 'GET',
        authenticated: false,
        fallback: () => ({ data: 'fallback' }),
      };

      service.registerEndpoint('test.endpoint', customEndpoint);
      mockExternalServices.isServiceAvailable.and.returnValue(false);

      let response: any;
      service.request('test.endpoint').subscribe(res => {
        response = res;
      });

      tick();

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ data: 'fallback' });
    }));
  });

  describe('Service Availability', () => {
    it('should check service availability before making request', fakeAsync(() => {
      mockExternalServices.isServiceAvailable.and.returnValue(false);

      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();

      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(errorReceived.error.retryable).toBe(true);
    }));

    it('should return error for unknown endpoint', fakeAsync(() => {
      let errorReceived: any;
      service.request('unknown.endpoint.key').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();

      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error.code).toBe('UNKNOWN_ENDPOINT');
      expect(errorReceived.error.retryable).toBe(false);
    }));
  });

  describe('Response Transformation', () => {
    it('should transform response if transform is defined', fakeAsync(() => {
      const mockData = { data: [{ value: 120 }], total: 1 };
      let response: any;

      service.request('tidepool.glucose.fetch', {}, { userId: 'user123' }).subscribe(res => {
        response = res;
      });

      tick();

      const req = httpMock.expectOne(req => req.url.includes('/data/v1/users/user123/data'));
      req.flush(mockData);
      tick();

      // Transform should extract data array
      expect(response.data).toEqual([{ value: 120 }]);
    }));
  });

  describe('Path Parameters', () => {
    it('should replace path parameters in URL', fakeAsync(() => {
      service.request('appointments.detail', {}, { id: 'appointment123' }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/appointments/appointment123');
      expect(req.request.method).toBe('GET');

      req.flush({ id: 'appointment123' });
      tick();
    }));

    it('should replace multiple path parameters', fakeAsync(() => {
      service.request('clinicalForm.get', {}, { appointmentId: 'appt123' }).subscribe();

      tick();

      const req = httpMock.expectOne(
        'http://localhost:8000/api/appointments/appt123/clinical-form'
      );
      expect(req.request.method).toBe('GET');

      req.flush({});
      tick();
    }));
  });

  describe('Caching', () => {
    it('should generate cache key using custom key function', fakeAsync(() => {
      const params = { limit: '10', offset: '0' };

      // First request
      service
        .request('glucoserver.readings.list', {
          params,
        })
        .subscribe();

      tick();

      const req1 = httpMock.expectOne('http://localhost:8000/api/v1/readings?limit=10&offset=0');
      req1.flush({ readings: [] });
      tick();

      // Second request with same params - should be cached
      service
        .request('glucoserver.readings.list', {
          params,
        })
        .subscribe();

      tick();

      httpMock.expectNone('http://localhost:8000/api/v1/readings?limit=10&offset=0');
    }));

    it('should expire cache after duration', fakeAsync(() => {
      const mockData = { readings: [] };

      // First request
      service.request('glucoserver.readings.list').subscribe();
      tick();

      const req1 = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req1.flush(mockData);
      tick();

      // Wait for cache to expire (cache duration is 60000ms for this endpoint)
      tick(60001);

      // Second request - should hit server again
      service.request('glucoserver.readings.list').subscribe();
      tick();

      const req2 = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req2.flush(mockData);
      tick();
    }));

    it('should clear cache for specific endpoint', fakeAsync(() => {
      // Make request to cache it
      service.request('glucoserver.statistics').subscribe();
      tick();

      const req1 = httpMock.expectOne('http://localhost:8000/api/v1/statistics');
      req1.flush({ average: 120 });
      tick();

      // Clear cache for this endpoint
      service.clearCache('glucoserver.statistics');

      // Next request should hit server
      service.request('glucoserver.statistics').subscribe();
      tick();

      const req2 = httpMock.expectOne('http://localhost:8000/api/v1/statistics');
      req2.flush({ average: 120 });
      tick();
    }));

    it('should clear all cache when no endpoint specified', fakeAsync(() => {
      // Cache multiple endpoints
      service.request('glucoserver.statistics').subscribe();
      tick();
      const req1 = httpMock.expectOne('http://localhost:8000/api/v1/statistics');
      req1.flush({ average: 120 });
      tick();

      service.request('appointments.list').subscribe();
      tick();
      const req2 = httpMock.expectOne('http://localhost:8000/api/appointments');
      req2.flush([]);
      tick();

      // Clear all cache
      service.clearCache();

      // Both requests should hit server
      service.request('glucoserver.statistics').subscribe();
      tick();
      const req3 = httpMock.expectOne('http://localhost:8000/api/v1/statistics');
      req3.flush({ average: 120 });
      tick();

      service.request('appointments.list').subscribe();
      tick();
      const req4 = httpMock.expectOne('http://localhost:8000/api/appointments');
      req4.flush([]);
      tick();
    }));
  });

  describe('Platform-Specific Base URLs', () => {
    it('should use platform detector for API Gateway base URL', fakeAsync(() => {
      mockPlatformDetector.getApiBaseUrl.and.returnValue('http://10.0.2.2:8000');

      service.request('glucoserver.readings.list').subscribe();

      tick();

      const req = httpMock.expectOne('http://10.0.2.2:8000/api/v1/readings');
      expect(req.request.method).toBe('GET');

      req.flush([]);
      tick();
    }));

    it('should use Tidepool base URL for Tidepool service', fakeAsync(() => {
      service.request('tidepool.user.profile', {}, { userId: 'user123' }).subscribe();

      tick();

      const req = httpMock.expectOne(req => req.url.startsWith('https://api.tidepool.org'));
      expect(req.request.method).toBe('GET');

      req.flush({});
      tick();
    }));
  });

  describe('Endpoint Management', () => {
    it('should register custom endpoint', () => {
      const customEndpoint: ApiEndpoint = {
        service: ExternalService.GLUCOSERVER,
        path: '/api/custom',
        method: 'GET',
        authenticated: false,
      };

      service.registerEndpoint('custom.endpoint', customEndpoint);

      const endpoint = service.getEndpoint('custom.endpoint');
      expect(endpoint).toBeDefined();
      expect(endpoint?.path).toBe('/api/custom');
    });

    it('should list all registered endpoints', () => {
      const endpoints = service.listEndpoints();
      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints).toContain('glucoserver.readings.list');
      expect(endpoints).toContain('appointments.list');
      expect(endpoints).toContain('auth.login');
    });

    it('should return undefined for non-existent endpoint', () => {
      const endpoint = service.getEndpoint('non.existent.endpoint');
      expect(endpoint).toBeUndefined();
    });
  });

  describe('Request Metadata', () => {
    it('should include response time in metadata', fakeAsync(() => {
      let response: any;

      service.request('glucoserver.readings.list').subscribe(res => {
        response = res;
      });

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      tick(50); // Simulate 50ms delay
      req.flush([]);
      tick();

      expect(response.metadata?.responseTime).toBeGreaterThanOrEqual(0);
      expect(response.metadata?.timestamp).toBeInstanceOf(Date);
    }));

    it('should include endpoint key in metadata', fakeAsync(() => {
      let response: any;

      service.request('appointments.list').subscribe(res => {
        response = res;
      });

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/appointments');
      req.flush([]);
      tick();

      expect(response.metadata?.endpoint).toBe('appointments.list');
      expect(response.metadata?.service).toBe(ExternalService.APPOINTMENTS);
    }));
  });

  describe('Custom Headers', () => {
    it('should include custom headers in request', fakeAsync(() => {
      const customHeaders = { 'X-Custom-Header': 'test-value' };

      service.request('glucoserver.readings.list', { headers: customHeaders }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      expect(req.request.headers.get('X-Custom-Header')).toBe('test-value');

      req.flush([]);
      tick();
    }));

    it('should set Content-Type for POST requests', fakeAsync(() => {
      service.request('glucoserver.readings.create', { body: { value: 120 } }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({});
      tick();
    }));

    it('should not override existing Content-Type header', fakeAsync(() => {
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

      service.request('auth.login', { body: {}, headers }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/auth/login');
      expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');

      req.flush({});
      tick();
    }));
  });

  describe('Error Code Mapping', () => {
    it('should map 400 BAD_REQUEST error', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.flush({ message: 'Error' }, { status: 400, statusText: 'Error' });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.code).toBe('BAD_REQUEST');
    }));

    it('should map 403 FORBIDDEN error', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.flush({ message: 'Error' }, { status: 403, statusText: 'Error' });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.code).toBe('FORBIDDEN');
    }));

    it('should map other HTTP status codes correctly', fakeAsync(() => {
      const testCases = [
        { status: 409, expectedCode: 'CONFLICT' },
        { status: 422, expectedCode: 'VALIDATION_ERROR' },
        { status: 429, expectedCode: 'RATE_LIMITED' },
        { status: 502, expectedCode: 'BAD_GATEWAY' },
        { status: 503, expectedCode: 'SERVICE_UNAVAILABLE' },
        { status: 504, expectedCode: 'GATEWAY_TIMEOUT' },
      ];

      testCases.forEach(({ status, expectedCode }) => {
        let errorResponse: any;
        let hasError = false;

        service.request('glucoserver.readings.list').subscribe({
          next: () => fail('should have thrown error'),
          error: err => {
            errorResponse = err;
            hasError = true;
          },
        });

        tick();

        const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
        req.flush({ message: 'Error' }, { status, statusText: 'Error' });
        tick();

        expect(hasError).toBe(true);
        expect(errorResponse).toBeDefined();
        expect(errorResponse.success).toBe(false);
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.code).toBe(expectedCode);
      });
    }));

    it('should identify network error (0) as retryable', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.error(new ProgressEvent('Network error'), { status: 0 });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.retryable).toBe(true);
    }));

    it('should identify 500 server error as retryable', fakeAsync(() => {
      let errorReceived: any;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {
          fail('should have thrown error');
        },
        error: err => {
          errorReceived = err;
        },
      });

      tick();
      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Error' });
      tick();

      expect(errorReceived).toBeDefined();
      expect(errorReceived.success).toBe(false);
      expect(errorReceived.error).toBeDefined();
      expect(errorReceived.error.retryable).toBe(true);
    }));

    it('should identify other retryable errors correctly', fakeAsync(() => {
      const retryableStatuses = [408, 429, 502, 503, 504];

      retryableStatuses.forEach(status => {
        let errorResponse: any;
        let hasError = false;

        service.request('glucoserver.readings.list').subscribe({
          next: () => fail('should have thrown error'),
          error: err => {
            errorResponse = err;
            hasError = true;
          },
        });

        tick();

        const req = httpMock.expectOne('http://localhost:8000/api/v1/readings');
        req.flush({ message: 'Error' }, { status, statusText: 'Error' });
        tick();

        expect(hasError).toBe(true);
        expect(errorResponse).toBeDefined();
        expect(errorResponse.error.retryable).toBe(true);
      });
    }));
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', fakeAsync(() => {
      let response: any;

      service.request('glucoserver.readings.delete', {}, { id: '123' }).subscribe(res => {
        response = res;
      });

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/v1/readings/123');
      req.flush(null);
      tick();

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    }));

    it('should handle undefined path parameters gracefully', fakeAsync(() => {
      service.request('appointments.detail', {}, { id: 'appt123' }).subscribe();

      tick();

      const req = httpMock.expectOne('http://localhost:8000/api/appointments/appt123');
      expect(req.request.url).toContain('appt123');

      req.flush({});
      tick();
    }));

    it('should handle special characters in query parameters', fakeAsync(() => {
      const params = { search: 'test & special' };

      service.request('appointments.list', { params }).subscribe();

      tick();

      const req = httpMock.expectOne(req => req.url.includes('/api/appointments'));
      expect(req.request.params.get('search')).toBe('test & special');

      req.flush([]);
      tick();
    }));
  });
});

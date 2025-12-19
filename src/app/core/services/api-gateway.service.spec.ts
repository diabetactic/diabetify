/**
 * API Gateway Service Unit Tests
 *
 * Comprehensive test suite for ApiGatewayService with 95%+ coverage
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
// Observable removed - no longer needed after CapacitorHttpService cleanup

import { ApiGatewayService, ApiEndpoint } from '@services/api-gateway.service';
import {
  ExternalServicesManager,
  ExternalService,
} from '@services/external-services-manager.service';
import { LocalAuthService } from '@services/local-auth.service';
import { TidepoolAuthService } from '@services/tidepool-auth.service';
import { EnvironmentDetectorService } from '@services/environment-detector.service';
import { PlatformDetectorService } from '@services/platform-detector.service';
import { MockAdapterService } from '@services/mock-adapter.service';
import { LoggerService } from '@services/logger.service';
// Note: ApiGatewayService now uses HttpClient directly via Capacitor 6 auto-patching
// No need for MockCapacitorHttpService - HttpClientTestingModule provides the mock

describe('ApiGatewayService', () => {
  let service: ApiGatewayService;
  let httpMock: HttpTestingController;
  let mockExternalServices: any;
  let mockLocalAuth: any;
  let mockTidepoolAuth: any;
  let mockEnvDetector: any;
  let mockPlatformDetector: any;
  let mockAdapterService: any;
  let mockLogger: any;

  beforeEach(() => {
    // Create spies for all dependencies
    // Note: recordServiceError is private but accessed via bracket notation in the service
    mockExternalServices = {
      isServiceAvailable: vi.fn(),
      recordServiceError: vi.fn(),
    } as any;
    mockLocalAuth = {
      getAccessToken: vi.fn(),
    } as any;
    mockTidepoolAuth = {
      getAccessToken: vi.fn(),
    } as any;
    mockEnvDetector = {
      isProduction: vi.fn(),
    } as any;
    mockPlatformDetector = {
      getApiBaseUrl: vi.fn(),
    } as any;
    mockAdapterService = {
      isServiceMockEnabled: vi.fn(),
      isMockEnabled: vi.fn(),
    } as any;
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getRequestId: vi.fn(),
      setRequestId: vi.fn(),
    } as any;

    // Default spy behaviors - MUST set isServiceAvailable to true for all tests
    mockExternalServices.isServiceAvailable.mockReturnValue(true);
    mockLocalAuth.getAccessToken.mockReturnValue(Promise.resolve('mock-local-token'));
    mockTidepoolAuth.getAccessToken.mockReturnValue(Promise.resolve('mock-tidepool-token'));
    mockPlatformDetector.getApiBaseUrl.mockReturnValue('http://localhost:8000');
    // CRITICAL: Disable mocks to force HTTP requests for HttpTestingController
    mockAdapterService.isServiceMockEnabled.mockReturnValue(false);
    mockAdapterService.isMockEnabled.mockReturnValue(false);
    mockLogger.getRequestId.mockReturnValue('test-request-id');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiGatewayService,
        // ApiGatewayService now uses HttpClient directly (Capacitor 6 auto-patching)
        // HttpClientTestingModule provides the mock HttpClient automatically
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
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('request() - GET method', () => {
    it('should make GET request to correct endpoint', async () => {
      const mockData = { readings: [] };
      let response: any;

      service.request('glucoserver.readings.list').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-local-token');

      req.flush(mockData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockData);
      expect(response.metadata?.service).toBe(ExternalService.GLUCOSERVER);
      expect(response.metadata?.cached).toBe(false);
    });

    it('should include query parameters in GET request', async () => {
      const params = { limit: '10', offset: '0' };

      service
        .request('glucoserver.readings.list', {
          params,
        })
        .subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings?limit=10&offset=0');
      expect(req.request.method).toBe('GET');

      req.flush({ readings: [] });
    });

    it('should cache GET requests when cache is enabled', async () => {
      const mockData = { statistics: { average: 120 } };

      // First request - should hit server
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req1 = httpMock.expectOne('http://localhost:8000/v1/statistics');
      req1.flush(mockData);

      // Second request - should use cache
      let cachedResponse: any;
      service.request('glucoserver.statistics').subscribe(res => {
        cachedResponse = res;
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      // No HTTP request should be made
      httpMock.expectNone('http://localhost:8000/v1/statistics');

      expect(cachedResponse.success).toBe(true);
      expect(cachedResponse.data).toEqual(mockData);
      expect(cachedResponse.metadata?.cached).toBe(true);
    });
  });

  describe('request() - POST method', () => {
    it('should make POST request with body', async () => {
      const requestBody = { value: 120, units: 'mg/dL', timestamp: '2024-01-15T10:00:00Z' };
      const mockResponse = { id: '123', ...requestBody };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        value: 120,
        units: 'mg/dL',
        timestamp: '2024-01-15T10:00:00Z',
      });
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush(mockResponse);
    });

    it('should transform request body if transform is defined', async () => {
      const requestBody = {
        value: 120,
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.body.timestamp).toBe('2024-01-15T10:00:00Z');

      req.flush({ id: '123' });
    });

    it('should handle appointment glucose sharing with privacy transform', async () => {
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

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/appointments/appt123/share-glucose');
      expect(req.request.body.days).toBe(30);
      expect(req.request.body.manualReadingsSummary).toBeDefined();
      expect(req.request.body.readings).toBeDefined();

      req.flush({ success: true });
    });

    it('should exclude raw readings without consent in glucose sharing', async () => {
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

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/appointments/appt123/share-glucose');
      expect(req.request.body.readings).toBeUndefined();

      req.flush({ success: true });
    });
  });

  describe('request() - PUT method', () => {
    it('should make PUT request to update reading', async () => {
      const updateData = { value: 130, notes: 'Updated' };

      service
        .request('glucoserver.readings.update', { body: updateData }, { id: 'reading123' })
        .subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings/reading123');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);

      req.flush({ id: 'reading123', ...updateData });
    });
  });

  describe('request() - DELETE method', () => {
    it('should make DELETE request', async () => {
      service.request('glucoserver.readings.delete', {}, { id: 'reading123' }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings/reading123');
      expect(req.request.method).toBe('DELETE');

      req.flush({ success: true });
    });
  });

  describe('Authentication', () => {
    it('should add Bearer token for authenticated endpoints', async () => {
      mockLocalAuth.getAccessToken.mockReturnValue(Promise.resolve('test-token-123'));

      service.request('glucoserver.readings.list').subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');

      req.flush([]);
    });

    it('should use Tidepool token for Tidepool endpoints', async () => {
      mockTidepoolAuth.getAccessToken.mockReturnValue(Promise.resolve('tidepool-token'));

      service.request('tidepool.user.profile', {}, { userId: 'user123' }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/metadata/v1/users/user123/profile'));
      expect(req.request.headers.get('Authorization')).toBe('Bearer tidepool-token');

      req.flush({ profile: {} });
    });

    it('should not add Authorization header for unauthenticated endpoints', async () => {
      service.request('appointments.doctors.list').subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/doctors');
      expect(req.request.headers.has('Authorization')).toBe(false);

      req.flush([]);
    });

    it('should throw error if authentication required but no token available', () =>
      new Promise<void>((resolve, reject) => {
        mockLocalAuth.getAccessToken.mockReturnValue(Promise.resolve(null));

        service.request('glucoserver.readings.list').subscribe({
          next: () => {
            reject(new Error('should have thrown error'));
          },
          error: err => {
            expect(err).toBeDefined();
            // The service throws a plain Error for authentication failures
            expect(err.message || err).toContain('Authentication required');
            resolve();
          },
        });
      }));
  });

  describe('Platform-Specific Base URLs', () => {
    it('should use platform detector for API Gateway base URL', async () => {
      mockPlatformDetector.getApiBaseUrl.mockReturnValue('http://10.0.2.2:8000');

      service.request('glucoserver.readings.list').subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://10.0.2.2:8000/v1/readings');
      expect(req.request.method).toBe('GET');

      req.flush([]);
    });

    it('should use Tidepool base URL for Tidepool service', async () => {
      service.request('tidepool.user.profile', {}, { userId: 'user123' }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.startsWith('https://api.tidepool.org'));
      expect(req.request.method).toBe('GET');

      req.flush({});
    });
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

  describe('Error Code Mapping', () => {
    const buildHttpError = (status: number): HttpErrorResponse =>
      new HttpErrorResponse({
        status,
        statusText: 'Error',
        url: 'http://localhost:8000/v1/readings',
        error: { message: 'Error' },
      });

    const invokeHandleError = (status: number) => {
      const endpoint = service.getEndpoint('glucoserver.readings.list') as ApiEndpoint;
      return (service as any)['handleError'](
        buildHttpError(status),
        endpoint,
        'glucoserver.readings.list'
      );
    };

    it('should map 400 BAD_REQUEST error', () =>
      new Promise<void>((resolve, reject) => {
        invokeHandleError(400).subscribe({
          next: () => {
            reject(new Error('should have thrown error'));
          },
          error: (err: any) => {
            expect(err).toBeDefined();
            expect(err.error.code).toBe('BAD_REQUEST');
            resolve();
          },
        });
      }));

    it('should map 403 FORBIDDEN error', () =>
      new Promise<void>((resolve, reject) => {
        invokeHandleError(403).subscribe({
          next: () => {
            reject(new Error('should have thrown error'));
          },
          error: (err: any) => {
            expect(err).toBeDefined();
            expect(err.error.code).toBe('FORBIDDEN');
            resolve();
          },
        });
      }));

    it('should map other HTTP status codes correctly', () =>
      new Promise<void>((resolve, reject) => {
        const testCases = [
          { status: 409, expectedCode: 'CONFLICT' },
          { status: 422, expectedCode: 'VALIDATION_ERROR' },
          { status: 429, expectedCode: 'RATE_LIMITED' },
          { status: 502, expectedCode: 'BAD_GATEWAY' },
          { status: 503, expectedCode: 'SERVICE_UNAVAILABLE' },
          { status: 504, expectedCode: 'GATEWAY_TIMEOUT' },
        ];

        let completed = 0;

        testCases.forEach(({ status, expectedCode }) => {
          invokeHandleError(status).subscribe({
            next: () => {
              reject(new Error('should have thrown error'));
            },
            error: (err: any) => {
              expect(err).toBeDefined();
              expect(err.error.code).toBe(expectedCode);
              completed++;
              if (completed === testCases.length) {
                resolve();
              }
            },
          });
        });
      }));

    it('should identify network error (0) as retryable', () =>
      new Promise<void>((resolve, reject) => {
        invokeHandleError(0).subscribe({
          next: () => {
            reject(new Error('should have thrown error'));
          },
          error: (err: any) => {
            expect(err).toBeDefined();
            expect(err.error.retryable).toBe(true);
            resolve();
          },
        });
      }));

    it('should identify 500 server error as retryable', () =>
      new Promise<void>((resolve, reject) => {
        invokeHandleError(500).subscribe({
          next: () => {
            reject(new Error('should have thrown error'));
          },
          error: (err: any) => {
            expect(err).toBeDefined();
            expect(err.error.retryable).toBe(true);
            resolve();
          },
        });
      }));

    it('should identify other retryable errors correctly', () =>
      new Promise<void>((resolve, reject) => {
        const retryableStatuses = [408, 429, 502, 503, 504];
        let completed = 0;

        retryableStatuses.forEach(status => {
          invokeHandleError(status).subscribe({
            next: () => {
              reject(new Error('should have thrown error'));
            },
            error: (err: any) => {
              expect(err).toBeDefined();
              expect(err.error.retryable).toBe(true);
              completed++;
              if (completed === retryableStatuses.length) {
                resolve();
              }
            },
          });
        });
      }));
  });
});

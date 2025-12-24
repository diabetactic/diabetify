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

    it('should handle client-side errors (line 1076)', () =>
      new Promise<void>((resolve, reject) => {
        const clientError = new HttpErrorResponse({
          error: new ErrorEvent('Network error', {
            message: 'Client-side network failure',
          }),
          status: 0,
          statusText: 'Unknown Error',
          url: 'http://localhost:8000/v1/readings',
        });

        const endpoint = service.getEndpoint('glucoserver.readings.list') as ApiEndpoint;
        (service as any)
          ['handleError'](clientError, endpoint, 'glucoserver.readings.list')
          .subscribe({
            next: () => {
              reject(new Error('should have thrown error'));
            },
            error: (err: any) => {
              expect(err).toBeDefined();
              expect(err.error.code).toBe('CLIENT_ERROR');
              expect(err.error.message).toBe('Client-side network failure');
              expect(err.error.retryable).toBe(false);
              resolve();
            },
          });
      }));
  });

  describe('Cache Management - Advanced Scenarios', () => {
    it('should generate cache key with custom function (line 1174)', async () => {
      const mockData = [{ id: 1, value: 120 }];

      // First request with specific params
      service
        .request('glucoserver.readings.list', {
          params: { limit: '10', offset: '0' },
        })
        .subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req1 = httpMock.expectOne('http://localhost:8000/v1/readings?limit=10&offset=0');
      req1.flush(mockData);

      // Second request with same params - should use cache
      let cachedResponse: any;
      service
        .request('glucoserver.readings.list', {
          params: { limit: '10', offset: '0' },
        })
        .subscribe(res => {
          cachedResponse = res;
        });

      await new Promise(resolve => setTimeout(resolve, 0));

      httpMock.expectNone('http://localhost:8000/v1/readings?limit=10&offset=0');
      expect(cachedResponse.metadata?.cached).toBe(true);
    });

    it('should expire cache after duration (lines 1190-1194)', async () => {
      const mockData = { statistics: { average: 120 } };

      // First request
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req1 = httpMock.expectOne('http://localhost:8000/v1/statistics');
      req1.flush(mockData);

      // Manually expire the cache entry
      const cacheKey = 'glucoserver.statistics_{}';
      const cache = (service as any)['cacheData'];
      const entry = cache.get(cacheKey);
      if (entry) {
        entry.timestamp = Date.now() - 400000; // Expire (5min + buffer)
        cache.set(cacheKey, entry);
      }

      // Second request should hit server again
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));

      const req2 = httpMock.expectOne('http://localhost:8000/v1/statistics');
      req2.flush(mockData);
    });

    it('should clear cache for specific endpoint prefix (lines 1214-1220)', async () => {
      const mockData = [{ id: 1 }];

      // Make multiple requests to cache them
      service.request('glucoserver.readings.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      const req1 = httpMock.expectOne('http://localhost:8000/v1/readings');
      req1.flush(mockData);

      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      const req2 = httpMock.expectOne('http://localhost:8000/v1/statistics');
      req2.flush({ average: 120 });

      // Clear only glucoserver.readings cache
      service.clearCache('glucoserver.readings');

      // Statistics should still be cached
      service.request('glucoserver.statistics').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      httpMock.expectNone('http://localhost:8000/v1/statistics');

      // Readings should hit server
      service.request('glucoserver.readings.list').subscribe();
      await new Promise(resolve => setTimeout(resolve, 0));
      const req3 = httpMock.expectOne('http://localhost:8000/v1/readings');
      req3.flush(mockData);
    });
  });

  describe('Mock Request Handling - Comprehensive Coverage', () => {
    beforeEach(() => {
      // Enable mock mode for specific services
      mockAdapterService.isServiceMockEnabled.mockImplementation((service: string) => {
        return ['glucoserver', 'achievements', 'auth'].includes(service);
      });
    });

    it('should handle glucoserver.readings.create mock (lines 1399-1400)', async () => {
      const mockReading = {
        id: 'mock-123',
        value: 120,
        units: 'mg/dL',
        timestamp: '2024-01-15T10:00:00Z',
      };

      mockAdapterService.mockAddReading = vi.fn().mockResolvedValue(mockReading);

      let response: any;
      service
        .request('glucoserver.readings.create', {
          body: { value: 120, units: 'mg/dL', timestamp: '2024-01-15T10:00:00Z' },
        })
        .subscribe(res => {
          response = res;
        });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockReading);
      expect(mockAdapterService.mockAddReading).toHaveBeenCalled();
    });

    it('should handle glucoserver.readings.update mock (lines 1402-1406)', async () => {
      const updatedReading = {
        id: 'reading-123',
        value: 130,
        notes: 'Updated',
      };

      mockAdapterService.mockUpdateReading = vi.fn().mockResolvedValue(updatedReading);

      let response: any;
      service
        .request(
          'glucoserver.readings.update',
          {
            body: { value: 130, notes: 'Updated' },
          },
          { id: 'reading-123' }
        )
        .subscribe(res => {
          response = res;
        });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedReading);
      expect(mockAdapterService.mockUpdateReading).toHaveBeenCalledWith('reading-123', {
        value: 130,
        notes: 'Updated',
      });
    });

    it('should handle glucoserver.readings.delete mock (lines 1408-1410)', async () => {
      mockAdapterService.mockDeleteReading = vi.fn().mockResolvedValue(undefined);

      let response: any;
      service.request('glucoserver.readings.delete', {}, { id: 'reading-123' }).subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ success: true });
      expect(mockAdapterService.mockDeleteReading).toHaveBeenCalledWith('reading-123');
    });

    it('should handle glucoserver.statistics mock (lines 1412-1415)', async () => {
      const mockStats = { average: 125, count: 30 };
      mockAdapterService.mockGetStatistics = vi.fn().mockResolvedValue(mockStats);

      let response: any;
      service.request('glucoserver.statistics', { params: { days: '30' } }).subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStats);
      expect(mockAdapterService.mockGetStatistics).toHaveBeenCalledWith('30');
    });

    it('should throw error for unknown glucoserver endpoint (lines 1417-1418)', async () => {
      service.registerEndpoint('glucoserver.unknown.endpoint', {
        service: ExternalService.GLUCOSERVER,
        path: '/unknown',
        method: 'GET',
        authenticated: false,
      });

      let errorCaught = false;
      service.request('glucoserver.unknown.endpoint').subscribe({
        next: () => {},
        error: err => {
          errorCaught = true;
          expect(err.error.message).toContain('Mock not implemented');
        },
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errorCaught).toBe(true);
    });

    it('should handle achievements.streak mock (lines 1429-1430)', async () => {
      const mockStreak = { currentStreak: 7, longestStreak: 14 };
      mockAdapterService.mockGetStreakData = vi.fn().mockResolvedValue(mockStreak);

      let response: any;
      service.request('achievements.streak').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStreak);
      expect(mockAdapterService.mockGetStreakData).toHaveBeenCalled();
    });

    it('should handle achievements.list mock (lines 1431-1432)', async () => {
      const mockAchievements = [
        { id: 1, name: 'First Reading', unlocked: true },
        { id: 2, name: 'Week Streak', unlocked: false },
      ];
      mockAdapterService.mockGetAchievements = vi.fn().mockResolvedValue(mockAchievements);

      let response: any;
      service.request('achievements.list').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockAchievements);
      expect(mockAdapterService.mockGetAchievements).toHaveBeenCalled();
    });

    it('should throw error for unknown achievements endpoint (lines 1433-1434)', async () => {
      service.registerEndpoint('achievements.unknown', {
        service: ExternalService.GLUCOSERVER,
        path: '/achievements/unknown',
        method: 'GET',
        authenticated: false,
      });

      mockAdapterService.isServiceMockEnabled.mockReturnValue(true);

      let errorCaught = false;
      service.request('achievements.unknown').subscribe({
        next: () => {},
        error: err => {
          errorCaught = true;
          expect(err.error.message).toContain('Mock not implemented');
        },
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errorCaught).toBe(true);
    });

    it('should handle auth.register mock (lines 1452-1455)', async () => {
      const mockUser = {
        id: 'user-123',
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
      };
      mockAdapterService.mockRegister = vi.fn().mockResolvedValue(mockUser);

      let response: any;
      service
        .request('auth.register', {
          body: {
            dni: '12345678',
            password: 'password123',
            name: 'Test User',
            email: 'test@example.com',
          },
        })
        .subscribe(res => {
          response = res;
        });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockUser);
      expect(mockAdapterService.mockRegister).toHaveBeenCalled();
    });

    it('should handle auth.logout mock (lines 1457-1459)', async () => {
      mockAdapterService.mockLogout = vi.fn().mockResolvedValue(undefined);

      let response: any;
      service.request('auth.logout').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ success: true });
      expect(mockAdapterService.mockLogout).toHaveBeenCalled();
    });

    it('should handle auth.user.me mock with GET method (lines 1461-1464, 1490-1491)', async () => {
      const mockProfile = { id: 'user-123', name: 'Test User', email: 'test@example.com' };
      mockAdapterService.mockGetProfile = vi.fn().mockResolvedValue(mockProfile);

      let response: any;
      service.request('auth.user.me').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockProfile);
      expect(mockAdapterService.mockGetProfile).toHaveBeenCalled();
    });

    it('should handle auth.profile.update mock with PUT method (lines 1461-1464, 1493)', async () => {
      const updatedProfile = { id: 'user-123', name: 'Updated Name' };
      mockAdapterService.mockUpdateProfile = vi.fn().mockResolvedValue(updatedProfile);

      let response: any;
      service.request('auth.profile.update', { body: { name: 'Updated Name' } }).subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedProfile);
      expect(mockAdapterService.mockUpdateProfile).toHaveBeenCalledWith({ name: 'Updated Name' });
    });

    it('should handle auth.preferences.update mock (lines 1461-1464)', async () => {
      const updatedPrefs = { theme: 'dark', notifications: true };
      mockAdapterService.mockUpdateProfile = vi.fn().mockResolvedValue(updatedPrefs);

      let response: any;
      service
        .request('auth.preferences.update', { body: { theme: 'dark', notifications: true } })
        .subscribe(res => {
          response = res;
        });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(mockAdapterService.mockUpdateProfile).toHaveBeenCalled();
    });

    it('should handle auth.refresh mock (lines 1466-1467, 1499-1504)', async () => {
      const newToken = 'new-refresh-token-123';
      mockAdapterService.mockRefreshToken = vi.fn().mockResolvedValue(newToken);

      let response: any;
      service.request('auth.refresh', { body: { token: 'old-token' } }).subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ token: newToken });
      expect(mockAdapterService.mockRefreshToken).toHaveBeenCalledWith('old-token');
    });

    it('should throw error for unknown auth endpoint (lines 1469-1471)', async () => {
      service.registerEndpoint('auth.unknown', {
        service: ExternalService.LOCAL_AUTH,
        path: '/auth/unknown',
        method: 'POST',
        authenticated: false,
      });

      let errorCaught = false;
      service.request('auth.unknown').subscribe({
        next: () => {},
        error: err => {
          errorCaught = true;
          expect(err.error.message).toContain('Mock not implemented');
        },
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errorCaught).toBe(true);
    });

    it('should handle auth.login with email (lines 1477-1483)', async () => {
      const mockResponse = { token: 'mock-token', user: { id: 'user-123' } };
      mockAdapterService.mockLogin = vi.fn().mockResolvedValue(mockResponse);

      let response: any;
      service
        .request('auth.login', {
          body: { email: 'test@example.com', password: 'password123' },
        })
        .subscribe(res => {
          response = res;
        });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(mockAdapterService.mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should handle auth.login with DNI (lines 1477-1483)', async () => {
      const mockResponse = { token: 'mock-token', user: { id: 'user-123' } };
      mockAdapterService.mockLogin = vi.fn().mockResolvedValue(mockResponse);

      let response: any;
      service
        .request('auth.login', {
          body: { dni: '12345678', password: 'password123' },
        })
        .subscribe(res => {
          response = res;
        });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(mockAdapterService.mockLogin).toHaveBeenCalledWith('12345678', 'password123');
    });

    it('should throw error for appointments mock (lines 1375-1378)', async () => {
      service.registerEndpoint('appointments.test', {
        service: ExternalService.APPOINTMENTS,
        path: '/appointments/test',
        method: 'GET',
        authenticated: false,
      });

      mockAdapterService.isServiceMockEnabled.mockImplementation(
        (svc: string) => svc === 'appointments'
      );

      let errorCaught = false;
      service.request('appointments.test').subscribe({
        next: () => {},
        error: err => {
          errorCaught = true;
          expect(err.error.message).toContain('should be handled by AppointmentService');
        },
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errorCaught).toBe(true);
    });

    it('should throw error for unknown service mock (lines 1510-1512)', async () => {
      service.registerEndpoint('unknown.service', {
        service: ExternalService.GLUCOSERVER,
        path: '/unknown/service',
        method: 'GET',
        authenticated: false,
      });

      mockAdapterService.isServiceMockEnabled.mockReturnValue(true);

      let errorCaught = false;
      service.request('unknown.service').subscribe({
        next: () => {},
        error: err => {
          errorCaught = true;
          expect(err.error.message).toContain('Mock not implemented');
        },
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errorCaught).toBe(true);
    });
  });

  describe('Request Transform - Edge Cases', () => {
    it('should handle timestamp as Date object (lines 181-182)', async () => {
      const requestBody = {
        value: 120,
        timestamp: new Date('2024-01-15T10:00:00.123Z'),
      };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.body.timestamp).toBe('2024-01-15T10:00:00Z');

      req.flush({ id: '123' });
    });

    it('should handle timestamp as ISO string (lines 183-184)', async () => {
      const requestBody = {
        value: 120,
        timestamp: '2024-01-15T10:00:00.456Z',
      };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.body.timestamp).toBe('2024-01-15T10:00:00Z');

      req.flush({ id: '123' });
    });

    it('should handle timestamp as non-Date/string (lines 186)', async () => {
      const requestBody = {
        value: 120,
        timestamp: 12345 as any,
      };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.body.timestamp).toBe(12345);

      req.flush({ id: '123' });
    });

    it('should handle reading without timestamp field (line 174-176)', async () => {
      const requestBody = {
        value: 120,
        units: 'mg/dL',
      };

      service.request('glucoserver.readings.create', { body: requestBody }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/v1/readings');
      expect(req.request.body).toEqual(requestBody);

      req.flush({ id: '123' });
    });

    it('should transform /token endpoint to form-encoded (lines 443-447)', async () => {
      const requestBody = {
        username: 'testuser',
        password: 'testpass',
      };

      service.request('auth.token', { body: requestBody }).subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/token');
      expect(req.request.body).toBe('username=testuser&password=testpass');
      expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');

      req.flush({ access_token: 'token123' });
    });

    it('should handle glucose.create with null transform (line 636-638)', async () => {
      mockAdapterService.isServiceMockEnabled.mockReturnValue(false);

      service
        .request('extservices.glucose.create', {
          body: { value: 120 },
        })
        .subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/glucose/create');
      expect(req.request.body).toBeNull();

      req.flush({ success: true });
    });
  });

  describe('Service Availability and Fallback', () => {
    it('should use fallback when service unavailable (lines 768-780)', async () => {
      mockExternalServices.isServiceAvailable.mockReturnValue(false);

      service.registerEndpoint('test.fallback', {
        service: ExternalService.GLUCOSERVER,
        path: '/test',
        method: 'GET',
        authenticated: false,
        fallback: () => ({ fallbackData: true }),
      });

      let response: any;
      service.request('test.fallback').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ fallbackData: true });
      expect(response.metadata?.responseTime).toBe(0);
    });

    it('should throw SERVICE_UNAVAILABLE when no fallback (lines 783-792)', async () => {
      mockExternalServices.isServiceAvailable.mockReturnValue(false);

      let errorCaught = false;
      service.request('glucoserver.readings.list').subscribe({
        next: () => {},
        error: err => {
          errorCaught = true;
          expect(err.error.code).toBe('SERVICE_UNAVAILABLE');
          expect(err.error.retryable).toBe(true);
        },
      });

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(errorCaught).toBe(true);
    });

    it('should use fallback on error if available (lines 1100-1112)', async () => {
      service.registerEndpoint('test.error.fallback', {
        service: ExternalService.GLUCOSERVER,
        path: '/test/error',
        method: 'GET',
        authenticated: false,
        fallback: () => ({ errorFallback: true }),
      });

      let response: any;
      service.request('test.error.fallback').subscribe(res => {
        response = res;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('http://localhost:8000/test/error');
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ errorFallback: true });
      expect(response.error).toBeDefined();
    });
  });
});

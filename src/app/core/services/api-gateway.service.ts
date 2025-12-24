/**
 * API Gateway Service
 *
 * Unified entry point for all external API calls.
 * Provides request routing, authentication handling,
 * response transformation, and centralized error handling.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, from } from 'rxjs';
import { switchMap, catchError, map, timeout, retry, shareReplay } from 'rxjs/operators';

import {
  ExternalServicesManager,
  ExternalService,
} from '@services/external-services-manager.service';
import { LocalAuthService } from '@services/local-auth.service';
import { TidepoolAuthService } from '@services/tidepool-auth.service';
import { EnvironmentDetectorService } from '@services/environment-detector.service';
import { PlatformDetectorService } from '@services/platform-detector.service';
import { LoggerService } from '@services/logger.service';
import { MockAdapterService } from '@services/mock-adapter.service';
import { LRUCache } from 'lru-cache';
import { environment } from '@env/environment';
import { API_GATEWAY_BASE_URL } from '@shared/config/api-base-url';
import { LocalGlucoseReading } from '@models/glucose-reading.model';

/**
 * API endpoint configuration
 */
export interface ApiEndpoint {
  service: ExternalService;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  authenticated: boolean;
  timeout?: number;
  retryAttempts?: number;
  cache?: {
    duration: number;
    key?: (params: Record<string, unknown>) => string;
  };
  transform?: {
    request?: (data: unknown) => unknown;
    response?: (data: unknown) => unknown;
  };
  fallback?: () => unknown;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  params?: HttpParams | { [param: string]: string | string[] };
  headers?: HttpHeaders | { [header: string]: string | string[] };
  body?: unknown;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  reportProgress?: boolean;
  withCredentials?: boolean;
  forceRefresh?: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    service: ExternalService;
    endpoint: string;
    responseTime: number;
    cached: boolean;
    timestamp: Date;
  };
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
  service?: ExternalService;
  endpoint?: string;
  retryable: boolean;
}

/**
 * Predefined API endpoints
 */
/**
 * API Endpoint Configuration Map
 *
 * Defines the registry of all external service endpoints.
 * Keys are used in `request()` calls (e.g., 'auth.login') to decouple logical operations from physical paths.
 *
 * Structure:
 * - Key: Logical name (dot-notation recommended, e.g. 'service.resource.action')
 * - Value: ApiEndpoint configuration object containing:
 *   - service: Target service enum (e.g. LOCAL_AUTH, APPOINTMENTS)
 *   - path: URL path (can include {param} placeholders)
 *   - method: HTTP method (GET, POST, PUT, DELETE, PATCH)
 *   - authenticated: boolean flag to trigger token injection
 *   - timeout: optional override for request timeout
 *   - cache: optional caching configuration
 *   - transform: optional request/response transformation functions
 */
const API_ENDPOINTS: Map<string, ApiEndpoint> = new Map([
  // Tidepool endpoints
  [
    'tidepool.glucose.fetch',
    {
      service: ExternalService.TIDEPOOL,
      path: '/data/v1/users/{userId}/data',
      method: 'GET',
      authenticated: true,
      timeout: 60000,
      retryAttempts: 3,
      cache: {
        duration: 300000, // 5 minutes
        key: (params: Record<string, unknown>) =>
          `glucose_${(params?.['userId'] as string | undefined) ?? 'user'}_${(params?.['startDate'] as string | undefined) ?? ''}_${(params?.['endDate'] as string | undefined) ?? ''}`,
      },
      transform: {
        response: (data: unknown) => (data as Record<string, unknown>)['data'] || [],
      },
    },
  ],
  [
    'tidepool.user.profile',
    {
      service: ExternalService.TIDEPOOL,
      path: '/metadata/v1/users/{userId}/profile',
      method: 'GET',
      authenticated: true,
      cache: {
        duration: 600000, // 10 minutes
      },
    },
  ],

  // Glucoserver endpoints
  [
    'glucoserver.readings.list',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/v1/readings',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      retryAttempts: 2,
      cache: {
        duration: 60000, // 1 minute
        key: (params: Record<string, unknown>) =>
          `readings_${(params?.['limit'] as string | undefined) ?? 'all'}_${(params?.['offset'] as number | undefined) ?? 0}`,
      },
    },
  ],
  [
    'glucoserver.readings.create',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/v1/readings',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
      retryAttempts: 1,
      transform: {
        request: (data: unknown) => {
          const dataObj = data as Record<string, unknown>;
          if (!dataObj['timestamp']) {
            return data;
          }
          // Handle both Date objects and ISO strings
          // Remove milliseconds to match expected format (2024-01-15T10:00:00Z instead of 2024-01-15T10:00:00.000Z)
          let timestamp: string;
          if (dataObj['timestamp'] instanceof Date) {
            timestamp = dataObj['timestamp'].toISOString().replace(/\.\d{3}Z$/, 'Z');
          } else if (typeof dataObj['timestamp'] === 'string') {
            timestamp = new Date(dataObj['timestamp']).toISOString().replace(/\.\d{3}Z$/, 'Z');
          } else {
            timestamp = dataObj['timestamp'] as string;
          }
          return {
            ...dataObj,
            timestamp,
          };
        },
      },
    },
  ],
  [
    'glucoserver.readings.update',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/v1/readings/{id}',
      method: 'PUT',
      authenticated: true,
      timeout: 30000,
      retryAttempts: 1,
    },
  ],
  [
    'glucoserver.readings.delete',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/v1/readings/{id}',
      method: 'DELETE',
      authenticated: true,
      timeout: 30000,
      retryAttempts: 1,
    },
  ],
  [
    'glucoserver.statistics',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/v1/statistics',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 300000, // 5 minutes
      },
    },
  ],
  [
    'glucoserver.export',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/v1/export',
      method: 'GET',
      authenticated: true,
      timeout: 60000,
      responseType: 'blob',
    },
  ],

  // Achievements endpoints (gamification)
  [
    'achievements.streak',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/achievements/streak/',
      method: 'GET',
      authenticated: true,
      timeout: 10000,
      cache: {
        duration: 60000, // 1 minute cache
      },
    },
  ],
  [
    'achievements.list',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/achievements/',
      method: 'GET',
      authenticated: true,
      timeout: 10000,
      cache: {
        duration: 60000, // 1 minute cache
      },
    },
  ],

  // Appointment endpoints
  [
    'appointments.list',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 120000, // 2 minutes
      },
    },
  ],
  [
    'appointments.detail',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{id}',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 60000, // 1 minute
      },
    },
  ],
  [
    'appointments.queue.open',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/queue/open',
      method: 'GET',
      authenticated: true,
      timeout: 10000,
    },
  ],
  [
    'appointments.create',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'appointments.update',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{id}',
      method: 'PUT',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'appointments.cancel',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{id}/cancel',
      method: 'PUT',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'appointments.shareGlucose',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{id}/share-glucose',
      method: 'POST',
      authenticated: true,
      timeout: 60000,
      transform: {
        request: (data: unknown) => {
          // Privacy-first: Strip raw readings unless explicitly enabled with consent
          // Default to summary-only data (manual readings summary)
          const dataObj = data as Record<string, unknown>;
          const transformed: Record<string, unknown> = {
            days: dataObj['days'] || 30,
          };

          // Only include manualReadingsSummary if present (privacy-compliant)
          if (dataObj['manualReadingsSummary']) {
            transformed['manualReadingsSummary'] = dataObj['manualReadingsSummary'];
          }

          // Only include raw readings if explicitly enabled with user consent
          if (dataObj['includeRawReadings'] === true && dataObj['userConsent'] === true) {
            transformed['readings'] = dataObj['readings'];
          }

          return transformed;
        },
      },
    },
  ],
  [
    'appointments.doctors.list',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/doctors',
      method: 'GET',
      authenticated: false,
      cache: {
        duration: 600000, // 10 minutes
      },
    },
  ],
  [
    'appointments.slots.available',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/slots',
      method: 'GET',
      authenticated: false,
      cache: {
        duration: 300000, // 5 minutes
        key: (params: Record<string, unknown>) =>
          `slots_${(params?.['doctorId'] as string | undefined) ?? 'doctor'}_${(params?.['date'] as string | undefined) ?? ''}`,
      },
    },
  ],

  // Clinical Form endpoints
  [
    'clinicalForm.get',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{appointmentId}/clinical-form',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 300000, // 5 minutes
      },
    },
  ],
  [
    'clinicalForm.save',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{appointmentId}/clinical-form',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'clinicalForm.update',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{appointmentId}/clinical-form',
      method: 'PUT',
      authenticated: true,
      timeout: 30000,
    },
  ],

  // Auth endpoints
  [
    'auth.token',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/token',
      method: 'POST',
      authenticated: false,
      timeout: 15000,
      retryAttempts: 1,
      transform: {
        request: (data: unknown) => {
          // Transform to form-encoded format for /token endpoint
          const dataObj = data as Record<string, unknown>;
          if (dataObj['username'] && dataObj['password']) {
            return `username=${encodeURIComponent(dataObj['username'] as string)}&password=${encodeURIComponent(dataObj['password'] as string)}`;
          }
          return data;
        },
      },
    },
  ],
  [
    'auth.user.me',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/users/me',
      method: 'GET',
      authenticated: true,
      timeout: 15000,
      cache: {
        duration: 300000, // 5 minutes
      },
    },
  ],
  [
    'auth.login',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/auth/login',
      method: 'POST',
      authenticated: false,
      timeout: 15000,
      retryAttempts: 1,
    },
  ],
  [
    'auth.register',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/auth/register',
      method: 'POST',
      authenticated: false,
      timeout: 15000,
      retryAttempts: 1,
    },
  ],
  [
    'auth.refresh',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/auth/refresh',
      method: 'POST',
      authenticated: false,
      timeout: 15000,
      retryAttempts: 1,
    },
  ],
  [
    'auth.logout',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/auth/logout',
      method: 'POST',
      authenticated: true,
      timeout: 15000,
    },
  ],
  [
    'auth.profile.update',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/auth/profile',
      method: 'PUT',
      authenticated: true,
      timeout: 15000,
    },
  ],
  [
    'auth.preferences.update',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/auth/preferences',
      method: 'PUT',
      authenticated: true,
      timeout: 15000,
    },
  ],
  // TODO: Add 'auth.tidepool.link' endpoint when backend implements PATCH /users/tidepool
  // The User model already has the 'tidepool' field (login/app/models/user_model.py:14)
  // but no API endpoint exists yet to update it

  // ExtServices-specific endpoints (Heroku backend)
  [
    'extservices.appointments.mine',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/mine',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 120000, // 2 minutes
      },
    },
  ],
  [
    'extservices.appointments.state',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/state',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'extservices.appointments.create',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/create',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'extservices.appointments.submit',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/submit',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'extservices.appointments.resolution',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/{appointmentId}/resolution',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'extservices.appointments.placement',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/appointments/placement',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 30000, // 30 seconds - queue position changes frequently
      },
    },
  ],
  [
    'extservices.glucose.mine',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/glucose/mine',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 60000, // 1 minute
      },
    },
  ],
  [
    'extservices.glucose.latest',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/glucose/mine/latest',
      method: 'GET',
      authenticated: true,
      timeout: 10000, // Faster timeout for latest readings
      cache: {
        duration: 30000, // 30 seconds
      },
    },
  ],
  [
    'extservices.glucose.create',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/glucose/create',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
      transform: {
        request: (_data: unknown) => {
          // This endpoint uses query params, not body
          return null;
        },
      },
    },
  ],
  [
    'extservices.users.me',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/users/me',
      method: 'GET',
      authenticated: true,
      timeout: 15000,
      cache: {
        duration: 300000, // 5 minutes
      },
    },
  ],
  [
    'extservices.users.update',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/users/me',
      method: 'PATCH',
      authenticated: true,
      timeout: 15000,
    },
  ],
]);

@Injectable({
  providedIn: 'root',
})
/**
 * ApiGatewayService - Centralized API Request Handler
 *
 * Implements the API Gateway pattern for the frontend application.
 * Acts as the single point of entry for all backend service communication (except Tidepool direct auth).
 *
 * Key Responsibilities:
 * 1. **Routing:** Maps logical endpoint keys (e.g., 'extservices.glucose.mine') to physical URLs based on environment.
 * 2. **Authentication:** Automatically injects JWT tokens for authenticated endpoints.
 * 3. **Caching:** Implements an LRU (Least Recently Used) caching strategy to reduce network load.
 * 4. **Error Handling:** Standardizes error responses into a common `ApiResponse` format.
 * 5. **Resilience:** Handles timeouts, retries, and circuit breaking (via service availability checks).
 * 6. **Mocking:** transparently switches to mock implementations if configured.
 *
 * Complexity:
 * - Space: O(N) where N is the cache size (bounded).
 * - Time: O(1) for cache lookups, network time for requests.
 */
export class ApiGatewayService {
  // LRU cache for response data with bounded size and TTL
  private cacheData = new LRUCache<string, { data: unknown; timestamp: number }>({
    max: 500, // Maximum 500 entries
    maxSize: 10 * 1024 * 1024, // 10 MB maximum total size
    ttl: 5 * 60 * 1000, // 5 minutes TTL
    updateAgeOnGet: true, // Reset TTL on access (LRU behavior)
    sizeCalculation: value => {
      // Rough estimate of object size in bytes
      return JSON.stringify(value).length;
    },
  });

  constructor(
    private http: HttpClient,
    private externalServices: ExternalServicesManager,
    private localAuth: LocalAuthService,
    private tidepoolAuth: TidepoolAuthService,
    private envDetector: EnvironmentDetectorService,
    private platformDetector: PlatformDetectorService,
    private logger: LoggerService,
    private mockAdapter: MockAdapterService
  ) {
    this.logger.info('Init', 'ApiGatewayService initialized');
  }

  /**
   * Make an API request through the gateway.
   * This is the primary public API for consuming services.
   *
   * @template T - The expected response data type.
   * @param endpointKey - The unique key identifying the endpoint (e.g., 'auth.login').
   * @param options - Optional request configuration (body, headers, params, forceRefresh).
   * @param pathParams - Key-value pairs to replace placeholders in the URL path (e.g., { id: '123' }).
   * @returns Observable<ApiResponse<T>> - The standardized API response.
   *
   * Flow:
   * 1. Resolve endpoint configuration.
   * 2. Check service availability (Circuit Breaker).
   * 3. Check Cache (if enabled and not forced refresh).
   * 4. Check Mock Mode (if enabled).
   * 5. Execute Real Request (`executeRequest`).
   */
  public request<T = unknown>(
    endpointKey: string,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Observable<ApiResponse<T>> {
    const requestId = this.logger.getRequestId() || `req-${Date.now()}`;
    this.logger.setRequestId(requestId);

    const endpoint = API_ENDPOINTS.get(endpointKey);

    if (!endpoint) {
      this.logger.error('API', 'Unknown endpoint', undefined, { endpointKey, requestId });
      return throwError(() => ({
        success: false,
        error: {
          code: 'UNKNOWN_ENDPOINT',
          message: `Unknown endpoint: ${endpointKey}`,
          retryable: false,
        },
      }));
    }

    this.logger.debug('API', 'Request initiated', {
      endpoint: endpointKey,
      service: endpoint.service,
      method: endpoint.method,
      requestId,
    });

    // Check service availability
    if (!this.externalServices.isServiceAvailable(endpoint.service)) {
      this.logger.warn('API', 'Service unavailable', {
        service: endpoint.service,
        endpoint: endpointKey,
      });

      if (endpoint.fallback) {
        this.logger.info('API', 'Using fallback data', { endpoint: endpointKey });
        return of({
          success: true,
          data: endpoint.fallback() as T,
          metadata: {
            service: endpoint.service,
            endpoint: endpointKey,
            responseTime: 0,
            cached: false,
            timestamp: new Date(),
          },
        } as ApiResponse<T>);
      }

      return throwError(() => ({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Service ${endpoint.service} is not available`,
          service: endpoint.service,
          endpoint: endpointKey,
          retryable: true,
        },
      }));
    }

    // Check cache
    if (endpoint.cache && !options?.forceRefresh) {
      const cacheKey = this.getCacheKey(
        endpointKey,
        endpoint,
        options?.params as Record<string, unknown>
      );
      const cached = this.getFromCache(cacheKey, endpoint.cache.duration);

      if (cached) {
        this.logger.debug('API', 'Cache hit', { endpoint: endpointKey, cacheKey });
        return of({
          success: true,
          data: cached as T,
          metadata: {
            service: endpoint.service,
            endpoint: endpointKey,
            responseTime: 0,
            cached: true,
            timestamp: new Date(),
          },
        } as ApiResponse<T>);
      } else {
        this.logger.debug('API', 'Cache miss', { endpoint: endpointKey, cacheKey });
      }
    }

    // Check if mock mode is enabled for this service
    if (this.shouldUseMock(endpoint.service)) {
      this.logger.info('API', 'Using mock data', {
        endpoint: endpointKey,
        service: endpoint.service,
        requestId,
      });
      return this.getMockResponse<T>(endpointKey, endpoint, options, pathParams);
    }

    // Execute request
    return this.executeRequest<T>(endpointKey, endpoint, options, pathParams);
  }

  /**
   * Execute the actual HTTP request using CapacitorHttp (native) or HttpClient (web fallback).
   * Handles timeouts, retries, response transformation, and caching of successful responses.
   *
   * @param endpointKey - The endpoint identifier.
   * @param endpoint - The endpoint configuration object.
   * @param options - Request options.
   * @param pathParams - URL path parameters.
   * @returns Observable<ApiResponse<T>>
   *
   * Complexity: Network I/O bound.
   */
  private executeRequest<T>(
    endpointKey: string,
    endpoint: ApiEndpoint,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Observable<ApiResponse<T>> {
    const startTime = Date.now();

    return from(this.prepareRequest(endpoint, options, pathParams)).pipe(
      switchMap<{ url: string; headers: HttpHeaders; body: unknown }, Observable<ApiResponse<T>>>(
        ({ url, headers, body }) => {
          let request$: Observable<unknown>;

          // Use Angular HttpClient directly
          // With CapacitorHttp auto-patching enabled (capacitor.config.ts),
          // HttpClient uses native HTTP on mobile platforms (bypasses CORS)
          const requestOptions = {
            headers,
            params: options?.params as HttpParams,
          };

          switch (endpoint.method) {
            case 'GET':
              request$ = this.http.get(url, requestOptions);
              break;
            case 'POST':
              request$ = this.http.post(url, body, requestOptions);
              break;
            case 'PUT':
              request$ = this.http.put(url, body, requestOptions);
              break;
            case 'DELETE':
              request$ = this.http.delete(url, requestOptions);
              break;
            case 'PATCH':
              request$ = this.http.patch(url, body, requestOptions);
              break;
            default:
              return throwError(() => new Error('Unsupported method'));
          }

          return request$.pipe(
            timeout(endpoint.timeout || 30000),
            retry(endpoint.retryAttempts || 0),
            map(response => {
              const responseTime = Date.now() - startTime;

              // Transform response if needed
              const data = endpoint.transform?.response
                ? endpoint.transform.response(response)
                : response;

              // Cache if applicable
              if (endpoint.cache) {
                const cacheKey = this.getCacheKey(
                  endpointKey,
                  endpoint,
                  options?.params as Record<string, unknown>
                );
                this.addToCache(cacheKey, data);
              }

              this.logger.info('API', 'Request completed successfully', {
                endpoint: endpointKey,
                method: endpoint.method,
                responseTime: `${responseTime}ms`,
                dataSize: JSON.stringify(data).length,
                requestId: this.logger.getRequestId(),
                status: 200,
              });

              return {
                success: true,
                data: data as T,
                metadata: {
                  service: endpoint.service,
                  endpoint: endpointKey,
                  responseTime,
                  cached: false,
                  timestamp: new Date(),
                },
              };
            }),
            catchError((error): Observable<ApiResponse<T>> => {
              const responseTime = Date.now() - startTime;

              const statusCode = error?.status;
              const isQueueStateNotFound =
                endpointKey === 'extservices.appointments.state' && statusCode === 404;

              if (!isQueueStateNotFound) {
                this.logger.error('API', 'Request failed', error, {
                  endpoint: endpointKey,
                  method: endpoint.method,
                  responseTime: `${responseTime}ms`,
                  statusCode,
                  requestId: this.logger.getRequestId(),
                });
              } else {
                this.logger.info('API', 'Queue state not found (treated as none)', {
                  endpoint: endpointKey,
                  method: endpoint.method,
                  responseTime: `${responseTime}ms`,
                  statusCode,
                  requestId: this.logger.getRequestId(),
                });
              }

              return this.handleError<T>(error, endpoint, endpointKey);
            })
          );
        }
      ),
      shareReplay({ bufferSize: 1, refCount: true }) // Share observable with automatic cleanup
    );
  }

  /**
   * Prepare request by building the full URL, headers, and body.
   * Handles async token retrieval for authenticated endpoints.
   *
   * @param endpoint - Endpoint config.
   * @param options - Request options.
   * @param pathParams - Path parameters for URL substitution.
   * @returns Promise resolving to URL, Headers, and Body.
   */
  private async prepareRequest(
    endpoint: ApiEndpoint,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Promise<{ url: string; headers: HttpHeaders; body: unknown }> {
    // Build URL
    const baseUrl = this.getBaseUrl(endpoint.service);
    let path = endpoint.path;

    // Replace path parameters
    if (pathParams) {
      Object.entries(pathParams).forEach(([key, value]) => {
        path = path.replace(`{${key}}`, value);
      });
    }

    const url = `${baseUrl}${path}`;

    // Prepare headers
    let headers =
      options?.headers instanceof HttpHeaders
        ? options.headers
        : new HttpHeaders((options?.headers as { [header: string]: string | string[] }) || {});

    // Add authentication if required
    if (endpoint.authenticated) {
      const token = await this.getAuthToken(endpoint.service);
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      } else {
        throw new Error('Authentication required but no token available');
      }
    }

    // Add content type if not set
    if (!headers.has('Content-Type') && endpoint.method !== 'GET' && endpoint.method !== 'DELETE') {
      // Use form-encoded for /token endpoint, JSON for others
      const contentType =
        endpoint.path === '/token' ? 'application/x-www-form-urlencoded' : 'application/json';
      headers = headers.set('Content-Type', contentType);
    }

    // Transform request body if needed
    const body =
      endpoint.transform?.request && options?.body
        ? endpoint.transform.request(options.body)
        : options?.body;

    return { url, headers, body };
  }

  /**
   * Get base URL for a service based on environment.
   * Resolves via `PlatformDetectorService` to handle localhost vs Android emulator (10.0.2.2).
   */
  private getBaseUrl(service: ExternalService): string {
    switch (service) {
      case ExternalService.TIDEPOOL:
        // Tidepool remains direct for now (may route through gateway in future)
        return environment.tidepool.baseUrl;
      case ExternalService.GLUCOSERVER:
      case ExternalService.APPOINTMENTS:
      case ExternalService.LOCAL_AUTH: {
        // Route all backend services through the API Gateway
        // Use platform detector to get the correct URL for the current environment
        const defaultUrl = API_GATEWAY_BASE_URL;
        return this.platformDetector.getApiBaseUrl(defaultUrl);
      }
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  /**
   * Get authentication token for a service.
   * Maps the service type to the appropriate auth provider (Local vs Tidepool).
   */
  private async getAuthToken(service: ExternalService): Promise<string | null> {
    switch (service) {
      case ExternalService.TIDEPOOL:
        return await this.tidepoolAuth.getAccessToken();
      case ExternalService.GLUCOSERVER:
      case ExternalService.APPOINTMENTS:
      case ExternalService.LOCAL_AUTH:
        return await this.localAuth.getAccessToken();
      default:
        return null;
    }
  }

  /**
   * Handle and normalize HTTP errors.
   * Converts raw `HttpErrorResponse` into a standardized `ApiError` object.
   * Checks for retryable conditions.
   */
  private handleError<T = unknown>(
    error: HttpErrorResponse,
    endpoint: ApiEndpoint,
    endpointKey: string
  ): Observable<ApiResponse<T>> {
    let apiError: ApiError;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      apiError = {
        code: 'CLIENT_ERROR',
        message: error.error.message,
        retryable: false,
      };
    } else {
      // Server-side error
      apiError = {
        code: this.getErrorCode(error.status),
        message: error.message,
        statusCode: error.status,
        details: error.error,
        service: endpoint.service,
        endpoint: endpointKey,
        retryable: this.isRetryable(error.status),
      };
    }

    // Record error in external services manager
    this.externalServices['recordServiceError'](endpoint.service, apiError.message);

    // Try fallback if available
    if (endpoint.fallback) {
      return of({
        success: true,
        data: endpoint.fallback() as T,
        error: apiError,
        metadata: {
          service: endpoint.service,
          endpoint: endpointKey,
          responseTime: 0,
          cached: false,
          timestamp: new Date(),
        },
      } as ApiResponse<T>);
    }

    return throwError(
      () =>
        ({
          success: false,
          error: apiError,
        }) as ApiResponse<T>
    );
  }

  /**
   * Map HTTP status codes to internal error strings.
   */
  private getErrorCode(status: number): string {
    switch (status) {
      case 0:
        return 'NETWORK_ERROR';
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Check if an error is transient and safe to retry.
   */
  private isRetryable(status: number): boolean {
    return status === 0 || status === 408 || status === 429 || status >= 500;
  }

  /**
   * Generate a unique cache key based on endpoint and params.
   */
  private getCacheKey(
    endpointKey: string,
    endpoint: ApiEndpoint,
    params?: Record<string, unknown>
  ): string {
    if (endpoint.cache?.key) {
      return `${endpointKey}_${endpoint.cache.key(params as Record<string, unknown>)}`;
    }
    return `${endpointKey}_${JSON.stringify(params || {})}`;
  }

  /**
   * Retrieve data from cache if valid.
   * Enforces the specific endpoint's TTL duration (which may be shorter than the global LRU TTL).
   */
  private getFromCache(key: string, duration: number): unknown | null {
    const cached = this.cacheData.get(key);

    if (!cached) {
      return null;
    }

    // Check endpoint-specific duration (may be shorter than LRUCache TTL)
    const now = Date.now();
    if (now - cached.timestamp > duration) {
      this.cacheData.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Add data to the LRU cache.
   */
  private addToCache(key: string, data: unknown): void {
    this.cacheData.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache entries.
   * @param endpointKey - Optional prefix to clear specific endpoint family. If omitted, clears entire cache.
   */
  public clearCache(endpointKey?: string): void {
    if (endpointKey) {
      // Clear specific endpoint cache
      const keysToDelete: string[] = [];
      for (const key of this.cacheData.keys()) {
        if (key.startsWith(endpointKey)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cacheData.delete(key));
    } else {
      // Clear all cache
      this.cacheData.clear();
    }
  }

  /**
   * Dynamically register a new endpoint configuration at runtime.
   */
  public registerEndpoint(key: string, endpoint: ApiEndpoint): void {
    API_ENDPOINTS.set(key, endpoint);
  }

  /**
   * Retrieve a registered endpoint configuration.
   */
  public getEndpoint(key: string): ApiEndpoint | undefined {
    return API_ENDPOINTS.get(key);
  }

  /**
   * List all available endpoint keys.
   */
  public listEndpoints(): string[] {
    return Array.from(API_ENDPOINTS.keys());
  }

  /**
   * Determine if a request should be routed to the Mock Adapter.
   * @param service - The target external service.
   */
  private shouldUseMock(service: ExternalService): boolean {
    // Tidepool always uses real API (not routed through mock system)
    if (service === ExternalService.TIDEPOOL) {
      return false;
    }

    // Check mock adapter configuration
    const serviceName = this.getServiceMockKey(service);
    return serviceName ? this.mockAdapter.isServiceMockEnabled(serviceName) : false;
  }

  /**
   * Helper to map service enum to mock config key.
   */
  private getServiceMockKey(
    service: ExternalService
  ): 'appointments' | 'glucoserver' | 'auth' | null {
    switch (service) {
      case ExternalService.APPOINTMENTS:
        return 'appointments';
      case ExternalService.GLUCOSERVER:
        return 'glucoserver';
      case ExternalService.LOCAL_AUTH:
        return 'auth';
      default:
        return null;
    }
  }

  /**
   * Route a request to the Mock Adapter implementation.
   */
  private getMockResponse<T>(
    endpointKey: string,
    endpoint: ApiEndpoint,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Observable<ApiResponse<T>> {
    const startTime = Date.now();

    return from(this.executeMockRequest<T>(endpointKey, endpoint, options, pathParams)).pipe(
      map(data => {
        const responseTime = Date.now() - startTime;

        this.logger.info('API', 'Mock request completed', {
          endpoint: endpointKey,
          method: endpoint.method,
          responseTime: `${responseTime}ms`,
          requestId: this.logger.getRequestId(),
          status: 200,
        });

        return {
          success: true,
          data: data as T,
          metadata: {
            service: endpoint.service,
            endpoint: endpointKey,
            responseTime,
            cached: false,
            timestamp: new Date(),
          },
        };
      }),
      catchError(error => {
        const responseTime = Date.now() - startTime;
        this.logger.error('API', 'Mock request failed', error, {
          endpoint: endpointKey,
          method: endpoint.method,
          responseTime: `${responseTime}ms`,
          requestId: this.logger.getRequestId(),
        });

        return throwError(() => ({
          success: false,
          error: {
            code: 'MOCK_ERROR',
            message: error.message || 'Mock request failed',
            retryable: false,
            service: endpoint.service,
            endpoint: endpointKey,
          },
        }));
      })
    );
  }

  /**
   * Dispatch the mock request to the specific mock method in MockAdapter.
   * Refactored para reducir complejidad ciclomática mediante delegación a handlers específicos.
   */
  private async executeMockRequest<T>(
    endpointKey: string,
    endpoint: ApiEndpoint,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Promise<T> {
    const params = options?.params as Record<string, unknown> | undefined;
    const body = options?.body;

    // Determinar el servicio basado en el prefijo del endpoint
    const [service] = endpointKey.split('.');

    switch (service) {
      case 'appointments':
        return this.handleAppointmentsMockRequest(endpointKey);
      case 'glucoserver':
        return this.handleGlucoserverMockRequest(endpointKey, params, body, pathParams);
      case 'achievements':
        return this.handleAchievementsMockRequest(endpointKey);
      case 'auth':
        return this.handleAuthMockRequest(endpointKey, endpoint, body);
      default:
        return this.handleUnknownMockRequest(endpointKey);
    }
  }

  /**
   * Handler para endpoints de appointments (delegados al servicio).
   */
  private handleAppointmentsMockRequest<T>(endpointKey: string): Promise<T> {
    throw new Error(
      `Mock endpoint ${endpointKey} should be handled by AppointmentService directly`
    );
  }

  /**
   * Handler para endpoints de glucoserver.
   */
  private async handleGlucoserverMockRequest<T>(
    endpointKey: string,
    params?: Record<string, unknown>,
    body?: unknown,
    pathParams?: { [key: string]: string }
  ): Promise<T> {
    const action = endpointKey.split('.').slice(1).join('.');

    switch (action) {
      case 'readings.list':
        return this.mockAdapter.mockGetAllReadings(
          (params?.['offset'] as number | undefined) || 0,
          (params?.['limit'] as number | undefined) || 100
        ) as Promise<T>;

      case 'readings.create':
        return this.mockAdapter.mockAddReading(body as LocalGlucoseReading) as Promise<T>;

      case 'readings.update':
        return this.mockAdapter.mockUpdateReading(
          pathParams?.['id'] || '',
          body as Partial<LocalGlucoseReading>
        ) as Promise<T>;

      case 'readings.delete':
        await this.mockAdapter.mockDeleteReading(pathParams?.['id'] || '');
        return { success: true } as T;

      case 'statistics':
        return this.mockAdapter.mockGetStatistics(
          (params?.['days'] as number | undefined) || 30
        ) as Promise<T>;

      default:
        throw new Error(`Mock not implemented for glucoserver endpoint: ${action}`);
    }
  }

  /**
   * Handler para endpoints de achievements.
   */
  private handleAchievementsMockRequest<T>(endpointKey: string): Promise<T> {
    const action = endpointKey.split('.').slice(1).join('.');

    switch (action) {
      case 'streak':
        return this.mockAdapter.mockGetStreakData() as Promise<T>;
      case 'list':
        return this.mockAdapter.mockGetAchievements() as Promise<T>;
      default:
        throw new Error(`Mock not implemented for achievements endpoint: ${action}`);
    }
  }

  /**
   * Handler para endpoints de autenticación.
   */
  private async handleAuthMockRequest<T>(
    endpointKey: string,
    endpoint: ApiEndpoint,
    body?: unknown
  ): Promise<T> {
    const action = endpointKey.split('.').slice(1).join('.');

    switch (action) {
      case 'login':
        return this.handleAuthLogin(body) as Promise<T>;

      case 'register':
        return this.mockAdapter.mockRegister(
          body as { dni: string; password: string; name: string; email: string }
        ) as Promise<T>;

      case 'logout':
        await this.mockAdapter.mockLogout();
        return { success: true } as T;

      case 'user.me':
      case 'profile.update':
      case 'preferences.update':
        return this.handleAuthProfile(endpoint, body) as Promise<T>;

      case 'refresh':
        return this.handleAuthRefresh(body) as Promise<T>;

      default:
        throw new Error(`Mock not implemented for auth endpoint: ${action}`);
    }
  }

  /**
   * Helper para login con email o DNI.
   */
  private handleAuthLogin(body?: unknown): Promise<unknown> {
    const bodyObj = body as Record<string, unknown>;
    return this.mockAdapter.mockLogin(
      ((bodyObj['email'] as string | undefined) ||
        (bodyObj['dni'] as string | undefined)) as string,
      bodyObj['password'] as string
    );
  }

  /**
   * Helper para profile (GET o UPDATE según método HTTP).
   */
  private handleAuthProfile(endpoint: ApiEndpoint, body?: unknown): Promise<unknown> {
    if (endpoint.method === 'GET') {
      return this.mockAdapter.mockGetProfile();
    }
    return this.mockAdapter.mockUpdateProfile(body as Record<string, unknown>);
  }

  /**
   * Helper para refresh token.
   */
  private async handleAuthRefresh(body?: unknown): Promise<{ token: string }> {
    const bodyObj = body as Record<string, unknown>;
    const newToken = await this.mockAdapter.mockRefreshToken(
      (bodyObj['token'] as string | undefined) || ''
    );
    return { token: newToken };
  }

  /**
   * Handler para endpoints desconocidos.
   */
  private handleUnknownMockRequest<T>(endpointKey: string): Promise<T> {
    this.logger.warn('API', `No mock implementation for endpoint: ${endpointKey}`);
    throw new Error(`Mock not implemented for endpoint: ${endpointKey}`);
  }
}

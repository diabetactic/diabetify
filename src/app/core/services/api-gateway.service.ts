/**
 * API Gateway Service
 *
 * Unified entry point for all external API calls.
 * Provides request routing, authentication handling,
 * response transformation, and centralized error handling.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, from, firstValueFrom } from 'rxjs';
import { switchMap, catchError, map, timeout, retry, tap, shareReplay } from 'rxjs/operators';

import { ExternalServicesManager, ExternalService } from './external-services-manager.service';
import { LocalAuthService } from './local-auth.service';
import { TidepoolAuthService } from './tidepool-auth.service';
import { EnvironmentDetectorService } from './environment-detector.service';
import { PlatformDetectorService } from './platform-detector.service';
import { LoggerService } from './logger.service';
import { MockAdapterService } from './mock-adapter.service';
import { CapacitorHttpService } from './capacitor-http.service';
import { environment } from '../../../environments/environment';

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
    key?: (params: any) => string;
  };
  transform?: {
    request?: (data: any) => any;
    response?: (data: any) => any;
  };
  fallback?: () => any;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  params?: HttpParams | { [param: string]: string | string[] };
  headers?: HttpHeaders | { [header: string]: string | string[] };
  body?: any;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  reportProgress?: boolean;
  withCredentials?: boolean;
  forceRefresh?: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
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
  details?: any;
  statusCode?: number;
  service?: ExternalService;
  endpoint?: string;
  retryable: boolean;
}

/**
 * Predefined API endpoints
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
        key: (params: any) =>
          `glucose_${params?.userId ?? 'user'}_${params?.startDate ?? ''}_${params?.endDate ?? ''}`,
      },
      transform: {
        response: (data: any) => data.data || [],
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
      path: '/api/v1/readings',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      retryAttempts: 2,
      cache: {
        duration: 60000, // 1 minute
        key: (params: any) => `readings_${params?.limit ?? 'all'}_${params?.offset ?? 0}`,
      },
    },
  ],
  [
    'glucoserver.readings.create',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/api/v1/readings',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
      retryAttempts: 1,
      transform: {
        request: (data: any) => {
          if (!data.timestamp) {
            return data;
          }
          // Handle both Date objects and ISO strings
          // Remove milliseconds to match expected format (2024-01-15T10:00:00Z instead of 2024-01-15T10:00:00.000Z)
          let timestamp: string;
          if (data.timestamp instanceof Date) {
            timestamp = data.timestamp.toISOString().replace(/\.\d{3}Z$/, 'Z');
          } else if (typeof data.timestamp === 'string') {
            timestamp = new Date(data.timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z');
          } else {
            timestamp = data.timestamp;
          }
          return {
            ...data,
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
      path: '/api/v1/readings/{id}',
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
      path: '/api/v1/readings/{id}',
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
      path: '/api/v1/statistics',
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
      path: '/api/v1/export',
      method: 'GET',
      authenticated: true,
      timeout: 60000,
      responseType: 'blob',
    },
  ],

  // Appointment endpoints
  [
    'appointments.list',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments',
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
      path: '/api/appointments/{id}',
      method: 'GET',
      authenticated: true,
      timeout: 30000,
      cache: {
        duration: 60000, // 1 minute
      },
    },
  ],
  [
    'appointments.create',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'appointments.update',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments/{id}',
      method: 'PUT',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'appointments.cancel',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments/{id}/cancel',
      method: 'PUT',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'appointments.shareGlucose',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments/{id}/share-glucose',
      method: 'POST',
      authenticated: true,
      timeout: 60000,
      transform: {
        request: (data: any) => {
          // Privacy-first: Strip raw readings unless explicitly enabled with consent
          // Default to summary-only data (manual readings summary)
          const transformed: any = {
            days: data.days || 30,
          };

          // Only include manualReadingsSummary if present (privacy-compliant)
          if (data.manualReadingsSummary) {
            transformed.manualReadingsSummary = data.manualReadingsSummary;
          }

          // Only include raw readings if explicitly enabled with user consent
          if (data.includeRawReadings === true && data.userConsent === true) {
            transformed.readings = data.readings;
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
      path: '/api/doctors',
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
      path: '/api/slots',
      method: 'GET',
      authenticated: false,
      cache: {
        duration: 300000, // 5 minutes
        key: (params: any) => `slots_${params?.doctorId ?? 'doctor'}_${params?.date ?? ''}`,
      },
    },
  ],

  // Clinical Form endpoints
  [
    'clinicalForm.get',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments/{appointmentId}/clinical-form',
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
      path: '/api/appointments/{appointmentId}/clinical-form',
      method: 'POST',
      authenticated: true,
      timeout: 30000,
    },
  ],
  [
    'clinicalForm.update',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments/{appointmentId}/clinical-form',
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
      path: '/api/auth/login',
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
      path: '/api/auth/register',
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
      path: '/api/auth/refresh',
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
      path: '/api/auth/logout',
      method: 'POST',
      authenticated: true,
      timeout: 15000,
    },
  ],
  [
    'auth.profile.update',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/api/auth/profile',
      method: 'PUT',
      authenticated: true,
      timeout: 15000,
    },
  ],
  [
    'auth.preferences.update',
    {
      service: ExternalService.LOCAL_AUTH,
      path: '/api/auth/preferences',
      method: 'PUT',
      authenticated: true,
      timeout: 15000,
    },
  ],
]);

@Injectable({
  providedIn: 'root',
})
export class ApiGatewayService {
  private requestCache = new Map<string, Observable<any>>();
  private cacheData = new Map<string, { data: any; timestamp: number }>();

  constructor(
    private http: HttpClient,
    private capacitorHttp: CapacitorHttpService,
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
   * Make an API request through the gateway
   */
  public request<T = any>(
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
          data: endpoint.fallback(),
          metadata: {
            service: endpoint.service,
            endpoint: endpointKey,
            responseTime: 0,
            cached: false,
            timestamp: new Date(),
          },
        });
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
      const cacheKey = this.getCacheKey(endpointKey, endpoint, options?.params);
      const cached = this.getFromCache(cacheKey, endpoint.cache.duration);

      if (cached) {
        this.logger.debug('API', 'Cache hit', { endpoint: endpointKey, cacheKey });
        return of({
          success: true,
          data: cached,
          metadata: {
            service: endpoint.service,
            endpoint: endpointKey,
            responseTime: 0,
            cached: true,
            timestamp: new Date(),
          },
        });
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
   * Execute the actual HTTP request
   */
  private executeRequest<T>(
    endpointKey: string,
    endpoint: ApiEndpoint,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Observable<ApiResponse<T>> {
    const startTime = Date.now();

    return from(this.prepareRequest(endpoint, options, pathParams)).pipe(
      switchMap(({ url, headers, body }) => {
        let request$: Observable<any>;

        // Use CapacitorHttp service (bypasses CORS on native platforms)
        const requestOptions = {
          headers,
          params: options?.params,
          responseType: (options?.responseType as any) || 'json',
        };

        switch (endpoint.method) {
          case 'GET':
            request$ = this.capacitorHttp.get(url, requestOptions);
            break;
          case 'POST':
            request$ = this.capacitorHttp.post(url, body, requestOptions);
            break;
          case 'PUT':
            request$ = this.capacitorHttp.put(url, body, requestOptions);
            break;
          case 'DELETE':
            request$ = this.capacitorHttp.delete(url, requestOptions);
            break;
          case 'PATCH':
            request$ = this.capacitorHttp.patch(url, body, requestOptions);
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
              const cacheKey = this.getCacheKey(endpointKey, endpoint, options?.params);
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
          catchError(error => {
            const responseTime = Date.now() - startTime;
            this.logger.error('API', 'Request failed', error, {
              endpoint: endpointKey,
              method: endpoint.method,
              responseTime: `${responseTime}ms`,
              statusCode: error?.status,
              requestId: this.logger.getRequestId(),
            });
            return this.handleError(error, endpoint, endpointKey);
          })
        );
      }),
      shareReplay(1) // Share the observable for multiple subscribers
    );
  }

  /**
   * Prepare request with authentication and URL building
   */
  private async prepareRequest(
    endpoint: ApiEndpoint,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Promise<{ url: string; headers: HttpHeaders; body: any }> {
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
      headers = headers.set('Content-Type', 'application/json');
    }

    // Transform request body if needed
    const body =
      endpoint.transform?.request && options?.body
        ? endpoint.transform.request(options.body)
        : options?.body;

    return { url, headers, body };
  }

  /**
   * Get base URL for a service
   * IMPORTANT: All non-Tidepool services should route through the API Gateway
   */
  private getBaseUrl(service: ExternalService): string {
    switch (service) {
      case ExternalService.TIDEPOOL:
        // Tidepool remains direct for now (may route through gateway in future)
        return environment.tidepool.baseUrl;
      case ExternalService.GLUCOSERVER:
      case ExternalService.APPOINTMENTS:
      case ExternalService.LOCAL_AUTH:
        // Route all backend services through the API Gateway
        // Use platform detector to get the correct URL for the current environment
        const defaultUrl =
          environment.backendServices.apiGateway.baseUrl || 'http://localhost:8000';
        return this.platformDetector.getApiBaseUrl(defaultUrl);
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  /**
   * Get authentication token for a service
   * Uses direct service injection to avoid circular dependencies
   */
  private async getAuthToken(service: ExternalService): Promise<string | null> {
    switch (service) {
      case ExternalService.TIDEPOOL:
        return await this.tidepoolAuth.getAccessToken();
      case ExternalService.GLUCOSERVER:
      case ExternalService.APPOINTMENTS:
      case ExternalService.LOCAL_AUTH:
        return this.localAuth.getAccessToken();
      default:
        return null;
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(
    error: HttpErrorResponse,
    endpoint: ApiEndpoint,
    endpointKey: string
  ): Observable<ApiResponse> {
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
        data: endpoint.fallback(),
        error: apiError,
        metadata: {
          service: endpoint.service,
          endpoint: endpointKey,
          responseTime: 0,
          cached: false,
          timestamp: new Date(),
        },
      });
    }

    return throwError(() => ({
      success: false,
      error: apiError,
    }));
  }

  /**
   * Get error code based on HTTP status
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
   * Check if error is retryable
   */
  private isRetryable(status: number): boolean {
    return status === 0 || status === 408 || status === 429 || status >= 500;
  }

  /**
   * Get cache key
   */
  private getCacheKey(endpointKey: string, endpoint: ApiEndpoint, params?: any): string {
    if (endpoint.cache?.key) {
      return `${endpointKey}_${endpoint.cache.key(params)}`;
    }
    return `${endpointKey}_${JSON.stringify(params || {})}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string, duration: number): any | null {
    const cached = this.cacheData.get(key);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > duration) {
      this.cacheData.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, data: any): void {
    this.cacheData.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
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
   * Register custom endpoint
   */
  public registerEndpoint(key: string, endpoint: ApiEndpoint): void {
    API_ENDPOINTS.set(key, endpoint);
  }

  /**
   * Get registered endpoint
   */
  public getEndpoint(key: string): ApiEndpoint | undefined {
    return API_ENDPOINTS.get(key);
  }

  /**
   * List all registered endpoints
   */
  public listEndpoints(): string[] {
    return Array.from(API_ENDPOINTS.keys());
  }

  /**
   * Check if mock should be used for a service
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
   * Map ExternalService to MockAdapter service key
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
   * Get mock response for an endpoint
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
   * Execute mock request based on endpoint
   */
  private async executeMockRequest<T>(
    endpointKey: string,
    endpoint: ApiEndpoint,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Promise<T> {
    const params = options?.params as any;
    const body = options?.body;

    switch (endpointKey) {
      // Appointments endpoints
      case 'appointments.list':
        return this.mockAdapter.mockGetAllAppointments() as Promise<T>;

      case 'appointments.detail':
        const appointments = await this.mockAdapter.mockGetAllAppointments();
        const aptId = pathParams?.['id'];
        const appointment = appointments.find((a: any) => a.id === aptId);
        if (!appointment) {
          throw new Error('Appointment not found');
        }
        return appointment as T;

      case 'appointments.create':
        return this.mockAdapter.mockBookAppointment(body) as Promise<T>;

      case 'appointments.update':
        return this.mockAdapter.mockUpdateAppointment(pathParams?.['id'] || '', body) as Promise<T>;

      case 'appointments.cancel':
        await this.mockAdapter.mockCancelAppointment(pathParams?.['id'] || '');
        return { success: true } as T;

      // Glucoserver endpoints
      case 'glucoserver.readings.list':
        return this.mockAdapter.mockGetAllReadings(
          params?.offset || 0,
          params?.limit || 100
        ) as Promise<T>;

      case 'glucoserver.readings.create':
        return this.mockAdapter.mockAddReading(body) as Promise<T>;

      case 'glucoserver.readings.update':
        return this.mockAdapter.mockUpdateReading(pathParams?.['id'] || '', body) as Promise<T>;

      case 'glucoserver.readings.delete':
        await this.mockAdapter.mockDeleteReading(pathParams?.['id'] || '');
        return { success: true } as T;

      case 'glucoserver.statistics':
        return this.mockAdapter.mockGetStatistics(params?.days || 30) as Promise<T>;

      // Auth endpoints
      case 'auth.login':
        return this.mockAdapter.mockLogin(body.email || body.dni, body.password) as Promise<T>;

      case 'auth.register':
        return this.mockAdapter.mockRegister(body) as Promise<T>;

      case 'auth.logout':
        await this.mockAdapter.mockLogout();
        return { success: true } as T;

      case 'auth.user.me':
      case 'auth.profile.update':
      case 'auth.preferences.update':
        if (endpoint.method === 'GET') {
          return this.mockAdapter.mockGetProfile() as Promise<T>;
        } else {
          return this.mockAdapter.mockUpdateProfile(body) as Promise<T>;
        }

      case 'auth.refresh':
        const newToken = await this.mockAdapter.mockRefreshToken(body.token || '');
        return { token: newToken } as T;

      default:
        console.warn(`🟡 No mock implementation for endpoint: ${endpointKey}`);
        throw new Error(`Mock not implemented for endpoint: ${endpointKey}`);
    }
  }
}

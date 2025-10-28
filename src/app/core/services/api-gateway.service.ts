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
import { switchMap, catchError, map, timeout, retry, tap, shareReplay } from 'rxjs/operators';

import { ExternalServicesManager, ExternalService } from './external-services-manager.service';
import { UnifiedAuthService } from './unified-auth.service';
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
        key: params => `glucose_${params.userId}_${params.startDate}_${params.endDate}`,
      },
      transform: {
        response: data => data.data || [],
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
        key: params => `readings_${params.limit}_${params.offset}`,
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
        request: data => ({
          ...data,
          timestamp: new Date(data.timestamp).toISOString(),
        }),
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
    'appointments.shareData',
    {
      service: ExternalService.APPOINTMENTS,
      path: '/api/appointments/{id}/share-glucose',
      method: 'POST',
      authenticated: true,
      timeout: 60000,
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
        key: params => `slots_${params.doctorId}_${params.date}`,
      },
    },
  ],

  // Auth endpoints
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
    private externalServices: ExternalServicesManager,
    private unifiedAuth: UnifiedAuthService
  ) {}

  /**
   * Make an API request through the gateway
   */
  public request<T = any>(
    endpointKey: string,
    options?: ApiRequestOptions,
    pathParams?: { [key: string]: string }
  ): Observable<ApiResponse<T>> {
    const endpoint = API_ENDPOINTS.get(endpointKey);

    if (!endpoint) {
      return throwError({
        success: false,
        error: {
          code: 'UNKNOWN_ENDPOINT',
          message: `Unknown endpoint: ${endpointKey}`,
          retryable: false,
        },
      });
    }

    // Check service availability
    if (!this.externalServices.isServiceAvailable(endpoint.service)) {
      if (endpoint.fallback) {
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

      return throwError({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Service ${endpoint.service} is not available`,
          service: endpoint.service,
          endpoint: endpointKey,
          retryable: true,
        },
      });
    }

    // Check cache
    if (endpoint.cache && !options?.forceRefresh) {
      const cacheKey = this.getCacheKey(endpointKey, endpoint, options?.params);
      const cached = this.getFromCache(cacheKey, endpoint.cache.duration);

      if (cached) {
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
      }
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

        switch (endpoint.method) {
          case 'GET':
            request$ = this.http.get(url, {
              headers,
              params: options?.params,
              responseType: (options?.responseType as any) || 'json',
            });
            break;
          case 'POST':
            request$ = this.http.post(url, body, {
              headers,
              params: options?.params,
              responseType: (options?.responseType as any) || 'json',
            });
            break;
          case 'PUT':
            request$ = this.http.put(url, body, {
              headers,
              params: options?.params,
              responseType: (options?.responseType as any) || 'json',
            });
            break;
          case 'DELETE':
            request$ = this.http.delete(url, {
              headers,
              params: options?.params,
              responseType: (options?.responseType as any) || 'json',
            });
            break;
          case 'PATCH':
            request$ = this.http.patch(url, body, {
              headers,
              params: options?.params,
              responseType: (options?.responseType as any) || 'json',
            });
            break;
          default:
            return throwError('Unsupported method');
        }

        return request$.pipe(
          timeout(endpoint.timeout || 30000),
          retry(endpoint.retryAttempts || 0),
          map(response => {
            // Transform response if needed
            const data = endpoint.transform?.response
              ? endpoint.transform.response(response)
              : response;

            // Cache if applicable
            if (endpoint.cache) {
              const cacheKey = this.getCacheKey(endpointKey, endpoint, options?.params);
              this.addToCache(cacheKey, data);
            }

            return {
              success: true,
              data: data as T,
              metadata: {
                service: endpoint.service,
                endpoint: endpointKey,
                responseTime: Date.now() - startTime,
                cached: false,
                timestamp: new Date(),
              },
            };
          }),
          catchError(error => this.handleError(error, endpoint, endpointKey))
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
    let headers = new HttpHeaders(options?.headers || {});

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
   */
  private getBaseUrl(service: ExternalService): string {
    switch (service) {
      case ExternalService.TIDEPOOL:
        return environment.tidepool.baseUrl;
      case ExternalService.GLUCOSERVER:
        return `${environment.backendServices.glucoserver.baseUrl}${environment.backendServices.glucoserver.apiPath}`;
      case ExternalService.APPOINTMENTS:
        return `${environment.backendServices.appointments.baseUrl}${environment.backendServices.appointments.apiPath}`;
      case ExternalService.LOCAL_AUTH:
        return environment.backendServices.auth.baseUrl;
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  /**
   * Get authentication token for a service
   */
  private async getAuthToken(service: ExternalService): Promise<string | null> {
    switch (service) {
      case ExternalService.TIDEPOOL:
        return await this.unifiedAuth.getProviderToken('tidepool');
      case ExternalService.GLUCOSERVER:
      case ExternalService.APPOINTMENTS:
      case ExternalService.LOCAL_AUTH:
        return await this.unifiedAuth.getProviderToken('local');
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

    return throwError({
      success: false,
      error: apiError,
    });
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
}

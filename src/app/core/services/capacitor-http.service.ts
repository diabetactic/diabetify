import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Observable, from, throwError, race, timer } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { LoggerService } from './logger.service';

// Default timeout for native HTTP requests (15 seconds)
const DEFAULT_TIMEOUT_MS = 15000;

type ParamsType = HttpParams | Record<string, string | string[]> | undefined;

@Injectable({
  providedIn: 'root',
})
export class CapacitorHttpService {
  private logger = inject(LoggerService);

  constructor(
    private http: HttpClient,
    private platform: Platform
  ) {}

  /**
   * Detecta si debe usar HTTP nativo (mobile) o Angular HTTP (web)
   */
  private shouldUseNativeHttp(): boolean {
    return this.platform.is('capacitor') && !this.platform.is('mobileweb');
  }

  /**
   * GET request híbrido
   */
  get<T>(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string>;
      params?: ParamsType;
    }
  ): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativeGet<T>(url, options);
    }
    return this.http.get<T>(url, options);
  }

  /**
   * POST request híbrido
   */
  post<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string>; params?: ParamsType }
  ): Observable<T> {
    const useNative = this.shouldUseNativeHttp();
    console.log('🔵 [HTTP-DEBUG] post() called', { url, useNative });
    if (useNative) {
      console.log('🔵 [HTTP-DEBUG] Using NATIVE HTTP (CapacitorHttp)');
      return this.nativePost<T>(url, data, options);
    }
    console.log('🔵 [HTTP-DEBUG] Using Angular HttpClient');
    return this.http.post<T>(url, data, options);
  }

  /**
   * PUT request híbrido
   */
  put<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string> }
  ): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativePut<T>(url, data, options);
    }
    return this.http.put<T>(url, data, options);
  }

  /**
   * DELETE request híbrido
   */
  delete<T>(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string>;
      params?: ParamsType;
    }
  ): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativeDelete<T>(url, options);
    }
    return this.http.delete<T>(url, options);
  }

  /**
   * PATCH request híbrido
   */
  patch<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string> }
  ): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativePatch<T>(url, data, options);
    }
    return this.http.patch<T>(url, data, options);
  }

  /**
   * Raw request that returns full response including headers
   * Useful for Tidepool auth where we need the x-tidepool-session-token header
   */
  async request<T>(config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    data?: unknown;
  }): Promise<{ data: T; headers: Record<string, string>; status: number }> {
    this.logger.debug('HTTP', `${config.method} ${config.url}`);

    const response = await CapacitorHttp.request({
      method: config.method,
      url: config.url,
      headers: config.headers || {},
      data: config.data,
    });

    this.logger.debug('HTTP', 'Full Response', {
      status: response.status,
      headers: response.headers,
      data: response.data,
    });

    if (response.status >= 200 && response.status < 300) {
      return {
        data: response.data as T,
        headers: response.headers || {},
        status: response.status,
      };
    }

    throw {
      status: response.status,
      error: response.data,
      headers: response.headers,
      message: `HTTP ${response.status}`,
    };
  }

  /**
   * Native GET usando CapacitorHttp
   */
  private nativeGet<T>(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string>;
      params?: ParamsType;
    }
  ): Observable<T> {
    const startTime = Date.now();

    // Build URL with query params if provided
    let fullUrl = url;
    const queryString = this.buildQueryString(options?.params);
    if (queryString) {
      fullUrl = `${url}?${queryString}`;
    }

    this.logger.debug('HTTP', 'GET starting', { url: fullUrl });

    const headers = this.convertHeaders(options?.headers);

    const request$ = from(
      CapacitorHttp.get({
        url: fullUrl,
        headers,
      })
    ).pipe(
      map((response: HttpResponse) => {
        const elapsed = Date.now() - startTime;
        this.logger.debug('HTTP', `Response in ${elapsed}ms`, {
          status: response.status,
          data: response.data,
        });

        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }

        throw {
          status: response.status,
          error: response.data,
          message: `HTTP ${response.status}`,
        };
      }),
      catchError(error => {
        const elapsed = Date.now() - startTime;
        this.logger.error('HTTP', `Error after ${elapsed}ms`, error);
        return throwError(() => error);
      })
    );

    // Wrap with timeout to prevent hanging requests
    return this.withTimeout(request$, DEFAULT_TIMEOUT_MS, fullUrl);
  }

  /**
   * Native POST usando CapacitorHttp
   */
  private nativePost<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string>; params?: ParamsType }
  ): Observable<T> {
    const startTime = Date.now();

    // Build URL with query params if provided
    let fullUrl = url;
    this.logger.debug('HTTP', 'POST params received', { params: options?.params });
    const queryString = this.buildQueryString(options?.params);
    this.logger.debug('HTTP', 'POST queryString built', { queryString });
    if (queryString) {
      fullUrl = `${url}?${queryString}`;
    }

    this.logger.debug('HTTP', 'POST starting', { url: fullUrl });
    this.logger.debug('HTTP', 'POST data', { data: JSON.stringify(data).substring(0, 200) });

    const headers = this.convertHeaders(options?.headers);

    // Si es form data (como login), convertir a x-www-form-urlencoded
    let bodyData: unknown;
    const finalHeaders = { ...headers };

    if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      // data ya viene como URLSearchParams string
      bodyData = data;
    } else {
      // JSON data
      bodyData = data;
      finalHeaders['Content-Type'] = 'application/json';
    }

    this.logger.debug('HTTP', 'POST headers', { headers: finalHeaders });
    console.log('🔵 [HTTP-DEBUG] nativePost: Creating CapacitorHttp.post Promise');

    const httpPromise = CapacitorHttp.post({
      url: fullUrl,
      headers: finalHeaders,
      data: bodyData,
    });
    console.log(
      '🔵 [HTTP-DEBUG] nativePost: CapacitorHttp.post Promise created, wrapping in from()'
    );

    const request$ = from(httpPromise).pipe(
      map((response: HttpResponse) => {
        const elapsed = Date.now() - startTime;
        console.log('🔵 [HTTP-DEBUG] nativePost: Response received in map()', {
          elapsed,
          status: response.status,
        });
        this.logger.debug('HTTP', `Response in ${elapsed}ms`, {
          status: response.status,
          data: response.data,
        });

        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }

        throw {
          status: response.status,
          error: response.data,
          message: `HTTP ${response.status}`,
        };
      }),
      catchError(error => {
        const elapsed = Date.now() - startTime;
        console.log('🔵 [HTTP-DEBUG] nativePost: Error in catchError()', { elapsed, error });
        this.logger.error('HTTP', `Error after ${elapsed}ms`, error);
        this.logger.error('HTTP', 'Error details', error);
        return throwError(() => error);
      })
    );

    console.log('🔵 [HTTP-DEBUG] nativePost: Returning Observable with timeout wrapper');
    // Wrap with timeout to prevent hanging requests
    return this.withTimeout(request$, DEFAULT_TIMEOUT_MS, fullUrl);
  }

  /**
   * Native PUT usando CapacitorHttp
   */
  private nativePut<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string> }
  ): Observable<T> {
    this.logger.debug('HTTP', 'PUT', { url, data });

    const headers = this.convertHeaders(options?.headers);
    const finalHeaders = {
      ...headers,
      'Content-Type': headers['Content-Type'] || 'application/json',
    };

    return from(
      CapacitorHttp.put({
        url,
        headers: finalHeaders,
        data: data,
      })
    ).pipe(
      map((response: HttpResponse) => {
        this.logger.debug('HTTP', 'Response', { status: response.status, data: response.data });
        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }
        throw { status: response.status, error: response.data, message: `HTTP ${response.status}` };
      }),
      catchError(error => {
        this.logger.error('HTTP', 'Error', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Native DELETE usando CapacitorHttp
   */
  private nativeDelete<T>(
    url: string,
    options?: {
      headers?: HttpHeaders | Record<string, string>;
      params?: ParamsType;
    }
  ): Observable<T> {
    // Build URL with query params if provided
    let fullUrl = url;
    const queryString = this.buildQueryString(options?.params);
    if (queryString) {
      fullUrl = `${url}?${queryString}`;
    }

    this.logger.debug('HTTP', 'DELETE', { url: fullUrl });

    const headers = this.convertHeaders(options?.headers);

    return from(
      CapacitorHttp.delete({
        url: fullUrl,
        headers,
      })
    ).pipe(
      map((response: HttpResponse) => {
        this.logger.debug('HTTP', 'Response', { status: response.status, data: response.data });
        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }
        throw { status: response.status, error: response.data, message: `HTTP ${response.status}` };
      }),
      catchError(error => {
        this.logger.error('HTTP', 'Error', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Native PATCH usando CapacitorHttp
   */
  private nativePatch<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string> }
  ): Observable<T> {
    this.logger.debug('HTTP', 'PATCH', { url, data });

    const headers = this.convertHeaders(options?.headers);
    const finalHeaders = {
      ...headers,
      'Content-Type': headers['Content-Type'] || 'application/json',
    };

    return from(
      CapacitorHttp.patch({
        url,
        headers: finalHeaders,
        data: data,
      })
    ).pipe(
      map((response: HttpResponse) => {
        this.logger.debug('HTTP', 'Response', { status: response.status, data: response.data });
        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }
        throw { status: response.status, error: response.data, message: `HTTP ${response.status}` };
      }),
      catchError(error => {
        this.logger.error('HTTP', 'Error', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Builds query string from params (HttpParams or Record)
   */
  private buildQueryString(params: ParamsType): string {
    if (!params) return '';

    if (params instanceof HttpParams) {
      return params.toString();
    }

    // Handle Record<string, string | string[]>
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    }
    return searchParams.toString();
  }

  /**
   * Convierte Angular HttpHeaders a objeto simple
   */
  private convertHeaders(headers?: HttpHeaders | Record<string, string>): {
    [key: string]: string;
  } {
    if (!headers) return {};

    if (headers instanceof HttpHeaders) {
      const result: { [key: string]: string } = {};
      headers.keys().forEach(key => {
        const value = headers.get(key);
        if (value) {
          result[key] = value;
        }
      });
      return result;
    }

    return headers;
  }

  /**
   * Wraps an observable with a timeout
   * If the request doesn't complete within the timeout, throws a timeout error
   */
  private withTimeout<T>(
    source$: Observable<T>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    url: string
  ): Observable<T> {
    const timeout$ = timer(timeoutMs).pipe(
      mergeMap(() =>
        throwError(() => ({
          status: 0,
          error: { message: 'Request timeout', code: 'TIMEOUT' },
          message: `Request to ${url} timed out after ${timeoutMs}ms`,
          isTimeout: true,
        }))
      )
    );

    return race(source$, timeout$);
  }
}

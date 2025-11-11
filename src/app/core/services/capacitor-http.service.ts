/**
 * Capacitor HTTP Service
 *
 * Wrapper around CapacitorHttp to provide native HTTP requests that bypass CORS.
 * Falls back to Angular HttpClient for web platform.
 *
 * @see https://capacitorjs.com/docs/apis/http
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp, HttpOptions, HttpResponse } from '@capacitor/core';
import { Observable, from, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * HTTP request options compatible with both CapacitorHttp and HttpClient
 */
export interface CapacitorHttpRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: HttpParams | { [param: string]: string | string[] };
  headers?: HttpHeaders | { [header: string]: string | string[] };
  data?: any;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

@Injectable({
  providedIn: 'root',
})
export class CapacitorHttpService {
  private readonly isNative = Capacitor.isNativePlatform();

  constructor(private http: HttpClient) {}

  /**
   * Perform GET request
   */
  get<T = any>(
    url: string,
    options?: Omit<CapacitorHttpRequestOptions, 'url' | 'method'>
  ): Observable<T> {
    return this.request<T>({ ...options, url, method: 'GET' });
  }

  /**
   * Perform POST request
   */
  post<T = any>(
    url: string,
    data?: any,
    options?: Omit<CapacitorHttpRequestOptions, 'url' | 'method' | 'data'>
  ): Observable<T> {
    return this.request<T>({ ...options, url, method: 'POST', data });
  }

  /**
   * Perform PUT request
   */
  put<T = any>(
    url: string,
    data?: any,
    options?: Omit<CapacitorHttpRequestOptions, 'url' | 'method' | 'data'>
  ): Observable<T> {
    return this.request<T>({ ...options, url, method: 'PUT', data });
  }

  /**
   * Perform DELETE request
   */
  delete<T = any>(
    url: string,
    options?: Omit<CapacitorHttpRequestOptions, 'url' | 'method'>
  ): Observable<T> {
    return this.request<T>({ ...options, url, method: 'DELETE' });
  }

  /**
   * Perform PATCH request
   */
  patch<T = any>(
    url: string,
    data?: any,
    options?: Omit<CapacitorHttpRequestOptions, 'url' | 'method' | 'data'>
  ): Observable<T> {
    return this.request<T>({ ...options, url, method: 'PATCH', data });
  }

  /**
   * Perform HTTP request
   *
   * Uses native CapacitorHttp on native platforms (bypasses CORS)
   * Falls back to Angular HttpClient on web platform
   */
  request<T = any>(options: CapacitorHttpRequestOptions): Observable<T> {
    if (this.isNative) {
      // Use native HTTP (no CORS restrictions)
      return from(this.nativeRequest<T>(options));
    } else {
      // Use Angular HttpClient for web
      return this.webRequest<T>(options);
    }
  }

  /**
   * Native HTTP request using CapacitorHttp
   */
  private async nativeRequest<T>(options: CapacitorHttpRequestOptions): Promise<T> {
    // Convert Angular HttpHeaders/HttpParams to plain objects
    const headers = this.convertHeaders(options.headers);
    const params = this.convertParams(options.params);

    // Build URL with query parameters
    let url = options.url;
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
          }
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');
      url = `${url}?${queryString}`;
    }

    // Prepare CapacitorHttp options
    const httpOptions: HttpOptions = {
      url,
      method: options.method || 'GET',
      headers,
    };

    // Add request body for POST/PUT/PATCH
    if (
      options.data &&
      (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')
    ) {
      // Check if data is already a string (e.g., URL-encoded form data)
      if (typeof options.data === 'string') {
        httpOptions.data = options.data;
      } else {
        // Otherwise, send as JSON
        httpOptions.data = options.data;
      }
    }

    try {
      const response: HttpResponse = await CapacitorHttp.request(httpOptions);

      // Handle response based on type
      if (options.responseType === 'text') {
        return response.data as T;
      } else if (options.responseType === 'blob' || options.responseType === 'arraybuffer') {
        // For blob/arraybuffer, return the data as-is
        return response.data as T;
      } else {
        // Default: JSON response
        // CapacitorHttp automatically parses JSON
        return response.data as T;
      }
    } catch (error: any) {
      // Convert CapacitorHttp error to match HttpClient error format
      throw {
        status: error.status || 0,
        statusText: error.message || 'Unknown Error',
        message: error.message || 'HTTP request failed',
        error: error,
      };
    }
  }

  /**
   * Web HTTP request using Angular HttpClient
   */
  private webRequest<T>(options: CapacitorHttpRequestOptions): Observable<T> {
    const method = options.method || 'GET';
    const httpOptions = {
      headers: options.headers,
      params: options.params,
      responseType: (options.responseType || 'json') as 'json',
      observe: 'body' as const,
    };

    switch (method) {
      case 'GET':
        return this.http.get<T>(options.url, httpOptions) as Observable<T>;
      case 'POST':
        return this.http.post<T>(options.url, options.data, httpOptions) as Observable<T>;
      case 'PUT':
        return this.http.put<T>(options.url, options.data, httpOptions) as Observable<T>;
      case 'DELETE':
        return this.http.delete<T>(options.url, httpOptions) as Observable<T>;
      case 'PATCH':
        return this.http.patch<T>(options.url, options.data, httpOptions) as Observable<T>;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Convert Angular HttpHeaders to plain object
   */
  private convertHeaders(headers?: HttpHeaders | { [header: string]: string | string[] }): {
    [key: string]: string;
  } {
    if (!headers) {
      return {};
    }

    if (headers instanceof HttpHeaders) {
      const result: { [key: string]: string } = {};
      headers.keys().forEach(key => {
        const values = headers.getAll(key);
        if (values && values.length > 0) {
          result[key] = values.join(', ');
        }
      });
      return result;
    }

    // Convert string[] to comma-separated string
    const result: { [key: string]: string } = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = value.join(', ');
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * Convert Angular HttpParams to plain object
   */
  private convertParams(params?: HttpParams | { [param: string]: string | string[] }): {
    [key: string]: string | string[];
  } {
    if (!params) {
      return {};
    }

    if (params instanceof HttpParams) {
      const result: { [key: string]: string | string[] } = {};
      params.keys().forEach(key => {
        const values = params.getAll(key);
        if (values) {
          result[key] = values.length === 1 ? values[0] : values;
        }
      });
      return result;
    }

    return params;
  }

  /**
   * Check if running on native platform
   */
  isNativePlatform(): boolean {
    return this.isNative;
  }
}

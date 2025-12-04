import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type ParamsType = HttpParams | Record<string, string | string[]> | undefined;

@Injectable({
  providedIn: 'root',
})
export class CapacitorHttpService {
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
    options?: { headers?: HttpHeaders | Record<string, string> }
  ): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativePost<T>(url, data, options);
    }
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
    console.log(`🔵 [Native HTTP] ${config.method}`, config.url);

    const response = await CapacitorHttp.request({
      method: config.method,
      url: config.url,
      headers: config.headers || {},
      data: config.data,
    });

    console.log('✅ [Native HTTP] Full Response:', {
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
    // Build URL with query params if provided
    let fullUrl = url;
    const queryString = this.buildQueryString(options?.params);
    if (queryString) {
      fullUrl = `${url}?${queryString}`;
    }

    console.log('🔵 [Native HTTP] GET', fullUrl);

    const headers = this.convertHeaders(options?.headers);

    return from(
      CapacitorHttp.get({
        url: fullUrl,
        headers,
      })
    ).pipe(
      map((response: HttpResponse) => {
        console.log('✅ [Native HTTP] Response', response.status, response.data);

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
        console.error('❌ [Native HTTP] Error', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Native POST usando CapacitorHttp
   */
  private nativePost<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string> }
  ): Observable<T> {
    console.log('🔵 [Native HTTP] POST', url, data);

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

    return from(
      CapacitorHttp.post({
        url,
        headers: finalHeaders,
        data: bodyData,
      })
    ).pipe(
      map((response: HttpResponse) => {
        console.log('✅ [Native HTTP] Response', response.status, response.data);

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
        console.error('❌ [Native HTTP] Error', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Native PUT usando CapacitorHttp
   */
  private nativePut<T>(
    url: string,
    data: unknown,
    options?: { headers?: HttpHeaders | Record<string, string> }
  ): Observable<T> {
    console.log('🔵 [Native HTTP] PUT', url, data);

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
        console.log('✅ [Native HTTP] Response', response.status, response.data);
        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }
        throw { status: response.status, error: response.data, message: `HTTP ${response.status}` };
      }),
      catchError(error => {
        console.error('❌ [Native HTTP] Error', error);
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

    console.log('🔵 [Native HTTP] DELETE', fullUrl);

    const headers = this.convertHeaders(options?.headers);

    return from(
      CapacitorHttp.delete({
        url: fullUrl,
        headers,
      })
    ).pipe(
      map((response: HttpResponse) => {
        console.log('✅ [Native HTTP] Response', response.status, response.data);
        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }
        throw { status: response.status, error: response.data, message: `HTTP ${response.status}` };
      }),
      catchError(error => {
        console.error('❌ [Native HTTP] Error', error);
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
    console.log('🔵 [Native HTTP] PATCH', url, data);

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
        console.log('✅ [Native HTTP] Response', response.status, response.data);
        if (response.status >= 200 && response.status < 300) {
          return response.data as T;
        }
        throw { status: response.status, error: response.data, message: `HTTP ${response.status}` };
      }),
      catchError(error => {
        console.error('❌ [Native HTTP] Error', error);
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
}

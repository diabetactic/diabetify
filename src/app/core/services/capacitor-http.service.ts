import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  get<T>(url: string, options?: { headers?: any }): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativeGet<T>(url, options);
    }
    return this.http.get<T>(url, options);
  }

  /**
   * POST request híbrido
   */
  post<T>(url: string, data: any, options?: { headers?: any }): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativePost<T>(url, data, options);
    }
    return this.http.post<T>(url, data, options);
  }

  /**
   * PUT request híbrido
   */
  put<T>(url: string, data: any, options?: { headers?: any }): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativePut<T>(url, data, options);
    }
    return this.http.put<T>(url, data, options);
  }

  /**
   * DELETE request híbrido
   */
  delete<T>(url: string, options?: { headers?: any }): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativeDelete<T>(url, options);
    }
    return this.http.delete<T>(url, options);
  }

  /**
   * PATCH request híbrido
   */
  patch<T>(url: string, data: any, options?: { headers?: any }): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativePatch<T>(url, data, options);
    }
    return this.http.patch<T>(url, data, options);
  }

  /**
   * Native GET usando CapacitorHttp
   */
  private nativeGet<T>(url: string, options?: { headers?: any }): Observable<T> {
    console.log('🔵 [Native HTTP] GET', url);

    const headers = this.convertHeaders(options?.headers);

    return from(
      CapacitorHttp.get({
        url,
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
  private nativePost<T>(url: string, data: any, options?: { headers?: any }): Observable<T> {
    console.log('🔵 [Native HTTP] POST', url, data);

    const headers = this.convertHeaders(options?.headers);

    // Si es form data (como login), convertir a x-www-form-urlencoded
    let bodyData: any;
    let finalHeaders = { ...headers };

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
  private nativePut<T>(url: string, data: any, options?: { headers?: any }): Observable<T> {
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
  private nativeDelete<T>(url: string, options?: { headers?: any }): Observable<T> {
    console.log('🔵 [Native HTTP] DELETE', url);

    const headers = this.convertHeaders(options?.headers);

    return from(
      CapacitorHttp.delete({
        url,
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
  private nativePatch<T>(url: string, data: any, options?: { headers?: any }): Observable<T> {
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
   * Convierte Angular HttpHeaders a objeto simple
   */
  private convertHeaders(headers?: HttpHeaders | any): { [key: string]: string } {
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

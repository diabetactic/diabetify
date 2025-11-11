/**
 * Request ID Interceptor
 *
 * Adds a unique request ID (UUID) to every outgoing HTTP request
 * via the X-Request-Id header. This enables:
 * - Request tracing across logs
 * - Correlating client requests with server logs
 * - Debugging distributed system issues
 *
 * UUID v4 is generated for each request to ensure uniqueness
 */

import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements HttpInterceptor {
  /**
   * Intercept HTTP requests and add X-Request-Id header
   * with a unique UUID for request tracing
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Generate unique request ID (UUID v4)
    const requestId = this.generateUUID();

    // Clone request and add X-Request-Id header
    const requestWithId = request.clone({
      setHeaders: {
        'X-Request-Id': requestId,
      },
    });

    return next.handle(requestWithId);
  }

  /**
   * Generate a UUID v4 (random)
   * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * where x is 0-f and y is 8-b
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

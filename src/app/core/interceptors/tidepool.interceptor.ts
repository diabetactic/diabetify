/**
 * TidepoolInterceptor - HTTP interceptor for Tidepool API requests
 * Handles OAuth2 authorization headers, automatic token refresh, retry logic, and error handling
 *
 * Features:
 * - Automatic OAuth2 Bearer token attachment
 * - Token refresh on 401 errors
 * - Request queuing during token refresh
 * - Exponential backoff retry logic
 * - Comprehensive error handling
 */

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Observable, throwError, timer, Subject, from } from 'rxjs';
import { catchError, retry, tap, switchMap, finalize, filter, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TidepoolAuthService } from '../services/tidepool-auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';

/**
 * Retry configuration with exponential backoff
 */
interface RetryConfig {
  maxRetries: number;
  delay: number;
  excludedStatusCodes: number[];
}

@Injectable()
export class TidepoolInterceptor implements HttpInterceptor {
  private retryConfig: RetryConfig = {
    maxRetries: environment.tidepool.maxRetries,
    delay: environment.tidepool.retryDelay,
    excludedStatusCodes: [400, 403, 404, 422], // Don't retry client errors (401 handled separately)
  };

  // Token refresh state management
  private isRefreshing = false;
  private refreshTokenSubject: Subject<string | null> = new Subject<string | null>();

  constructor(
    private authService: TidepoolAuthService,
    private errorHandler: ErrorHandlerService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const startTime = Date.now();

    // Only intercept Tidepool API requests
    if (!this.isTidepoolRequest(request)) {
      return next.handle(request);
    }

    // Log request if enabled
    if (environment.logging.enableApiLogging) {
      this.logRequest(request);
    }

    // Add authorization header and handle request
    return this.addAuthHeader(request).pipe(
      switchMap(authRequest => {
        return next.handle(authRequest).pipe(
          // Retry with exponential backoff for retryable errors
          retry({
            count: this.retryConfig.maxRetries,
            delay: (error, retryCount) => this.calculateRetryDelay(error, retryCount),
          }),

          // Log response
          tap(event => {
            if (event instanceof HttpResponse && environment.logging.enableApiLogging) {
              this.logResponse(event, startTime);
            }
          }),

          // Handle errors
          catchError((error: HttpErrorResponse) => {
            // Log error
            if (environment.logging.enableApiLogging) {
              this.logError(error, startTime);
            }

            // Handle 401 Unauthorized - try to refresh token
            if (error.status === 401) {
              return this.handle401Error(request, next);
            }

            // Use error handler service for standardized error handling
            return this.errorHandler.handleError(error);
          }),

          // Finalize logging
          finalize(() => {
            if (environment.logging.enableApiLogging) {
              const duration = Date.now() - startTime;
              console.log(`[HTTP] ${request.method} ${request.url} - Completed in ${duration}ms`);
            }
          })
        );
      })
    );
  }

  /**
   * Check if request is for Tidepool API
   */
  private isTidepoolRequest(request: HttpRequest<unknown>): boolean {
    return (
      request.url.includes('tidepool.org') || request.url.startsWith(environment.tidepool.baseUrl)
    );
  }

  /**
   * Add OAuth2 authorization header to request
   */
  private addAuthHeader(request: HttpRequest<unknown>): Observable<HttpRequest<unknown>> {
    return from(this.authService.getAccessToken()).pipe(
      switchMap(token => {
        if (token) {
          // Clone request and add OAuth2 Bearer token
          const authRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });
          return new Observable<HttpRequest<unknown>>(observer => {
            observer.next(authRequest);
            observer.complete();
          });
        } else {
          // No auth token, send request as-is
          return new Observable<HttpRequest<unknown>>(observer => {
            observer.next(request);
            observer.complete();
          });
        }
      }),
      catchError(error => {
        console.error('Failed to get access token:', error);
        // Send request without auth header
        return new Observable<HttpRequest<unknown>>(observer => {
          observer.next(request);
          observer.complete();
        });
      })
    );
  }

  /**
   * Handle 401 Unauthorized error - attempt automatic token refresh
   *
   * Implements request queuing pattern:
   * - If a refresh is already in progress, queue the request
   * - Otherwise, start a new refresh and queue all subsequent requests
   * - Retry all queued requests once refresh completes
   *
   * @param request - Original HTTP request
   * @param next - HTTP handler
   * @returns Observable of HTTP event
   */
  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Check if token refresh is already in progress
    if (this.isRefreshing) {
      // Queue this request and wait for refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => {
          // Retry request with new token
          return this.addAuthHeader(request).pipe(
            switchMap(authRequest => next.handle(authRequest))
          );
        })
      );
    }

    // Start token refresh
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return from(this.authService.refreshAccessToken()).pipe(
      switchMap(newToken => {
        // Refresh successful
        this.isRefreshing = false;
        this.refreshTokenSubject.next(newToken);

        // Retry original request with new token
        return this.addAuthHeader(request).pipe(switchMap(authRequest => next.handle(authRequest)));
      }),
      catchError(refreshError => {
        // Refresh failed
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);

        console.error('Token refresh failed:', refreshError);

        // Return standardized error
        return throwError(() => ({
          message: 'Session expired. Please log in again.',
          code: 'SESSION_EXPIRED',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        }));
      })
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(error: any, retryCount: number): Observable<number> {
    // Don't retry certain status codes
    if (
      error instanceof HttpErrorResponse &&
      this.retryConfig.excludedStatusCodes.includes(error.status)
    ) {
      throw error; // Stop retrying
    }

    // Calculate exponential backoff: delay * 2^(retryCount - 1)
    const delay = this.retryConfig.delay * Math.pow(2, retryCount - 1);

    // Add jitter (random 0-1000ms) to prevent thundering herd
    const jitter = Math.random() * 1000;
    const totalDelay = delay + jitter;

    if (environment.logging.enableApiLogging) {
      console.log(
        `[HTTP Retry] Attempt ${retryCount}/${this.retryConfig.maxRetries} - Waiting ${Math.round(totalDelay)}ms`
      );
    }

    return timer(totalDelay);
  }

  /**
   * Log HTTP request
   */
  private logRequest(request: HttpRequest<unknown>): void {
    console.group(`[HTTP Request] ${request.method} ${request.url}`);
    console.log(
      'Headers:',
      request.headers.keys().reduce((acc, key) => {
        // Don't log sensitive headers
        if (key.toLowerCase() === 'authorization') {
          acc[key] = '***';
        } else {
          acc[key] = request.headers.get(key);
        }
        return acc;
      }, {} as any)
    );

    if (request.body) {
      console.log('Body:', request.body);
    }

    console.groupEnd();
  }

  /**
   * Log HTTP response
   */
  private logResponse(response: HttpResponse<any>, startTime: number): void {
    const duration = Date.now() - startTime;

    console.group(`[HTTP Response] ${response.status} ${response.url} (${duration}ms)`);
    console.log(
      'Headers:',
      response.headers.keys().reduce((acc, key) => {
        acc[key] = response.headers.get(key);
        return acc;
      }, {} as any)
    );

    if (response.body) {
      console.log('Body:', response.body);
    }

    console.groupEnd();
  }

  /**
   * Log HTTP error
   */
  private logError(error: HttpErrorResponse, startTime: number): void {
    const duration = Date.now() - startTime;

    console.group(`[HTTP Error] ${error.status} ${error.url} (${duration}ms)`);
    console.error('Status:', error.status, error.statusText);
    console.error('Message:', error.message);

    if (error.error) {
      console.error('Error Details:', error.error);
    }

    console.groupEnd();
  }
}

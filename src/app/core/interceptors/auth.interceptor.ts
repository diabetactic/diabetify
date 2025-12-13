/**
 * Authentication Interceptor
 *
 * Centralized HTTP interceptor that handles:
 * 1. Automatic JWT token injection for authenticated requests
 * 2. 401 Unauthorized error handling with automatic token refresh
 * 3. Request queue management during token refresh (prevents stampede)
 * 4. Automatic logout on refresh failure
 *
 * This ensures robust authentication flow across all API requests.
 */

import { Injectable, OnDestroy } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer, Subject } from 'rxjs';
import { catchError, filter, take, switchMap, retryWhen, mergeMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LocalAuthService } from '../services/local-auth.service';
import { LoggerService } from '../services/logger.service';
import { ROUTES } from '../constants';

@Injectable()
export class AuthInterceptor implements HttpInterceptor, OnDestroy {
  private destroy$ = new Subject<void>();
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(
    null
  );

  /**
   * Clean up subscriptions when interceptor is destroyed
   * Prevents memory leaks from uncompleted BehaviorSubject
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshTokenSubject.complete();
  }

  // Exponential backoff configuration for 5xx errors
  private readonly baseDelay = 1000; // 1 second base delay
  private readonly maxRetries = 3;
  private readonly maxDelay = 30000; // 30 second max delay

  constructor(
    private router: Router,
    private authService: LocalAuthService,
    private logger: LoggerService
  ) {}

  /**
   * Intercept HTTP requests to add authentication and handle errors
   * - 401: Unauthorized - triggers token refresh with request queueing
   * - 5xx: Server errors - applies exponential backoff retry with jitter
   *
   * Note: With CapacitorHttp auto-patching enabled, errors on native platforms
   * may be plain objects instead of HttpErrorResponse. We handle both cases.
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Note: Token injection is handled by ApiGatewayService
    // This interceptor focuses on error handling, refresh, and retry

    return next.handle(request).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, attemptIndex) => {
            // Extract status from HttpErrorResponse or plain object (native CapacitorHttp)
            const status = this.extractErrorStatus(error);

            // Only retry 5xx server errors for GET requests (idempotent operations only)
            // POST/PUT/DELETE are not retried to prevent duplicate operations
            if (
              status !== null &&
              status >= 500 &&
              attemptIndex < this.maxRetries &&
              request.method === 'GET'
            ) {
              this.logger.debug(
                'AuthInterceptor',
                `Retrying 5xx error (attempt ${attemptIndex + 1}/${this.maxRetries})`,
                { status, url: request.url }
              );
              return this.calculateBackoffDelay(attemptIndex);
            }
            return throwError(() => error);
          })
        )
      ),
      catchError(error => {
        // Extract status from HttpErrorResponse or plain object (native CapacitorHttp)
        const status = this.extractErrorStatus(error);

        if (status === 401) {
          this.logger.debug('AuthInterceptor', '401 Unauthorized - attempting token refresh');
          return this.handle401Error(request, next);
        }
        if (status === 403) {
          return this.handle403Error(error);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Extract HTTP status code from error object.
   * Handles both HttpErrorResponse (web) and plain objects (native CapacitorHttp).
   */
  private extractErrorStatus(error: unknown): number | null {
    if (error instanceof HttpErrorResponse) {
      return error.status;
    }

    // Handle plain error objects from CapacitorHttp on native platforms
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: unknown }).status;
      if (typeof status === 'number') {
        return status;
      }
    }

    return null;
  }

  /**
   * Handle 401 Unauthorized errors with automatic token refresh
   * Implements request queuing to prevent multiple simultaneous refresh attempts
   */
  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshAccessToken().pipe(
        switchMap(authState => {
          this.isRefreshing = false;
          if (!authState.accessToken) {
            return throwError(() => new Error('No access token after refresh'));
          }

          this.refreshTokenSubject.next(authState.accessToken);

          // Retry the original request with new token
          return next.handle(this.addTokenToRequest(request, authState.accessToken));
        }),
        catchError(err => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);

          this.authService.logout().then(() => {
            this.router.navigate([ROUTES.WELCOME]);
          });

          return throwError(() => err);
        })
      );
    } else {
      // Refresh already in progress, queue this request
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.addTokenToRequest(request, token!)))
      );
    }
  }

  /**
   * Handle 403 Forbidden errors
   * 403 indicates the user's token is valid but lacks required permissions.
   * This typically means the user needs to re-authenticate to get fresh permissions.
   * Unlike 401, token refresh won't help - we need a full re-login.
   */
  private handle403Error(error: HttpErrorResponse): Observable<never> {
    this.logger.warn('AuthInterceptor', '403 Forbidden - forcing re-login for fresh permissions');

    // Force logout and redirect to welcome page
    // Don't wait for logout to complete, just trigger it
    this.authService.logout().then(() => {
      this.router.navigate([ROUTES.WELCOME]);
    });

    return throwError(() => error);
  }

  /**
   * Clone request and add authentication token
   */
  private addTokenToRequest(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Formula: delay = min(baseDelay * 2^attempt + jitter, maxDelay)
   * where jitter is a random value to prevent thundering herd
   */
  private calculateBackoffDelay(attemptIndex: number): Observable<number> {
    // Calculate exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.baseDelay * Math.pow(2, attemptIndex);

    // Add random jitter (0-1000ms) to prevent thundering herd
    const jitter = Math.random() * 1000;

    // Cap at maxDelay
    const delay = Math.min(exponentialDelay + jitter, this.maxDelay);

    return timer(delay);
  }
}

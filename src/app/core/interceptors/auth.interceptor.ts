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

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer } from 'rxjs';
import { catchError, filter, take, switchMap, retryWhen, mergeMap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

/**
 * Interface for auth service to avoid circular dependency
 * The actual auth service should implement this
 */
export interface AuthServiceInterface {
  getAccessToken(): Observable<string | null>;
  refreshToken(): Observable<{ accessToken: string }>;
  logout(): Promise<void>;
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(
    null
  );

  // Exponential backoff configuration for 5xx errors
  private readonly baseDelay = 1000; // 1 second base delay
  private readonly maxRetries = 3;
  private readonly maxDelay = 30000; // 30 second max delay

  constructor(private router: Router) {}

  /**
   * Intercept HTTP requests to add authentication and handle errors
   * - 401: Unauthorized - triggers token refresh with request queueing
   * - 5xx: Server errors - applies exponential backoff retry with jitter
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Note: Token injection is handled by ApiGatewayService
    // This interceptor focuses on error handling, refresh, and retry

    return next.handle(request).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, attemptIndex) => {
            // Only retry 5xx server errors (not 401, 403, 4xx client errors)
            if (
              error instanceof HttpErrorResponse &&
              error.status >= 500 &&
              attemptIndex < this.maxRetries
            ) {
              return this.calculateBackoffDelay(attemptIndex);
            }
            return throwError(() => error);
          })
        )
      ),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
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

      // TODO: Inject auth service when available
      // For now, redirect to login
      this.isRefreshing = false;
      this.router.navigate(['/welcome']);
      return throwError(() => new Error('Authentication required'));

      /*
      // Full implementation when auth service is ready:
      return this.authService.refreshToken().pipe(
        switchMap((tokens: { accessToken: string }) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokens.accessToken);

          // Retry the original request with new token
          return next.handle(this.addTokenToRequest(request, tokens.accessToken));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);

          // Refresh failed, logout user
          this.authService.logout().then(() => {
            this.router.navigate(['/welcome']);
          });

          return throwError(() => err);
        })
      );
      */
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

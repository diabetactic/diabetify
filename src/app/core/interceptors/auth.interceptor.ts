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

import { Injectable, Inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer } from 'rxjs';
import { catchError, filter, take, switchMap, retryWhen, mergeMap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LocalAuthService } from '../services/local-auth.service';

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

  constructor(
    private router: Router,
    private authService: LocalAuthService
  ) {}

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

          // Refresh failed, logout user
          this.authService.logout().then(() => {
            this.router.navigate(['/welcome']);
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

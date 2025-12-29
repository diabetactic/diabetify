import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, mergeMap, retryWhen } from 'rxjs/operators';

import { ErrorHandlerService } from '@services/error-handler.service';

/**
 * RetryInterceptor - Automatically retries failed HTTP requests with exponential backoff
 */
@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  // Maximum number of retries
  private readonly maxRetries = 3;
  // Initial backoff delay in milliseconds
  private readonly backoffDelay = 1000;

  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  /**
   * Intercept HTTP requests and apply retry logic
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: HttpErrorResponse, i) => {
            const retryAttempt = i + 1;
            if (retryAttempt > this.maxRetries) {
              return throwError(() => error);
            }

            const appError = this.errorHandlerService.parseHttpError(error);
            if (!this.errorHandlerService.isRetryable(appError)) {
              return throwError(() => error);
            }

            // Exponential backoff with jitter for better distribution
            const baseDelay = this.backoffDelay * Math.pow(2, i);
            const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
            const delay = Math.round(baseDelay + jitter);

            return timer(delay);
          })
        )
      ),
      catchError((error: HttpErrorResponse) => {
        // After all retries, pass the error to the global error handler
        return this.errorHandlerService.handleError(error);
      })
    );
  }
}

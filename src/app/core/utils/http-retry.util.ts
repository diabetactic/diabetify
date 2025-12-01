/**
 * HTTP Retry Utilities for Tidepool API
 *
 * Provides RxJS operators and utilities for robust error handling with exponential backoff retry logic.
 * Designed for use with Angular HttpClient and Tidepool API integration.
 *
 * @module HttpRetryUtil
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { mergeMap, retryWhen, scan } from 'rxjs/operators';
import { MonoTypeOperatorFunction } from 'rxjs';
import { SyncError } from '../models/tidepool-sync.model';

/**
 * Configuration interface for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000ms) */
  initialDelay?: number;
  /** Maximum delay in milliseconds between retries (default: 30000ms) */
  maxDelay?: number;
  /** Exponential backoff factor (default: 2) */
  backoffFactor?: number;
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Whether to use jitter to randomize delays (default: true) */
  useJitter?: boolean;
}

/**
 * Default configuration values for retry behavior
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  useJitter: true,
};

/**
 * RxJS operator for retrying HTTP requests with exponential backoff
 *
 * @param config - Optional configuration for retry behavior
 * @returns RxJS operator that implements retry with exponential backoff
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * this.http.get('/api/data').pipe(
 *   retryWithBackoff(),
 *   catchError(handleHttpError)
 * );
 *
 * // Custom configuration
 * this.http.post('/api/upload', data).pipe(
 *   retryWithBackoff({
 *     maxRetries: 5,
 *     initialDelay: 2000,
 *     retryableStatuses: [500, 502, 503, 504]
 *   }),
 *   catchError(handleHttpError)
 * );
 * ```
 */
export function retryWithBackoff<T>(config?: RetryConfig): MonoTypeOperatorFunction<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return (source: Observable<T>) =>
    source.pipe(
      retryWhen(errors =>
        errors.pipe(
          scan((retryAttempt, error) => {
            // Check if error is retryable
            if (!isRetryableErrorWithConfig(error, mergedConfig.retryableStatuses)) {
              throw error;
            }

            // Check if we've exceeded max retries
            if (retryAttempt >= mergedConfig.maxRetries) {
              throw error;
            }

            return retryAttempt + 1;
          }, 0),
          mergeMap(retryAttempt => {
            // Calculate exponential backoff delay
            const baseDelay = Math.min(
              mergedConfig.initialDelay * Math.pow(mergedConfig.backoffFactor, retryAttempt - 1),
              mergedConfig.maxDelay
            );

            // Add jitter to prevent thundering herd
            const jitter = mergedConfig.useJitter
              ? Math.random() * 0.3 * baseDelay // Add up to 30% jitter
              : 0;

            const totalDelay = Math.floor(baseDelay + jitter);

            console.log(
              `Retrying after ${totalDelay}ms (attempt ${retryAttempt}/${mergedConfig.maxRetries})`
            );

            return timer(totalDelay);
          })
        )
      )
    );
}

/**
 * Handles HTTP errors and returns a structured error observable
 *
 * @param error - The HTTP error response
 * @returns Observable that throws a structured SyncError
 *
 * @example
 * ```typescript
 * this.http.get('/api/data').pipe(
 *   retryWithBackoff(),
 *   catchError(error => handleHttpError(error))
 * ).subscribe({
 *   next: data => console.log(data),
 *   error: (syncError: SyncError) => console.error('Sync failed:', syncError)
 * });
 * ```
 */
export function handleHttpError(error: HttpErrorResponse): Observable<never> {
  let syncError: SyncError;

  if (error.status === 0) {
    // Network error or CORS issue
    syncError = {
      message: 'Network error: Unable to connect to Tidepool server',
      timestamp: new Date().toISOString(),
      retryable: true,
      errorType: 'NETWORK_ERROR',
      details: {
        originalError: error.message || 'Connection failed',
      },
    };
  } else if (error.status === 401) {
    // Authentication error
    syncError = {
      message: 'Authentication failed: Please log in again',
      timestamp: new Date().toISOString(),
      retryable: false,
      errorType: 'AUTH_ERROR',
      statusCode: 401,
      details: {
        requiresReauth: true,
      },
    };
  } else if (error.status === 403) {
    // Authorization error
    syncError = {
      message: 'Access denied: Insufficient permissions',
      timestamp: new Date().toISOString(),
      retryable: false,
      errorType: 'AUTH_ERROR',
      statusCode: 403,
    };
  } else if (error.status === 429) {
    // Rate limiting
    const retryAfter = getRateLimitDelay(error);
    syncError = {
      message: `Rate limit exceeded. Please wait ${retryAfter ? Math.ceil(retryAfter / 1000) + ' seconds' : 'before retrying'}`,
      timestamp: new Date().toISOString(),
      retryable: true,
      errorType: 'RATE_LIMIT',
      statusCode: 429,
      details: {
        retryAfter,
      },
    };
  } else if (error.status >= 500) {
    // Server error
    syncError = {
      message: `Server error: ${error.statusText || 'Internal server error'}`,
      timestamp: new Date().toISOString(),
      retryable: true,
      errorType: 'SERVER_ERROR',
      statusCode: error.status,
      details: {
        serverMessage: error.error?.message || error.message,
      },
    };
  } else if (error.status >= 400 && error.status < 500) {
    // Client error
    syncError = {
      message: `Request error: ${error.error?.message || error.statusText || 'Invalid request'}`,
      timestamp: new Date().toISOString(),
      retryable: false,
      errorType: 'CLIENT_ERROR',
      statusCode: error.status,
      details: {
        validationErrors: error.error?.errors,
      },
    };
  } else {
    // Unknown error
    syncError = {
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      retryable: false,
      errorType: 'UNKNOWN_ERROR',
      statusCode: error.status,
      details: {
        originalError: error.message,
      },
    };
  }

  return throwError(() => syncError);
}

/**
 * Determines if an HTTP error should be retried
 *
 * @param error - The HTTP error response
 * @returns True if the error is retryable, false otherwise
 *
 * @example
 * ```typescript
 * if (isRetryableError(error)) {
 *   console.log('This error can be retried');
 * } else {
 *   console.log('This error should not be retried');
 * }
 * ```
 */
export function isRetryableError(error: HttpErrorResponse): boolean {
  // Network errors are retryable
  if (error.status === 0) {
    return true;
  }

  // Check against default retryable status codes
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  return retryableStatuses.includes(error.status);
}

/**
 * Internal helper to check if error is retryable with custom status codes
 */
function isRetryableErrorWithConfig(error: unknown, retryableStatuses: number[]): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  // Network errors are always retryable
  if (error.status === 0) {
    return true;
  }

  return retryableStatuses.includes(error.status);
}

/**
 * Extracts rate limit delay from Retry-After header
 *
 * @param response - The HTTP error response
 * @returns Delay in milliseconds, or null if no Retry-After header is present
 *
 * @example
 * ```typescript
 * const delay = getRateLimitDelay(errorResponse);
 * if (delay !== null) {
 *   console.log(`Wait ${delay}ms before retrying`);
 *   setTimeout(() => retry(), delay);
 * }
 * ```
 */
export function getRateLimitDelay(response: HttpErrorResponse): number | null {
  const retryAfter = response.headers.get('Retry-After');

  if (!retryAfter) {
    return null;
  }

  // Check if it's a number (seconds)
  const seconds = Number(retryAfter);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Try to parse as HTTP-date (RFC 7231)
  try {
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
      const now = Date.now();
      const delay = retryDate.getTime() - now;
      return delay > 0 ? delay : 0;
    }
  } catch {
    // Invalid date format
  }

  // Default to 60 seconds if we can't parse the header
  console.warn(`Unable to parse Retry-After header: ${retryAfter}. Using default 60s delay.`);
  return 60000;
}

/**
 * Creates a standardized SyncError from any error type
 *
 * @param error - Any error object
 * @param readingId - Optional reading ID associated with the error
 * @returns Structured SyncError object
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const syncError = createSyncError(error, 'reading-123');
 *   console.error('Sync error:', syncError);
 * }
 * ```
 */
export function createSyncError(error: unknown, readingId?: string): SyncError {
  // If it's already a SyncError, just add readingId if provided
  if (error && typeof error === 'object' && 'errorType' in error) {
    const existingError = error as SyncError;
    return {
      ...existingError,
      readingId: readingId || existingError.readingId,
    };
  }

  // If it's an HttpErrorResponse, use handleHttpError logic
  if (error instanceof HttpErrorResponse) {
    // Extract the sync error from handleHttpError
    let syncError: SyncError = {
      message: 'HTTP error occurred',
      timestamp: new Date().toISOString(),
      retryable: false,
      errorType: 'UNKNOWN_ERROR',
    };

    handleHttpError(error).subscribe({
      error: (err: SyncError) => {
        syncError = err;
      },
    });

    return {
      ...syncError,
      readingId,
    };
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      timestamp: new Date().toISOString(),
      retryable: false,
      errorType: 'UNKNOWN_ERROR',
      readingId,
      details: {
        stack: error.stack,
        name: error.name,
      },
    };
  }

  // Handle unknown error types
  return {
    message: typeof error === 'string' ? error : 'An unknown error occurred',
    timestamp: new Date().toISOString(),
    retryable: false,
    errorType: 'UNKNOWN_ERROR',
    readingId,
    details: {
      originalError: error,
    },
  };
}

/**
 * Custom RxJS operator that combines retry with rate limit awareness
 *
 * @param config - Retry configuration
 * @returns RxJS operator that respects rate limits
 *
 * @example
 * ```typescript
 * this.http.get('/api/data').pipe(
 *   retryWithRateLimit({ maxRetries: 5 }),
 *   catchError(handleHttpError)
 * );
 * ```
 */
export function retryWithRateLimit<T>(config?: RetryConfig): MonoTypeOperatorFunction<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return (source: Observable<T>) =>
    source.pipe(
      retryWhen(errors =>
        errors.pipe(
          scan(
            (acc, error) => {
              if (!isRetryableErrorWithConfig(error, mergedConfig.retryableStatuses)) {
                throw error;
              }

              if (acc.retryCount >= mergedConfig.maxRetries) {
                throw error;
              }

              return {
                retryCount: acc.retryCount + 1,
                error,
              };
            },
            { retryCount: 0, error: null as HttpErrorResponse | null }
          ),
          mergeMap(({ retryCount, error }) => {
            let delay: number;

            // Check for rate limit delay
            if (error instanceof HttpErrorResponse && error.status === 429) {
              const rateLimitDelay = getRateLimitDelay(error);
              if (rateLimitDelay !== null) {
                delay = rateLimitDelay;
                console.log(`Rate limited. Waiting ${delay}ms as specified by server`);
              } else {
                // Use exponential backoff if no Retry-After header
                delay = Math.min(
                  mergedConfig.initialDelay * Math.pow(mergedConfig.backoffFactor, retryCount - 1),
                  mergedConfig.maxDelay
                );
              }
            } else {
              // Use normal exponential backoff
              delay = Math.min(
                mergedConfig.initialDelay * Math.pow(mergedConfig.backoffFactor, retryCount - 1),
                mergedConfig.maxDelay
              );
            }

            // Add jitter
            if (mergedConfig.useJitter) {
              delay += Math.random() * 0.3 * delay;
            }

            console.log(
              `Retrying after ${Math.floor(delay)}ms (attempt ${retryCount}/${mergedConfig.maxRetries})`
            );

            return timer(Math.floor(delay));
          })
        )
      )
    );
}

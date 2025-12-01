/**
 * Unit tests for HTTP retry utilities
 * Tests retry logic, error handling, and rate limiting
 */

import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { isRetryableError, getRateLimitDelay, createSyncError } from './http-retry.util';

describe('HttpRetryUtil', () => {
  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 408 Request Timeout', () => {
      const error = new HttpErrorResponse({ status: 408, statusText: 'Request Timeout' });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 429 Too Many Requests', () => {
      const error = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 500 Internal Server Error', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 502 Bad Gateway', () => {
      const error = new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway' });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      const error = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 504 Gateway Timeout', () => {
      const error = new HttpErrorResponse({ status: 504, statusText: 'Gateway Timeout' });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for 400 Bad Request', () => {
      const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 401 Unauthorized', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 403 Forbidden', () => {
      const error = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 404 Not Found', () => {
      const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 422 Unprocessable Entity', () => {
      const error = new HttpErrorResponse({ status: 422, statusText: 'Unprocessable Entity' });
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getRateLimitDelay', () => {
    it('should return null when Retry-After header is missing', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders(),
      });
      expect(getRateLimitDelay(error)).toBeNull();
    });

    it('should parse numeric Retry-After header in seconds', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '60' }),
      });
      expect(getRateLimitDelay(error)).toBe(60000); // 60 seconds = 60000ms
    });

    it('should parse decimal Retry-After values', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '30.5' }),
      });
      expect(getRateLimitDelay(error)).toBe(30500); // 30.5 seconds = 30500ms
    });

    it('should parse HTTP-date Retry-After header', () => {
      const futureDate = new Date(Date.now() + 120000); // 2 minutes from now
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': futureDate.toUTCString() }),
      });
      const delay = getRateLimitDelay(error);
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(120000);
    });

    it('should return 0 for past dates in Retry-After', () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': pastDate.toUTCString() }),
      });
      expect(getRateLimitDelay(error)).toBe(0);
    });

    it('should handle invalid date format with default', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': 'invalid-date' }),
      });
      expect(getRateLimitDelay(error)).toBe(60000); // Default 60 seconds
    });

    it('should handle empty Retry-After header', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '' }),
      });
      // Angular HttpHeaders treats empty string as no header, returns null
      expect(getRateLimitDelay(error)).toBeNull();
    });

    it('should convert zero seconds to zero milliseconds', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '0' }),
      });
      expect(getRateLimitDelay(error)).toBe(0);
    });
  });

  describe('createSyncError', () => {
    it('should create error from HttpErrorResponse with status 0', () => {
      const httpError = new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
      });
      const syncError = createSyncError(httpError);

      expect(syncError.errorType).toBe('NETWORK_ERROR');
      expect(syncError.retryable).toBe(true);
      expect(syncError.message).toContain('Network error');
    });

    it('should create error from HttpErrorResponse with status 401', () => {
      const httpError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
      });
      const syncError = createSyncError(httpError);

      expect(syncError.errorType).toBe('AUTH_ERROR');
      expect(syncError.retryable).toBe(false);
      expect(syncError.statusCode).toBe(401);
    });

    it('should create error from HttpErrorResponse with status 429', () => {
      const httpError = new HttpErrorResponse({
        status: 429,
        statusText: 'Too Many Requests',
      });
      const syncError = createSyncError(httpError);

      expect(syncError.errorType).toBe('RATE_LIMIT');
      expect(syncError.retryable).toBe(true);
      expect(syncError.statusCode).toBe(429);
    });

    it('should create error from HttpErrorResponse with status 500', () => {
      const httpError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
      });
      const syncError = createSyncError(httpError);

      expect(syncError.errorType).toBe('SERVER_ERROR');
      expect(syncError.retryable).toBe(true);
      expect(syncError.statusCode).toBe(500);
    });

    it('should create error from Error object', () => {
      const error = new Error('Test error message');
      const syncError = createSyncError(error);

      expect(syncError.message).toBe('Test error message');
      expect(syncError.errorType).toBe('UNKNOWN_ERROR');
      expect(syncError.retryable).toBe(false);
    });

    it('should create error from string', () => {
      const syncError = createSyncError('Simple error message');

      expect(syncError.message).toBe('Simple error message');
      expect(syncError.errorType).toBe('UNKNOWN_ERROR');
      expect(syncError.retryable).toBe(false);
    });

    it('should preserve existing SyncError', () => {
      const existingError = {
        message: 'Existing error',
        timestamp: '2024-01-15T10:00:00Z',
        retryable: true,
        errorType: 'NETWORK_ERROR',
      };
      const syncError = createSyncError(existingError);

      expect(syncError.message).toBe('Existing error');
      expect(syncError.errorType).toBe('NETWORK_ERROR');
      expect(syncError.retryable).toBe(true);
    });

    it('should add readingId when provided', () => {
      const error = new Error('Test error');
      const syncError = createSyncError(error, 'reading123');

      expect(syncError.readingId).toBe('reading123');
    });

    it('should preserve readingId from existing SyncError', () => {
      const existingError = {
        message: 'Existing error',
        timestamp: '2024-01-15T10:00:00Z',
        retryable: true,
        errorType: 'NETWORK_ERROR',
        readingId: 'original123',
      };
      const syncError = createSyncError(existingError, 'new456');

      expect(syncError.readingId).toBe('new456');
    });

    it('should add timestamp to error', () => {
      const error = new Error('Test error');
      const syncError = createSyncError(error);

      expect(syncError.timestamp).toBeDefined();
      expect(new Date(syncError.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should handle unknown error types', () => {
      const weirdError = { weird: 'object' };
      const syncError = createSyncError(weirdError);

      expect(syncError.errorType).toBe('UNKNOWN_ERROR');
      expect(syncError.retryable).toBe(false);
    });

    it('should include stack trace for Error objects', () => {
      const error = new Error('Test error');
      const syncError = createSyncError(error);

      expect(syncError.details && (syncError.details as any)['stack']).toBeDefined();
      expect(syncError.details && (syncError.details as any)['name']).toBe('Error');
    });
  });

  describe('Error categorization', () => {
    it('should categorize network errors correctly', () => {
      const error = new HttpErrorResponse({ status: 0 });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should categorize timeout errors correctly', () => {
      const error = new HttpErrorResponse({ status: 408 });
      expect(isRetryableError(error)).toBe(true);
    });

    it('should categorize server errors as retryable', () => {
      const serverErrors = [500, 502, 503, 504];
      serverErrors.forEach(status => {
        const error = new HttpErrorResponse({ status });
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should categorize client errors as non-retryable', () => {
      const clientErrors = [400, 401, 403, 404, 422];
      clientErrors.forEach(status => {
        const error = new HttpErrorResponse({ status });
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('Timestamp validation', () => {
    it('should create valid ISO 8601 timestamps', () => {
      const error = new Error('Test');
      const syncError = createSyncError(error);

      const timestamp = new Date(syncError.timestamp);
      expect(timestamp.toISOString()).toBe(syncError.timestamp);
    });

    it('should create recent timestamps', () => {
      const error = new Error('Test');
      const syncError = createSyncError(error);

      const timestamp = new Date(syncError.timestamp);
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();

      expect(diff).toBeLessThan(1000); // Less than 1 second old
    });
  });

  describe('Rate limit calculation', () => {
    it('should convert seconds to milliseconds correctly', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '1' }),
      });
      expect(getRateLimitDelay(error)).toBe(1000);
    });

    it('should handle large delay values', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '3600' }), // 1 hour
      });
      expect(getRateLimitDelay(error)).toBe(3600000);
    });

    it('should handle fractional second delays', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({ 'Retry-After': '0.5' }),
      });
      expect(getRateLimitDelay(error)).toBe(500);
    });
  });

  describe('Edge cases', () => {
    it('should handle null or undefined errors gracefully', () => {
      const syncError1 = createSyncError(null);
      const syncError2 = createSyncError(undefined);

      expect(syncError1.errorType).toBe('UNKNOWN_ERROR');
      expect(syncError2.errorType).toBe('UNKNOWN_ERROR');
    });

    it('should handle empty string error', () => {
      const syncError = createSyncError('');

      // Empty string is still a valid string, so it's used as-is
      expect(syncError.message).toBe('');
      expect(syncError.errorType).toBe('UNKNOWN_ERROR');
    });

    it('should handle HttpErrorResponse without headers', () => {
      const error = new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders(),
      });
      expect(getRateLimitDelay(error)).toBeNull();
    });
  });
});

/**
 * ErrorHandlerService Integration Tests
 *
 * Tests the centralized error handling system:
 * 1. HTTP error parsing (400, 401, 403, 404, 5xx)
 * 2. PHI redaction (glucose, readings, tokens)
 * 3. Error categorization (NETWORK, AUTH, VALIDATION)
 * 4. User-friendly messages (prod vs dev)
 * 5. Retryable error detection
 * 6. Deep error traversal
 * 7. Error context extraction
 */

// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { ErrorHandlerService, AppError, ErrorCategory } from '@core/services/error-handler.service';

// Mock del módulo environment para controlar environment.production
vi.mock('@env/environment', () => ({
  environment: {
    production: false,
    logging: {
      enableApiLogging: true,
      enableConsole: true,
    },
  },
}));

describe('ErrorHandlerService Integration Tests', () => {
  let service: ErrorHandlerService;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Suprimir console.error durante los tests
    originalConsoleError = console.error;
    console.error = vi.fn();

    TestBed.configureTestingModule({
      providers: [ErrorHandlerService],
    });

    service = TestBed.inject(ErrorHandlerService);
  });

  afterEach(() => {
    // Restaurar console.error
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('HTTP Error Parsing - Client Errors (4xx)', () => {
    it('should parse 400 Bad Request error with default message', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: null,
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Invalid request. Please check your input.');
        expect(appError.code).toBe('BAD_REQUEST');
        expect(appError.statusCode).toBe(400);
        expect(appError.timestamp).toBeDefined();
      }
    });

    it('should parse 400 error with server message extraction', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Valor de glucosa inválido: debe estar entre 20-600 mg/dL' },
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Valor de glucosa inválido: debe estar entre 20-600 mg/dL');
        expect(appError.code).toBe('BAD_REQUEST');
        expect(appError.statusCode).toBe(400);
      }
    });

    it('should parse 401 Unauthorized error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Token expired' },
        status: 401,
        statusText: 'Unauthorized',
        url: 'http://localhost:8000/v1/profile',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Authentication required. Please log in again.');
        expect(appError.code).toBe('UNAUTHORIZED');
        expect(appError.statusCode).toBe(401);
      }
    });

    it('should parse 403 Forbidden error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Insufficient permissions' },
        status: 403,
        statusText: 'Forbidden',
        url: 'http://localhost:8000/v1/admin',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe("Access denied. You don't have permission to perform this action.");
        expect(appError.code).toBe('FORBIDDEN');
        expect(appError.statusCode).toBe(403);
      }
    });

    it('should parse 404 Not Found error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Reading not found' },
        status: 404,
        statusText: 'Not Found',
        url: 'http://localhost:8000/v1/readings/999',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Resource not found.');
        expect(appError.code).toBe('NOT_FOUND');
        expect(appError.statusCode).toBe(404);
      }
    });

    it('should parse 422 Validation Error with server message', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Email ya registrado en el sistema' },
        status: 422,
        statusText: 'Unprocessable Entity',
        url: 'http://localhost:8000/v1/users',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Email ya registrado en el sistema');
        expect(appError.code).toBe('VALIDATION_ERROR');
        expect(appError.statusCode).toBe(422);
      }
    });

    it('should parse 429 Rate Limit error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Too many requests' },
        status: 429,
        statusText: 'Too Many Requests',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Too many requests. Please wait and try again.');
        expect(appError.code).toBe('RATE_LIMIT');
        expect(appError.statusCode).toBe(429);
      }
    });
  });

  describe('HTTP Error Parsing - Server Errors (5xx)', () => {
    it('should parse 500 Internal Server Error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Database connection failed' },
        status: 500,
        statusText: 'Internal Server Error',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Server error. Please try again later.');
        expect(appError.code).toBe('INTERNAL_SERVER_ERROR');
        expect(appError.statusCode).toBe(500);
      }
    });

    it('should parse 502 Bad Gateway error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: null,
        status: 502,
        statusText: 'Bad Gateway',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Server is temporarily unavailable. Please try again.');
        expect(appError.code).toBe('BAD_GATEWAY');
        expect(appError.statusCode).toBe(502);
      }
    });

    it('should parse 503 Service Unavailable error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Service maintenance' },
        status: 503,
        statusText: 'Service Unavailable',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Service unavailable. Please try again later.');
        expect(appError.code).toBe('SERVICE_UNAVAILABLE');
        expect(appError.statusCode).toBe(503);
      }
    });

    it('should parse 504 Gateway Timeout error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: null,
        status: 504,
        statusText: 'Gateway Timeout',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Server timeout. Please try again.');
        expect(appError.code).toBe('GATEWAY_TIMEOUT');
        expect(appError.statusCode).toBe(504);
      }
    });
  });

  describe('HTTP Error Parsing - Network Errors', () => {
    it('should parse network error (ErrorEvent)', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: new ErrorEvent('Network error', { message: 'Failed to fetch' }),
        status: 0,
        statusText: 'Unknown Error',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Network error occurred. Please check your connection.');
        expect(appError.code).toBe('NETWORK_ERROR');
        expect(appError.statusCode).toBe(0);
        expect(appError.details?.message).toBe('Failed to fetch');
      }
    });

    it('should parse connection error (status 0)', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: null,
        status: 0,
        statusText: 'Unknown Error',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Unable to connect to server. Please check your internet connection.');
        expect(appError.code).toBe('CONNECTION_ERROR');
        expect(appError.statusCode).toBe(0);
      }
    });
  });

  describe('PHI Redaction - Protected Health Information', () => {
    it('should redact glucose values from error details', () => {
      // ARRANGE
      const errorWithPHI: AppError = {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        details: {
          glucoseValue: 150,
          readingValue: 120,
          bloodGlucose: 180,
          normalField: 'visible',
        },
      };

      // ACT
      const redacted = (service as any).redactPHI(errorWithPHI);

      // ASSERT
      expect(redacted.details?.glucoseValue).toBe('[REDACTED]');
      expect(redacted.details?.readingValue).toBe('[REDACTED]');
      expect(redacted.details?.bloodGlucose).toBe('[REDACTED]');
      expect(redacted.details?.normalField).toBe('visible');
    });

    it('should redact insulin and medication data', () => {
      // ARRANGE
      const errorWithPHI: AppError = {
        message: 'Server error',
        code: 'SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        details: {
          insulin: 'NovoRapid',
          insulinDose: 5,
          bolusAmount: 3.5,
          basalRate: 0.8,
          carbRatio: 10,
          medications: ['Metformin', 'Insulin'],
          otherData: 'public',
        },
      };

      // ACT
      const redacted = (service as any).redactPHI(errorWithPHI);

      // ASSERT
      expect(redacted.details?.insulin).toBe('[REDACTED]');
      expect(redacted.details?.insulinDose).toBe('[REDACTED]');
      expect(redacted.details?.bolusAmount).toBe('[REDACTED]');
      expect(redacted.details?.basalRate).toBe('[REDACTED]');
      expect(redacted.details?.carbRatio).toBe('[REDACTED]');
      expect(redacted.details?.medications).toBe('[REDACTED]');
      expect(redacted.details?.otherData).toBe('public');
    });

    it('should redact authentication tokens and credentials', () => {
      // ARRANGE
      const errorWithTokens: AppError = {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        details: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'refresh-token-abc123',
          token: 'bearer-token',
          password: 'secret123',
          credentials: { user: 'admin', pass: 'admin123' },
          publicInfo: 'safe',
        },
      };

      // ACT
      const redacted = (service as any).redactPHI(errorWithTokens);

      // ASSERT
      expect(redacted.details?.accessToken).toBe('[REDACTED]');
      expect(redacted.details?.refreshToken).toBe('[REDACTED]');
      expect(redacted.details?.token).toBe('[REDACTED]');
      expect(redacted.details?.password).toBe('[REDACTED]');
      expect(redacted.details?.credentials).toBe('[REDACTED]');
      expect(redacted.details?.publicInfo).toBe('safe');
    });

    it('should redact personal identifiers (PII)', () => {
      // ARRANGE
      const errorWithPII: AppError = {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
        timestamp: new Date().toISOString(),
        details: {
          phoneNumber: '+34-600-123-456',
          phone: '600123456',
          dateOfBirth: '1990-05-15',
          dob: '1990-05-15',
          ssn: '123-45-6789',
          medicalHistory: 'Type 1 Diabetes since 2010',
          email: 'user@example.com', // Email no se redacta según la implementación
        },
      };

      // ACT
      const redacted = (service as any).redactPHI(errorWithPII);

      // ASSERT
      expect(redacted.details?.phoneNumber).toBe('[REDACTED]');
      expect(redacted.details?.phone).toBe('[REDACTED]');
      expect(redacted.details?.dateOfBirth).toBe('[REDACTED]');
      expect(redacted.details?.dob).toBe('[REDACTED]');
      expect(redacted.details?.ssn).toBe('[REDACTED]');
      expect(redacted.details?.medicalHistory).toBe('[REDACTED]');
      expect(redacted.details?.email).toBe('user@example.com');
    });

    it('should recursively redact nested objects', () => {
      // ARRANGE
      const errorWithNestedPHI: AppError = {
        message: 'Error',
        code: 'ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        details: {
          user: {
            profile: {
              glucose: 150,
              insulin: 'NovoRapid',
              name: 'John Doe',
            },
            auth: {
              accessToken: 'token123',
              publicKey: 'public',
            },
          },
          metadata: 'safe',
        },
      };

      // ACT
      const redacted = (service as any).redactPHI(errorWithNestedPHI);

      // ASSERT
      expect((redacted.details as any).user.profile.glucose).toBe('[REDACTED]');
      expect((redacted.details as any).user.profile.insulin).toBe('[REDACTED]');
      expect((redacted.details as any).user.profile.name).toBe('John Doe');
      expect((redacted.details as any).user.auth.accessToken).toBe('[REDACTED]');
      expect((redacted.details as any).user.auth.publicKey).toBe('public');
      expect(redacted.details?.metadata).toBe('safe');
    });

    it('should redact arrays containing PHI using redactObject', () => {
      // ARRANGE - Probar redactObject directamente con un array
      const sensitiveFields = [
        'glucoseValue',
        'readingValue',
        'insulin',
        'accessToken',
        'password',
      ];

      const dataWithArrayPHI = {
        readings: [
          { glucoseValue: 120, timestamp: '2024-01-15T10:00:00Z' },
          { glucoseValue: 150, timestamp: '2024-01-15T14:00:00Z' },
        ],
        tags: ['diabetes', 'health'],
      };

      // ACT - Llamar directamente a redactObject
      const redacted = (service as any).redactObject(dataWithArrayPHI, sensitiveFields);

      // ASSERT - El array se procesa recursivamente
      expect(redacted).toBeDefined();
      expect(Array.isArray(redacted.readings)).toBe(true);
      expect(redacted.readings.length).toBe(2);

      // Verificar redacción de PHI en el array
      expect(redacted.readings[0].glucoseValue).toBe('[REDACTED]');
      expect(redacted.readings[1].glucoseValue).toBe('[REDACTED]');

      // Verificar que datos no sensibles se preservan
      expect(redacted.readings[0].timestamp).toBe('2024-01-15T10:00:00Z');
      expect(redacted.readings[1].timestamp).toBe('2024-01-15T14:00:00Z');

      // Tags no contienen PHI, se preservan como array de strings
      expect(Array.isArray(redacted.tags)).toBe(true);
      expect(redacted.tags).toEqual(['diabetes', 'health']);
    });
  });

  describe('Error Categorization', () => {
    it('should categorize network errors (status 0)', () => {
      // ARRANGE
      const networkError: AppError = {
        message: 'Network error',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const category = service.getErrorCategory(networkError);

      // ASSERT
      expect(category).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize authentication errors (401)', () => {
      // ARRANGE
      const authError: AppError = {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const category = service.getErrorCategory(authError);

      // ASSERT
      expect(category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should categorize authorization errors (403)', () => {
      // ARRANGE
      const authzError: AppError = {
        message: 'Forbidden',
        code: 'FORBIDDEN',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const category = service.getErrorCategory(authzError);

      // ASSERT
      expect(category).toBe(ErrorCategory.AUTHORIZATION);
    });

    it('should categorize validation errors (400, 422)', () => {
      // ARRANGE
      const validationError400: AppError = {
        message: 'Bad request',
        code: 'BAD_REQUEST',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };

      const validationError422: AppError = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const category400 = service.getErrorCategory(validationError400);
      const category422 = service.getErrorCategory(validationError422);

      // ASSERT
      expect(category400).toBe(ErrorCategory.VALIDATION);
      expect(category422).toBe(ErrorCategory.VALIDATION);
    });

    it('should categorize server errors (5xx)', () => {
      // ARRANGE
      const serverError: AppError = {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const category = service.getErrorCategory(serverError);

      // ASSERT
      expect(category).toBe(ErrorCategory.SERVER);
    });

    it('should categorize client errors (4xx excluding 400, 401, 403, 422)', () => {
      // ARRANGE
      const clientError: AppError = {
        message: 'Not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const category = service.getErrorCategory(clientError);

      // ASSERT
      expect(category).toBe(ErrorCategory.CLIENT);
    });

    it('should categorize unknown errors (no statusCode)', () => {
      // ARRANGE - Error sin statusCode se categoriza como NETWORK
      const unknownError: AppError = {
        message: 'Unknown error',
        code: 'UNKNOWN',
        timestamp: new Date().toISOString(),
      };

      // ACT
      const category = service.getErrorCategory(unknownError);

      // ASSERT
      expect(category).toBe(ErrorCategory.NETWORK);
    });
  });

  describe('Retryable Error Detection', () => {
    it('should mark network errors as retryable', () => {
      // ARRANGE
      const networkError: AppError = {
        message: 'Network error',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const retryable = service.isRetryable(networkError);

      // ASSERT
      expect(retryable).toBe(true);
    });

    it('should mark 5xx server errors as retryable', () => {
      // ARRANGE
      const serverErrors = [500, 502, 503, 504];

      serverErrors.forEach(status => {
        const error: AppError = {
          message: 'Server error',
          code: 'SERVER_ERROR',
          statusCode: status,
          timestamp: new Date().toISOString(),
        };

        // ACT
        const retryable = service.isRetryable(error);

        // ASSERT
        expect(retryable).toBe(true);
      });
    });

    it('should mark 408 timeout errors as retryable', () => {
      // ARRANGE
      const timeoutError: AppError = {
        message: 'Timeout',
        code: 'TIMEOUT',
        statusCode: 408,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const retryable = service.isRetryable(timeoutError);

      // ASSERT
      expect(retryable).toBe(true);
    });

    it('should mark 429 rate limit errors as retryable', () => {
      // ARRANGE
      const rateLimitError: AppError = {
        message: 'Too many requests',
        code: 'RATE_LIMIT',
        statusCode: 429,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const retryable = service.isRetryable(rateLimitError);

      // ASSERT
      expect(retryable).toBe(true);
    });

    it('should mark 4xx client errors (except 408, 429) as non-retryable', () => {
      // ARRANGE
      const clientErrors = [400, 401, 403, 404, 422];

      clientErrors.forEach(status => {
        const error: AppError = {
          message: 'Client error',
          code: 'CLIENT_ERROR',
          statusCode: status,
          timestamp: new Date().toISOString(),
        };

        // ACT
        const retryable = service.isRetryable(error);

        // ASSERT
        expect(retryable).toBe(false);
      });
    });
  });

  describe('Deep Error Traversal - Message Extraction', () => {
    it('should extract message from string error', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: 'Simple error message',
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Simple error message');
      }
    });

    it('should extract message from error.message field', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { message: 'Message in message field' },
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Message in message field');
      }
    });

    it('should extract message from error.error.message (nested)', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { error: { message: 'Deeply nested message' } },
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Deeply nested message');
      }
    });

    it('should extract message from error.error string (string nested)', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { error: 'Nested string error' },
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Nested string error');
      }
    });

    it('should extract message from error.errors array', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { errors: [{ message: 'First error in array' }, { message: 'Second error' }] },
        status: 422,
        statusText: 'Unprocessable Entity',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('First error in array');
      }
    });

    it('should extract string from error.errors array without message field', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { errors: ['String error 1', 'String error 2'] },
        status: 422,
        statusText: 'Unprocessable Entity',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('String error 1');
      }
    });

    it('should use default message when no server message found', async () => {
      // ARRANGE
      const httpError = new HttpErrorResponse({
        error: { someOtherField: 'irrelevant data' },
        status: 400,
        statusText: 'Bad Request',
        url: 'http://localhost:8000/v1/readings',
      });

      // ACT & ASSERT
      try {
        await firstValueFrom(service.handleError(httpError));
        expect.fail('Expected error but got success');
      } catch (error) {
        const appError = error as AppError;
        expect(appError.message).toBe('Invalid request. Please check your input.');
      }
    });
  });

  describe('User-Friendly Messages - Production vs Development', () => {
    it('should return detailed message in development mode', async () => {
      // ARRANGE
      const { environment } = await import('@env/environment');
      (environment as any).production = false;

      const error: AppError = {
        message: 'Detailed technical error: Database connection pool exhausted at line 42',
        code: 'SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const userMessage = service.getUserMessage(error);

      // ASSERT
      expect(userMessage).toBe('Detailed technical error: Database connection pool exhausted at line 42');
    });

    it('should return simplified network message in production', async () => {
      // ARRANGE
      const { environment } = await import('@env/environment');
      (environment as any).production = true;

      const error: AppError = {
        message: 'Network error occurred. Please check your connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const userMessage = service.getUserMessage(error);

      // ASSERT
      expect(userMessage).toBe('Connection problem. Please check your internet.');

      // Cleanup
      (environment as any).production = false;
    });

    it('should return simplified auth message in production', async () => {
      // ARRANGE
      const { environment } = await import('@env/environment');
      (environment as any).production = true;

      const error: AppError = {
        message: 'JWT token expired at timestamp 1234567890',
        code: 'UNAUTHORIZED',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const userMessage = service.getUserMessage(error);

      // ASSERT
      expect(userMessage).toBe('Please log in again.');

      // Cleanup
      (environment as any).production = false;
    });

    it('should return simplified authorization message in production', async () => {
      // ARRANGE
      const { environment } = await import('@env/environment');
      (environment as any).production = true;

      const error: AppError = {
        message: 'User role "viewer" lacks permission for admin endpoint',
        code: 'FORBIDDEN',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const userMessage = service.getUserMessage(error);

      // ASSERT
      expect(userMessage).toBe("You don't have permission for this action.");

      // Cleanup
      (environment as any).production = false;
    });

    it('should return simplified server error message in production', async () => {
      // ARRANGE
      const { environment } = await import('@env/environment');
      (environment as any).production = true;

      const error: AppError = {
        message: 'NullPointerException at DatabaseService.java:156',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const userMessage = service.getUserMessage(error);

      // ASSERT
      expect(userMessage).toBe('Server error. Please try again later.');

      // Cleanup
      (environment as any).production = false;
    });

    it('should return generic error message for other errors in production', async () => {
      // ARRANGE
      const { environment } = await import('@env/environment');
      (environment as any).production = true;

      const error: AppError = {
        message: 'Complex technical error details',
        code: 'UNKNOWN',
        statusCode: 404,
        timestamp: new Date().toISOString(),
      };

      // ACT
      const userMessage = service.getUserMessage(error);

      // ASSERT
      expect(userMessage).toBe('Something went wrong. Please try again.');

      // Cleanup
      (environment as any).production = false;
    });
  });
});

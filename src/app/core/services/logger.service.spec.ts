/**
 * Logger Service Tests
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { type MockInstance } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LoggerService } from '@services/logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let _consoleDebugSpy: MockInstance;
  let consoleLogSpy: MockInstance;
  let _consoleWarnSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoggerService);

    // Spy on console methods with return values
    _consoleDebugSpy = vi.spyOn(console, 'debug').mockReturnValue(undefined);
    consoleLogSpy = vi.spyOn(console, 'log').mockReturnValue(undefined);
    _consoleWarnSpy = vi.spyOn(console, 'warn').mockReturnValue(undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
  });

  describe('Request ID Tracking', () => {
    it('should set and get request ID', () => {
      const requestId = 'test-request-123';
      service.setRequestId(requestId);

      expect(service.getRequestId()).toBe(requestId);
    });

    it('should include request ID in logs', () => {
      const requestId = 'req-456';
      service.setRequestId(requestId);
      service.info('API', 'Test message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      expect(args[0]).toContain(`[${requestId}]`);
    });

    it('should not include request ID prefix when request ID is not set', () => {
      // Don't set any request ID
      service.info('API', 'Test message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      // When no request ID is set, the log should not have a request ID prefix
      expect(args[0]).not.toContain('[req-');
      expect(args[0]).toContain('[INFO]');
      expect(args[0]).toContain('[API]');
    });
  });

  describe('PHI Redaction', () => {
    it('should redact blood glucose values', () => {
      service.info('Sync', 'Data synchronized', {
        bloodGlucose: 120,
        timestamp: '2025-01-03T10:00:00Z',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('120');
    });

    it('should redact multiple PHI fields', () => {
      service.info('API', 'User data retrieved', {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        glucose: 150,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('John');
      expect(output).not.toContain('Doe');
      expect(output).not.toContain('john@example.com');
      expect(output).not.toContain('150');
      expect(output).toContain('user-123'); // userId should not be redacted
    });

    it('should redact PHI in nested objects', () => {
      service.info('Sync', 'Reading synced', {
        reading: {
          value: 180,
          timestamp: '2025-01-03T10:00:00Z',
        },
        metadata: {
          userId: 'user-456',
        },
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('180');
    });

    it('should redact PHI in arrays', () => {
      service.info('Sync', 'Multiple readings synced', {
        readings: [
          { glucose: 120, timestamp: '2025-01-03T10:00:00Z' },
          { glucose: 135, timestamp: '2025-01-03T11:00:00Z' },
        ],
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('120');
      expect(output).not.toContain('135');
    });

    it('should preserve non-PHI data', () => {
      service.info('API', 'Request completed', {
        userId: 'user-789',
        statusCode: 200,
        duration: 150,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('user-789');
      expect(output).toContain('200');
      expect(output).toContain('150');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at TestClass.method()';
      service.error('Error', 'Operation failed', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const args = consoleErrorSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('Test error');
    });

    it('should handle non-Error objects', () => {
      const customError = {
        code: 'NETWORK_ERROR',
        details: 'Connection timeout',
      };
      service.error('API', 'Request failed', customError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const args = consoleErrorSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('NETWORK_ERROR');
    });

    it('should handle string errors', () => {
      service.error('Error', 'Operation failed', 'Simple error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const args = consoleErrorSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('Simple error message');
    });
  });

  describe('Context Logging', () => {
    it('should log without context', () => {
      service.info('API', 'Simple message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      expect(args[0]).toContain('Simple message');
    });

    it('should log with context', () => {
      service.info('API', 'Message with context', {
        endpoint: '/api/test',
        method: 'GET',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const args = consoleLogSpy.mock.calls.slice(-1)[0];
      const output = args[0] + (args[2] || '');
      expect(output).toContain('endpoint');
      expect(output).toContain('/api/test');
    });

    it('should handle null context', () => {
      service.info('API', 'Message with null context', null as any);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle undefined context', () => {
      service.info('API', 'Message with undefined context', undefined);

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});

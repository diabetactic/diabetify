import { Injectable } from '@angular/core';

/**
 * Logger service for debugging with request tracking
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private requestId: string | null = null;
  private readonly phiPatterns = [
    'bloodglucose',
    'glucose',
    'timestamp',
    'firstname',
    'lastname',
    'email',
    'reading',
    'readings',
    'value',
  ];

  /**
   * Set current request ID for tracking
   */
  setRequestId(id: string): void {
    this.requestId = id;
  }

  /**
   * Get current request ID
   */
  getRequestId(): string | null {
    return this.requestId;
  }

  /**
   * Log info message
   */
  info(context: string, message: string, data?: unknown): void {
    this.writeLog('INFO', context, message, data);
  }

  /**
   * Log warning message
   */
  warn(context: string, message: string, metadata?: unknown): void {
    this.writeLog('WARN', context, message, metadata, console.warn);
  }

  /**
   * Log error message
   */
  error(context: string, message: string, error?: unknown, metadata?: unknown): void {
    const serializedError = this.serializeError(error);
    this.writeLog('ERROR', context, message, metadata, console.error, serializedError);
  }

  /**
   * Log debug message
   */
  debug(context: string, message: string, metadata?: unknown): void {
    this.writeLog('DEBUG', context, message, metadata, console.debug);
  }

  /**
   * Build and emit a log entry
   */
  private writeLog(
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    context: string,
    message: string,
    metadata?: unknown,
    logger: (...args: unknown[]) => void = console.log,
    errorDetails?: string | null
  ): void {
    const timestamp = new Date().toISOString();
    const requestPrefix = this.requestId ? `[${this.requestId}] ` : '';
    const sanitizedMetadata = this.formatMetadata(metadata);

    let formattedMessage = `${timestamp} [${level}] ${requestPrefix}[${context}] ${message}`;

    if (errorDetails) {
      formattedMessage += ` | ${errorDetails}`;
    }

    if (sanitizedMetadata) {
      formattedMessage += ` ${sanitizedMetadata}`;
    }

    logger(formattedMessage);
  }

  /**
   * Prepare metadata for safe logging
   */
  private formatMetadata(metadata?: unknown): string | null {
    if (metadata === undefined || metadata === null) {
      return null;
    }

    const sanitized = this.sanitizeValue(metadata);
    if (sanitized === undefined || sanitized === null) {
      return null;
    }

    if (typeof sanitized === 'string') {
      return sanitized;
    }

    try {
      return JSON.stringify(sanitized);
    } catch {
      return String(sanitized);
    }
  }

  /**
   * Recursively sanitize metadata, redacting PHI fields.
   */
  private sanitizeValue(value: unknown, key?: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      if (key && this.isPhiKey(key)) {
        return '[REDACTED]';
      }
      return value.map(item => this.sanitizeValue(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      Object.entries(value).forEach(([childKey, childValue]) => {
        sanitized[childKey] = this.sanitizeValue(childValue, childKey);
      });
      return sanitized;
    }

    if (key && this.isPhiKey(key)) {
      return '[REDACTED]';
    }

    return value;
  }

  private isPhiKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return this.phiPatterns.some(pattern => normalized.includes(pattern));
  }

  private serializeError(error: unknown): string | null {
    if (!error) {
      return null;
    }

    if (error instanceof Error) {
      return error.stack ? `${error.name}: ${error.message}` : error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}

/**
 * Logger Service
 *
 * Centralized logging service for debugging with:
 * - Environment-aware verbosity (verbose in dev, minimal in prod)
 * - Category-based logging (Init, API, Auth, Sync, UI, Error)
 * - Log levels (debug, info, warn, error)
 * - Request ID tracking for distributed tracing
 * - PHI redaction for health data protection
 * - Console output with timestamps and colors
 *
 * Usage:
 * ```typescript
 * logger.info('Auth', 'User logged in', { userId, provider });
 * logger.error('API', 'Request failed', error, { requestId, endpoint });
 * logger.debug('Sync', 'Data synchronized', { recordCount });
 * ```
 */

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Log levels ordered by severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log categories for organizing and filtering logs
 */
export type LogCategory = 'Init' | 'API' | 'Auth' | 'Sync' | 'UI' | 'Error';

/**
 * Console colors for different log levels
 */
const LOG_COLORS = {
  [LogLevel.DEBUG]: '#9E9E9E', // Gray
  [LogLevel.INFO]: '#2196F3', // Blue
  [LogLevel.WARN]: '#FF9800', // Orange
  [LogLevel.ERROR]: '#F44336', // Red
};

/**
 * Console colors for different categories
 */
const CATEGORY_COLORS: Record<LogCategory, string> = {
  Init: '#4CAF50', // Green
  API: '#2196F3', // Blue
  Auth: '#9C27B0', // Purple
  Sync: '#FF9800', // Orange
  UI: '#00BCD4', // Cyan
  Error: '#F44336', // Red
};

/**
 * Fields that may contain PHI (Protected Health Information)
 * These will be redacted in logs to comply with HIPAA/privacy regulations
 */
const PHI_FIELDS = [
  'bloodGlucose',
  'glucose',
  'reading',
  'value',
  'hba1c',
  'insulin',
  'carbs',
  'weight',
  'bloodPressure',
  'healthData',
  'medicalRecord',
  'diagnosis',
  'medication',
  'firstName',
  'lastName',
  'dateOfBirth',
  'ssn',
  'email',
  'phone',
  'address',
];

/**
 * Logger Service
 *
 * Provides structured logging with category-based organization,
 * environment-aware verbosity, and PHI redaction
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  /**
   * Minimum log level to display based on environment
   */
  private readonly minLogLevel: LogLevel;

  /**
   * Whether console logging is enabled
   */
  private readonly consoleEnabled: boolean;

  /**
   * Current request ID for distributed tracing
   * Set by interceptors or manually via setRequestId()
   */
  private currentRequestId: string | null = null;

  constructor() {
    // Configure based on environment
    this.consoleEnabled = environment.logging?.enableConsole ?? !environment.production;

    // Map string log level to enum
    const envLogLevel =
      environment.logging?.logLevel || (environment.production ? 'error' : 'debug');
    this.minLogLevel = this.parseLogLevel(envLogLevel);
  }

  /**
   * Log debug message (verbose details for development)
   */
  debug(category: LogCategory, message: string, context?: any): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  /**
   * Log info message (general informational messages)
   */
  info(category: LogCategory, message: string, context?: any): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  /**
   * Log warning message (potential issues)
   */
  warn(category: LogCategory, message: string, context?: any): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  /**
   * Log error message (errors and exceptions)
   */
  error(category: LogCategory, message: string, error?: any, context?: any): void {
    // Combine error and context
    const fullContext = {
      ...context,
      error: this.serializeError(error),
    };
    this.log(LogLevel.ERROR, category, message, fullContext);
  }

  /**
   * Set the current request ID for distributed tracing
   * This should be called by interceptors or at the start of operations
   */
  setRequestId(requestId: string | null): void {
    this.currentRequestId = requestId;
  }

  /**
   * Get the current request ID
   */
  getRequestId(): string | null {
    return this.currentRequestId;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: LogCategory, message: string, context?: any): void {
    // Skip if below minimum log level
    if (level < this.minLogLevel) {
      return;
    }

    // Skip if console is disabled
    if (!this.consoleEnabled) {
      return;
    }

    // Build log entry
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const requestId = this.currentRequestId || 'no-request-id';

    // Redact PHI from context
    const sanitizedContext = context ? this.redactPHI(context) : undefined;

    // Format log message
    const logEntry = {
      timestamp,
      level: levelName,
      category,
      requestId,
      message,
      ...(sanitizedContext && { context: sanitizedContext }),
    };

    // Output to console with colors
    this.outputToConsole(level, category, logEntry);
  }

  /**
   * Output log entry to console with colors and formatting
   */
  private outputToConsole(level: LogLevel, category: LogCategory, logEntry: any): void {
    const levelColor = LOG_COLORS[level];
    const categoryColor = CATEGORY_COLORS[category];
    const levelName = LogLevel[level];

    // Format: [TIMESTAMP] [LEVEL] [CATEGORY] [REQUEST_ID] message {context}
    const prefix = `[${logEntry.timestamp}] [${levelName}] [${category}] [${logEntry.requestId}]`;
    const contextStr = logEntry.context ? `\n${JSON.stringify(logEntry.context, null, 2)}` : '';

    // Use appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(
          `%c${prefix}%c ${logEntry.message}${contextStr}`,
          `color: ${levelColor}; font-weight: bold`,
          'color: inherit'
        );
        break;
      case LogLevel.INFO:
        console.log(
          `%c${prefix}%c ${logEntry.message}${contextStr}`,
          `color: ${levelColor}; font-weight: bold`,
          'color: inherit'
        );
        break;
      case LogLevel.WARN:
        console.warn(
          `%c${prefix}%c ${logEntry.message}${contextStr}`,
          `color: ${levelColor}; font-weight: bold`,
          'color: inherit'
        );
        break;
      case LogLevel.ERROR:
        console.error(
          `%c${prefix}%c ${logEntry.message}${contextStr}`,
          `color: ${levelColor}; font-weight: bold`,
          'color: inherit'
        );
        break;
    }
  }

  /**
   * Parse log level string to enum
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Redact PHI (Protected Health Information) from context object
   * Replaces sensitive fields with [REDACTED] to comply with privacy regulations
   */
  private redactPHI(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.redactPHI(item));
    }

    // Handle objects
    const redacted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Check if key matches PHI field (case-insensitive)
        const isPHI = PHI_FIELDS.some(phiField => phiField.toLowerCase() === key.toLowerCase());

        if (isPHI) {
          redacted[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          // Recursively redact nested objects
          redacted[key] = this.redactPHI(obj[key]);
        } else {
          redacted[key] = obj[key];
        }
      }
    }

    return redacted;
  }

  /**
   * Serialize Error objects for logging
   * Extracts useful information from Error instances
   */
  private serializeError(error: any): any {
    if (!error) {
      return undefined;
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any), // Include any additional properties
      };
    }

    // If it's already an object, return as-is
    if (typeof error === 'object') {
      return error;
    }

    // Convert primitives to string
    return String(error);
  }
}

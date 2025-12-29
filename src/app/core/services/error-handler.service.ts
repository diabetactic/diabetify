/**
 * ErrorHandlerService - Centralized error handling for HTTP requests
 * Provides standardized error messages and logging
 */

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '@env/environment';
import {
  AppError,
  ErrorCategory,
  extractErrorMessage,
  getErrorCategoryFromStatus,
} from '../models/http-error.model';

// Re-export types for consumers of this service
export { AppError, ErrorCategory } from '../models/http-error.model';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  /**
   * Handle HTTP error response
   */
  handleError(error: HttpErrorResponse): Observable<never> {
    const appError = this.parseHttpError(error);

    // Log error if enabled
    if (environment.logging.enableApiLogging) {
      this.logError(appError, error);
    }

    return throwError(() => appError);
  }

  /**
   * Parse HTTP error into standardized AppError
   */
  parseHttpError(error: HttpErrorResponse): AppError {
    const timestamp = new Date().toISOString();

    // Client-side or network error
    if (error.error instanceof ErrorEvent) {
      return {
        message: 'Network error occurred. Please check your connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        details: { message: error.error.message } as Record<string, unknown>,
        timestamp,
      };
    }

    // Server-side error
    const statusCode = error.status;
    let message: string;
    let code: string;

    switch (statusCode) {
      case 0:
        message = 'Unable to connect to server. Please check your internet connection.';
        code = 'CONNECTION_ERROR';
        break;

      case 400:
        message = this.extractServerMessage(error) || 'Invalid request. Please check your input.';
        code = 'BAD_REQUEST';
        break;

      case 401:
        message = 'Authentication required. Please log in again.';
        code = 'UNAUTHORIZED';
        break;

      case 403:
        message = "Access denied. You don't have permission to perform this action.";
        code = 'FORBIDDEN';
        break;

      case 404:
        message = 'Resource not found.';
        code = 'NOT_FOUND';
        break;

      case 408:
        message = 'Request timeout. Please try again.';
        code = 'TIMEOUT';
        break;

      case 409:
        message = 'Conflict with existing data.';
        code = 'CONFLICT';
        break;

      case 422:
        message = this.extractServerMessage(error) || 'Validation error. Please check your input.';
        code = 'VALIDATION_ERROR';
        break;

      case 429:
        message = 'Too many requests. Please wait and try again.';
        code = 'RATE_LIMIT';
        break;

      case 500:
        message = 'Server error. Please try again later.';
        code = 'INTERNAL_SERVER_ERROR';
        break;

      case 502:
        message = 'Server is temporarily unavailable. Please try again.';
        code = 'BAD_GATEWAY';
        break;

      case 503:
        message = 'Service unavailable. Please try again later.';
        code = 'SERVICE_UNAVAILABLE';
        break;

      case 504:
        message = 'Server timeout. Please try again.';
        code = 'GATEWAY_TIMEOUT';
        break;

      default:
        message =
          this.extractServerMessage(error) || 'An unexpected error occurred. Please try again.';
        code = 'UNKNOWN_ERROR';
    }

    return {
      message,
      code,
      statusCode,
      details: error.error,
      timestamp,
    };
  }

  /**
   * Extract error message from server response using type-safe extraction
   */
  private extractServerMessage(error: HttpErrorResponse): string | null {
    if (!error.error) {
      return null;
    }

    // Use type-safe error extraction from http-error.model
    const message = extractErrorMessage(error.error);

    // extractErrorMessage returns a default message if nothing found
    // Return null if we got the default to let caller use their own default
    if (message === 'An unknown error occurred') {
      return null;
    }

    return message;
  }

  /**
   * Get error category for additional handling logic
   * Uses centralized category mapping from http-error.model
   */
  getErrorCategory(error: AppError): ErrorCategory {
    // Use the centralized category mapping (handles all status codes)
    return getErrorCategoryFromStatus(error.statusCode);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AppError): boolean {
    if (!error.statusCode) {
      return true; // Network errors are retryable
    }

    // Retry server errors and timeouts
    return error.statusCode >= 500 || error.statusCode === 408 || error.statusCode === 429;
  }

  /**
   * Log error to console (development) or error tracking service (production)
   * Sensitive health information (PHI) is redacted before logging
   */
  private logError(appError: AppError, originalError: HttpErrorResponse): void {
    const category = this.getErrorCategory(appError);

    const logData = {
      category,
      error: this.redactPHI(appError),
      url: originalError.url,
      method: originalError.status ? 'HTTP' : 'Unknown',
      timestamp: appError.timestamp,
    };

    if (environment.logging.enableConsole) {
      console.error('[HTTP Error]', logData);
    }

    // Send to error tracking service in production
    if (environment.production && environment.features.crashReporting) {
      this.sendToErrorTracking(logData);
    }
  }

  /**
   * Send error data to external error tracking service
   * Placeholder for integration with services like Sentry, Bugsnag, etc.
   */
  private sendToErrorTracking(logData: unknown): void {
    // TODO: Integrate with error tracking service (Sentry, Bugsnag, etc.)
    // For now, this is a no-op placeholder
    void logData;
  }

  /**
   * Redact Protected Health Information (PHI) from error objects
   * Removes sensitive glucose and diabetes-related data before logging
   *
   * @param error - AppError object potentially containing PHI
   * @returns AppError with sensitive fields redacted
   */
  private redactPHI(error: AppError): AppError {
    if (!error.details) {
      return error;
    }

    // List of sensitive fields that contain PHI (HIPAA compliance)
    const sensitiveFields = [
      // Glucose/medical data
      'glucoseValue',
      'readingValue',
      'hba1c',
      'rawReadings',
      'glucose',
      'reading',
      'cgm',
      'bloodGlucose',
      'bloodSugar',
      'readings',
      // Insulin/medication data
      'insulin',
      'insulinDose',
      'bolusAmount',
      'basalRate',
      'carbRatio',
      'correctionFactor',
      // Personal identifiers
      'phoneNumber',
      'phone',
      'dateOfBirth',
      'dob',
      'birthDate',
      'ssn',
      'socialSecurityNumber',
      // Medical history
      'medicalHistory',
      'diagnosis',
      'medications',
      'allergies',
      // Authentication tokens (prevent token leakage)
      'accessToken',
      'refreshToken',
      'token',
      'password',
      'credentials',
    ];

    // Create a deep copy and redact sensitive fields
    const redactedDetails = this.redactObject(error.details, sensitiveFields);

    return {
      ...error,
      details: redactedDetails as Record<string, unknown> | undefined,
    };
  }

  /**
   * Recursively redact sensitive fields from an object
   *
   * @param obj - Object to redact
   * @param sensitiveFields - Array of field names to redact
   * @returns Object with sensitive fields redacted
   */
  private redactObject(obj: unknown, sensitiveFields: string[]): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item, sensitiveFields));
    }

    const redacted: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          redacted[key] = '[REDACTED]';
        } else if (typeof objRecord[key] === 'object') {
          redacted[key] = this.redactObject(objRecord[key], sensitiveFields);
        } else {
          redacted[key] = objRecord[key];
        }
      }
    }
    return redacted;
  }

  /**
   * Create user-friendly error message
   */
  getUserMessage(error: AppError): string {
    // For production, show simplified messages
    if (environment.production) {
      const category = this.getErrorCategory(error);

      switch (category) {
        case ErrorCategory.NETWORK:
          return 'Connection problem. Please check your internet.';
        case ErrorCategory.AUTHENTICATION:
          return 'Please log in again.';
        case ErrorCategory.AUTHORIZATION:
          return "You don't have permission for this action.";
        case ErrorCategory.SERVER:
          return 'Server error. Please try again later.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }

    // For development, show detailed message
    return error.message;
  }
}

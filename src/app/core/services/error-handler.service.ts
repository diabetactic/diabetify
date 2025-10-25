/**
 * ErrorHandlerService - Centralized error handling for HTTP requests
 * Provides standardized error messages and logging
 */

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Standardized error structure
 */
export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
  timestamp: string;
}

/**
 * Error categories for better handling
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN',
}

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
  private parseHttpError(error: HttpErrorResponse): AppError {
    const timestamp = new Date().toISOString();

    // Client-side or network error
    if (error.error instanceof ErrorEvent) {
      return {
        message: 'Network error occurred. Please check your connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        details: error.error.message,
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
   * Extract error message from server response
   */
  private extractServerMessage(error: HttpErrorResponse): string | null {
    if (!error.error) {
      return null;
    }

    // Try common error message fields
    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error.message) {
      return error.error.message;
    }

    if (error.error.error) {
      return typeof error.error.error === 'string' ? error.error.error : error.error.error.message;
    }

    if (error.error.errors && Array.isArray(error.error.errors) && error.error.errors.length > 0) {
      return error.error.errors[0].message || error.error.errors[0];
    }

    return null;
  }

  /**
   * Get error category for additional handling logic
   */
  getErrorCategory(error: AppError): ErrorCategory {
    if (!error.statusCode) {
      return ErrorCategory.NETWORK;
    }

    if (error.statusCode === 401) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (error.statusCode === 403) {
      return ErrorCategory.AUTHORIZATION;
    }

    if (error.statusCode === 400 || error.statusCode === 422) {
      return ErrorCategory.VALIDATION;
    }

    if (error.statusCode >= 500) {
      return ErrorCategory.SERVER;
    }

    if (error.statusCode >= 400 && error.statusCode < 500) {
      return ErrorCategory.CLIENT;
    }

    return ErrorCategory.UNKNOWN;
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
   */
  private logError(appError: AppError, originalError: HttpErrorResponse): void {
    const category = this.getErrorCategory(appError);

    const logData = {
      category,
      error: appError,
      url: originalError.url,
      method: originalError.status ? 'HTTP' : 'Unknown',
      timestamp: appError.timestamp,
    };

    if (environment.logging.enableConsole) {
      console.error('[HTTP Error]', logData);
    }

    // TODO: Send to error tracking service in production
    // if (environment.production && environment.features.crashReporting) {
    //   this.sendToErrorTracking(logData);
    // }
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

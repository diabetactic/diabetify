/**
 * HTTP Error Models and Type Guards
 * Provides type-safe error handling for API responses
 */

/**
 * Structured error body from API responses
 */
export interface HttpErrorBody {
  /** Primary error message */
  message?: string;
  /** Nested error (can be string or object) */
  error?: string | { message?: string };
  /** Array of validation errors */
  errors?: Array<string | { message?: string; field?: string }>;
  /** FastAPI-style detail field */
  detail?: string | Array<{ msg?: string; detail?: string; loc?: string[]; type?: string }>;
  /** Error code for categorization */
  code?: string;
}

/**
 * Standardized API error response structure
 */
export interface ApiErrorResponse {
  /** Nested error object */
  error?: HttpErrorBody;
  /** HTTP status code */
  status?: number;
  /** Top-level message */
  message?: string;
  /** Whether this was a timeout error */
  isTimeout?: boolean;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * App-level error structure used throughout the application
 */
export interface AppError {
  message: string;
  code: string;
  statusCode?: number;
  details?: unknown;
  timestamp: string;
  requestId?: string;
  category?: ErrorCategory;
}

/**
 * Error categories for handling logic
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN',
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if object has a specific property
 */
export function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is HttpErrorBody
 */
export function isHttpErrorBody(value: unknown): value is HttpErrorBody {
  if (!isObject(value)) return false;

  // At least one expected field should exist
  return (
    'message' in value ||
    'error' in value ||
    'errors' in value ||
    'detail' in value ||
    'code' in value
  );
}

/**
 * Check if value is ApiErrorResponse
 */
export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isObject(value)) return false;

  // Check for typical API error response structure
  return 'error' in value || 'status' in value || 'message' in value;
}

/**
 * Safely extract error message from unknown error
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  if (isString(error)) return error;

  if (error instanceof Error) {
    return error.message;
  }

  if (isObject(error)) {
    // Try common message fields
    if (hasProperty(error, 'message') && isString(error['message'])) {
      return error['message'];
    }
    if (hasProperty(error, 'error')) {
      if (isString(error['error'])) return error['error'];
      const nestedError = error['error'];
      if (
        isObject(nestedError) &&
        hasProperty(nestedError, 'message') &&
        isString(nestedError['message'])
      ) {
        return nestedError['message'];
      }
    }
    if (hasProperty(error, 'detail')) {
      if (isString(error['detail'])) return error['detail'];
      const detail = error['detail'];
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        if (isObject(first)) {
          if (hasProperty(first, 'msg') && isString(first['msg'])) return first['msg'];
          if (hasProperty(first, 'detail') && isString(first['detail'])) return first['detail'];
        }
      }
    }
    if (hasProperty(error, 'errors')) {
      const errors = error['errors'];
      if (Array.isArray(errors) && errors.length > 0) {
        const first = errors[0];
        if (isString(first)) return first;
        if (isObject(first) && hasProperty(first, 'message') && isString(first['message'])) {
          return first['message'];
        }
      }
    }
  }

  return 'An unknown error occurred';
}

/**
 * Safely extract HTTP status code from error
 */
export function extractStatusCode(error: unknown): number | undefined {
  if (!isObject(error)) return undefined;

  if (hasProperty(error, 'status') && typeof error['status'] === 'number') {
    return error['status'];
  }
  if (hasProperty(error, 'statusCode') && typeof error['statusCode'] === 'number') {
    return error['statusCode'];
  }

  return undefined;
}

/**
 * Determine error category from status code
 */
export function getErrorCategoryFromStatus(statusCode?: number): ErrorCategory {
  if (!statusCode) return ErrorCategory.NETWORK;

  if (statusCode === 401) return ErrorCategory.AUTHENTICATION;
  if (statusCode === 403) return ErrorCategory.AUTHORIZATION;
  if (statusCode === 404) return ErrorCategory.NOT_FOUND;
  if (statusCode === 409) return ErrorCategory.CONFLICT;
  if (statusCode === 422 || statusCode === 400) return ErrorCategory.VALIDATION;
  if (statusCode === 429) return ErrorCategory.RATE_LIMIT;
  if (statusCode === 408 || statusCode === 504) return ErrorCategory.TIMEOUT;
  if (statusCode >= 500) return ErrorCategory.SERVER;
  if (statusCode >= 400 && statusCode < 500) return ErrorCategory.CLIENT;

  return ErrorCategory.UNKNOWN;
}

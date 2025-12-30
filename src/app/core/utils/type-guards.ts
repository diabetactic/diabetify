/**
 * Generic Type Guards and Validation Utilities
 * Provides runtime type safety for dynamic data
 */

import { AccountState } from '../models/user-profile.model';

// ============================================================================
// Basic Type Guards
// ============================================================================

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a non-empty string
 * @internal Exported for potential future use in validation utilities
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid number (not NaN, not Infinity)
 * @internal Exported for potential future use in validation utilities
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Check if value is a valid array
 * @internal Exported for potential future use in validation utilities
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

// ============================================================================
// Domain-Specific Type Guards
// ============================================================================

/**
 * LocalUser interface for type guard (avoids circular dependency)
 */
interface LocalUserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'doctor' | 'admin';
  accountState?: AccountState;
  profileImage?: string;
  phone?: string;
  dateOfBirth?: string;
  diabetesType?: '1' | '2' | 'gestational' | 'other';
  diagnosisDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validate LocalUser structure from storage
 */
export function isLocalUser(data: unknown): data is LocalUserType {
  if (!isObject(data)) return false;

  // Required fields
  const hasId = 'id' in data && (typeof data['id'] === 'string' || typeof data['id'] === 'number');
  const hasEmail =
    'email' in data &&
    (typeof data['email'] === 'string' || data['email'] === null || data['email'] === undefined);

  // At least id must be present
  return hasId && hasEmail !== false;
}

/**
 * Validate glucose reading structure
 * @internal Exported for potential future use in data validation
 */
export function isGlucoseReading(data: unknown): data is {
  id: string;
  value: number;
  time: string;
} {
  if (!isObject(data)) return false;

  return (
    'id' in data &&
    typeof data['id'] === 'string' &&
    'value' in data &&
    typeof data['value'] === 'number' &&
    'time' in data &&
    typeof data['time'] === 'string'
  );
}

/**
 * Validate account state enum value
 * @internal Exported for potential future use in auth validation
 */
export function isValidAccountState(
  state: unknown
): state is 'active' | 'pending' | 'suspended' | 'inactive' {
  return (
    typeof state === 'string' &&
    ['active', 'pending', 'suspended', 'inactive'].includes(state.toLowerCase())
  );
}

// ============================================================================
// Safe JSON Parsing
// ============================================================================

/**
 * Safely parse JSON with validation
 * Returns null if parsing fails or validation fails
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  validator?: (data: unknown) => data is T
): T | null {
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);

    if (validator) {
      return validator(parsed) ? parsed : null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Safely parse JSON with a default value
 * @internal Exported for potential future use in storage utilities
 */
export function safeJsonParseWithDefault<T>(
  json: string | null | undefined,
  defaultValue: T,
  validator?: (data: unknown) => data is T
): T {
  const parsed = safeJsonParse(json, validator);
  return parsed ?? defaultValue;
}

// ============================================================================
// Property Access Helpers
// ============================================================================

/**
 * Safely get a string property from an object
 * @internal Exported for potential future use in property access utilities
 */
export function getStringProperty(obj: unknown, key: string): string | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely get a number property from an object
 * @internal Exported for potential future use in property access utilities
 */
export function getNumberProperty(obj: unknown, key: string): number | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Safely get a boolean property from an object
 * @internal Exported for potential future use in property access utilities
 */
export function getBooleanProperty(obj: unknown, key: string): boolean | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Safely get an array property from an object
 * @internal Exported for potential future use in property access utilities
 */
export function getArrayProperty<T>(obj: unknown, key: string): T[] | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return Array.isArray(value) ? (value as T[]) : undefined;
}

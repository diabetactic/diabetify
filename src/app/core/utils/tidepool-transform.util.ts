/**
 * Tidepool Data Transformation Utilities
 *
 * Pure functions for transforming Tidepool glucose readings to local storage format.
 * All functions are stateless and side-effect free.
 *
 * @module TidepoolTransformUtil
 */

import {
  GlucoseReading,
  LocalGlucoseReading,
  GlucoseUnit,
  GlucoseStatus,
} from '../models/glucose-reading.model';

/**
 * Conversion factor for glucose unit transformation
 * 1 mmol/L = 18.0182 mg/dL
 */
const MMOLL_TO_MGDL = 18.0182;

/**
 * Transform a Tidepool glucose reading to local storage format
 *
 * Preserves all Tidepool fields and adds local-specific metadata:
 * - localId: Unique local identifier
 * - synced: Always true for Tidepool-sourced data
 * - userId: User identifier for multi-user support
 * - localStoredAt: Timestamp when stored locally
 * - isLocalOnly: Always false for Tidepool data
 * - status: Derived glucose status based on value
 *
 * @param reading - Tidepool glucose reading (CBG or SMBG)
 * @param userId - User identifier to associate with reading
 * @returns LocalGlucoseReading with all local fields populated
 *
 * @example
 * ```typescript
 * const tidepoolReading: CBGReading = {
 *   id: 'tp_12345',
 *   type: 'cbg',
 *   value: 120,
 *   units: 'mg/dL',
 *   time: '2025-01-15T10:30:00.000Z',
 *   deviceId: 'dexcom_g6'
 * };
 *
 * const localReading = transformTidepoolToLocal(tidepoolReading, 'user_abc');
 * // Result: {
 * //   ...tidepoolReading,
 * //   localId: 'local_1736938200000_xyz123456',
 * //   synced: true,
 * //   userId: 'user_abc',
 * //   localStoredAt: '2025-01-15T10:30:00.000Z',
 * //   isLocalOnly: false,
 * //   status: 'normal'
 * // }
 * ```
 */
export function transformTidepoolToLocal(
  reading: GlucoseReading,
  userId: string
): LocalGlucoseReading {
  if (!reading) {
    throw new Error('Reading cannot be null or undefined');
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('userId must be a non-empty string');
  }

  const localReading: LocalGlucoseReading = {
    // Preserve all Tidepool fields (spread operator maintains type discrimination)
    ...reading,

    // Add local-specific fields
    localId: generateLocalId(),
    synced: true, // Always true since it came from Tidepool
    userId: userId.trim(),
    localStoredAt: new Date().toISOString(),
    isLocalOnly: false, // Not a local-only reading
    status: calculateGlucoseStatus(reading.value, reading.units),
  };

  return localReading;
}

/**
 * Calculate glucose status based on value and unit
 *
 * Uses standard clinical ranges (converted to mg/dL for comparison):
 * - Critical Low: < 54 mg/dL (< 3.0 mmol/L)
 * - Low: 54-69 mg/dL (3.0-3.8 mmol/L)
 * - Normal: 70-180 mg/dL (3.9-10.0 mmol/L)
 * - High: 181-250 mg/dL (10.1-13.9 mmol/L)
 * - Critical High: > 250 mg/dL (> 13.9 mmol/L)
 *
 * @param value - Glucose concentration value
 * @param unit - Unit of measurement ('mg/dL' or 'mmol/L')
 * @returns GlucoseStatus enum value
 *
 * @example
 * ```typescript
 * calculateGlucoseStatus(120, 'mg/dL');     // 'normal'
 * calculateGlucoseStatus(6.7, 'mmol/L');    // 'normal' (equals ~120 mg/dL)
 * calculateGlucoseStatus(50, 'mg/dL');      // 'critical-low'
 * calculateGlucoseStatus(300, 'mg/dL');     // 'critical-high'
 * calculateGlucoseStatus(185, 'mg/dL');     // 'high'
 * calculateGlucoseStatus(65, 'mg/dL');      // 'low'
 * ```
 */
export function calculateGlucoseStatus(value: number, unit: GlucoseUnit): GlucoseStatus {
  if (value == null || typeof value !== 'number' || !isFinite(value)) {
    throw new Error('Value must be a finite number');
  }

  if (value < 0) {
    throw new Error('Glucose value cannot be negative');
  }

  if (unit !== 'mg/dL' && unit !== 'mmol/L') {
    throw new Error(`Invalid unit: ${unit}. Must be 'mg/dL' or 'mmol/L'`);
  }

  if (unit === 'mmol/L') {
    if (value < 3.0) return 'critical-low';
    if (value < 3.9) return 'low';
    if (value >= 13.9) return 'critical-high';
    if (value > 10.0) return 'high';
    return 'normal';
  }

  if (value < 54) return 'critical-low';
  if (value < 70) return 'low';
  if (value > 250) return 'critical-high';
  if (value > 180) return 'high';
  return 'normal';
}

/**
 * Transform multiple Tidepool readings to local format
 *
 * Batch transformation utility that applies transformTidepoolToLocal to an array.
 * Handles empty arrays gracefully and maintains order.
 *
 * @param readings - Array of Tidepool glucose readings
 * @param userId - User identifier to associate with all readings
 * @returns Array of LocalGlucoseReading objects
 *
 * @example
 * ```typescript
 * const tidepoolReadings: GlucoseReading[] = [
 *   { id: '1', type: 'cbg', value: 120, units: 'mg/dL', time: '2025-01-15T10:00:00Z' },
 *   { id: '2', type: 'cbg', value: 130, units: 'mg/dL', time: '2025-01-15T10:05:00Z' }
 * ];
 *
 * const localReadings = transformBatch(tidepoolReadings, 'user_abc');
 * // Returns array of 2 LocalGlucoseReading objects
 * ```
 *
 * @example
 * ```typescript
 * // Empty array handling
 * const emptyResult = transformBatch([], 'user_abc');
 * // Returns: []
 * ```
 */
export function transformBatch(readings: GlucoseReading[], userId: string): LocalGlucoseReading[] {
  if (!Array.isArray(readings)) {
    throw new Error('readings must be an array');
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('userId must be a non-empty string');
  }

  // Handle empty array
  if (readings.length === 0) {
    return [];
  }

  // Transform each reading
  return readings.map(reading => transformTidepoolToLocal(reading, userId));
}

/**
 * Convert glucose value between units
 *
 * Handles bidirectional conversion between mg/dL and mmol/L using the
 * standard conversion factor of 18.0182. Returns unchanged value if
 * converting between the same unit.
 *
 * Conversion formulas:
 * - mmol/L to mg/dL: value × 18.0182
 * - mg/dL to mmol/L: value ÷ 18.0182
 *
 * @param value - Glucose concentration value
 * @param from - Source unit
 * @param to - Target unit
 * @returns Converted glucose value
 *
 * @example
 * ```typescript
 * convertGlucoseUnit(120, 'mg/dL', 'mmol/L');  // 6.66 mmol/L
 * convertGlucoseUnit(6.7, 'mmol/L', 'mg/dL');  // 120.72 mg/dL
 * convertGlucoseUnit(120, 'mg/dL', 'mg/dL');   // 120 (no conversion)
 * ```
 */
export function convertGlucoseUnit(value: number, from: GlucoseUnit, to: GlucoseUnit): number {
  if (value == null || typeof value !== 'number' || !isFinite(value)) {
    throw new Error('Value must be a finite number');
  }

  if (value < 0) {
    throw new Error('Glucose value cannot be negative');
  }

  if (from !== 'mg/dL' && from !== 'mmol/L') {
    throw new Error(`Invalid source unit: ${from}. Must be 'mg/dL' or 'mmol/L'`);
  }

  if (to !== 'mg/dL' && to !== 'mmol/L') {
    throw new Error(`Invalid target unit: ${to}. Must be 'mg/dL' or 'mmol/L'`);
  }

  // No conversion needed
  if (from === to) {
    return value;
  }

  // mmol/L to mg/dL
  if (from === 'mmol/L' && to === 'mg/dL') {
    return value * MMOLL_TO_MGDL;
  }

  // mg/dL to mmol/L
  if (from === 'mg/dL' && to === 'mmol/L') {
    return value / MMOLL_TO_MGDL;
  }

  // Should never reach here due to type guards above
  return value;
}

/**
 * Generate a unique local identifier for readings
 *
 * Creates an identifier in the format: `local_${timestamp}_${random}`
 * where:
 * - timestamp: Current time in milliseconds since Unix epoch
 * - random: 9-character alphanumeric string
 *
 * This format ensures:
 * - Uniqueness across devices (due to random component)
 * - Sortability by creation time (timestamp prefix)
 * - Easy identification of local vs. Tidepool IDs (local_ prefix)
 *
 * @returns Unique local identifier string
 *
 * @example
 * ```typescript
 * generateLocalId();
 * // Returns: 'local_1736938200000_abc123xyz'
 *
 * generateLocalId();
 * // Returns: 'local_1736938200001_def456uvw' (different timestamp/random)
 * ```
 */
export function generateLocalId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11); // 9 chars
  return `local_${timestamp}_${random}`;
}

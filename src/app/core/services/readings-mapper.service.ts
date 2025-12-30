/**
 * ReadingsMapperService - Handles data mapping and unit conversions for glucose readings
 *
 * Responsibilities:
 * - Map backend API responses to local format
 * - Map local readings to backend API format
 * - Unit conversions (mg/dL <-> mmol/L)
 * - Glucose status calculations
 * - Timestamp parsing
 */

import { Injectable } from '@angular/core';
import { LocalGlucoseReading, GlucoseUnit, GlucoseStatus } from '@models/glucose-reading.model';
import { MockReading } from '@services/mock-data.service';

/**
 * Backend glucose reading format from Heroku API
 */
export interface BackendGlucoseReading {
  id: number;
  user_id: number;
  glucose_level: number;
  reading_type: string;
  created_at: string; // Format: "DD/MM/YYYY HH:mm:ss"
  notes?: string;
}

/**
 * Backend response for glucose readings (GET /glucose/mine)
 */
export interface BackendGlucoseResponse {
  readings: BackendGlucoseReading[];
}

/**
 * Argentina timezone offset (UTC-3) used by the backend
 */
const ARGENTINA_TIMEZONE_OFFSET = '-03:00';

@Injectable({
  providedIn: 'root',
})
export class ReadingsMapperService {
  // ============================================================================
  // Unit Conversion
  // ============================================================================

  /**
   * Convert glucose value between units
   * Conversion factor: 1 mmol/L = 18.0182 mg/dL
   */
  convertToUnit(value: number, from: GlucoseUnit, to: GlucoseUnit): number {
    if (from === to) return value;

    if (from === 'mmol/L' && to === 'mg/dL') {
      return value * 18.0182;
    } else if (from === 'mg/dL' && to === 'mmol/L') {
      return value / 18.0182;
    }

    return value;
  }

  /**
   * Convert value to mg/dL for consistent comparison
   */
  toMgDl(value: number, unit: GlucoseUnit): number {
    return unit === 'mmol/L' ? value * 18.0182 : value;
  }

  // ============================================================================
  // Status Calculation
  // ============================================================================

  /**
   * Calculate glucose status based on value and clinical ranges
   *
   * Ranges (in mg/dL):
   * - Critical Low: < 54
   * - Low: 54-69
   * - Normal: 70-179
   * - High: 180-250
   * - Critical High: > 250
   */
  calculateGlucoseStatus(value: number, unit: GlucoseUnit): GlucoseStatus {
    const mgdl = this.toMgDl(value, unit);

    if (mgdl < 54) return 'critical-low';
    if (mgdl < 70) return 'low';
    if (mgdl > 250) return 'critical-high';
    if (mgdl >= 180) return 'high';
    return 'normal';
  }

  // ============================================================================
  // Timestamp Parsing
  // ============================================================================

  /**
   * Parse backend timestamp format "DD/MM/YYYY HH:mm:ss" to milliseconds since epoch.
   * Backend stores in Argentina timezone (UTC-3), so we parse accordingly.
   */
  parseBackendTimestamp(createdAt: string): number {
    const [datePart, timePart] = createdAt.split(' ');
    const [day, month, year] = datePart.split('/');
    return new Date(`${year}-${month}-${day}T${timePart}${ARGENTINA_TIMEZONE_OFFSET}`).getTime();
  }

  /**
   * Format a Date object to backend timestamp format
   * Returns ISO 8601 format with timezone: YYYY-MM-DDTHH:mm:ssZ
   */
  formatToBackendTimestamp(date: Date): string {
    return `${date.toISOString().slice(0, 19)}Z`;
  }

  // ============================================================================
  // Backend to Local Mapping
  // ============================================================================

  /**
   * Map backend reading to local format
   */
  mapBackendToLocal(backend: BackendGlucoseReading): LocalGlucoseReading {
    const [datePart, timePart] = backend.created_at.split(' ');
    const [day, month, year] = datePart.split('/');
    const isoDate = new Date(
      `${year}-${month}-${day}T${timePart}${ARGENTINA_TIMEZONE_OFFSET}`
    ).toISOString();

    return {
      id: `backend_${backend.id}`,
      localId: `backend_${backend.id}`,
      backendId: backend.id,
      time: isoDate,
      value: backend.glucose_level,
      units: 'mg/dL',
      type: 'smbg' as const,
      subType: 'manual',
      deviceId: 'backend-sync',
      userId: backend.user_id.toString(),
      synced: true,
      localStoredAt: new Date().toISOString(),
      isLocalOnly: false,
      status: this.calculateGlucoseStatus(backend.glucose_level, 'mg/dL'),
      mealContext: backend.reading_type || 'OTRO',
      notes: backend.notes,
    };
  }

  /**
   * Map MockReading to LocalGlucoseReading
   */
  mapMockToLocal(mock: MockReading): LocalGlucoseReading {
    return {
      id: mock.id,
      localId: mock.id,
      time: mock.date.toISOString(),
      value: mock.glucose,
      units: 'mg/dL',
      type: 'smbg' as const,
      subType: 'manual',
      deviceId: 'mock-device',
      userId: 'pac001',
      synced: true,
      localStoredAt: new Date().toISOString(),
      isLocalOnly: false,
      status: this.calculateGlucoseStatus(mock.glucose, 'mg/dL'),
      notes: mock.notes,
    };
  }

  // ============================================================================
  // Local to Backend Mapping
  // ============================================================================

  /**
   * Build query params for creating a reading on the backend
   */
  buildBackendCreateParams(reading: LocalGlucoseReading): Record<string, string> {
    const params: Record<string, string> = {
      glucose_level: reading.value.toString(),
      reading_type: reading.mealContext || 'OTRO',
    };

    if (reading.time) {
      const date = new Date(reading.time);
      params['created_at'] = this.formatToBackendTimestamp(date);
    }

    if (reading.notes) {
      params['notes'] = reading.notes;
    }

    return params;
  }

  // ============================================================================
  // ID Generation
  // ============================================================================

  /**
   * Generate a unique local ID for readings
   */
  generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

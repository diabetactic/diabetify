/**
 * Glucose sharing models for sharing data with healthcare providers
 */

import { LocalGlucoseReading } from './glucose-reading.model';

/**
 * Glucose reading summary for sharing (privacy-first approach)
 */
export interface GlucoseReadingSummary {
  // Time range
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  daysOfData: number;

  // Basic statistics
  totalReadings: number;
  averageGlucose: number; // mg/dL
  medianGlucose: number; // mg/dL
  standardDeviation: number; // mg/dL
  coefficientOfVariation: number; // Percentage (CV%)

  // Estimated HbA1c
  estimatedHbA1c?: number; // Percentage
  estimatedGMI?: number; // Glucose Management Indicator

  // Time in Range metrics
  timeInRange: {
    veryLow: number; // < 54 mg/dL (percentage)
    low: number; // 54-69 mg/dL (percentage)
    normal: number; // 70-180 mg/dL (percentage)
    high: number; // 181-250 mg/dL (percentage)
    veryHigh: number; // > 250 mg/dL (percentage)
  };

  // Daily patterns (optional, for more detailed analysis)
  dailyAverages?: {
    morning?: number; // 6am-12pm
    afternoon?: number; // 12pm-6pm
    evening?: number; // 6pm-12am
    night?: number; // 12am-6am
  };

  // Reading type breakdown
  readingTypes: {
    manual: number; // Count of manual readings
    cgm: number; // Count of CGM readings
    meter: number; // Count of meter readings
  };
}

/**
 * Glucose share request model
 */
export interface GlucoseShareRequest {
  appointmentId: string;
  shareType: 'summary' | 'detailed';

  // Summary data (always included)
  summary: GlucoseReadingSummary;

  // Raw readings (only when explicitly consented)
  rawReadings?: LocalGlucoseReading[];

  // User consent tracking
  userConsent: boolean;
  consentTimestamp: string; // ISO 8601

  // Optional metadata
  notes?: string;
  shareReason?: string;
}

/**
 * Glucose share response model
 */
export interface GlucoseShareResponse {
  success: boolean;
  shareId: string;
  appointmentId: string;
  recordCount: number;
  sharedAt: string; // ISO 8601
  expiresAt?: string; // Optional expiration date for shared data
  message?: string;
}

/**
 * Glucose share status model
 */
export interface GlucoseShareStatus {
  appointmentId: string;
  sharedAt?: string;
  recordCount?: number;
  shareType?: 'summary' | 'detailed';
  status: 'not_shared' | 'shared' | 'expired' | 'error';
  errorMessage?: string;
}

/**
 * Offline queue entry for glucose sharing
 */
export interface GlucoseShareQueueEntry {
  id: string;
  appointmentId: string;
  request: GlucoseShareRequest;
  createdAt: string; // ISO 8601
  attempts: number;
  lastAttempt?: string; // ISO 8601
  error?: string;
}

/**
 * Provider access log entry
 */
export interface ProviderAccessLog {
  id: string;
  appointmentId: string;
  providerId: string;
  providerName: string;
  accessedAt: string; // ISO 8601
  dataType: 'summary' | 'detailed';
  ipAddress?: string;
}

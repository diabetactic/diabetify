/**
 * Glucose reading models based on Tidepool API data types
 * @see https://developer.tidepool.org/data-model/
 */

/**
 * Unit type for glucose measurements
 */
export type GlucoseUnit = 'mg/dL' | 'mmol/L';

/**
 * Rate unit for trend measurements
 */
export type TrendRateUnit = 'mg/dL/minute' | 'mmol/L/minute';

/**
 * Glucose reading type discriminator
 */
export type GlucoseType = 'cbg' | 'smbg';

/**
 * Sub-type for SMBG readings
 * - manual: Value was manually entered by user
 * - linked: Value was transferred from BG meter to pump
 */
export type SMBGSubType = 'manual' | 'linked';

/**
 * Glucose status based on value ranges
 */
export type GlucoseStatus = 'low' | 'normal' | 'high' | 'critical-low' | 'critical-high';

/**
 * Base interface for all Tidepool glucose data
 * Based on Tidepool's base.v1.yaml schema
 */
export interface TidepoolBaseData {
  /** Unique identifier for the data record */
  id: string;

  /** Type of diabetes data */
  type: GlucoseType;

  /** UTC timestamp in ISO 8601 format */
  time: string;

  /** Device identifier that captured the data */
  deviceId?: string;

  /** Local device time (no timezone info) in ISO 8601 format */
  deviceTime?: string;

  /** Upload session identifier */
  uploadId?: string;

  /** GUID assigned during data processing (deprecated by Tidepool) */
  guid?: string;

  /** Clock drift offset in milliseconds */
  clockDriftOffset?: number;

  /** Conversion offset for timezone adjustments */
  conversionOffset?: number;

  /** Timezone offset in minutes from UTC */
  timezoneOffset?: number;

  /** Timezone name (e.g., "America/Los_Angeles") */
  timezone?: string;

  /** Timestamp when record was created in Tidepool */
  createdTime?: string;

  /** Timestamp when record was last modified */
  modifiedTime?: string;

  /** Annotations array for additional metadata */
  annotations?: Array<{
    code: string;
    value?: string;
  }>;

  /** User notes attached to the reading */
  notes?: string[];

  /** Tags for categorization */
  tags?: string[];
}

/**
 * Continuous Blood Glucose (CBG) reading from CGM devices
 * Based on Tidepool's continuousglucose.v1.yaml schema
 */
export interface CBGReading extends TidepoolBaseData {
  type: 'cbg';

  /** Glucose concentration value */
  value: number;

  /** Unit of measurement for glucose value */
  units: GlucoseUnit;

  /** Rate of change of glucose (optional) */
  trendRate?: number;

  /** Unit for trend rate (required if trendRate is provided) */
  trendRateUnits?: TrendRateUnit;

  /** Interval between samples in milliseconds (e.g., 60000 for 1 min, 300000 for 5 min) */
  sampleInterval?: number;

  /** Indicates if this reading was backfilled from device to receiver */
  backfilled?: boolean;
}

/**
 * Self-Monitored Blood Glucose (SMBG) reading from fingerstick meters
 * Based on Tidepool's selfmonitoredglucose.v1.yaml schema
 */
export interface SMBGReading extends TidepoolBaseData {
  type: 'smbg';

  /** Glucose concentration value */
  value: number;

  /** Unit of measurement for glucose value */
  units: GlucoseUnit;

  /** Sub-type indicating source/entry method */
  subType?: SMBGSubType;
}

/**
 * Union type for all glucose reading types
 */
export type GlucoseReading = CBGReading | SMBGReading;

/**
 * Local app-specific fields added to glucose readings
 * Used for local storage and display in the mobile app
 */
export interface LocalGlucoseFields {
  /** Local database identifier (separate from Tidepool id) */
  localId?: string;

  /** Indicates if this reading has been synced with Tidepool/backend */
  synced: boolean;

  /** Derived status based on value and target ranges */
  status?: GlucoseStatus;

  /** User ID this reading belongs to */
  userId?: string;

  /** Timestamp when locally stored (for tracking local modifications) */
  localStoredAt?: string;

  /** Indicates if this is a local-only reading not yet uploaded */
  isLocalOnly?: boolean;

  /** Backend ID from Heroku API (for deduplication during sync) */
  backendId?: number;

  /** Meal context for the reading (e.g., 'before-breakfast', 'after-lunch') */
  mealContext?: string;
}

/**
 * Extended glucose reading with local app-specific fields
 * Intersection type combining GlucoseReading with local fields
 */
export type LocalGlucoseReading = GlucoseReading & LocalGlucoseFields;

/**
 * Query parameters for fetching glucose readings
 */
export interface GlucoseQueryParams {
  /** Start of date range (ISO 8601) */
  startDate?: string;

  /** End of date range (ISO 8601) */
  endDate?: string;

  /** Filter by glucose type */
  type?: GlucoseType | GlucoseType[];

  /** Maximum number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort order */
  sort?: 'asc' | 'desc';
}

/**
 * Statistics for glucose readings over a period
 */
export interface GlucoseStatistics {
  /** Average glucose value */
  average: number;

  /** Median glucose value */
  median: number;

  /** Standard deviation */
  standardDeviation: number;

  /** Coefficient of variation (%) */
  coefficientOfVariation: number;

  /** Percentage of readings in range */
  timeInRange: number;

  /** Percentage of readings above range */
  timeAboveRange: number;

  /** Percentage of readings below range */
  timeBelowRange: number;

  /** Total number of readings */
  totalReadings: number;

  /** Estimated A1C based on average glucose */
  estimatedA1C?: number;

  /** Glucose Management Indicator (GMI) */
  gmi?: number;
}

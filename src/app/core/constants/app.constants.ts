/**
 * Application Constants
 *
 * Centralized constants for the entire application.
 * Prevents hardcoded values scattered throughout the codebase.
 */

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  // User settings (localStorage)
  USER_SETTINGS: 'userSettings',
  NOTIFICATION_SETTINGS: 'notificationSettings',
  ACCESS_TOKEN: 'access_token',

  // Demo mode
  DEMO_MODE: 'demoMode',
  DEMO_USER: 'demoUser',
  DEMO_PROFILE: 'demoProfile',
  DEMO_READINGS: 'demoReadings',
  DEMO_APPOINTMENTS: 'demoAppointments',

  // Mock adapter (already defined in mock-adapter.service.ts, re-exported for consistency)
  MOCK_BACKEND: 'diabetactic_use_mock_backend',
  MOCK_READINGS: 'diabetactic_mock_readings',
  MOCK_APPOINTMENTS: 'diabetactic_mock_appointments',
  MOCK_PROFILE: 'diabetactic_mock_profile',
  MOCK_TOKEN: 'diabetactic_mock_token',

  // Profile service (already defined in profile.service.ts, re-exported for consistency)
  USER_PROFILE: 'diabetactic_user_profile',
  TIDEPOOL_AUTH: 'diabetactic_tidepool_auth',
  SCHEMA_VERSION: 'diabetactic_schema_version',

  // Language
  LANGUAGE: 'diabetactic_language',
} as const;

// ============================================================================
// TIMEOUTS (milliseconds)
// ============================================================================

export const TIMEOUTS = {
  // API request timeouts
  API_DEFAULT: 30000,
  API_FAST: 15000,
  API_SLOW: 60000,
  API_VERY_SLOW: 300000,

  // Cache durations
  CACHE_SHORT: 30000,
  CACHE_MEDIUM: 300000,
  CACHE_LONG: 600000,

  // UI feedback
  TOAST_SHORT: 2000,
  TOAST_MEDIUM: 3000,
  TOAST_LONG: 5000,

  // Retry and backoff
  RETRY_BASE_DELAY: 1000,
  RETRY_MAX_DELAY: 30000,
  RETRY_JITTER_MAX: 1000,

  // Login flow
  LOGIN_TIMEOUT: 10000,
  POST_LOGIN_DELAY: 3000,

  // Mock network simulation
  MOCK_NETWORK_DELAY: 300,
} as const;

// ============================================================================
// GLUCOSE VALUES
// ============================================================================

export const GLUCOSE = {
  // Units
  UNITS: {
    MG_DL: 'mg/dL',
    MMOL_L: 'mmol/L',
  } as const,

  // Conversion factor
  MMOL_TO_MGDL: 18.0182,

  // Valid input ranges
  RANGE: {
    MG_DL: { MIN: 20, MAX: 600 },
    MMOL_L: { MIN: 1.1, MAX: 33.3 },
  } as const,

  // Clinical thresholds (mg/dL)
  THRESHOLDS: {
    CRITICAL_LOW: 54,
    LOW: 70,
    TARGET_LOW: 70,
    TARGET_HIGH: 180,
    HIGH: 180,
    CRITICAL_HIGH: 250,
  } as const,

  // Default target range
  DEFAULT_TARGET: {
    LOW: 70,
    HIGH: 180,
  } as const,
} as const;

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  BOLUS_CARB_MAX: 300,
  BOLUS_GLUCOSE_MIN: 40,
  BOLUS_GLUCOSE_MAX: 600,
  MAX_PAGINATED_ENTRIES: 500,
} as const;

// ============================================================================
// NOTIFICATION DEFAULTS
// ============================================================================

export const NOTIFICATION_DEFAULTS = {
  REMINDER_TIMES: {
    MORNING: '08:00',
    LUNCH: '12:00',
    DINNER: '18:00',
  } as const,
  APPOINTMENT_REMINDER_MINUTES: 30,
} as const;

// ============================================================================
// COLORS (UI Theme Colors)
// ============================================================================

export const COLORS = {
  // Stat card gradients
  STAT_GRADIENTS: {
    HBA1C: { START: '#60a5fa', END: '#3b82f6' },
    TIME_IN_RANGE: { START: '#c084fc', END: '#a855f7' },
    AVG_GLUCOSE: { START: '#4ade80', END: '#22c55e' },
    GMI: { START: '#fbbf24', END: '#f59e0b' },
  } as const,

  // Default colors
  PRIMARY: '#3b82f6',
  PRIMARY_LIGHT: '#60a5fa',
} as const;

// ============================================================================
// EXTERNAL URLS
// ============================================================================

export const EXTERNAL_URLS = {
  TIDEPOOL: {
    API: 'https://api.tidepool.org',
    AUTH: 'https://auth.tidepool.org',
    AUTH_EXTERNAL: 'https://auth.external.tidepool.org',
    APP: 'https://app.tidepool.org',
    WEBSITE: 'https://www.tidepool.org/',
    LOGIN_ENDPOINT: 'https://api.tidepool.org/auth/login',
  } as const,
} as const;

/**
 * Build Tidepool dashboard URL for a specific user
 */
export function tidepoolDashboardUrl(userId: string): string {
  return `${EXTERNAL_URLS.TIDEPOOL.APP}/patients/${userId}/data`;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type GlucoseUnit = (typeof GLUCOSE.UNITS)[keyof typeof GLUCOSE.UNITS];

/**
 * User profile models for Diabetactic mobile app
 */

import { GlucoseUnit } from '@models/glucose-reading.model';

/**
 * Account state derived from backend `blocked` field
 * - ACTIVE: blocked=false (user can log in)
 * - DISABLED: blocked=true (account blocked by admin)
 */
export enum AccountState {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/**
 * Available theme color palettes for child-friendly design
 */
export type ColorPalette = 'default' | 'candy' | 'nature' | 'ocean';

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Target glucose ranges for different times of day
 */
export interface GlucoseTargetRange {
  /** Minimum target value */
  min: number;

  /** Maximum target value */
  max: number;

  /** Unit for the range */
  unit: GlucoseUnit;

  /** Optional label for the time period */
  label?: string;
}

/**
 * User preferences for app configuration
 */
export interface UserPreferences {
  /** Preferred glucose unit */
  glucoseUnit: GlucoseUnit;

  /** Theme color palette */
  colorPalette: ColorPalette;

  /** Theme mode (light/dark/auto) */
  themeMode: ThemeMode;

  /** Enable high contrast mode */
  highContrastMode: boolean;

  /** Target glucose range for normal times */
  targetRange: GlucoseTargetRange;

  /** Optional target range for nighttime */
  nighttimeTargetRange?: GlucoseTargetRange;

  /** Enable notifications */
  notificationsEnabled: boolean;

  /** Enable sounds with notifications */
  soundEnabled: boolean;

  /** Show trend arrows on dashboard */
  showTrendArrows: boolean;

  /** Automatically sync with backend */
  autoSync: boolean;

  /** Sync interval in minutes */
  syncInterval: number;

  /** Display language (ISO 639-1 code) */
  language: string;

  /** Date format preference */
  dateFormat: '12h' | '24h';
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  glucoseUnit: 'mg/dL',
  colorPalette: 'default',
  themeMode: 'auto',
  highContrastMode: false,
  targetRange: {
    min: 70,
    max: 180,
    unit: 'mg/dL',
    label: 'Default',
  },
  notificationsEnabled: true,
  soundEnabled: true,
  showTrendArrows: true,
  autoSync: true,
  syncInterval: 15,
  language: 'es',
  dateFormat: '12h',
};

/**
 * Avatar configuration for child-friendly profiles
 */
export interface Avatar {
  /** Avatar identifier/name */
  id: string;

  /** Display name for the avatar */
  name: string;

  /** Asset path or URL for avatar image */
  imagePath: string;

  /** Optional background color */
  backgroundColor?: string;

  /** Category for grouping avatars */
  category?: 'animals' | 'characters' | 'shapes' | 'custom';
}

/**
 * Main user profile interface
 */
export interface UserProfile {
  /** Local user identifier */
  id: string;

  /** Display name */
  name: string;

  /** User's email from backend (Backoffice configured) */
  email?: string;

  /** User's age (for age-appropriate UI adjustments) */
  age: number;

  /** Account state for pre-enabled account workflow */
  accountState: AccountState;

  /** Date of birth (ISO 8601 format) */
  dateOfBirth?: string;

  /** Selected avatar */
  avatar?: Avatar;

  /** User preferences */
  preferences: UserPreferences;

  /** Timestamp when profile was created */
  createdAt: string;

  /** Timestamp when profile was last updated */
  updatedAt: string;

  /** Diagnosis date (ISO 8601 format) */
  diagnosisDate?: string;

  /** Diabetes type */
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'other';

  /** Healthcare provider information */
  healthcareProvider?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  /** Emergency contact information */
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };

  /** Optional notes */
  notes?: string;

  /** Has user completed onboarding */
  hasCompletedOnboarding?: boolean;
}

/**
 * Partial profile for creation (with defaults applied)
 */
export type CreateUserProfileInput = Pick<UserProfile, 'name' | 'age'> &
  Partial<Omit<UserProfile, 'id' | 'name' | 'age' | 'createdAt' | 'updatedAt'>>;

/**
 * Profile update payload
 */
export type UpdateUserProfileInput = Partial<Omit<UserProfile, 'id' | 'createdAt'>>;

export interface PreferencesSeed {
  glucoseUnit: 'mg/dL' | 'mmol/L';
  colorPalette: 'default' | 'candy' | 'nature' | 'ocean';
  themeMode: 'light' | 'dark' | 'auto';
  highContrastMode: boolean;
  targetRange: {
    min: number;
    max: number;
    unit: 'mg/dL' | 'mmol/L';
    label?: string;
  };
  nighttimeTargetRange?: {
    min: number;
    max: number;
    unit: 'mg/dL' | 'mmol/L';
    label?: string;
  };
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  showTrendArrows: boolean;
  autoSync: boolean;
  syncInterval: number;
  language: 'en' | 'es';
  dateFormat: '12h' | '24h';
}

export interface UserProfileSeed {
  id: string;
  name: string;
  age: number;
  accountState: 'pending' | 'active' | 'disabled';
  dateOfBirth?: string;
  avatar?: {
    id: string;
    name: string;
    imagePath: string;
    backgroundColor?: string;
    category?: 'animals' | 'characters' | 'shapes' | 'custom';
  };
  preferences: PreferencesSeed;
  createdAt: string;
  updatedAt: string;
  diagnosisDate?: string;
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'other';
  healthcareProvider?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  notes?: string;
  hasCompletedOnboarding: boolean;
}

export const CAPACITOR_STORAGE_PREFIX = 'CapacitorStorage.';
export const PROFILE_STORAGE_KEY = `${CAPACITOR_STORAGE_PREFIX}diabetactic_user_profile`;
export const SCHEMA_STORAGE_KEY = `${CAPACITOR_STORAGE_PREFIX}diabetactic_schema_version`;

export function createProfileSeed(overrides: Partial<UserProfileSeed> = {}): UserProfileSeed {
  const now = new Date('2024-01-01T12:00:00.000Z').toISOString();
  const defaultPreferences: PreferencesSeed = {
    glucoseUnit: 'mg/dL',
    colorPalette: 'default',
    themeMode: 'light',
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
    language: 'en',
    dateFormat: '12h',
  };

  const mergedPreferences: PreferencesSeed = {
    ...defaultPreferences,
    ...(overrides.preferences ?? {}),
  };

  const base: UserProfileSeed = {
    id: 'test-user',
    name: 'Test User',
    age: 12,
    accountState: 'active',
    dateOfBirth: '2012-02-20',
    preferences: mergedPreferences,
    createdAt: now,
    updatedAt: now,
    hasCompletedOnboarding: true,
  };

  return {
    ...base,
    ...overrides,
    preferences: mergedPreferences,
  };
}

export function seedStorageScript(profile: UserProfileSeed, schemaVersion = 1) {
  return `
    localStorage.setItem('${PROFILE_STORAGE_KEY}', ${JSON.stringify(JSON.stringify(profile))});
    localStorage.setItem('${SCHEMA_STORAGE_KEY}', '${schemaVersion}');
  `;
}

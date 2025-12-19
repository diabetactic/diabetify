/**
 * Factory para crear datos de prueba de perfiles de usuario
 * Proporciona funciones helper para generar UserProfile con valores realistas
 */

import type {
  UserProfile,
  UserPreferences,
  TidepoolConnection,
  Avatar,
  AccountState,
  ColorPalette,
  ThemeMode,
  GlucoseTargetRange,
} from '@models/user-profile.model';
import { DEFAULT_USER_PREFERENCES } from '@models/user-profile.model';
import type { GlucoseUnit } from '@models/glucose-reading.model';

/**
 * ID counter para perfiles mock
 */
let profileIdCounter = 1;

/**
 * Genera un ID único para perfiles
 */
const generateProfileId = (): string => {
  return `profile_${Date.now()}_${profileIdCounter++}`;
};

/**
 * Resetea el contador de IDs (útil para tests)
 */
export const resetProfileIdCounter = (): void => {
  profileIdCounter = 1;
};

/**
 * Avatares de ejemplo para tests
 */
const SAMPLE_AVATARS: Avatar[] = [
  {
    id: 'bear',
    name: 'Osito',
    imagePath: 'assets/avatars/bear.svg',
    backgroundColor: '#FFE4B5',
    category: 'animals',
  },
  {
    id: 'cat',
    name: 'Gatito',
    imagePath: 'assets/avatars/cat.svg',
    backgroundColor: '#FFB6C1',
    category: 'animals',
  },
  {
    id: 'robot',
    name: 'Robot',
    imagePath: 'assets/avatars/robot.svg',
    backgroundColor: '#B0E0E6',
    category: 'characters',
  },
];

/**
 * Crea un rango de glucosa objetivo mock
 *
 * @param overrides - Valores para sobrescribir
 * @returns Rango de glucosa objetivo
 *
 * @example
 * ```typescript
 * const range = createMockTargetRange({ min: 80, max: 160 });
 * const mmolRange = createMockTargetRange({ unit: 'mmol/L', min: 4, max: 10 });
 * ```
 */
export const createMockTargetRange = (
  overrides?: Partial<GlucoseTargetRange>
): GlucoseTargetRange => {
  return {
    min: 70,
    max: 180,
    unit: 'mg/dL' as GlucoseUnit,
    label: 'Default',
    ...overrides,
  };
};

/**
 * Crea preferencias de usuario mock
 *
 * @param overrides - Valores para sobrescribir
 * @returns Preferencias de usuario
 *
 * @example
 * ```typescript
 * const prefs = createMockUserPreferences();
 * const darkMode = createMockUserPreferences({ themeMode: 'dark' });
 * ```
 */
export const createMockUserPreferences = (
  overrides?: Partial<UserPreferences>
): UserPreferences => {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...overrides,
  };
};

/**
 * Crea una conexión de Tidepool mock
 *
 * @param connected - Si está conectado (default: true)
 * @param overrides - Valores para sobrescribir
 * @returns Conexión de Tidepool
 *
 * @example
 * ```typescript
 * const connected = createMockTidepoolConnection();
 * const disconnected = createMockTidepoolConnection(false);
 * const customConnection = createMockTidepoolConnection(true, {
 *   email: 'user@example.com',
 *   fullName: 'Juan Pérez'
 * });
 * ```
 */
export const createMockTidepoolConnection = (
  connected: boolean = true,
  overrides?: Partial<TidepoolConnection>
): TidepoolConnection => {
  if (!connected) {
    return {
      connected: false,
      ...overrides,
    };
  }

  return {
    connected: true,
    userId: `tidepool_user_${Math.random().toString(36).substring(2, 9)}`,
    email: 'test@tidepool.org',
    fullName: 'Usuario Test',
    lastSyncTime: new Date().toISOString(),
    connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días atrás
    dataRetentionDays: 90,
    ...overrides,
  };
};

/**
 * Crea un avatar mock
 *
 * @param id - ID del avatar (usa uno de los samples si no se especifica)
 * @param overrides - Valores para sobrescribir
 * @returns Avatar
 *
 * @example
 * ```typescript
 * const avatar = createMockAvatar();
 * const customAvatar = createMockAvatar('dragon', {
 *   name: 'Dragón',
 *   category: 'characters'
 * });
 * ```
 */
export const createMockAvatar = (
  id?: string,
  overrides?: Partial<Avatar>
): Avatar => {
  if (!id) {
    return SAMPLE_AVATARS[0];
  }

  const sample = SAMPLE_AVATARS.find((a) => a.id === id);
  if (sample) {
    return { ...sample, ...overrides };
  }

  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    imagePath: `assets/avatars/${id}.svg`,
    backgroundColor: '#FFFFFF',
    category: 'custom',
    ...overrides,
  };
};

/**
 * Crea un perfil de usuario mock completo
 *
 * @param overrides - Valores para sobrescribir
 * @returns Perfil de usuario completo
 *
 * @example
 * ```typescript
 * // Perfil básico
 * const profile = createMockUserProfile();
 *
 * // Perfil con valores específicos
 * const profile = createMockUserProfile({
 *   name: 'María',
 *   age: 12,
 *   diabetesType: 'type1'
 * });
 *
 * // Perfil sin conexión Tidepool
 * const profile = createMockUserProfile({
 *   tidepoolConnection: createMockTidepoolConnection(false)
 * });
 * ```
 */
export const createMockUserProfile = (
  overrides?: Partial<UserProfile>
): UserProfile => {
  const now = new Date();
  const createdAt = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 días atrás

  return {
    id: generateProfileId(),
    name: 'Usuario Test',
    email: 'test@diabetify.com',
    age: 10,
    accountState: 'ACTIVE' as AccountState,
    avatar: SAMPLE_AVATARS[0],
    tidepoolConnection: createMockTidepoolConnection(),
    preferences: createMockUserPreferences(),
    createdAt: createdAt.toISOString(),
    updatedAt: now.toISOString(),
    diabetesType: 'type1',
    hasCompletedOnboarding: true,
    ...overrides,
  };
};

/**
 * Crea un perfil de usuario con estado de cuenta específico
 *
 * @param accountState - Estado de la cuenta
 * @returns Perfil con el estado especificado
 *
 * @example
 * ```typescript
 * const pending = createProfileWithAccountState('PENDING');
 * const disabled = createProfileWithAccountState('DISABLED');
 * ```
 */
export const createProfileWithAccountState = (
  accountState: AccountState
): UserProfile => {
  const hasCompletedOnboarding = accountState === 'ACTIVE';

  return createMockUserProfile({
    accountState,
    hasCompletedOnboarding,
  });
};

/**
 * Crea un perfil de niño (edad < 13)
 *
 * @param age - Edad del niño (default: 8)
 * @param overrides - Valores para sobrescribir
 * @returns Perfil de niño
 *
 * @example
 * ```typescript
 * const child = createChildProfile();
 * const youngChild = createChildProfile(6, { colorPalette: 'candy' });
 * ```
 */
export const createChildProfile = (
  age: number = 8,
  overrides?: Partial<UserProfile>
): UserProfile => {
  return createMockUserProfile({
    age,
    avatar: SAMPLE_AVATARS[Math.floor(Math.random() * SAMPLE_AVATARS.length)],
    preferences: createMockUserPreferences({
      colorPalette: 'candy',
      highContrastMode: true,
    }),
    ...overrides,
  });
};

/**
 * Crea un perfil de adolescente (edad 13-17)
 *
 * @param age - Edad del adolescente (default: 15)
 * @param overrides - Valores para sobrescribir
 * @returns Perfil de adolescente
 *
 * @example
 * ```typescript
 * const teen = createTeenProfile();
 * const olderTeen = createTeenProfile(17);
 * ```
 */
export const createTeenProfile = (
  age: number = 15,
  overrides?: Partial<UserProfile>
): UserProfile => {
  return createMockUserProfile({
    age,
    preferences: createMockUserPreferences({
      colorPalette: 'ocean',
      themeMode: 'dark',
    }),
    ...overrides,
  });
};

/**
 * Crea un perfil con configuración específica de tema
 *
 * @param colorPalette - Paleta de colores
 * @param themeMode - Modo de tema
 * @returns Perfil con tema configurado
 *
 * @example
 * ```typescript
 * const candyDark = createProfileWithTheme('candy', 'dark');
 * const natureLIGHT = createProfileWithTheme('nature', 'light');
 * ```
 */
export const createProfileWithTheme = (
  colorPalette: ColorPalette,
  themeMode: ThemeMode
): UserProfile => {
  return createMockUserProfile({
    preferences: createMockUserPreferences({
      colorPalette,
      themeMode,
    }),
  });
};

/**
 * Crea múltiples perfiles de usuario
 *
 * @param count - Número de perfiles
 * @param overrides - Valores para sobrescribir en todos los perfiles
 * @returns Array de perfiles
 *
 * @example
 * ```typescript
 * const profiles = createMockUserProfiles(5);
 * const activeProfiles = createMockUserProfiles(3, { accountState: 'ACTIVE' });
 * ```
 */
export const createMockUserProfiles = (
  count: number,
  overrides?: Partial<UserProfile>
): UserProfile[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockUserProfile({
      name: `Usuario Test ${i + 1}`,
      ...overrides,
    })
  );
};

/**
 * Crea un perfil con información de contacto de emergencia
 *
 * @param overrides - Valores para sobrescribir
 * @returns Perfil con contacto de emergencia
 *
 * @example
 * ```typescript
 * const profile = createProfileWithEmergencyContact({
 *   emergencyContact: {
 *     name: 'María González',
 *     relationship: 'Madre',
 *     phone: '+34 666 777 888'
 *   }
 * });
 * ```
 */
export const createProfileWithEmergencyContact = (
  overrides?: Partial<UserProfile>
): UserProfile => {
  return createMockUserProfile({
    emergencyContact: {
      name: 'Contacto Emergencia',
      relationship: 'Padre/Madre',
      phone: '+34 600 000 000',
    },
    healthcareProvider: {
      name: 'Dr. García',
      phone: '+34 900 000 000',
      email: 'dr.garcia@hospital.com',
    },
    ...overrides,
  });
};

/**
 * Crea un perfil que aún no ha completado onboarding
 *
 * @param overrides - Valores para sobrescribir
 * @returns Perfil sin onboarding completo
 *
 * @example
 * ```typescript
 * const newUser = createProfileWithoutOnboarding();
 * ```
 */
export const createProfileWithoutOnboarding = (
  overrides?: Partial<UserProfile>
): UserProfile => {
  return createMockUserProfile({
    hasCompletedOnboarding: false,
    tidepoolConnection: createMockTidepoolConnection(false),
    ...overrides,
  });
};

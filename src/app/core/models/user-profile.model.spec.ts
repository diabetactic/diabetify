/**
 * Unit tests for user profile models
 * Tests enums, constants, and type definitions
 */

import {
  AccountState,
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
  GlucoseTargetRange,
  TidepoolConnection,
  Avatar,
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
} from './user-profile.model';

describe('UserProfileModel', () => {
  describe('AccountState enum', () => {
    it('should have PENDING state', () => {
      expect(AccountState.PENDING).toBe('pending');
    });

    it('should have ACTIVE state', () => {
      expect(AccountState.ACTIVE).toBe('active');
    });

    it('should have DISABLED state', () => {
      expect(AccountState.DISABLED).toBe('disabled');
    });

    it('should have exactly 3 states', () => {
      const states = Object.values(AccountState);
      expect(states.length).toBe(3);
    });
  });

  describe('DEFAULT_USER_PREFERENCES', () => {
    it('should have valid glucose unit', () => {
      expect(DEFAULT_USER_PREFERENCES.glucoseUnit).toBe('mg/dL');
    });

    it('should have default color palette', () => {
      expect(DEFAULT_USER_PREFERENCES.colorPalette).toBe('default');
    });

    it('should have auto theme mode', () => {
      expect(DEFAULT_USER_PREFERENCES.themeMode).toBe('auto');
    });

    it('should have high contrast mode disabled', () => {
      expect(DEFAULT_USER_PREFERENCES.highContrastMode).toBe(false);
    });

    it('should have valid target range', () => {
      expect(DEFAULT_USER_PREFERENCES.targetRange).toEqual({
        min: 70,
        max: 180,
        unit: 'mg/dL',
        label: 'Default',
      });
    });

    it('should have target range with valid min/max values', () => {
      const { min, max } = DEFAULT_USER_PREFERENCES.targetRange;
      expect(min).toBeLessThan(max);
      expect(min).toBeGreaterThan(0);
      expect(max).toBeGreaterThan(0);
    });

    it('should have notifications enabled', () => {
      expect(DEFAULT_USER_PREFERENCES.notificationsEnabled).toBe(true);
    });

    it('should have sound enabled', () => {
      expect(DEFAULT_USER_PREFERENCES.soundEnabled).toBe(true);
    });

    it('should show trend arrows', () => {
      expect(DEFAULT_USER_PREFERENCES.showTrendArrows).toBe(true);
    });

    it('should have auto sync enabled', () => {
      expect(DEFAULT_USER_PREFERENCES.autoSync).toBe(true);
    });

    it('should have valid sync interval', () => {
      expect(DEFAULT_USER_PREFERENCES.syncInterval).toBe(15);
      expect(DEFAULT_USER_PREFERENCES.syncInterval).toBeGreaterThan(0);
    });

    it('should have Spanish as default language', () => {
      expect(DEFAULT_USER_PREFERENCES.language).toBe('es');
    });

    it('should have 12h date format', () => {
      expect(DEFAULT_USER_PREFERENCES.dateFormat).toBe('12h');
    });

    it('should not have nighttime target range by default', () => {
      expect(DEFAULT_USER_PREFERENCES.nighttimeTargetRange).toBeUndefined();
    });
  });

  describe('GlucoseTargetRange interface', () => {
    it('should accept valid range with all required fields', () => {
      const range: GlucoseTargetRange = {
        min: 70,
        max: 180,
        unit: 'mg/dL',
      };
      expect(range.min).toBe(70);
      expect(range.max).toBe(180);
      expect(range.unit).toBe('mg/dL');
    });

    it('should accept valid range with optional label', () => {
      const range: GlucoseTargetRange = {
        min: 70,
        max: 180,
        unit: 'mg/dL',
        label: 'Daytime',
      };
      expect(range.label).toBe('Daytime');
    });

    it('should accept mmol/L unit', () => {
      const range: GlucoseTargetRange = {
        min: 4.0,
        max: 10.0,
        unit: 'mmol/L',
      };
      expect(range.unit).toBe('mmol/L');
    });
  });

  describe('TidepoolConnection interface', () => {
    it('should accept disconnected state', () => {
      const connection: TidepoolConnection = {
        connected: false,
      };
      expect(connection.connected).toBe(false);
    });

    it('should accept connected state with all fields', () => {
      const connection: TidepoolConnection = {
        connected: true,
        userId: 'user123',
        email: 'test@example.com',
        fullName: 'Test User',
        lastSyncTime: '2024-01-01T00:00:00Z',
        connectedAt: '2023-12-01T00:00:00Z',
        dataRetentionDays: 90,
      };
      expect(connection.connected).toBe(true);
      expect(connection.userId).toBe('user123');
      expect(connection.email).toBe('test@example.com');
      expect(connection.fullName).toBe('Test User');
      expect(connection.dataRetentionDays).toBe(90);
    });

    it('should accept partial connection data', () => {
      const connection: TidepoolConnection = {
        connected: true,
        userId: 'user123',
      };
      expect(connection.connected).toBe(true);
      expect(connection.userId).toBe('user123');
      expect(connection.email).toBeUndefined();
    });
  });

  describe('Avatar interface', () => {
    it('should accept avatar with required fields', () => {
      const avatar: Avatar = {
        id: 'cat1',
        name: 'Orange Cat',
        imagePath: '/assets/avatars/cat1.png',
      };
      expect(avatar.id).toBe('cat1');
      expect(avatar.name).toBe('Orange Cat');
      expect(avatar.imagePath).toBe('/assets/avatars/cat1.png');
    });

    it('should accept avatar with all fields', () => {
      const avatar: Avatar = {
        id: 'cat1',
        name: 'Orange Cat',
        imagePath: '/assets/avatars/cat1.png',
        backgroundColor: '#FF6B35',
        category: 'animals',
      };
      expect(avatar.backgroundColor).toBe('#FF6B35');
      expect(avatar.category).toBe('animals');
    });

    it('should accept all avatar categories', () => {
      const categories: Avatar['category'][] = ['animals', 'characters', 'shapes', 'custom'];
      categories.forEach(category => {
        const avatar: Avatar = {
          id: 'test',
          name: 'Test',
          imagePath: '/test.png',
          category,
        };
        expect(avatar.category).toBe(category);
      });
    });
  });

  describe('UserProfile interface', () => {
    it('should accept minimal profile', () => {
      const profile: UserProfile = {
        id: '123',
        name: 'Test User',
        age: 10,
        accountState: AccountState.ACTIVE,
        tidepoolConnection: { connected: false },
        preferences: DEFAULT_USER_PREFERENCES,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(profile.id).toBe('123');
      expect(profile.name).toBe('Test User');
      expect(profile.age).toBe(10);
      expect(profile.accountState).toBe(AccountState.ACTIVE);
    });

    it('should accept profile with all optional fields', () => {
      const profile: UserProfile = {
        id: '123',
        name: 'Test User',
        age: 10,
        accountState: AccountState.ACTIVE,
        dateOfBirth: '2014-01-01',
        avatar: {
          id: 'cat1',
          name: 'Orange Cat',
          imagePath: '/assets/avatars/cat1.png',
        },
        tidepoolConnection: { connected: true, userId: 'tp123' },
        preferences: DEFAULT_USER_PREFERENCES,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
        healthcareProvider: {
          name: 'Dr. Smith',
          phone: '555-1234',
          email: 'dr.smith@example.com',
        },
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Mother',
          phone: '555-5678',
        },
        notes: 'Test notes',
        hasCompletedOnboarding: true,
      };
      expect(profile.dateOfBirth).toBe('2014-01-01');
      expect(profile.avatar).toBeDefined();
      expect(profile.diagnosisDate).toBe('2020-01-01');
      expect(profile.diabetesType).toBe('type1');
      expect(profile.healthcareProvider?.name).toBe('Dr. Smith');
      expect(profile.emergencyContact?.name).toBe('Jane Doe');
      expect(profile.notes).toBe('Test notes');
      expect(profile.hasCompletedOnboarding).toBe(true);
    });

    it('should accept all diabetes types', () => {
      const types: UserProfile['diabetesType'][] = ['type1', 'type2', 'gestational', 'other'];
      types.forEach(diabetesType => {
        const profile: UserProfile = {
          id: '123',
          name: 'Test User',
          age: 10,
          accountState: AccountState.ACTIVE,
          tidepoolConnection: { connected: false },
          preferences: DEFAULT_USER_PREFERENCES,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          diabetesType,
        };
        expect(profile.diabetesType).toBe(diabetesType);
      });
    });
  });

  describe('CreateUserProfileInput type', () => {
    it('should accept minimal creation input', () => {
      const input: CreateUserProfileInput = {
        name: 'New User',
        age: 12,
      };
      expect(input.name).toBe('New User');
      expect(input.age).toBe(12);
    });

    it('should accept creation input with optional fields', () => {
      const input: CreateUserProfileInput = {
        name: 'New User',
        age: 12,
        accountState: AccountState.PENDING,
        preferences: DEFAULT_USER_PREFERENCES,
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
      };
      expect(input.accountState).toBe(AccountState.PENDING);
      expect(input.preferences).toEqual(DEFAULT_USER_PREFERENCES);
      expect(input.diagnosisDate).toBe('2020-01-01');
      expect(input.diabetesType).toBe('type1');
    });
  });

  describe('UpdateUserProfileInput type', () => {
    it('should accept empty update', () => {
      const input: UpdateUserProfileInput = {};
      expect(Object.keys(input).length).toBe(0);
    });

    it('should accept partial updates', () => {
      const input: UpdateUserProfileInput = {
        name: 'Updated Name',
        age: 13,
      };
      expect(input.name).toBe('Updated Name');
      expect(input.age).toBe(13);
    });

    it('should accept updating preferences only', () => {
      const input: UpdateUserProfileInput = {
        preferences: {
          ...DEFAULT_USER_PREFERENCES,
          glucoseUnit: 'mmol/L',
          language: 'en',
        },
      };
      expect(input.preferences?.glucoseUnit).toBe('mmol/L');
      expect(input.preferences?.language).toBe('en');
    });

    it('should accept updating avatar', () => {
      const input: UpdateUserProfileInput = {
        avatar: {
          id: 'dog1',
          name: 'Golden Dog',
          imagePath: '/assets/avatars/dog1.png',
        },
      };
      expect(input.avatar?.id).toBe('dog1');
    });

    it('should accept updating tidepool connection', () => {
      const input: UpdateUserProfileInput = {
        tidepoolConnection: {
          connected: true,
          userId: 'tp456',
          email: 'user@example.com',
        },
      };
      expect(input.tidepoolConnection?.connected).toBe(true);
      expect(input.tidepoolConnection?.userId).toBe('tp456');
    });
  });

  describe('Type definitions', () => {
    it('should support all ColorPalette values', () => {
      const palettes: Array<'default' | 'candy' | 'nature' | 'ocean'> = [
        'default',
        'candy',
        'nature',
        'ocean',
      ];
      palettes.forEach(palette => {
        const prefs: UserPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          colorPalette: palette,
        };
        expect(prefs.colorPalette).toBe(palette);
      });
    });

    it('should support all ThemeMode values', () => {
      const modes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
      modes.forEach(mode => {
        const prefs: UserPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          themeMode: mode,
        };
        expect(prefs.themeMode).toBe(mode);
      });
    });

    it('should support all dateFormat values', () => {
      const formats: Array<'12h' | '24h'> = ['12h', '24h'];
      formats.forEach(format => {
        const prefs: UserPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          dateFormat: format,
        };
        expect(prefs.dateFormat).toBe(format);
      });
    });
  });
});

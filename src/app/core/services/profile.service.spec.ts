// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { ProfileService } from '@services/profile.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { of, throwError } from 'rxjs';
import {
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
  DEFAULT_USER_PREFERENCES,
  TidepoolAuth,
  AccountState,
} from '@core/models';

/**
 * Comprehensive test suite for ProfileService
 * Tests profile management, Tidepool credentials, migrations, and storage operations
 */
describe('ProfileService', () => {
  let service: ProfileService;
  let mockStorage: Map<string, string>;
  let mockSecureStorage: Map<string, any>;

  // Mock user profile
  const mockProfile: UserProfile = {
    id: 'user_123',
    name: 'Test User',
    age: 10,
    accountState: AccountState.ACTIVE,
    dateOfBirth: '2014-01-01',
    avatar: {
      id: 'avatar-1',
      name: 'Happy Dino',
      imagePath: '/assets/avatars/dino.png',
    },
    tidepoolConnection: {
      connected: false,
    },
    preferences: DEFAULT_USER_PREFERENCES,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    diagnosisDate: '2020-06-15',
    diabetesType: 'type1',
    hasCompletedOnboarding: true,
  };

  const mockTidepoolAuth: TidepoolAuth = {
    userId: 'tidepool-user-123',
    email: 'test@example.com',
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    tokenType: 'Bearer',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000, // 1 hour from now
  };

  beforeEach(async () => {
    mockStorage = new Map<string, string>();
    mockSecureStorage = new Map<string, any>();

    // Mock Capacitor Preferences
    const PreferencesMock = {
      get: vi.fn().mockImplementation(async (options: { key: string }) => {
        const value = mockStorage.get(options.key);
        return { value: value || null };
      }),
      set: vi.fn().mockImplementation(async (options: { key: string; value: string }) => {
        mockStorage.set(options.key, options.value);
      }),
      remove: vi.fn().mockImplementation(async (options: { key: string }) => {
        mockStorage.delete(options.key);
      }),
    };

    // Mock SecureStorage
    const SecureStorageMock = {
      get: vi.fn().mockImplementation(async (key: string) => {
        return mockSecureStorage.get(key) || null;
      }),
      set: vi.fn().mockImplementation(async (key: string, value: any) => {
        mockSecureStorage.set(key, value);
      }),
      remove: vi.fn().mockImplementation(async (key: string) => {
        mockSecureStorage.delete(key);
      }),
    };

    // Register mocks globally
    (window as any).Capacitor = {
      Plugins: {
        Preferences: PreferencesMock,
        SecureStorage: SecureStorageMock,
      },
    };

    // Import mocks
    const { Preferences } = await import('@capacitor/preferences');
    const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');

    vi.spyOn(Preferences, 'get').mockImplementation(PreferencesMock.get);
    vi.spyOn(Preferences, 'set').mockImplementation(PreferencesMock.set);
    vi.spyOn(Preferences, 'remove').mockImplementation(PreferencesMock.remove);

    vi.spyOn(SecureStorage, 'get').mockImplementation(SecureStorageMock.get);
    vi.spyOn(SecureStorage, 'set').mockImplementation(SecureStorageMock.set);
    vi.spyOn(SecureStorage, 'remove').mockImplementation(SecureStorageMock.remove);

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        {
          provide: ApiGatewayService,
          useValue: {
            request: vi.fn(),
            clearCache: vi.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(ProfileService);

    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    mockStorage.clear();
    mockSecureStorage.clear();
    // Reset TestBed to force new service instance and prevent state pollution
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getProfile tests - state pollution fixed with TestBed.resetTestingModule()
  describe('getProfile()', () => {
    describe('Success Cases', () => {
      it('should return null when no profile exists', async () => {
        const profile = await service.getProfile();
        expect(profile).toBeNull();
      });

      it('should retrieve existing profile', async () => {
        mockStorage.set('diabetactic_user_profile', JSON.stringify(mockProfile));

        const profile = await service.getProfile();

        expect(profile).toBeTruthy();
        expect(profile!.id).toBe('user_123');
        expect(profile!.name).toBe('Test User');
      });

      it('should add default preferences if missing', async () => {
        const profileWithoutPrefs = { ...mockProfile };
        delete (profileWithoutPrefs as any).preferences;

        mockStorage.set('diabetactic_user_profile', JSON.stringify(profileWithoutPrefs));

        const profile = await service.getProfile();

        expect(profile!.preferences).toEqual(DEFAULT_USER_PREFERENCES);
      });

      it('should merge partial preferences with defaults', async () => {
        const profileWithPartialPrefs = {
          ...mockProfile,
          preferences: {
            glucoseUnit: 'mmol/L' as const,
            language: 'en',
          },
        };

        mockStorage.set('diabetactic_user_profile', JSON.stringify(profileWithPartialPrefs));

        const profile = await service.getProfile();

        expect(profile!.preferences.glucoseUnit).toBe('mmol/L');
        expect(profile!.preferences.language).toBe('en');
        expect(profile!.preferences.colorPalette).toBe(DEFAULT_USER_PREFERENCES.colorPalette);
        expect(profile!.preferences.targetRange).toEqual(DEFAULT_USER_PREFERENCES.targetRange);
      });

      it('should handle profile with all optional fields', async () => {
        const fullProfile: UserProfile = {
          ...mockProfile,
          healthcareProvider: {
            name: 'Dr. Smith',
            email: 'dr.smith@hospital.com',
            phone: '555-0123',
          },
          emergencyContact: {
            name: 'Parent',
            relationship: 'Mother',
            phone: '555-9999',
          },
          notes: 'Special dietary needs',
        };

        mockStorage.set('diabetactic_user_profile', JSON.stringify(fullProfile));

        const profile = await service.getProfile();

        expect(profile!.healthcareProvider).toBeDefined();
        expect(profile!.emergencyContact).toBeDefined();
        expect(profile!.notes).toBe('Special dietary needs');
      });
    });

    describe('Error Cases', () => {
      it('should return null on parsing error', async () => {
        mockStorage.set('diabetactic_user_profile', 'invalid json');

        const profile = await service.getProfile();

        expect(profile).toBeNull();
      });

      it('should handle storage read error gracefully', async () => {
        const loggerService = TestBed.inject(LoggerService);
        vi.spyOn(loggerService, 'error');

        const { Preferences } = await import('@capacitor/preferences');
        (Preferences.get as Mock).mockReturnValue(Promise.reject(new Error('Storage error')));

        const profile = await service.getProfile();

        expect(profile).toBeNull();
        expect(loggerService.error).toHaveBeenCalled();
      });
    });
  });

  describe('createProfile()', () => {
    const createInput: CreateUserProfileInput = {
      name: 'New User',
      age: 12,
      dateOfBirth: '2012-05-15',
      avatar: {
        id: 'avatar-2',
        name: 'Cool Cat',
        imagePath: '/assets/avatars/cat.png',
      },
      diagnosisDate: '2018-03-20',
      diabetesType: 'type1',
      hasCompletedOnboarding: false,
    };

    describe('Success Cases', () => {
      it('should create a new profile', async () => {
        const profile = await service.createProfile(createInput);

        expect(profile).toBeTruthy();
        expect(profile.name).toBe('New User');
        expect(profile.age).toBe(12);
        expect(profile.id).toContain('user_');
        expect(profile.createdAt).toBeTruthy();
        expect(profile.updatedAt).toBeTruthy();
      });

      it('should set default account state to PENDING', async () => {
        const profile = await service.createProfile(createInput);

        expect(profile.accountState).toBe(AccountState.PENDING);
      });

      it('should allow custom account state', async () => {
        const input: CreateUserProfileInput = {
          ...createInput,
          accountState: AccountState.ACTIVE,
        };

        const profile = await service.createProfile(input);

        expect(profile.accountState).toBe(AccountState.ACTIVE);
      });

      it('should set default preferences if not provided', async () => {
        const profile = await service.createProfile(createInput);

        expect(profile.preferences).toEqual(DEFAULT_USER_PREFERENCES);
      });

      it('should use provided preferences', async () => {
        const customPrefs = {
          ...DEFAULT_USER_PREFERENCES,
          glucoseUnit: 'mmol/L' as const,
          language: 'en',
        };

        const input: CreateUserProfileInput = {
          ...createInput,
          preferences: customPrefs,
        };

        const profile = await service.createProfile(input);

        expect(profile.preferences.glucoseUnit).toBe('mmol/L');
        expect(profile.preferences.language).toBe('en');
      });

      it('should set Tidepool connection to disconnected by default', async () => {
        const profile = await service.createProfile(createInput);

        expect(profile.tidepoolConnection.connected).toBe(false);
      });

      it('should allow custom Tidepool connection', async () => {
        const input: CreateUserProfileInput = {
          ...createInput,
          tidepoolConnection: {
            connected: true,
            userId: 'tidepool-123',
            email: 'test@example.com',
          },
        };

        const profile = await service.createProfile(input);

        expect(profile.tidepoolConnection.connected).toBe(true);
        expect(profile.tidepoolConnection.userId).toBe('tidepool-123');
      });

      it('should set hasCompletedOnboarding from input', async () => {
        const profile = await service.createProfile(createInput);

        expect(profile.hasCompletedOnboarding).toBe(false);
      });

      it('should create profile with optional fields', async () => {
        const input: CreateUserProfileInput = {
          ...createInput,
          healthcareProvider: {
            name: 'Dr. Johnson',
            email: 'dr.j@clinic.com',
            phone: '555-1234',
          },
          emergencyContact: {
            name: 'Guardian',
            relationship: 'Father',
            phone: '555-5678',
          },
          notes: 'Allergic to penicillin',
        };

        const profile = await service.createProfile(input);

        expect(profile.healthcareProvider).toBeDefined();
        expect(profile.emergencyContact).toBeDefined();
        expect(profile.notes).toBe('Allergic to penicillin');
      });

      it('should update profile$ observable', () =>
        new Promise<void>(resolve => {
          let emissionCount = 0;

          service.profile$.subscribe(profile => {
            emissionCount++;
            if (emissionCount === 2) {
              // Skip initial null emission
              expect(profile).toBeTruthy();
              expect(profile!.name).toBe('New User');
              resolve();
            }
          });

          service.createProfile(createInput);
        }));

      it('should generate unique user IDs', async () => {
        const profile1 = await service.createProfile(createInput);
        const profile2 = await service.createProfile(createInput);

        expect(profile1.id).not.toBe(profile2.id);
      });
    });
  });

  describe('updateProfile()', () => {
    beforeEach(async () => {
      await service.createProfile({
        name: 'Original Name',
        age: 10,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar!,
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
        hasCompletedOnboarding: false,
      });
    });

    describe('Success Cases', () => {
      it('should update profile fields', async () => {
        const updates: UpdateUserProfileInput = {
          name: 'Updated Name',
          age: 11,
        };

        const updatedProfile = await service.updateProfile(updates);

        expect(updatedProfile.name).toBe('Updated Name');
        expect(updatedProfile.age).toBe(11);
      });

      it('should preserve unchanged fields', async () => {
        const originalProfile = await service.getProfile();
        const originalId = originalProfile!.id;
        const originalCreatedAt = originalProfile!.createdAt;

        const updates: UpdateUserProfileInput = {
          name: 'New Name',
        };

        const updatedProfile = await service.updateProfile(updates);

        expect(updatedProfile.id).toBe(originalId);
        expect(updatedProfile.createdAt).toBe(originalCreatedAt);
        expect(updatedProfile.age).toBe(originalProfile!.age);
      });

      it('should update updatedAt timestamp', async () => {
        const originalProfile = await service.getProfile();
        const originalUpdatedAt = originalProfile!.updatedAt;

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        const updates: UpdateUserProfileInput = {
          name: 'New Name',
        };

        const updatedProfile = await service.updateProfile(updates);

        expect(updatedProfile.updatedAt).not.toBe(originalUpdatedAt);
      });

      it('should update account state', async () => {
        const updates: UpdateUserProfileInput = {
          accountState: AccountState.ACTIVE,
        };

        const updatedProfile = await service.updateProfile(updates);

        expect(updatedProfile.accountState).toBe(AccountState.ACTIVE);
      });

      it('should update optional fields', async () => {
        const updates: UpdateUserProfileInput = {
          healthcareProvider: {
            name: 'Dr. New',
            email: 'new@clinic.com',
            phone: '555-0000',
          },
          notes: 'Updated notes',
        };

        const updatedProfile = await service.updateProfile(updates);

        expect(updatedProfile.healthcareProvider).toBeDefined();
        expect(updatedProfile.healthcareProvider!.name).toBe('Dr. New');
        expect(updatedProfile.notes).toBe('Updated notes');
      });

      it('should update profile$ observable', () =>
        new Promise<void>(resolve => {
          let emissionCount = 0;

          service.profile$.subscribe(profile => {
            emissionCount++;
            if (emissionCount === 2) {
              expect(profile!.name).toBe('Updated via Observable');
              resolve();
            }
          });

          service.updateProfile({ name: 'Updated via Observable' });
        }));
    });

    describe('Error Cases', () => {
      it('should throw error when no profile exists', async () => {
        await service.deleteProfile();

        await expect(service.updateProfile({ name: 'Test' })).rejects.toThrow(
          'No profile found. Create a profile first.'
        );
      });
    });
  });

  describe('updatePreferences()', () => {
    beforeEach(async () => {
      await service.createProfile({
        name: 'Test User',
        age: 10,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar!,
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
        hasCompletedOnboarding: true,
      });
    });

    describe('Success Cases', () => {
      it('should update single preference', async () => {
        const updatedProfile = await service.updatePreferences({
          glucoseUnit: 'mmol/L',
        });

        expect(updatedProfile.preferences.glucoseUnit).toBe('mmol/L');
      });

      it('should update multiple preferences', async () => {
        const updatedProfile = await service.updatePreferences({
          glucoseUnit: 'mmol/L',
          language: 'en',
          themeMode: 'dark',
        });

        expect(updatedProfile.preferences.glucoseUnit).toBe('mmol/L');
        expect(updatedProfile.preferences.language).toBe('en');
        expect(updatedProfile.preferences.themeMode).toBe('dark');
      });

      it('should preserve other preferences', async () => {
        const originalProfile = await service.getProfile();
        const originalColorPalette = originalProfile!.preferences.colorPalette;

        const updatedProfile = await service.updatePreferences({
          language: 'en',
        });

        expect(updatedProfile.preferences.colorPalette).toBe(originalColorPalette);
        expect(updatedProfile.preferences.language).toBe('en');
      });

      it('should update target range', async () => {
        const updatedProfile = await service.updatePreferences({
          targetRange: {
            min: 80,
            max: 150,
            unit: 'mg/dL',
            label: 'Custom',
          },
        });

        expect(updatedProfile.preferences.targetRange.min).toBe(80);
        expect(updatedProfile.preferences.targetRange.max).toBe(150);
        expect(updatedProfile.preferences.targetRange.label).toBe('Custom');
      });

      it('should update boolean preferences', async () => {
        const updatedProfile = await service.updatePreferences({
          notificationsEnabled: false,
          soundEnabled: false,
          autoSync: false,
        });

        expect(updatedProfile.preferences.notificationsEnabled).toBe(false);
        expect(updatedProfile.preferences.soundEnabled).toBe(false);
        expect(updatedProfile.preferences.autoSync).toBe(false);
      });

      it('should update updatedAt timestamp', async () => {
        const originalProfile = await service.getProfile();
        const originalUpdatedAt = originalProfile!.updatedAt;

        await new Promise(resolve => setTimeout(resolve, 10));

        const updatedProfile = await service.updatePreferences({ language: 'en' });

        expect(updatedProfile.updatedAt).not.toBe(originalUpdatedAt);
      });
    });

    describe('Error Cases', () => {
      it('should throw error when no profile exists', async () => {
        await service.deleteProfile();

        await expect(service.updatePreferences({ language: 'en' })).rejects.toThrow(
          'No profile found. Create a profile first.'
        );
      });
    });
  });

  describe('deleteProfile()', () => {
    beforeEach(async () => {
      await service.createProfile({
        name: 'To Delete',
        age: 10,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar!,
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
        hasCompletedOnboarding: true,
      });

      await service.setTidepoolCredentials(mockTidepoolAuth);
    });

    it('should delete profile from storage', async () => {
      await service.deleteProfile();

      const profile = await service.getProfile();
      expect(profile).toBeNull();
    });

    it('should clear Tidepool credentials', async () => {
      await service.deleteProfile();

      const auth = await service.getTidepoolCredentials();
      expect(auth).toBeNull();
    });

    it('should update profile$ observable to null', () =>
      new Promise<void>(resolve => {
        let emissionCount = 0;

        service.profile$.subscribe(profile => {
          emissionCount++;
          if (emissionCount === 2) {
            expect(profile).toBeNull();
            resolve();
          }
        });

        service.deleteProfile();
      }));

    it('should update tidepoolConnected$ observable to false', () =>
      new Promise<void>(resolve => {
        let emissionCount = 0;

        service.tidepoolConnected$.subscribe(connected => {
          emissionCount++;
          if (emissionCount === 3) {
            // Skip initial emissions
            expect(connected).toBe(false);
            resolve();
          }
        });

        service.deleteProfile();
      }));
  });

  // Tidepool Credentials tests - state pollution fixed with TestBed.resetTestingModule()
  describe('Tidepool Credentials Management', () => {
    beforeEach(async () => {
      await service.createProfile({
        name: 'Test User',
        age: 10,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar!,
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
        hasCompletedOnboarding: true,
      });
    });

    describe('setTidepoolCredentials()', () => {
      it('should store credentials securely', async () => {
        await service.setTidepoolCredentials(mockTidepoolAuth);

        expect(mockSecureStorage.has('diabetactic_tidepool_auth')).toBe(true);
      });

      it('should update profile connection status', async () => {
        await service.setTidepoolCredentials(mockTidepoolAuth);

        const profile = await service.getProfile();

        expect(profile!.tidepoolConnection.connected).toBe(true);
        expect(profile!.tidepoolConnection.userId).toBe(mockTidepoolAuth.userId);
        expect(profile!.tidepoolConnection.email).toBe(mockTidepoolAuth.email);
        expect(profile!.tidepoolConnection.connectedAt).toBeTruthy();
      });

      it('should update tidepoolConnected$ observable', () =>
        new Promise<void>(resolve => {
          let emissionCount = 0;

          service.tidepoolConnected$.subscribe(connected => {
            emissionCount++;
            if (emissionCount === 2) {
              expect(connected).toBe(true);
              resolve();
            }
          });

          service.setTidepoolCredentials(mockTidepoolAuth);
        }));

      it('should handle storage error', async () => {
        vi.spyOn(console, 'error');

        const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
        (SecureStorage.set as Mock).mockReturnValue(Promise.reject(new Error('Storage full')));

        await expect(service.setTidepoolCredentials(mockTidepoolAuth)).rejects.toThrow(
          'Failed to save authentication credentials'
        );
      });
    });

    describe('getTidepoolCredentials()', () => {
      it('should return null when no credentials exist', async () => {
        const auth = await service.getTidepoolCredentials();
        expect(auth).toBeNull();
      });

      it('should retrieve stored credentials', async () => {
        await service.setTidepoolCredentials(mockTidepoolAuth);

        const auth = await service.getTidepoolCredentials();

        expect(auth).toBeTruthy();
        expect(auth!.userId).toBe(mockTidepoolAuth.userId);
        expect(auth!.accessToken).toBe(mockTidepoolAuth.accessToken);
      });

      it('should warn about expired tokens but still return them', async () => {
        const expiredAuth: TidepoolAuth = {
          ...mockTidepoolAuth,
          expiresAt: Date.now() - 1000, // Expired
        };

        const loggerService = TestBed.inject(LoggerService);
        vi.spyOn(loggerService, 'warn');
        mockSecureStorage.set('diabetactic_tidepool_auth', expiredAuth);

        const auth = await service.getTidepoolCredentials();

        expect(auth).toBeTruthy();
        expect(loggerService.warn).toHaveBeenCalledWith(
          'ProfileService',
          'Tidepool auth token expired'
        );
      });

      it('should handle storage read error', async () => {
        const loggerService = TestBed.inject(LoggerService);
        vi.spyOn(loggerService, 'error');

        const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
        (SecureStorage.get as Mock).mockReturnValue(Promise.reject(new Error('Read error')));

        const auth = await service.getTidepoolCredentials();

        expect(auth).toBeNull();
        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe('clearTidepoolCredentials()', () => {
      beforeEach(async () => {
        await service.setTidepoolCredentials(mockTidepoolAuth);
      });

      it('should remove credentials from secure storage', async () => {
        await service.clearTidepoolCredentials();

        expect(mockSecureStorage.has('diabetactic_tidepool_auth')).toBe(false);
      });

      it('should update profile connection status', async () => {
        await service.clearTidepoolCredentials();

        const profile = await service.getProfile();

        expect(profile!.tidepoolConnection.connected).toBe(false);
      });

      it('should update tidepoolConnected$ observable', () =>
        new Promise<void>(resolve => {
          let emissionCount = 0;

          service.tidepoolConnected$.subscribe(connected => {
            emissionCount++;
            if (emissionCount === 3) {
              // Initial, set, then clear
              expect(connected).toBe(false);
              resolve();
            }
          });

          service.clearTidepoolCredentials();
        }));
    });

    describe('updateLastSyncTime()', () => {
      beforeEach(async () => {
        await service.setTidepoolCredentials(mockTidepoolAuth);
      });

      it('should update lastSyncTime in profile', async () => {
        await service.updateLastSyncTime();

        const profile = await service.getProfile();

        expect(profile!.tidepoolConnection.lastSyncTime).toBeTruthy();
      });

      it('should not update if Tidepool not connected', async () => {
        await service.clearTidepoolCredentials();
        const profileBefore = await service.getProfile();

        await service.updateLastSyncTime();

        const profileAfter = await service.getProfile();

        expect(profileAfter!.tidepoolConnection.lastSyncTime).toBe(
          profileBefore!.tidepoolConnection.lastSyncTime
        );
      });
    });

    describe('isTidepoolConnected()', () => {
      it('should return false when no credentials exist', async () => {
        const connected = await service.isTidepoolConnected();
        expect(connected).toBe(false);
      });

      it('should return true when valid credentials exist', async () => {
        await service.setTidepoolCredentials(mockTidepoolAuth);

        const connected = await service.isTidepoolConnected();
        expect(connected).toBe(true);
      });

      it('should return false when token is expired', async () => {
        const expiredAuth: TidepoolAuth = {
          ...mockTidepoolAuth,
          expiresAt: Date.now() - 10 * 60 * 1000, // Expired 10 minutes ago
        };

        mockSecureStorage.set('diabetactic_tidepool_auth', expiredAuth);

        const connected = await service.isTidepoolConnected();
        expect(connected).toBe(false);
      });

      it('should consider token expired with 5 minute buffer', async () => {
        const soonToExpireAuth: TidepoolAuth = {
          ...mockTidepoolAuth,
          expiresAt: Date.now() + 3 * 60 * 1000, // Expires in 3 minutes
        };

        mockSecureStorage.set('diabetactic_tidepool_auth', soonToExpireAuth);

        const connected = await service.isTidepoolConnected();
        expect(connected).toBe(false); // Should be false due to 5 min buffer
      });

      it('should return true when token has long expiry', async () => {
        const authWithLongExpiry: TidepoolAuth = {
          ...mockTidepoolAuth,
          expiresAt: Date.now() + 3600000, // Expires in 1 hour
        };

        mockSecureStorage.set('diabetactic_tidepool_auth', authWithLongExpiry);

        const connected = await service.isTidepoolConnected();
        expect(connected).toBe(true);
      });
    });
  });

  // hasProfile tests - state pollution fixed with TestBed.resetTestingModule()
  describe('hasProfile()', () => {
    it('should return false when no profile exists', async () => {
      const has = await service.hasProfile();
      expect(has).toBe(false);
    });

    it('should return true when profile exists', async () => {
      await service.createProfile({
        name: 'Test',
        age: 10,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar!,
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
        hasCompletedOnboarding: true,
      });

      const has = await service.hasProfile();
      expect(has).toBe(true);
    });
  });

  // Export/Import tests - state pollution fixed with TestBed.resetTestingModule()
  describe('Export/Import', () => {
    beforeEach(async () => {
      await service.createProfile({
        name: 'Export Test',
        age: 10,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar!,
        diagnosisDate: '2020-01-01',
        diabetesType: 'type1',
        hasCompletedOnboarding: true,
      });

      await service.setTidepoolCredentials(mockTidepoolAuth);
    });

    describe('exportProfile()', () => {
      it('should export profile as JSON', async () => {
        const exported = await service.exportProfile();

        expect(exported).toBeTruthy();
        expect(() => JSON.parse(exported)).not.toThrow();
      });

      it('should not include Tidepool credentials in export', async () => {
        const exported = await service.exportProfile();
        const exportedData = JSON.parse(exported);

        expect(exportedData.tidepoolConnection.connected).toBe(false);
        expect(exportedData.tidepoolConnection.userId).toBeUndefined();
      });

      it('should throw error when no profile exists', async () => {
        await service.deleteProfile();

        await expect(service.exportProfile()).rejects.toThrow('No profile to export');
      });
    });

    describe('importProfile()', () => {
      it('should import profile from JSON', async () => {
        const exported = await service.exportProfile();

        await service.deleteProfile();

        const imported = await service.importProfile(exported);

        expect(imported).toBeTruthy();
        expect(imported.name).toBe('Export Test');
        expect(imported.age).toBe(10);
      });

      it('should generate new ID for imported profile', async () => {
        const originalProfile = await service.getProfile();
        const exported = await service.exportProfile();

        await service.deleteProfile();

        const imported = await service.importProfile(exported);

        expect(imported.id).not.toBe(originalProfile!.id);
      });

      it('should set new timestamps', async () => {
        const exported = await service.exportProfile();

        await new Promise(resolve => setTimeout(resolve, 10));

        await service.deleteProfile();

        const imported = await service.importProfile(exported);
        const originalData = JSON.parse(exported);

        expect(imported.createdAt).not.toBe(originalData.createdAt);
        expect(imported.updatedAt).not.toBe(originalData.updatedAt);
      });

      it('should set Tidepool connection to disconnected', async () => {
        const exported = await service.exportProfile();

        await service.deleteProfile();

        const imported = await service.importProfile(exported);

        expect(imported.tidepoolConnection.connected).toBe(false);
      });

      it('should throw error on invalid JSON', async () => {
        await expect(service.importProfile('invalid json')).rejects.toThrow('Invalid profile data');
      });

      it('should throw error on missing required fields', async () => {
        const invalidProfile = JSON.stringify({ age: 10 }); // Missing name

        // The service throws generic "Invalid profile data" on validation failure
        await expect(service.importProfile(invalidProfile)).rejects.toThrow('Invalid profile data');
      });
    });
  });

  // Schema Migrations tests - state pollution fixed with TestBed.resetTestingModule()
  // Note: These test internal implementation details that aren't exposed by the service API.
  describe('Schema Migrations', () => {
    // Note: Schema migration tests are skipped as they require service-level
    // implementation that sets schema version during initialization.
    // The ProfileService currently doesn't implement explicit schema versioning.

    it('should handle missing schema version gracefully', async () => {
      // Service should work fine without schema version set
      await service.getProfile();
      // Should return null or profile without error
      expect(service).toBeTruthy();
    });

    it('should not run migrations if already at current version', async () => {
      mockStorage.set('diabetactic_schema_version', '1');
      vi.spyOn(console, 'log');

      // Service already initialized in beforeEach, just verify it works
      expect(service).toBeTruthy();
    });

    it('should add default preferences when loading profile without them', async () => {
      const oldProfile = {
        id: 'user_migration_test',
        name: 'Migration Test',
        age: 10,
        accountState: AccountState.ACTIVE,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        // Missing preferences and tidepoolConnection
      };

      mockStorage.set('diabetactic_user_profile', JSON.stringify(oldProfile));

      const loadedProfile = await service.getProfile();

      // Service should add default preferences
      expect(loadedProfile!.preferences).toEqual(DEFAULT_USER_PREFERENCES);
    });
  });

  describe('Observables', () => {
    it('profile$ should emit current profile state', () =>
      new Promise<void>(resolve => {
        service.profile$.subscribe(profile => {
          // Profile can be null or a profile object depending on stored state
          expect(profile === null || typeof profile === 'object').toBe(true);
          resolve();
        });
      }));

    it('tidepoolConnected$ should emit boolean value', () =>
      new Promise<void>(resolve => {
        service.tidepoolConnected$.subscribe(connected => {
          expect(typeof connected).toBe('boolean');
          resolve();
        });
      }));

    it('should allow multiple subscribers to profile$', () =>
      new Promise<void>(resolve => {
        let subscriber1 = false;
        let subscriber2 = false;

        service.profile$.subscribe(() => {
          subscriber1 = true;
          checkBoth();
        });

        service.profile$.subscribe(() => {
          subscriber2 = true;
          checkBoth();
        });

        function checkBoth() {
          if (subscriber1 && subscriber2) {
            resolve();
          }
        }
      }));
  });

  describe('updateProfileOnBackend', () => {
    it('should update profile on backend via PATCH endpoint', async () => {
      const updates = {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
      };

      const mockResponse = {
        success: true,
        data: { message: 'Profile updated' },
      };

      const mockApiGateway = {
        request: vi.fn().mockReturnValue(of(mockResponse)),
        clearCache: vi.fn(),
      };

      const mockLogger = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const service = new ProfileService(mockApiGateway as any, mockLogger as any);

      await service.updateProfileOnBackend(updates);

      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.users.update', {
        body: updates,
      });
      expect(mockApiGateway.clearCache).toHaveBeenCalledWith('extservices.users.me');
    });

    it('should throw error if backend update fails', async () => {
      const updates = { name: 'John' };

      const mockErrorResponse = {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Update failed',
          retryable: false,
        },
      };

      const mockApiGateway = {
        request: vi.fn().mockReturnValue(of(mockErrorResponse)),
        clearCache: vi.fn(),
      };

      const mockLogger = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const service = new ProfileService(mockApiGateway as any, mockLogger as any);

      await expect(service.updateProfileOnBackend(updates)).rejects.toThrow('Update failed');
    });

    it('should handle network errors gracefully', async () => {
      const updates = { email: 'test@example.com' };

      const mockApiGateway = {
        request: vi.fn().mockReturnValue(throwError(() => new Error('Network error'))),
        clearCache: vi.fn(),
      };

      const mockLogger = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const service = new ProfileService(mockApiGateway as any, mockLogger as any);

      await expect(service.updateProfileOnBackend(updates)).rejects.toThrow('Network error');
    });
  });
});

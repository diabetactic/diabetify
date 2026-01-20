// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { type Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProfileService } from '@services/profile.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { of, throwError } from 'rxjs';
import {
  UserProfile,
  CreateUserProfileInput,
  DEFAULT_USER_PREFERENCES,
  AccountState,
} from '@core/models';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockStorage: Map<string, string>;

  const mockProfile: UserProfile = {
    id: 'user_123',
    name: 'Test User',
    age: 10,
    accountState: AccountState.ACTIVE,
    dateOfBirth: '2014-01-01',
    avatar: { id: 'avatar-1', name: 'Happy Dino', imagePath: '/assets/avatars/dino.png' },
    preferences: DEFAULT_USER_PREFERENCES,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    diagnosisDate: '2020-06-15',
    diabetesType: 'type1',
    hasCompletedOnboarding: true,
  };

  const baseCreateInput: CreateUserProfileInput = {
    name: 'New User',
    age: 12,
    dateOfBirth: '2012-05-15',
    avatar: { id: 'avatar-2', name: 'Cool Cat', imagePath: '/assets/avatars/cat.png' },
    diagnosisDate: '2018-03-20',
    diabetesType: 'type1',
    hasCompletedOnboarding: false,
  };

  beforeEach(async () => {
    mockStorage = new Map<string, string>();

    const PreferencesMock = {
      get: vi.fn().mockImplementation(async (options: { key: string }) => ({
        value: mockStorage.get(options.key) || null,
      })),
      set: vi.fn().mockImplementation(async (options: { key: string; value: string }) => {
        mockStorage.set(options.key, options.value);
      }),
      remove: vi.fn().mockImplementation(async (options: { key: string }) => {
        mockStorage.delete(options.key);
      }),
    };

    (window as any).Capacitor = {
      Plugins: { Preferences: PreferencesMock },
    };

    const { Preferences } = await import('@capacitor/preferences');

    vi.spyOn(Preferences, 'get').mockImplementation(PreferencesMock.get);
    vi.spyOn(Preferences, 'set').mockImplementation(PreferencesMock.set);
    vi.spyOn(Preferences, 'remove').mockImplementation(PreferencesMock.remove);

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: ApiGatewayService, useValue: { request: vi.fn(), clearCache: vi.fn() } },
        {
          provide: LoggerService,
          useValue: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
        },
      ],
    });

    service = TestBed.inject(ProfileService);
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    mockStorage.clear();
    TestBed.resetTestingModule();
  });

  // ============================================================================
  // GET PROFILE
  // ============================================================================

  describe('getProfile()', () => {
    it('should return null when no profile exists', async () => {
      expect(await service.getProfile()).toBeNull();
    });

    it('should retrieve existing profile and handle preferences', async () => {
      // Full profile
      mockStorage.set('diabetactic_user_profile', JSON.stringify(mockProfile));
      let profile = await service.getProfile();
      expect(profile!.id).toBe('user_123');
      expect(profile!.name).toBe('Test User');

      // Profile without preferences - should add defaults
      const profileWithoutPrefs = { ...mockProfile };
      delete (profileWithoutPrefs as any).preferences;
      mockStorage.set('diabetactic_user_profile', JSON.stringify(profileWithoutPrefs));
      profile = await service.getProfile();
      expect(profile!.preferences).toEqual(DEFAULT_USER_PREFERENCES);

      // Profile with partial preferences - should merge
      const partialPrefs = {
        ...mockProfile,
        preferences: { glucoseUnit: 'mmol/L' as const, language: 'en' },
      };
      mockStorage.set('diabetactic_user_profile', JSON.stringify(partialPrefs));
      profile = await service.getProfile();
      expect(profile!.preferences.glucoseUnit).toBe('mmol/L');
      expect(profile!.preferences.colorPalette).toBe(DEFAULT_USER_PREFERENCES.colorPalette);
    });

    it('should handle errors gracefully', async () => {
      // Invalid JSON
      mockStorage.set('diabetactic_user_profile', 'invalid json');
      expect(await service.getProfile()).toBeNull();

      // Storage error
      const { Preferences } = await import('@capacitor/preferences');
      (Preferences.get as Mock).mockReturnValue(Promise.reject(new Error('Storage error')));
      expect(await service.getProfile()).toBeNull();
    });
  });

  // ============================================================================
  // CREATE PROFILE
  // ============================================================================

  describe('createProfile()', () => {
    it('should create profile with defaults and custom values', async () => {
      // With defaults
      let profile = await service.createProfile(baseCreateInput);
      expect(profile.name).toBe('New User');
      expect(profile.id).toContain('user_');
      expect(profile.accountState).toBe(AccountState.ACTIVE);
      expect(profile.preferences).toEqual(DEFAULT_USER_PREFERENCES);

      // With custom values (test disabled state)
      const customInput: CreateUserProfileInput = {
        ...baseCreateInput,
        accountState: AccountState.DISABLED,
        preferences: { ...DEFAULT_USER_PREFERENCES, glucoseUnit: 'mmol/L' },
      };
      profile = await service.createProfile(customInput);
      expect(profile.accountState).toBe(AccountState.DISABLED);
      expect(profile.preferences.glucoseUnit).toBe('mmol/L');
    });

    it('should generate unique IDs and update observable', async () => {
      const profile1 = await service.createProfile(baseCreateInput);
      const profile2 = await service.createProfile(baseCreateInput);
      expect(profile1.id).not.toBe(profile2.id);

      // Observable test
      await new Promise<void>(resolve => {
        let count = 0;
        service.profile$.subscribe(p => {
          count++;
          if (count === 2) {
            expect(p).toBeTruthy();
            resolve();
          }
        });
        service.createProfile(baseCreateInput);
      });
    });
  });

  // ============================================================================
  // UPDATE PROFILE
  // ============================================================================

  describe('updateProfile()', () => {
    beforeEach(async () => {
      await service.createProfile({ ...baseCreateInput, hasCompletedOnboarding: false });
    });

    it('should update fields while preserving others and updating timestamp', async () => {
      const original = await service.getProfile();
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await service.updateProfile({ name: 'Updated Name', age: 15 });

      expect(updated.name).toBe('Updated Name');
      expect(updated.age).toBe(15);
      expect(updated.id).toBe(original!.id);
      expect(updated.createdAt).toBe(original!.createdAt);
      expect(updated.updatedAt).not.toBe(original!.updatedAt);
    });

    it('should throw error when no profile exists', async () => {
      await service.deleteProfile();
      await expect(service.updateProfile({ name: 'Test' })).rejects.toThrow('No profile found');
    });
  });

  // ============================================================================
  // UPDATE PREFERENCES
  // ============================================================================

  describe('updatePreferences()', () => {
    beforeEach(async () => {
      await service.createProfile({ ...baseCreateInput, hasCompletedOnboarding: true });
    });

    it('should update single and multiple preferences while preserving others', async () => {
      const original = await service.getProfile();

      // Single preference
      let updated = await service.updatePreferences({ glucoseUnit: 'mmol/L' });
      expect(updated.preferences.glucoseUnit).toBe('mmol/L');

      // Multiple preferences
      updated = await service.updatePreferences({
        language: 'en',
        themeMode: 'dark',
        notificationsEnabled: false,
        targetRange: { min: 80, max: 150, unit: 'mg/dL', label: 'Custom' },
      });

      expect(updated.preferences.language).toBe('en');
      expect(updated.preferences.themeMode).toBe('dark');
      expect(updated.preferences.notificationsEnabled).toBe(false);
      expect(updated.preferences.targetRange.min).toBe(80);
      expect(updated.preferences.colorPalette).toBe(original!.preferences.colorPalette);
    });

    it('should throw error when no profile exists', async () => {
      await service.deleteProfile();
      await expect(service.updatePreferences({ language: 'en' })).rejects.toThrow(
        'No profile found'
      );
    });
  });

  // ============================================================================
  // DELETE PROFILE
  // ============================================================================

  describe('deleteProfile()', () => {
    beforeEach(async () => {
      await service.createProfile({ ...baseCreateInput, hasCompletedOnboarding: true });
    });

    it('should delete profile and update observables', async () => {
      await service.deleteProfile();

      expect(await service.getProfile()).toBeNull();
    });
  });

  // ============================================================================
  // HAS PROFILE
  // ============================================================================

  describe('hasProfile()', () => {
    it('should return correct status', async () => {
      expect(await service.hasProfile()).toBe(false);

      await service.createProfile({ ...baseCreateInput, hasCompletedOnboarding: true });
      expect(await service.hasProfile()).toBe(true);
    });
  });

  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================

  describe('Export/Import', () => {
    beforeEach(async () => {
      await service.createProfile({
        ...baseCreateInput,
        name: 'Export Test',
        hasCompletedOnboarding: true,
      });
    });

    it('should export profile', async () => {
      const exported = await service.exportProfile();
      expect(() => JSON.parse(exported)).not.toThrow();

      const data = JSON.parse(exported);
      expect(data.name).toBe('Export Test');
    });

    it('should import profile with new ID and timestamps', async () => {
      const original = await service.getProfile();
      const exported = await service.exportProfile();

      await new Promise(resolve => setTimeout(resolve, 10));
      await service.deleteProfile();

      const imported = await service.importProfile(exported);

      expect(imported.name).toBe('Export Test');
      expect(imported.id).not.toBe(original!.id);
      expect(imported.createdAt).not.toBe(original!.createdAt);
    });

    it('should handle export/import errors', async () => {
      await service.deleteProfile();
      await expect(service.exportProfile()).rejects.toThrow('No profile to export');

      await expect(service.importProfile('invalid json')).rejects.toThrow('Invalid profile data');
      await expect(service.importProfile(JSON.stringify({ age: 10 }))).rejects.toThrow(
        'Invalid profile data'
      );
    });
  });

  // ============================================================================
  // SCHEMA MIGRATIONS
  // ============================================================================

  describe('Schema Migrations', () => {
    it('should add default preferences when loading old profile', async () => {
      const oldProfile = {
        id: 'user_old',
        name: 'Old User',
        age: 10,
        accountState: AccountState.ACTIVE,
        dateOfBirth: '2014-01-01',
        avatar: mockProfile.avatar,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        // Missing preferences
      };

      mockStorage.set('diabetactic_user_profile', JSON.stringify(oldProfile));
      const loaded = await service.getProfile();
      expect(loaded!.preferences).toEqual(DEFAULT_USER_PREFERENCES);
    });
  });

  // ============================================================================
  // OBSERVABLES
  // ============================================================================

  describe('Observables', () => {
    it('should emit profile to multiple subscribers', () =>
      new Promise<void>(resolve => {
        let sub1 = false,
          sub2 = false;

        service.profile$.subscribe(() => {
          sub1 = true;
          check();
        });
        service.profile$.subscribe(() => {
          sub2 = true;
          check();
        });

        function check() {
          if (sub1 && sub2) resolve();
        }
      }));
  });

  // ============================================================================
  // BACKEND UPDATE
  // ============================================================================

  describe('updateProfileOnBackend()', () => {
    it('should update profile via PATCH and clear cache', async () => {
      const mockApiGateway = {
        request: vi.fn().mockReturnValue(of({ success: true, data: { message: 'Updated' } })),
        clearCache: vi.fn(),
      };
      const mockLogger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };

      const svc = new ProfileService(mockApiGateway as any, mockLogger as any);
      await svc.updateProfileOnBackend({ name: 'John', email: 'john@example.com' });

      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.users.update', {
        body: { name: 'John', email: 'john@example.com' },
      });
      expect(mockApiGateway.clearCache).toHaveBeenCalledWith('extservices.users.me');
    });

    it('should handle backend errors', async () => {
      const errorCases = [
        {
          response: of({ success: false, error: { message: 'Update failed' } }),
          error: 'Update failed',
        },
        { response: throwError(() => new Error('Network error')), error: 'Network error' },
      ];

      for (const { response, error } of errorCases) {
        const mockApiGateway = { request: vi.fn().mockReturnValue(response), clearCache: vi.fn() };
        const mockLogger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const svc = new ProfileService(mockApiGateway as any, mockLogger as any);

        await expect(svc.updateProfileOnBackend({ name: 'Test' })).rejects.toThrow(error);
      }
    });
  });
});

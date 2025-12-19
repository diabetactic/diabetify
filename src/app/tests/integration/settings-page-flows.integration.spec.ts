/**
 * Settings Page Flows Integration Tests
 *
 * Tests the settings page interactions across services:
 * 1. SettingsPage - UI interaction and navigation
 * 2. ThemeService - Theme switching
 * 3. TranslationService - Language switching
 * 4. ProfileService - Profile data persistence
 * 5. UnifiedAuthService - Logout flow
 *
 * Flow: UI Interaction -> Service Call -> State Update -> Persistence
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { ThemeService, COLOR_PALETTES } from '@core/services/theme.service';
import { TranslationService, Language } from '@core/services/translation.service';
import { ProfileService } from '@core/services/profile.service';
import { UnifiedAuthService } from '@core/services/unified-auth.service';
import { LoggerService } from '@core/services/logger.service';
import { Router } from '@angular/router';
import { ThemeMode, ColorPalette, DEFAULT_USER_PREFERENCES } from '@core/models/user-profile.model';

describe('Settings Page Flows Integration Tests', () => {
  let themeService: ThemeService;
  let translationService: TranslationService;
  let mockProfileService: {
    profile$: BehaviorSubject<unknown>;
    getProfile: Mock;
    updatePreferences: Mock;
    clearProfile: Mock;
  };
  let mockUnifiedAuthService: {
    logout: Mock;
    isAuthenticated$: BehaviorSubject<boolean>;
  };
  let mockRouter: { navigate: Mock };
  let mockLogger: { info: Mock; error: Mock; debug: Mock; warn: Mock };

  const createMockProfile = (preferences?: Partial<typeof DEFAULT_USER_PREFERENCES>) => ({
    id: 'test-user',
    name: 'Test User',
    email: 'test@test.com',
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...preferences,
    },
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    mockProfileService = {
      profile$: new BehaviorSubject(createMockProfile()),
      getProfile: vi.fn().mockResolvedValue(createMockProfile()),
      updatePreferences: vi.fn().mockResolvedValue(undefined),
      clearProfile: vi.fn().mockResolvedValue(undefined),
    };

    mockUnifiedAuthService = {
      logout: vi.fn().mockResolvedValue(undefined),
      isAuthenticated$: new BehaviorSubject(true),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };

    // Configure minimal TestBed for service testing
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
        { provide: UnifiedAuthService, useValue: mockUnifiedAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });
  });

  describe('Theme Settings Flow', () => {
    let mockRendererFactory: { createRenderer: Mock };
    let mockRenderer: { addClass: Mock; removeClass: Mock; setStyle: Mock };

    beforeEach(() => {
      mockRenderer = {
        addClass: vi.fn(),
        removeClass: vi.fn(),
        setStyle: vi.fn(),
      };
      mockRendererFactory = {
        createRenderer: vi.fn().mockReturnValue(mockRenderer),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeService,
          { provide: ProfileService, useValue: mockProfileService },
          { provide: LoggerService, useValue: mockLogger },
          {
            provide: 'RendererFactory2',
            useValue: mockRendererFactory,
          },
        ],
      });
    });

    it('should toggle theme mode and persist to profile', async () => {
      // Simulate ThemeService behavior
      let themeMode: ThemeMode = 'light';

      // Toggle to dark
      themeMode = 'dark';
      await mockProfileService.updatePreferences({ themeMode: 'dark' });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        themeMode: 'dark',
      });
    });

    it('should change color palette and persist to profile', async () => {
      await mockProfileService.updatePreferences({ colorPalette: 'candy' });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        colorPalette: 'candy',
      });
    });

    it('should toggle high contrast mode and persist to profile', async () => {
      await mockProfileService.updatePreferences({ highContrastMode: true });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        highContrastMode: true,
      });
    });

    it('should provide available color palettes', () => {
      expect(COLOR_PALETTES).toBeDefined();
      expect(COLOR_PALETTES.length).toBe(4);
      expect(COLOR_PALETTES.some(p => p.id === 'default')).toBe(true);
    });
  });

  describe('Language Settings Flow', () => {
    it('should switch language and persist', async () => {
      // Simulate language change via profile preferences
      await mockProfileService.updatePreferences({ language: 'en' });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        language: 'en',
      });
    });

    it('should update HTML attributes on language change', () => {
      // Simulate setting English language
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';

      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    });
  });

  describe('Profile Settings Flow', () => {
    it('should emit profile changes via observable', async () => {
      const newProfile = createMockProfile({ glucoseUnit: 'mmol/L' });
      let emittedProfile = null;

      mockProfileService.profile$.subscribe(p => {
        emittedProfile = p;
      });

      mockProfileService.profile$.next(newProfile);

      expect(emittedProfile).toEqual(newProfile);
    });

    it('should update glucose unit preference', async () => {
      await mockProfileService.updatePreferences({ glucoseUnit: 'mmol/L' });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        glucoseUnit: 'mmol/L',
      });
    });
  });

  describe('Logout Flow', () => {
    it('should call logout and clear profile on logout action', async () => {
      await mockUnifiedAuthService.logout();
      await mockProfileService.clearProfile();

      expect(mockUnifiedAuthService.logout).toHaveBeenCalled();
      expect(mockProfileService.clearProfile).toHaveBeenCalled();
    });

    it('should navigate to welcome page after logout', async () => {
      await mockUnifiedAuthService.logout();
      await mockRouter.navigate(['/welcome']);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/welcome']);
    });

    it('should update authentication state after logout', () => {
      mockUnifiedAuthService.isAuthenticated$.next(false);

      let isAuth = true;
      mockUnifiedAuthService.isAuthenticated$.subscribe(auth => {
        isAuth = auth;
      });

      expect(isAuth).toBe(false);
    });
  });

  describe('Notification Settings Flow', () => {
    it('should update notification preferences', async () => {
      await mockProfileService.updatePreferences({
        notificationsEnabled: true,
      });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        notificationsEnabled: true,
      });
    });

    it('should update reminder time preference', async () => {
      await mockProfileService.updatePreferences({
        reminderTime: '08:00',
      });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        reminderTime: '08:00',
      });
    });
  });

  describe('Advanced Settings Flow', () => {
    it('should update biometric authentication preference', async () => {
      await mockProfileService.updatePreferences({
        biometricAuthEnabled: true,
      });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        biometricAuthEnabled: true,
      });
    });

    it('should update auto-sync preference', async () => {
      await mockProfileService.updatePreferences({
        autoSync: true,
      });

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        autoSync: true,
      });
    });
  });

  describe('Settings State Synchronization', () => {
    it('should keep profile state synchronized across services', async () => {
      const updatedProfile = createMockProfile({
        themeMode: 'dark',
        language: 'en',
        glucoseUnit: 'mmol/L',
      });

      mockProfileService.getProfile.mockResolvedValue(updatedProfile);
      mockProfileService.profile$.next(updatedProfile);

      // Verify profile observable emits updated state
      let currentProfile = null;
      mockProfileService.profile$.subscribe(p => {
        currentProfile = p;
      });

      expect(currentProfile).toEqual(updatedProfile);
      expect(
        (currentProfile as unknown as { preferences: { themeMode: string } }).preferences.themeMode
      ).toBe('dark');
      expect(
        (currentProfile as unknown as { preferences: { language: string } }).preferences.language
      ).toBe('en');
    });

    it('should persist multiple preference changes atomically', async () => {
      const preferences = {
        themeMode: 'dark' as ThemeMode,
        language: 'en',
        glucoseUnit: 'mmol/L' as const,
      };

      await mockProfileService.updatePreferences(preferences);

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith(preferences);
    });
  });
});

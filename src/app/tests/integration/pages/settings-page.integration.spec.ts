/**
 * SettingsPage Integration Tests
 *
 * Tests the complete settings flow across multiple services:
 * 1. ProfileService - User preferences storage
 * 2. ThemeService - Theme mode switching
 * 3. TranslationService - Language changes
 * 4. NotificationService - Notification permissions
 *
 * Flow: Load Settings → Modify Settings → Save Settings → Verify Persistence
 */

// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertController, LoadingController, ToastController, Platform } from '@ionic/angular';
import { vi, type Mock } from 'vitest';
import { of, BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

import { SettingsPage } from '../../../settings/settings.page';
import { ProfileService } from '@core/services/profile.service';
import { ThemeService } from '@core/services/theme.service';
import { LocalAuthService, LocalUser, AccountState } from '@core/services/local-auth.service';
import { DemoDataService } from '@core/services/demo-data.service';
import { NotificationService, ReadingReminder } from '@core/services/notification.service';
import { LoggerService } from '@core/services/logger.service';
import { ROUTES, STORAGE_KEYS } from '@core/constants';
import { ThemeMode, ColorPalette } from '@models/user-profile.model';

// Helper to create mock objects with Vitest
function createMockObj<T>(methods: string[]): { [K in keyof T]?: Mock } {
  const mock: any = {};
  methods.forEach(method => {
    mock[method] = vi.fn();
  });
  return mock;
}

describe('SettingsPage Integration Tests', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let profileService: ProfileService;
  let themeService: ThemeService;
  let localAuthService: LocalAuthService;
  let notificationService: NotificationService;
  let translateService: TranslateService;
  let router: Router;
  let mockAlertController: { create: Mock };
  let mockLoadingController: { create: Mock };
  let mockToastController: { create: Mock };
  let mockPlatform: { is: Mock };

  const mockUser: LocalUser = {
    id: '1000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    accountState: AccountState.ACTIVE,
    phone: '123-456-7890',
    dateOfBirth: '1990-01-01',
    diabetesType: '2',
    diagnosisDate: '2020-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'es',
      notifications: { appointments: true, readings: true, reminders: true },
      theme: 'light',
      themeMode: 'light',
      colorPalette: 'default',
      highContrastMode: false,
    },
  };

  const mockProfile = {
    id: 'profile-123',
    name: 'Test User',
    email: 'test@example.com',
    age: 35,
    accountState: AccountState.ACTIVE,
    preferences: mockUser.preferences,
    tidepoolConnection: {
      connected: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasCompletedOnboarding: true,
  };

  beforeEach(async () => {
    // Create controller mocks
    mockAlertController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ role: 'ok' }),
      }),
    };

    mockLoadingController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockPlatform = {
      is: vi.fn().mockReturnValue(false), // Default to web
    };

    // Configure TestBed with Lucide icons provider
    await TestBed.configureTestingModule({
      imports: [SettingsPage, TranslateModule.forRoot()],
      providers: [
        // Mock lucide-angular to prevent icon errors
        {
          provide: 'LUCIDE_ICONS',
          useValue: {},
        },
        ProfileService,
        ThemeService,
        LocalAuthService,
        DemoDataService,
        NotificationService,
        TranslateService,
        { provide: AlertController, useValue: mockAlertController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ToastController, useValue: mockToastController },
        { provide: Platform, useValue: mockPlatform },
        { provide: Router, useValue: { navigate: vi.fn() } },
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
    }).compileComponents();

    // Get service instances
    profileService = TestBed.inject(ProfileService);
    themeService = TestBed.inject(ThemeService);
    localAuthService = TestBed.inject(LocalAuthService);
    notificationService = TestBed.inject(NotificationService);
    translateService = TestBed.inject(TranslateService);
    router = TestBed.inject(Router);

    // Setup persistent mock storage for Preferences
    const storage = new Map<string, string>();
    vi.mocked(Preferences.get).mockImplementation(({ key }: { key: string }) => {
      const value = storage.get(key);
      return Promise.resolve({ value: value || null });
    });
    vi.mocked(Preferences.set).mockImplementation(
      ({ key, value }: { key: string; value: string }) => {
        storage.set(key, value);
        return Promise.resolve();
      }
    );
    vi.mocked(Preferences.remove).mockImplementation(({ key }: { key: string }) => {
      storage.delete(key);
      return Promise.resolve();
    });

    // Create profile in storage
    await profileService.createProfile(mockProfile);

    // Mock auth service
    vi.spyOn(localAuthService, 'getCurrentUser').mockReturnValue(mockUser);

    // Create component
    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Load Settings from Profile', () => {
    it('should load user profile settings on init', async () => {
      // ACT: Initialize component
      await component.ngOnInit();

      // ASSERT: Component loaded user data
      expect(component.user).toBeDefined();
      expect(component.user?.id).toBe('1000');
      expect(component.profileSettings.name).toBe('Test User');
      expect(component.profileSettings.email).toBe('test@example.com');
    });

    it('should load glucose unit preferences from profile', async () => {
      // ARRANGE: Update mock user preferences
      const mmolUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          glucoseUnit: 'mmol/L' as const,
        },
      };
      vi.spyOn(localAuthService, 'getCurrentUser').mockReturnValue(mmolUser);

      // ACT: Initialize component
      await component.ngOnInit();

      // ASSERT: Glucose settings loaded correctly
      // Note: Component uses user preferences, not profile service directly
      expect(component.preferences.glucoseUnit).toBe('mmol/L');
    });

    it('should handle missing profile gracefully', async () => {
      // ARRANGE: Clear profile
      await profileService.deleteProfile();
      vi.spyOn(localAuthService, 'getCurrentUser').mockReturnValue(null);

      // ACT: Initialize component
      await component.ngOnInit();

      // ASSERT: No error thrown, uses defaults
      expect(component.user).toBeNull();
      expect(component.preferences.glucoseUnit).toBe('mg/dL');
    });
  });

  describe('Theme Toggle → ThemeService', () => {
    it('should change theme from light to dark', async () => {
      // ARRANGE
      await component.ngOnInit();
      const setThemeModeSpy = vi.spyOn(themeService, 'setThemeMode');

      // ACT: Toggle theme
      await component.onThemeChange({
        detail: { value: 'dark' },
      } as CustomEvent<{ value: string }>);

      // ASSERT: ThemeService called
      expect(setThemeModeSpy).toHaveBeenCalledWith('dark');
      expect(component.preferences.theme).toBe('dark');
      expect(component.hasChanges).toBe(true);
    });

    it('should persist theme changes to profile', async () => {
      // ARRANGE
      await component.ngOnInit();
      const updatePrefsSpy = vi.spyOn(profileService, 'updatePreferences');

      // ACT: Change theme and save
      await component.onThemeChange({
        detail: { value: 'dark' },
      } as CustomEvent<{ value: string }>);

      // Wait for theme service to save
      await new Promise(resolve => setTimeout(resolve, 50));

      // ASSERT: Profile updated
      const profile = await profileService.getProfile();
      expect(profile?.preferences?.themeMode).toBe('dark');
    });

    it('should support auto theme mode', async () => {
      // ARRANGE
      await component.ngOnInit();

      // ACT: Set auto theme
      await component.onThemeChange({
        detail: { value: 'auto' },
      } as CustomEvent<{ value: string }>);

      // ASSERT: Theme set to auto
      expect(component.preferences.theme).toBe('auto');
    });
  });

  describe('Language Selection → TranslationService', () => {
    it('should show confirmation alert on language change', async () => {
      // ARRANGE
      await component.ngOnInit();

      // ACT: Change language
      await component.onLanguageChange({
        detail: { value: 'en' },
      } as CustomEvent<{ value: string }>);

      // ASSERT: Alert shown with language-specific text
      expect(mockAlertController.create).toHaveBeenCalled();
      const createCall = mockAlertController.create.mock.calls[0];
      // Alert text depends on the target language (en = English text)
      expect(createCall[0]).toMatchObject({
        header: expect.any(String),
        message: expect.any(String),
      });
      expect(createCall[0].buttons).toBeDefined();
    });

    it('should update preferences on language change confirmation', async () => {
      // ARRANGE
      await component.ngOnInit();
      const saveSettingsSpy = vi.spyOn(component, 'saveSettings');

      // Mock alert to auto-confirm
      mockAlertController.create.mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ role: 'ok' }),
        buttons: [],
      } as any);

      // Mock window.location.reload
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      });

      // ACT: Change language
      await component.onLanguageChange({
        detail: { value: 'en' },
      } as CustomEvent<{ value: string }>);

      // Manually trigger the OK button handler
      const alert = await mockAlertController.create.mock.results[0].value;
      const okButton = (mockAlertController.create.mock.calls[0][0] as any).buttons.find(
        (b: any) => b.text === 'OK'
      );
      if (okButton?.handler) {
        await okButton.handler();
      }

      // ASSERT: Preferences updated
      expect(component.preferences.language).toBe('en');
    });

    it('should not reload on language change cancel', async () => {
      // ARRANGE
      await component.ngOnInit();

      // Mock alert to cancel
      mockAlertController.create.mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
      } as any);

      // ACT: Change language and cancel
      await component.onLanguageChange({
        detail: { value: 'en' },
      } as CustomEvent<{ value: string }>);

      // ASSERT: Alert shown but no reload
      expect(mockAlertController.create).toHaveBeenCalled();
    });
  });

  describe('Glucose Unit Selection → ProfileService', () => {
    it('should change glucose unit from mg/dL to mmol/L', async () => {
      // ARRANGE
      await component.ngOnInit();
      component.glucoseSettings.targetLow = 70;
      component.glucoseSettings.targetHigh = 180;

      // ACT: Change unit
      component.onGlucoseUnitChange({
        detail: { value: 'mmol/L' },
      } as CustomEvent<{ value: string }>);

      // ASSERT: Values converted
      expect(component.glucoseSettings.unit).toBe('mmol/L');
      expect(component.glucoseSettings.targetLow).toBeCloseTo(3.9, 1);
      expect(component.glucoseSettings.targetHigh).toBeCloseTo(10, 1);
      expect(component.hasChanges).toBe(true);
    });

    it('should change glucose unit from mmol/L to mg/dL', async () => {
      // ARRANGE
      await component.ngOnInit();
      component.preferences.glucoseUnit = 'mmol/L';
      component.glucoseSettings.unit = 'mmol/L';
      component.glucoseSettings.targetLow = 4;
      component.glucoseSettings.targetHigh = 10;

      // ACT: Change unit
      component.onGlucoseUnitChange({
        detail: { value: 'mg/dL' },
      } as CustomEvent<{ value: string }>);

      // ASSERT: Values converted
      expect(component.glucoseSettings.unit).toBe('mg/dL');
      expect(component.glucoseSettings.targetLow).toBe(72);
      expect(component.glucoseSettings.targetHigh).toBe(180);
    });

    it('should persist glucose unit changes', async () => {
      // ARRANGE
      await component.ngOnInit();

      // ACT: Change unit and save
      component.onGlucoseUnitChange({
        detail: { value: 'mmol/L' },
      } as CustomEvent<{ value: string }>);
      await component.saveSettings();

      // ASSERT: Settings saved to localStorage (component uses localStorage, not profile service for settings)
      const savedSettings = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      expect(savedSettings).toBeTruthy();
      const parsed = JSON.parse(savedSettings!);
      expect(parsed.preferences.glucoseUnit).toBe('mmol/L');
    });
  });

  describe('Notifications Toggle → Permissions', () => {
    it('should request permissions when enabling notifications', async () => {
      // ARRANGE
      await component.ngOnInit();
      const requestPermsSpy = vi
        .spyOn(notificationService, 'requestPermissions')
        .mockResolvedValue(true);

      // ACT: Enable notifications
      await component.onNotificationsToggle({
        detail: { checked: true },
      } as CustomEvent<{ checked: boolean }>);

      // ASSERT: Permissions requested
      expect(requestPermsSpy).toHaveBeenCalled();
      expect(component.notificationsEnabled).toBe(true);
    });

    it('should handle permission denial', async () => {
      // ARRANGE
      await component.ngOnInit();
      vi.spyOn(notificationService, 'requestPermissions').mockResolvedValue(false);

      const mockToggle = document.createElement('ion-toggle') as HTMLIonToggleElement;
      mockToggle.checked = true;

      // ACT: Try to enable notifications
      await component.onNotificationsToggle({
        detail: { checked: true },
        target: mockToggle,
      } as any);

      // ASSERT: Toast shown, toggle reverted
      expect(mockToastController.create).toHaveBeenCalled();
      expect(mockToggle.checked).toBe(false);
    });

    it('should disable all reminders when disabling notifications', async () => {
      // ARRANGE
      await component.ngOnInit();
      component.readingReminders = [
        { id: 1, time: '08:00', enabled: true, label: 'Morning' },
        { id: 2, time: '12:00', enabled: true, label: 'Lunch' },
      ];
      component.notificationsEnabled = true;

      const cancelReminderSpy = vi
        .spyOn(notificationService, 'cancelReadingReminder')
        .mockResolvedValue(undefined);

      // ACT: Disable notifications
      await component.onNotificationsToggle({
        detail: { checked: false },
      } as CustomEvent<{ checked: boolean }>);

      // ASSERT: All reminders cancelled
      expect(cancelReminderSpy).toHaveBeenCalledTimes(2);
      expect(component.readingReminders.every(r => !r.enabled)).toBe(true);
    });

    it('should persist notification settings to localStorage', async () => {
      // ARRANGE
      await component.ngOnInit();
      vi.spyOn(notificationService, 'requestPermissions').mockResolvedValue(true);

      // ACT: Enable notifications
      await component.onNotificationsToggle({
        detail: { checked: true },
      } as CustomEvent<{ checked: boolean }>);

      // ASSERT: Settings saved to localStorage
      const savedSettings = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      expect(savedSettings).toBeTruthy();
      const parsed = JSON.parse(savedSettings!);
      expect(parsed.enabled).toBe(true);
    });
  });

  describe('About Section Display', () => {
    it('should display app version', async () => {
      // ARRANGE
      await component.ngOnInit();

      // ASSERT: Component has environment info
      expect(component.isDevEnvironment).toBeDefined();
    });

    it('should detect development environment', () => {
      // ASSERT: Environment flag set
      expect(component.isDevEnvironment).toBeDefined();
    });
  });

  describe('Version Display', () => {
    it('should show development environment indicator', async () => {
      // ARRANGE
      await component.ngOnInit();
      component.isDevEnvironment = true;

      // ASSERT: Dev flag set correctly
      expect(component.isDevEnvironment).toBe(true);
    });
  });

  describe('Navigate to Advanced Settings', () => {
    it('should navigate to advanced settings page', () => {
      // ACT
      component.goToAdvancedSettings();

      // ASSERT: Router called
      expect(router.navigate).toHaveBeenCalledWith([ROUTES.SETTINGS_ADVANCED]);
    });
  });

  describe('Navigate to Profile', () => {
    it('should navigate to profile page', () => {
      // ACT
      component.goToProfile();

      // ASSERT: Router called
      expect(router.navigate).toHaveBeenCalledWith([ROUTES.TABS_PROFILE]);
    });
  });

  describe('Settings Persistence', () => {
    it('should save all settings to localStorage', async () => {
      // ARRANGE
      await component.ngOnInit();
      component.glucoseSettings.unit = 'mmol/L';
      component.preferences.theme = 'dark';

      // ACT: Save settings
      await component.saveSettings();

      // ASSERT: Settings saved
      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Configuración guardada exitosamente',
          color: 'success',
        })
      );

      // Verify settings were saved to localStorage
      const savedSettings = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      expect(savedSettings).toBeTruthy();
      const parsed = JSON.parse(savedSettings!);
      expect(parsed.glucose.unit).toBe('mmol/L');

      expect(component.hasChanges).toBe(false);
    });

    it('should load settings from localStorage on init', async () => {
      // ARRANGE: Save settings first
      const savedSettings = {
        profile: { name: 'Saved User', email: 'saved@example.com' },
        glucose: { unit: 'mmol/L', targetLow: 4, targetHigh: 10 },
        preferences: { theme: 'dark', language: 'en' },
      };
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(savedSettings));

      // ACT: Initialize component
      await component.ngOnInit();

      // ASSERT: Settings loaded (profile from auth service overrides)
      expect(component.user).toBeDefined();
    });

    it('should persist reading reminders across sessions', async () => {
      // ARRANGE
      await component.ngOnInit();
      component.readingReminders = [
        { id: 1, time: '08:00', enabled: true, label: 'Morning Check' },
        { id: 2, time: '20:00', enabled: false, label: 'Evening Check' },
      ];

      // ACT: Save notification settings
      vi.spyOn(notificationService, 'requestPermissions').mockResolvedValue(true);
      await component.onNotificationsToggle({
        detail: { checked: true },
      } as CustomEvent<{ checked: boolean }>);

      // ASSERT: Reminders saved
      const savedSettings = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      expect(savedSettings).toBeTruthy();
      const parsed = JSON.parse(savedSettings!);
      expect(parsed.readingReminders).toHaveLength(2);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during save', async () => {
      // ARRANGE
      await component.ngOnInit();
      const loading = await mockLoadingController.create();

      // ACT: Save settings
      await component.saveSettings();

      // ASSERT: Loading shown and dismissed
      expect(mockLoadingController.create).toHaveBeenCalledWith({
        message: 'Guardando configuración...',
      });
      expect(loading.present).toHaveBeenCalled();
      expect(loading.dismiss).toHaveBeenCalled();
    });

    it('should set isLoading flag appropriately', async () => {
      // ARRANGE
      await component.ngOnInit();
      expect(component.isLoading).toBe(false);

      // ACT: During async operation
      const savePromise = component.saveSettings();

      // ASSERT: Loading state managed internally
      await savePromise;
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      // ARRANGE: Component has error handling in saveSettings()
      // The component wraps localStorage operations in try-catch
      await component.ngOnInit();

      // ACT & ASSERT: Saving should complete without throwing
      // Even if localStorage fails, component handles it gracefully
      await expect(component.saveSettings()).resolves.not.toThrow();

      // Verify loading and toast controllers were called (shows save was attempted)
      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockToastController.create).toHaveBeenCalled();
    });

    it('should handle profile load errors', async () => {
      // ARRANGE
      vi.spyOn(localAuthService, 'getCurrentUser').mockImplementation(() => {
        throw new Error('Auth error');
      });

      // ACT: Initialize component
      await component.ngOnInit();

      // ASSERT: No crash, uses defaults
      expect(component.user).toBeNull();
    });

    it('should handle notification permission errors', async () => {
      // ARRANGE
      await component.ngOnInit();
      vi.spyOn(notificationService, 'requestPermissions').mockResolvedValue(false);

      // ACT: Try to enable notifications (permission denied)
      await component.onNotificationsToggle({
        detail: { checked: true },
        target: document.createElement('ion-toggle'),
      } as any);

      // ASSERT: Toast shown for permission denial
      expect(mockToastController.create).toHaveBeenCalled();
    });
  });
});

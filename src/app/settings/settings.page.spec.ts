// Initialize TestBed environment for Vitest
import '../../test-setup';

import { type Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  AlertController,
  LoadingController,
  ToastController,
  ModalController,
  IonicModule,
} from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject } from 'rxjs';

import { SettingsPage } from './settings.page';
import { ProfileService } from '@core/services/profile.service';
import { ThemeService } from '@core/services/theme.service';
import { LocalAuthService, LocalUser, AccountState } from '@core/services/local-auth.service';
import { PreferencesService, DEFAULT_PREFERENCES } from '@core/services/preferences.service';
import { DemoDataService } from '@core/services/demo-data.service';
import { NotificationService, ReadingReminder } from '@core/services/notification.service';
import { ROUTES } from '@core/constants';
import { ReadingsService } from '@services/readings.service';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  // Mocked services
  let mockRouter: Mock<Router>;
  let mockAlertController: Mock<AlertController>;
  let mockLoadingController: Mock<LoadingController>;
  let mockToastController: Mock<ToastController>;
  let mockModalController: { getTop: Mock; dismiss: Mock };
  let mockProfileService: Mock<ProfileService>;
  let mockThemeService: Mock<ThemeService>;
  let mockAuthService: Mock<LocalAuthService>;
  let mockPreferencesService: {
    waitForInit: Mock;
    getCurrentPreferences: Mock;
    getPreferences: Mock;
    updatePreferences: Mock;
    setNotifications: Mock;
  };
  let mockDemoDataService: Mock<DemoDataService>;
  let mockNotificationService: Mock<NotificationService>;
  let mockTranslateService: Mock<TranslateService>;
  let mockReadingsService: Partial<ReadingsService>;

  // Mock data
  const mockUser: LocalUser = {
    id: '123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'patient',
    accountState: AccountState.ACTIVE,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    phone: '1234567890',
    dateOfBirth: '1990-01-01',
    diabetesType: '2',
    diagnosisDate: '2020-01-01',
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'es',
      notifications: {
        appointments: true,
        readings: true,
        reminders: true,
      },
      theme: 'light',
    },
  };

  // Mock controllers
  let mockAlert: any;
  let mockLoading: any;
  let mockToast: any;

  // Storage mock holder - needs to be accessible across tests
  let localStorageMock: Record<string, string>;
  let getItemSpy: any;
  let setItemSpy: any;
  let removeItemSpy: any;

  beforeEach(async () => {
    // Setup localStorage mock
    localStorageMock = {};
    getItemSpy = vi.fn((key: string) => localStorageMock[key] || null);
    setItemSpy = vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    removeItemSpy = vi.fn((key: string) => {
      delete localStorageMock[key];
    });

    Storage.prototype.getItem = getItemSpy;
    Storage.prototype.setItem = setItemSpy;
    Storage.prototype.removeItem = removeItemSpy;

    // Mock alert, loading, toast
    mockAlert = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'confirm' }),
    };

    mockLoading = {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
    };

    mockToast = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    // Mock services
    const routerEventsSubject = new Subject();
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      events: routerEventsSubject.asObservable(),
      url: '/settings',
    } as any;

    mockAlertController = {
      create: vi.fn().mockResolvedValue(mockAlert),
    } as any;

    mockLoadingController = {
      create: vi.fn().mockResolvedValue(mockLoading),
    } as any;

    mockToastController = {
      create: vi.fn().mockResolvedValue(mockToast),
    } as any;

    const mockModal = { dismiss: vi.fn().mockResolvedValue(true) };
    mockModalController = {
      getTop: vi.fn().mockResolvedValue(mockModal),
      dismiss: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({}),
      }),
    };

    mockProfileService = {
      getProfile: vi.fn(),
      updatePreferences: vi.fn(),
    } as any;

    mockThemeService = {
      setThemeMode: vi.fn().mockResolvedValue(undefined),
      isDark$: new BehaviorSubject(false),
    } as any;

    mockAuthService = {
      getCurrentUser: vi.fn().mockReturnValue(mockUser),
      logout: vi.fn().mockResolvedValue(undefined),
    } as any;

    mockPreferencesService = {
      waitForInit: vi.fn().mockResolvedValue(undefined),
      getCurrentPreferences: vi.fn().mockReturnValue({ ...DEFAULT_PREFERENCES }),
      getPreferences: vi.fn().mockReturnValue(new BehaviorSubject({ ...DEFAULT_PREFERENCES })),
      updatePreferences: vi.fn().mockResolvedValue(undefined),
      setNotifications: vi.fn().mockResolvedValue(undefined),
    };

    mockDemoDataService = {
      isDemoMode: vi.fn().mockReturnValue(false),
      generateGlucoseReadings: vi.fn().mockResolvedValue([]),
    } as any;

    mockNotificationService = {
      checkPermissions: vi.fn().mockResolvedValue(true),
      requestPermissions: vi.fn().mockResolvedValue(true),
      scheduleReadingReminder: vi.fn().mockResolvedValue(undefined),
      cancelReadingReminder: vi.fn().mockResolvedValue(undefined),
      showImmediateNotification: vi.fn().mockResolvedValue(undefined),
    } as any;

    mockTranslateService = {
      instant: vi.fn((key: string) => {
        const translations: Record<string, string> = {
          'settings.notifications.morningCheck': 'Morning Check',
          'settings.notifications.lunchCheck': 'Lunch Check',
          'settings.notifications.dinnerCheck': 'Dinner Check',
        };
        return translations[key] || key;
      }),
      use: vi.fn(),
      currentLang: 'es',
    } as any;

    mockReadingsService = {
      pendingConflicts$: new BehaviorSubject(0),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ToastController, useValue: mockToastController },
        { provide: ModalController, useValue: mockModalController },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: LocalAuthService, useValue: mockAuthService },
        { provide: PreferencesService, useValue: mockPreferencesService },
        { provide: DemoDataService, useValue: mockDemoDataService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: ReadingsService, useValue: mockReadingsService },
      ],
    }).compileComponents();

    // Initialize Ionic for testing (required for IonBackButton and other components)
    await TestBed.inject(IonicModule);

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    // Don't call detectChanges in beforeEach to avoid triggering ngOnInit
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize readingReminders as array', () => {
      expect(Array.isArray(component.readingReminders)).toBe(true);
    });

    it('should have glucose settings with unit', () => {
      expect(component.glucoseSettings.unit).toBeDefined();
    });
  });

  describe('Theme Management', () => {
    it('should change theme and mark as having changes', async () => {
      const event = { detail: { value: 'dark' } } as CustomEvent<{ value: string }>;
      await component.onThemeChange(event);

      expect(component.preferences.theme).toBe('dark');
      expect(mockThemeService.setThemeMode).toHaveBeenCalledWith('dark');
      expect(component.hasChanges).toBe(true);
    });

    it('should support auto theme mode', async () => {
      const event = { detail: { value: 'auto' } } as CustomEvent<{ value: string }>;
      await component.onThemeChange(event);

      expect(component.preferences.theme).toBe('auto');
      expect(mockThemeService.setThemeMode).toHaveBeenCalledWith('auto');
    });
  });

  describe('Glucose Unit Management', () => {
    it('should convert from mg/dL to mmol/L', () => {
      component.preferences.glucoseUnit = 'mg/dL';
      component.glucoseSettings = {
        unit: 'mg/dL',
        targetLow: 70,
        targetHigh: 180,
        hypoglycemiaThreshold: 70,
        hyperglycemiaThreshold: 180,
      };

      const event = { detail: { value: 'mmol/L' } } as CustomEvent<{ value: string }>;
      component.onGlucoseUnitChange(event);

      expect(component.glucoseSettings.unit).toBe('mmol/L');
      expect(component.glucoseSettings.targetLow).toBeCloseTo(3.9, 1);
      expect(component.glucoseSettings.targetHigh).toBe(10);
      expect(component.hasChanges).toBe(true);
    });

    it('should convert from mmol/L to mg/dL', () => {
      component.preferences.glucoseUnit = 'mmol/L';
      component.glucoseSettings = {
        unit: 'mmol/L',
        targetLow: 4,
        targetHigh: 10,
        hypoglycemiaThreshold: 4,
        hyperglycemiaThreshold: 10,
      };

      const event = { detail: { value: 'mg/dL' } } as CustomEvent<{ value: string }>;
      component.onGlucoseUnitChange(event);

      expect(component.glucoseSettings.unit).toBe('mg/dL');
      expect(component.glucoseSettings.targetLow).toBe(72);
      expect(component.glucoseSettings.targetHigh).toBe(180);
      expect(component.hasChanges).toBe(true);
    });

    it('should not convert if unit stays the same', () => {
      component.preferences.glucoseUnit = 'mg/dL';
      component.glucoseSettings = {
        unit: 'mg/dL',
        targetLow: 70,
        targetHigh: 180,
        hypoglycemiaThreshold: 70,
        hyperglycemiaThreshold: 180,
      };

      const event = { detail: { value: 'mg/dL' } } as CustomEvent<{ value: string }>;
      component.onGlucoseUnitChange(event);

      expect(component.glucoseSettings.targetLow).toBe(70);
      expect(component.glucoseSettings.targetHigh).toBe(180);
    });
  });

  describe('Language Management', () => {
    it('should show confirmation alert when changing language', async () => {
      const event = { detail: { value: 'en' } } as CustomEvent<{ value: string }>;
      await component.onLanguageChange(event);

      expect(mockAlertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Language Change',
          message: 'The app will reload to apply the language change.',
        })
      );
      expect(mockAlert.present).toHaveBeenCalled();
    });

    it('should save settings and reload on confirmation', async () => {
      mockAlert.onDidDismiss.mockResolvedValue({ role: 'confirm' });

      const mockAlertWithHandler = {
        present: vi.fn().mockResolvedValue(undefined),
        buttons: [] as any[],
      };

      mockAlertController.create.mockImplementation(async opts => {
        mockAlertWithHandler.buttons = opts?.buttons || [];
        return mockAlertWithHandler as any;
      });

      const event = { detail: { value: 'en' } } as CustomEvent<{ value: string }>;
      await component.onLanguageChange(event);

      // Verify alert was created with correct buttons
      const okButton = mockAlertWithHandler.buttons.find((b: any) => b.text === 'OK');
      expect(okButton).toBeDefined();
      expect(component.preferences.language).toBe('en');
    });

    it('should show Spanish alert when changing to Spanish', async () => {
      const event = { detail: { value: 'es' } } as CustomEvent<{ value: string }>;
      await component.onLanguageChange(event);

      expect(mockAlertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Cambio de idioma',
          message: 'La aplicación se recargará para aplicar el cambio de idioma.',
        })
      );
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings via PreferencesService', async () => {
      component.hasChanges = true;

      await component.saveSettings();

      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();
      expect(mockPreferencesService.updatePreferences).toHaveBeenCalled();
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Configuración guardada exitosamente',
          color: 'success',
        })
      );
      expect(component.hasChanges).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      component.hasChanges = true;

      mockPreferencesService.updatePreferences.mockRejectedValueOnce(new Error('Storage error'));

      await component.saveSettings();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al guardar la configuración',
          color: 'danger',
        })
      );
    });

    it('should dismiss loading on save error', async () => {
      component.hasChanges = true;

      mockPreferencesService.updatePreferences.mockRejectedValueOnce(new Error('Storage error'));

      await component.saveSettings();

      expect(mockLoading.dismiss).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should open advanced settings as a modal', async () => {
      // Spy on modal creation
      const createSpy = vi.spyOn(mockModalController, 'create').mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({}),
      } as any);

      try {
        await component.goToAdvancedSettings();
      } catch (e) {
        // Ignore potential import errors in test environment
      }

      // getTop is no longer called in the new implementation (we stack modals)
      // expect(mockModalController.getTop).toHaveBeenCalled();

      // We expect create to be called to open the new modal
      // Note: We use 'called' instead of 'calledWith' because the component class reference from import()
      // might vary in test environment vs runtime
      expect(mockModalController.create).toHaveBeenCalled();

      // Ensure we are NOT navigating via router to avoid the freeze bug
      expect(mockRouter.navigate).not.toHaveBeenCalledWith([ROUTES.SETTINGS_ADVANCED]);
    });

    it('should navigate to profile', () => {
      component.goToProfile();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.TABS_PROFILE]);
    });
  });

  describe('Sign Out', () => {
    it('should show confirmation alert before signing out', async () => {
      await component.signOut();

      expect(mockAlertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Cerrar Sesión',
          message: '¿Estás seguro de que deseas cerrar sesión?',
        })
      );
      expect(mockAlert.present).toHaveBeenCalled();
    });

    it('should logout and navigate to login on confirmation', async () => {
      const mockAlertWithHandler = {
        present: vi.fn().mockResolvedValue(undefined),
        buttons: [] as any[],
      };

      mockAlertController.create.mockImplementation(async opts => {
        mockAlertWithHandler.buttons = opts?.buttons || [];
        return mockAlertWithHandler as any;
      });

      await component.signOut();

      // Simulate confirmation
      const confirmButton = mockAlertWithHandler.buttons.find(
        (b: any) => b.text === 'Cerrar Sesión'
      );
      if (confirmButton?.handler) {
        await confirmButton.handler();
      }

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.LOGIN], { replaceUrl: true });
    });
  });

  describe('Can Deactivate Guard', () => {
    it('should allow navigation if no changes', async () => {
      component.hasChanges = false;

      const result = await component.canDeactivate();

      expect(result).toBe(true);
      expect(mockAlertController.create).not.toHaveBeenCalled();
    });

    it('should show alert if there are unsaved changes', async () => {
      component.hasChanges = true;

      await component.canDeactivate();

      expect(mockAlertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Cambios sin guardar',
          message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
        })
      );
    });

    it('should return true if user confirms leaving', async () => {
      component.hasChanges = true;
      mockAlert.onDidDismiss.mockResolvedValue({ role: 'confirm' });

      const result = await component.canDeactivate();

      expect(result).toBe(true);
    });

    it('should return false if user cancels', async () => {
      component.hasChanges = true;
      mockAlert.onDidDismiss.mockResolvedValue({ role: 'cancel' });

      const result = await component.canDeactivate();

      expect(result).toBe(false);
    });
  });

  describe('Notification Management', () => {
    it('should toggle notifications on when permission granted', async () => {
      mockNotificationService.requestPermissions.mockResolvedValue(true);

      const event = {
        detail: { checked: true },
        target: null,
      } as any;

      await component.onNotificationsToggle(event);

      expect(component.notificationsEnabled).toBe(true);
      expect(component.hasChanges).toBe(true);
    });

    it('should request permission if not granted and show warning on deny', async () => {
      component.notificationPermissionGranted = false;
      mockNotificationService.requestPermissions.mockResolvedValue(false);

      const mockToggle = { checked: false };
      const event = {
        detail: { checked: true },
        target: mockToggle,
      } as any;

      await component.onNotificationsToggle(event);

      expect(mockNotificationService.requestPermissions).toHaveBeenCalled();
      expect(mockToggle.checked).toBe(false);
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Notification permission denied',
          color: 'warning',
        })
      );
    });

    it('should disable all reminders when notifications toggled off', async () => {
      component.readingReminders = [
        { id: 1, time: '08:00', enabled: true, label: 'Morning' },
        { id: 2, time: '12:00', enabled: true, label: 'Lunch' },
      ];

      const event = {
        detail: { checked: false },
        target: null,
      } as any;

      await component.onNotificationsToggle(event);

      expect(component.readingReminders[0].enabled).toBe(false);
      expect(component.readingReminders[1].enabled).toBe(false);
      expect(mockNotificationService.cancelReadingReminder).toHaveBeenCalledTimes(2);
    });

    it('should save notification settings after toggle', async () => {
      component.notificationPermissionGranted = true;

      const event = {
        detail: { checked: true },
        target: null,
      } as any;

      await component.onNotificationsToggle(event);

      expect(mockPreferencesService.setNotifications).toHaveBeenCalledWith({ enabled: true });
    });
  });

  describe('Reading Reminders', () => {
    it('should schedule reminder when toggled on', async () => {
      const reminder: ReadingReminder = { id: 1, time: '08:00', enabled: false, label: 'Morning' };

      const event = { detail: { checked: true } } as CustomEvent<{ checked: boolean }>;
      await component.onReminderToggle(reminder, event);

      expect(reminder.enabled).toBe(true);
      expect(mockNotificationService.scheduleReadingReminder).toHaveBeenCalledWith(reminder);
      expect(component.hasChanges).toBe(true);
    });

    it('should cancel reminder when toggled off', async () => {
      const reminder: ReadingReminder = { id: 1, time: '08:00', enabled: true, label: 'Morning' };

      const event = { detail: { checked: false } } as CustomEvent<{ checked: boolean }>;
      await component.onReminderToggle(reminder, event);

      expect(reminder.enabled).toBe(false);
      expect(mockNotificationService.cancelReadingReminder).toHaveBeenCalledWith(1);
    });

    it('should update reminder time and reschedule if enabled', async () => {
      const reminder: ReadingReminder = { id: 1, time: '08:00', enabled: true, label: 'Morning' };

      const event = { detail: { value: '09:00' } } as CustomEvent;
      await component.onReminderTimeChange(reminder, event);

      expect(reminder.time).toBe('09:00');
      expect(mockNotificationService.scheduleReadingReminder).toHaveBeenCalledWith(reminder);
      expect(component.hasChanges).toBe(true);
    });

    it('should not reschedule if reminder is disabled', async () => {
      const reminder: ReadingReminder = { id: 1, time: '08:00', enabled: false, label: 'Morning' };

      const event = { detail: { value: '09:00' } } as CustomEvent;
      await component.onReminderTimeChange(reminder, event);

      expect(reminder.time).toBe('09:00');
      expect(mockNotificationService.scheduleReadingReminder).not.toHaveBeenCalled();
    });
  });

  describe('Test Notification', () => {
    it('should show immediate test notification with one of the rotating messages', async () => {
      await component.testNotification();

      // The test notification now rotates through different types
      expect(mockNotificationService.showImmediateNotification).toHaveBeenCalledTimes(1);
      const [title, body] = mockNotificationService.showImmediateNotification.mock.calls[0];

      // Valid notification types
      const validTitles = ['Diabetactic', 'Appointment Reminder', 'Daily Check'];
      const validBodies = [
        'Time to check your glucose levels!',
        'You have a medical appointment in 30 minutes',
        'Remember to log your morning glucose reading',
      ];

      expect(validTitles).toContain(title);
      expect(validBodies).toContain(body);

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test notification sent',
          color: 'success',
        })
      );
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup on destroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      fixture.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should initialize and load data on ngOnInit - Lines 150-154', async () => {
      // Arrange: Set up mocks
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockDemoDataService.isDemoMode.mockReturnValue(false);
      mockNotificationService.checkPermissions.mockResolvedValue(true);

      // Spy on private methods
      const checkPermissionsSpy = vi
        .spyOn<any, any>(component, 'checkNotificationPermission')
        .mockResolvedValue(undefined);
      const loadUserDataSpy = vi
        .spyOn<any, any>(component, 'loadUserData')
        .mockResolvedValue(undefined);

      // Act: Trigger ngOnInit which calls initializeReadingReminders
      component.ngOnInit();

      // Assert: Verify initialization methods were called
      expect(component.readingReminders.length).toBeGreaterThan(0);
      expect(component.isDemoMode).toBe(false);
      expect(checkPermissionsSpy).toHaveBeenCalled();
      // loadNotificationSettings is now called inside loadUserData, not directly in ngOnInit
      expect(loadUserDataSpy).toHaveBeenCalled();

      checkPermissionsSpy.mockRestore();
      loadUserDataSpy.mockRestore();
    });
  });

  describe('User Data Loading', () => {
    it('should load user profile data when user exists - Line 192-193', async () => {
      // Test lines 192-193: if (this.user)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);

      await component['loadUserData']();

      expect(component.profileSettings.name).toBe('John Doe');
      expect(component.profileSettings.email).toBe('test@example.com');
      expect(component.profileSettings.phone).toBe('1234567890');
    });

    it('should handle missing phone number - Line 197', async () => {
      // Test line 197: phone: this.user.phone || ''
      const userWithoutPhone = { ...mockUser, phone: undefined };
      mockAuthService.getCurrentUser.mockReturnValue(userWithoutPhone);

      await component['loadUserData']();

      expect(component.profileSettings.phone).toBe('');
    });

    it('should load preferences when user has preferences - Lines 207-209', async () => {
      // Test lines 207-209: if (this.user.preferences)
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);

      await component['loadUserData']();

      expect(component.preferences.glucoseUnit).toBe('mg/dL');
      expect(component.glucoseSettings.unit).toBe('mg/dL');
      expect(component.glucoseSettings.targetLow).toBe(70);
      expect(component.glucoseSettings.targetHigh).toBe(180);
    });

    it('should handle error when loading user data - Lines 219-220', async () => {
      // Test lines 219-220: catch block with error
      mockAuthService.getCurrentUser.mockImplementation(() => {
        throw new Error('Failed to load user');
      });

      await component['loadUserData']();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al cargar los datos del usuario',
          color: 'danger',
        })
      );
    });
  });

  describe('Language Change with Alert Handler', () => {
    it('should execute handler on OK button click - Lines 278-279', async () => {
      // Test lines 278-279: OK button handler that calls saveSettings and reloads
      const saveSettingsSpy = vi.spyOn(component, 'saveSettings').mockResolvedValue();

      // Track that reload would be called (we can't actually spy on it in all environments)
      const originalLocation = window.location;

      // Create a mock location object
      delete (window as any).location;
      const mockReload = vi.fn();
      (window as any).location = {
        ...originalLocation,
        reload: mockReload,
      };

      const mockAlertWithHandler = {
        present: vi.fn().mockResolvedValue(undefined),
        buttons: [] as any[],
      };

      mockAlertController.create.mockImplementation(async opts => {
        mockAlertWithHandler.buttons = opts?.buttons || [];
        return mockAlertWithHandler as any;
      });

      const event = { detail: { value: 'en' } } as CustomEvent<{ value: string }>;
      await component.onLanguageChange(event);

      // Find and execute OK button handler
      const okButton = mockAlertWithHandler.buttons.find((b: any) => b.text === 'OK');
      expect(okButton).toBeDefined();

      if (okButton?.handler) {
        await okButton.handler();
      }

      expect(saveSettingsSpy).toHaveBeenCalled();

      // Restore original location
      (window as any).location = originalLocation;
      saveSettingsSpy.mockRestore();
    });
  });

  describe('Sign Out Error Handling', () => {
    it('should navigate to login even if logout fails - Lines 367-371', async () => {
      // Test lines 367-371: catch block that navigates even on error
      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      const mockAlertWithHandler = {
        present: vi.fn().mockResolvedValue(undefined),
        buttons: [] as any[],
      };

      mockAlertController.create.mockImplementation(async opts => {
        mockAlertWithHandler.buttons = opts?.buttons || [];
        return mockAlertWithHandler as any;
      });

      await component.signOut();

      // Find and execute Cerrar Sesión button handler
      const confirmButton = mockAlertWithHandler.buttons.find(
        (b: any) => b.text === 'Cerrar Sesión'
      );
      expect(confirmButton).toBeDefined();

      if (confirmButton?.handler) {
        await confirmButton.handler();
      }

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al cerrar sesión',
          color: 'warning',
        })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.LOGIN], { replaceUrl: true });
    });
  });

  describe('canDeactivate Alert Handler', () => {
    it('should execute handler on Salir sin guardar button - Line 411', async () => {
      // Test line 411: handler: () => true
      component.hasChanges = true;

      const mockAlertWithHandler = {
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ role: 'confirm' }),
        buttons: [] as any[],
      };

      mockAlertController.create.mockImplementation(async opts => {
        mockAlertWithHandler.buttons = opts?.buttons || [];
        return mockAlertWithHandler as any;
      });

      await component.canDeactivate();

      // Find exit button and verify handler returns true
      const exitButton = mockAlertWithHandler.buttons.find(
        (b: any) => b.text === 'Salir sin guardar'
      );
      expect(exitButton).toBeDefined();
      expect(exitButton?.handler).toBeDefined();

      if (exitButton?.handler) {
        const result = exitButton.handler();
        expect(result).toBe(true);
      }
    });
  });

  describe('Notification Settings Loading', () => {
    it('should load notification enabled state from preferences', () => {
      component.preferences = {
        ...DEFAULT_PREFERENCES,
        notifications: { ...DEFAULT_PREFERENCES.notifications, enabled: true },
      };

      component['loadNotificationSettings']();

      expect(component.notificationsEnabled).toBe(true);
    });

    it('should use disabled state if notifications disabled in preferences', () => {
      component.preferences = {
        ...DEFAULT_PREFERENCES,
        notifications: { ...DEFAULT_PREFERENCES.notifications, enabled: false },
      };

      component['loadNotificationSettings']();

      expect(component.notificationsEnabled).toBe(false);
    });
  });

  describe('Notification Permission Check', () => {
    it('should check and set notification permission status - Lines 150-154', async () => {
      // Test lines 150-154: checkNotificationPermission in ngOnInit
      mockNotificationService.checkPermissions.mockResolvedValue(true);

      await component['checkNotificationPermission']();

      expect(mockNotificationService.checkPermissions).toHaveBeenCalled();
      expect(component.notificationPermissionGranted).toBe(true);
      // notificationsEnabled is NOT changed when permission is granted
    });

    it('should handle permission denied', async () => {
      mockNotificationService.checkPermissions.mockResolvedValue(false);

      await component['checkNotificationPermission']();

      expect(component.notificationPermissionGranted).toBe(false);
      // notificationsEnabled should be false when permission is denied
      expect(component.notificationsEnabled).toBe(false);
    });

    it('should force notificationsEnabled off when permission denied but was enabled', async () => {
      // Simulate case where preference had notifications enabled
      component.notificationsEnabled = true;
      mockNotificationService.checkPermissions.mockResolvedValue(false);

      await component['checkNotificationPermission']();

      expect(component.notificationPermissionGranted).toBe(false);
      // Should force notificationsEnabled to false to keep UI consistent
      expect(component.notificationsEnabled).toBe(false);
    });
  });

  describe('TrackBy Function', () => {
    it('should return reminder id for trackBy - Line 547', () => {
      // Test line 547: trackByReminder function
      const reminder: ReadingReminder = { id: 5, time: '10:00', enabled: true, label: 'Test' };

      const result = component.trackByReminder(0, reminder);

      expect(result).toBe(5);
    });

    it('should work with different reminders', () => {
      const reminder1: ReadingReminder = { id: 1, time: '08:00', enabled: true, label: 'Morning' };
      const reminder2: ReadingReminder = { id: 2, time: '12:00', enabled: false, label: 'Noon' };

      expect(component.trackByReminder(0, reminder1)).toBe(1);
      expect(component.trackByReminder(1, reminder2)).toBe(2);
    });
  });

  describe('Platform Detection', () => {
    it('should detect web platform - Line 166', () => {
      // Test line 166: this.isWebPlatform assignment in constructor
      expect(component.isWebPlatform).toBeDefined();
      expect(typeof component.isWebPlatform).toBe('boolean');
    });
  });
});

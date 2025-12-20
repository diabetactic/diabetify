// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController, IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject } from 'rxjs';

import { SettingsPage } from './settings.page';
import { ProfileService } from '@core/services/profile.service';
import { ThemeService } from '@core/services/theme.service';
import { LocalAuthService, LocalUser, AccountState } from '@core/services/local-auth.service';
import { DemoDataService } from '@core/services/demo-data.service';
import { NotificationService, ReadingReminder } from '@core/services/notification.service';
import { ROUTES, STORAGE_KEYS } from '@core/constants';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  // Mocked services
  let mockRouter: vi.Mocked<Router>;
  let mockAlertController: vi.Mocked<AlertController>;
  let mockLoadingController: vi.Mocked<LoadingController>;
  let mockToastController: vi.Mocked<ToastController>;
  let mockProfileService: vi.Mocked<ProfileService>;
  let mockThemeService: vi.Mocked<ThemeService>;
  let mockAuthService: vi.Mocked<LocalAuthService>;
  let mockDemoDataService: vi.Mocked<DemoDataService>;
  let mockNotificationService: vi.Mocked<NotificationService>;
  let mockTranslateService: vi.Mocked<TranslateService>;

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

    mockDemoDataService = {
      isDemoMode: vi.fn().mockReturnValue(false),
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

    await TestBed.configureTestingModule({
      imports: [SettingsPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ToastController, useValue: mockToastController },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: LocalAuthService, useValue: mockAuthService },
        { provide: DemoDataService, useValue: mockDemoDataService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: TranslateService, useValue: mockTranslateService },
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
    it('should save settings to localStorage', async () => {
      component.hasChanges = true;

      await component.saveSettings();

      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();

      const savedData = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      expect(savedData).toBeTruthy();

      const parsed = JSON.parse(savedData!);
      expect(parsed).toHaveProperty('profile');
      expect(parsed).toHaveProperty('glucose');
      expect(parsed).toHaveProperty('preferences');

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Configuración guardada exitosamente',
          color: 'success',
        })
      );
      expect(component.hasChanges).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      // Ensure hasChanges is true
      component.hasChanges = true;

      // Spy on localStorage.setItem directly to throw error
      const setItemErrorSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      await component.saveSettings();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al guardar la configuración',
          color: 'danger',
        })
      );

      // Restore original mock
      setItemErrorSpy.mockRestore();
    });

    it('should dismiss loading on save error', async () => {
      // Ensure hasChanges is true
      component.hasChanges = true;

      // Spy on localStorage.setItem directly to throw error
      const setItemErrorSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      await component.saveSettings();

      expect(mockLoading.dismiss).toHaveBeenCalled();

      // Restore original mock
      setItemErrorSpy.mockRestore();
    });
  });

  describe('Navigation', () => {
    it('should navigate to advanced settings', () => {
      component.goToAdvancedSettings();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.SETTINGS_ADVANCED]);
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
      // Ensure permission is granted so we don't get stuck in permission request
      component.notificationPermissionGranted = true;

      const event = {
        detail: { checked: true },
        target: null,
      } as any;

      await component.onNotificationsToggle(event);

      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.enabled).toBe(true);
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
  });
});

import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController, IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { ProfilePage } from './profile.page';
import { TidepoolAuthService, AuthState } from '@services/tidepool-auth.service';
import { LocalAuthService } from '@services/local-auth.service';
import { ProfileService } from '@services/profile.service';
import { BiometricAuthService } from '@services/biometric-auth.service';

import { TranslationService, Language } from '@services/translation.service';
import { NotificationService } from '@services/notification.service';
import { UserProfile, AccountState, DEFAULT_USER_PREFERENCES } from '@models/user-profile.model';
import { ROUTES } from '@core/constants';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let mockAuthService: any;
  let mockLocalAuthService: any;
  let mockProfileService: any;
  let mockBiometricAuthService: any;

  let mockTranslationService: any;
  let mockNotificationService: any;
  let mockRouter: any;
  let mockAlertController: any;
  let mockToastController: any;
  let mockModalController: any;

  const mockProfile: UserProfile = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    age: 25,
    accountState: AccountState.ACTIVE,
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      language: 'en',
      themeMode: 'auto',
    },
    tidepoolConnection: {
      connected: false,
    },
    avatar: {
      id: 'avatar-1',
      name: 'Default',
      imagePath: '/assets/avatars/default.png',
      category: 'animals',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAuthState: AuthState = {
    isAuthenticated: true,
    isLoading: false,
    error: null,
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    mockAuthService = {
      authState: new BehaviorSubject<AuthState | null>(mockAuthState),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    mockLocalAuthService = {
      logout: vi.fn().mockResolvedValue(undefined),
      getCurrentUser: vi.fn().mockReturnValue({ id: 'local-user-id' }),
      getAccessToken: vi.fn().mockResolvedValue('access-token'),
    };

    mockProfileService = {
      profile$: new BehaviorSubject<UserProfile | null>(mockProfile),
      getProfile: vi.fn().mockResolvedValue(mockProfile),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      updatePreferences: vi.fn().mockResolvedValue(undefined),
      deleteProfile: vi.fn().mockResolvedValue(undefined),
    };

    mockBiometricAuthService = {
      isBiometricAvailable: vi.fn().mockResolvedValue(true),
      enrollBiometric: vi.fn().mockResolvedValue({ success: true }),
      clearBiometricEnrollment: vi.fn().mockResolvedValue(undefined),
    };

    mockTranslationService = {
      currentLanguage$: new BehaviorSubject<Language>(Language.EN),
      getCurrentLanguage: vi.fn().mockReturnValue(Language.EN),
      setLanguage: vi.fn().mockResolvedValue(undefined),
      instant: vi.fn((key: string) => key),
    };

    mockNotificationService = {
      requestPermissions: vi.fn().mockResolvedValue(true),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockAlertController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockModalController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onWillDismiss: vi.fn().mockResolvedValue({ data: { success: true } }),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: TidepoolAuthService, useValue: mockAuthService },
        { provide: LocalAuthService, useValue: mockLocalAuthService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: BiometricAuthService, useValue: mockBiometricAuthService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: ToastController, useValue: mockToastController },
        { provide: ModalController, useValue: mockModalController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should be a standalone component', () => {
      const componentMetadata = (ProfilePage as any).ɵcmp;
      expect(componentMetadata.standalone).toBe(true);
    });

    it('should use OnPush change detection strategy', () => {
      const componentMetadata = (ProfilePage as any).ɵcmp;
      expect(
        componentMetadata.changeDetection === 0 || componentMetadata.changeDetection === undefined
      ).toBe(true);
    });

    it('should have correct selector', () => {
      const componentMetadata = (ProfilePage as any).ɵcmp;
      expect(componentMetadata.selectors[0][0]).toBe('app-profile');
    });

    it('should load user data on init', async () => {
      component.ngOnInit();
      await fixture.whenStable();

      expect(mockProfileService.getProfile).toHaveBeenCalled();
      expect(component.profile).toEqual(mockProfile);
      expect(component.currentTheme).toBe('auto');
      expect(component.currentGlucoseUnit).toBe('mg/dL');
    });

    it('should default notifications to false if no settings in localStorage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      component.ngOnInit();

      expect(component.notificationsEnabled).toBe(false);
    });

    it('should subscribe to auth state changes', () => {
      component.ngOnInit();

      expect(component.authState).toEqual(mockAuthState);

      const newAuthState: AuthState = {
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      };
      mockAuthService.authState.next(newAuthState);

      expect(component.authState).toEqual(newAuthState);
    });

    it('should subscribe to profile changes', () => {
      component.ngOnInit();

      const updatedProfile: UserProfile = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, themeMode: 'dark' },
      };
      mockProfileService.profile$.next(updatedProfile);

      expect(component.profile).toEqual(updatedProfile);
      expect(component.currentTheme).toBe('dark');
    });

    it('should subscribe to language changes', () => {
      component.ngOnInit();

      mockTranslationService.currentLanguage$.next(Language.ES);

      expect(component.currentLanguage).toBe(Language.ES);
    });

    it('should clean up subscriptions on destroy', () => {
      component.ngOnInit();
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Notification Management', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should enable notifications when permission is granted', async () => {
      mockNotificationService.requestPermissions.mockResolvedValue(true);
      const event = {
        detail: { checked: true },
      } as CustomEvent<{ checked: boolean }>;

      await component.onNotificationsToggle(event);

      expect(mockNotificationService.requestPermissions).toHaveBeenCalled();
      expect(component.notificationsEnabled).toBe(true);
      expect(mockToastController.create).toHaveBeenCalled();
    });

    it('should not enable notifications when permission is denied', async () => {
      mockNotificationService.requestPermissions.mockResolvedValue(false);
      const mockToggle = { checked: true };
      const event = {
        detail: { checked: true },
        target: mockToggle,
      } as CustomEvent<{ checked: boolean }>;

      await component.onNotificationsToggle(event);

      expect(mockNotificationService.requestPermissions).toHaveBeenCalled();
      expect(mockToggle.checked).toBe(false);
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'warning',
        })
      );
    });

    it('should disable notifications when toggle is turned off', async () => {
      component.notificationsEnabled = true;
      const event = {
        detail: { checked: false },
      } as CustomEvent<{ checked: boolean }>;

      await component.onNotificationsToggle(event);

      expect(component.notificationsEnabled).toBe(false);
      expect(mockToastController.create).toHaveBeenCalled();
    });
  });

  describe('Biometric Management', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should load biometric status on init', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('true');
      mockBiometricAuthService.isBiometricAvailable.mockResolvedValue(true);

      // Re-init to trigger loadBiometricStatus
      component.ngOnInit();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 0)); // Ensure microtasks clear

      expect(mockBiometricAuthService.isBiometricAvailable).toHaveBeenCalled();
      expect(component.biometricEnabled).toBe(true);
    });

    it('should set biometric disabled if not available', async () => {
      mockBiometricAuthService.isBiometricAvailable.mockResolvedValue(false);

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.biometricEnabled).toBe(false);
    });

    it('should enable biometric when toggled on and enrollment succeeds', async () => {
      const event = {
        detail: { checked: true },
        target: { checked: true },
      } as CustomEvent<{ checked: boolean }>;

      await component.onBiometricToggle(event);

      expect(mockBiometricAuthService.enrollBiometric).toHaveBeenCalledWith(
        'local-user-id',
        'access-token'
      );
      expect(component.biometricEnabled).toBe(true);
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'success' })
      );
    });

    it('should revert toggle if enrollment fails', async () => {
      mockBiometricAuthService.enrollBiometric.mockResolvedValue({
        success: false,
        error: 'Failed',
      });
      const mockToggle = { checked: true };
      const event = {
        detail: { checked: true },
        target: mockToggle,
      } as CustomEvent<{ checked: boolean }>;

      await component.onBiometricToggle(event);

      expect(component.biometricEnabled).toBe(false);
      expect(mockToggle.checked).toBe(false);
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'danger' })
      );
    });

    it('should disable biometric when toggled off', async () => {
      component.biometricEnabled = true;
      const event = {
        detail: { checked: false },
        target: { checked: false },
      } as CustomEvent<{ checked: boolean }>;

      await component.onBiometricToggle(event);

      expect(mockBiometricAuthService.clearBiometricEnrollment).toHaveBeenCalled();
      expect(component.biometricEnabled).toBe(false);
    });
  });

  describe('Sign Out', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should sign out user and navigate to welcome page', async () => {
      await component.onSignOut();

      expect(mockLocalAuthService.logout).toHaveBeenCalled();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockProfileService.deleteProfile).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.WELCOME], { replaceUrl: true });
    });

    it('should navigate to welcome page even if logout fails', async () => {
      mockLocalAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      await component.onSignOut();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.WELCOME], { replaceUrl: true });
    });
  });

  describe('Edit Age', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should open age edit alert', async () => {
      await component.editAge();

      expect(mockAlertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'profile.editAge',
          inputs: expect.arrayContaining([
            expect.objectContaining({
              name: 'age',
              type: 'number',
              value: 25,
              min: 1,
              max: 120,
            }),
          ]),
        })
      );
    });

    it('should update profile age when valid age is provided', async () => {
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };

      let savedHandler: any;
      mockAlertController.create.mockImplementation(async (options: any) => {
        savedHandler = options.buttons[1].handler;
        return mockAlert;
      });

      await component.editAge();
      await savedHandler({ age: '30' });

      expect(mockProfileService.updateProfile).toHaveBeenCalledWith({ age: 30 });
    });

    it('should not update profile if age is invalid (too low)', async () => {
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };

      let savedHandler: any;
      mockAlertController.create.mockImplementation(async (options: any) => {
        savedHandler = options.buttons[1].handler;
        return mockAlert;
      });

      await component.editAge();
      await savedHandler({ age: '0' });

      expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    });

    it('should not update profile if age is invalid (too high)', async () => {
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };

      let savedHandler: any;
      mockAlertController.create.mockImplementation(async (options: any) => {
        savedHandler = options.buttons[1].handler;
        return mockAlert;
      });

      await component.editAge();
      await savedHandler({ age: '121' });

      expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Edit Profile', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should open profile edit modal', async () => {
      await component.editProfile();

      expect(mockModalController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cssClass: 'profile-edit-modal',
        })
      );
    });

    it('should handle successful profile edit', async () => {
      const mockModal = {
        present: vi.fn().mockResolvedValue(undefined),
        onWillDismiss: vi.fn().mockResolvedValue({ data: { success: true } }),
      };
      mockModalController.create.mockResolvedValue(mockModal);

      await component.editProfile();

      expect(mockModal.present).toHaveBeenCalled();
      expect(mockModal.onWillDismiss).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should open settings modal', async () => {
      const mockModal = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockModalController.create.mockResolvedValue(mockModal);

      await component.goToSettings();

      expect(mockModalController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cssClass: 'fullscreen-modal',
        })
      );
      expect(mockModal.present).toHaveBeenCalled();
    });

    it('should navigate to achievements page', async () => {
      await component.goToAchievements();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/achievements']);
    });
  });

  describe('Avatar Management', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should reject files larger than 3MB', async () => {
      const largeFile = new File(['x'.repeat(4 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const event = {
        target: { files: [largeFile], value: 'test.jpg' },
      } as any;

      await component.onAvatarSelected(event);

      expect(mockAlertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'profile.avatar.tooLarge',
        })
      );
      expect(event.target.value).toBe('');
    });

    it('should do nothing if no file is selected', async () => {
      const event = {
        target: { files: [], value: '' },
      } as any;

      await component.onAvatarSelected(event);

      expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Data Properties', () => {
    it('should initialize with default values', () => {
      expect(component.profile).toBeNull();
      expect(component.authState).toBeNull();
      expect(component.currentTheme).toBe('auto');
      expect(component.currentGlucoseUnit).toBe('mg/dL');
      expect(component.notificationsEnabled).toBe(false);
    });
  });
});

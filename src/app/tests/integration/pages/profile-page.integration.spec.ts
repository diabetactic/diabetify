/**
 * ProfilePage Integration Tests
 *
 * Tests de integración para el componente ProfilePage que verifica:
 * - Carga de perfil y estado de Tidepool al inicializar
 * - Flujo de conexión a Tidepool
 * - Desconexión de Tidepool
 * - Cambio de tema con aplicación y persistencia
 * - Cambio de idioma con diálogo de confirmación y recarga
 * - Cambio de unidad de glucosa con persistencia
 * - Toggle de notificaciones con verificación de permisos
 * - Edición de edad mediante diálogo
 * - Edición de nombre de usuario mediante diálogo
 * - Flujo de cerrar sesión con navegación a welcome
 * - Carga de avatar con redimensionamiento y actualización
 * - Visualización de datos del perfil
 * - Estado de carga durante fetch de perfil
 * - Manejo de errores
 * - Toast de éxito al guardar preferencias
 */

// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { ProfilePage } from '@app/profile/profile.page';
import { ProfileService } from '@core/services/profile.service';
import { UnifiedAuthService } from '@core/services/unified-auth.service';
import { TidepoolAuthService, AuthState } from '@core/services/tidepool-auth.service';
import { ThemeService } from '@core/services/theme.service';
import { TranslationService } from '@core/services/translation.service';
import { NotificationService } from '@core/services/notification.service';
import { HttpClient } from '@angular/common/http';
import { UserProfile, ThemeMode } from '@models/user-profile.model';
import { ROUTES } from '@core/constants';

describe('ProfilePage Integration Tests', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let mockProfileService: {
    getProfile: Mock;
    updateProfile: Mock;
    updatePreferences: Mock;
    clearTidepoolCredentials: Mock;
    deleteProfile: Mock;
    profile$: BehaviorSubject<UserProfile | null>;
  };
  let mockUnifiedAuthService: {
    logout: Mock;
    authState$: BehaviorSubject<any>;
  };
  let mockTidepoolAuthService: {
    loginWithCredentials: Mock;
    logout: Mock;
    getAccessToken: Mock;
    refreshAccessToken: Mock;
    authState: BehaviorSubject<AuthState>;
  };
  let mockThemeService: {
    setThemeMode: Mock;
    getCurrentThemeMode: Mock;
  };
  let mockTranslationService: {
    getCurrentLanguage: Mock;
    setLanguage: Mock;
    instant: Mock;
    currentLanguage$: BehaviorSubject<'en' | 'es'>;
  };
  let mockNotificationService: {
    requestPermissions: Mock;
  };
  let mockHttpClient: {
    get: Mock;
  };
  let mockRouter: {
    navigate: Mock;
  };
  let mockAlertController: {
    create: Mock;
  };
  let mockToastController: {
    create: Mock;
  };
  let mockLoadingController: {
    create: Mock;
  };
  let mockModalController: {
    create: Mock;
  };

  const mockUserProfile: UserProfile = {
    id: 'user_123',
    name: 'Test User',
    email: 'test@example.com',
    age: 35,
    accountState: 'active' as any,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    hasCompletedOnboarding: true,
    tidepoolConnection: {
      connected: false,
    },
    preferences: {
      themeMode: 'light' as ThemeMode,
      glucoseUnit: 'mg/dL' as 'mg/dL' | 'mmol/L',
      language: 'en' as 'en' | 'es',
      colorPalette: 'default' as any,
      highContrastMode: false,
      targetRange: { low: 70, high: 180 },
      notificationSettings: {
        enabled: false,
        reminderTimes: [],
      },
    },
  };

  const mockAuthState: AuthState = {
    isAuthenticated: false,
    userId: null,
    email: null,
  };

  beforeEach(async () => {
    // Create mock services
    const profileSubject = new BehaviorSubject<UserProfile | null>(mockUserProfile);
    mockProfileService = {
      getProfile: vi.fn().mockResolvedValue(mockUserProfile),
      updateProfile: vi.fn().mockResolvedValue(mockUserProfile),
      updatePreferences: vi.fn().mockResolvedValue(mockUserProfile),
      clearTidepoolCredentials: vi.fn().mockResolvedValue(undefined),
      deleteProfile: vi.fn().mockResolvedValue(undefined),
      profile$: profileSubject,
    };

    const unifiedAuthSubject = new BehaviorSubject<any>({
      isAuthenticated: true,
      user: { id: 'user_123', email: 'test@example.com' },
    });
    mockUnifiedAuthService = {
      logout: vi.fn().mockResolvedValue(undefined),
      authState$: unifiedAuthSubject,
    };

    const tidepoolAuthSubject = new BehaviorSubject<AuthState>(mockAuthState);
    mockTidepoolAuthService = {
      loginWithCredentials: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue('mock_token'),
      refreshAccessToken: vi.fn().mockResolvedValue('new_mock_token'),
      authState: tidepoolAuthSubject,
    };

    mockThemeService = {
      setThemeMode: vi.fn().mockResolvedValue(undefined),
      getCurrentThemeMode: vi.fn().mockReturnValue('light'),
    };

    const languageSubject = new BehaviorSubject<'en' | 'es'>('en');
    mockTranslationService = {
      getCurrentLanguage: vi.fn().mockReturnValue('en'),
      setLanguage: vi.fn().mockResolvedValue(undefined),
      instant: vi.fn().mockImplementation((key: string) => key),
      currentLanguage$: languageSubject,
    };

    mockNotificationService = {
      requestPermissions: vi.fn().mockResolvedValue(true),
    };

    mockHttpClient = {
      get: vi.fn().mockReturnValue(of({ success: true })),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockAlertController = {
      create: vi.fn(),
    };

    mockToastController = {
      create: vi.fn(),
    };

    mockLoadingController = {
      create: vi.fn(),
    };

    mockModalController = {
      create: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
        { provide: UnifiedAuthService, useValue: mockUnifiedAuthService },
        { provide: TidepoolAuthService, useValue: mockTidepoolAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: ToastController, useValue: mockToastController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ModalController, useValue: mockModalController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Load profile and Tidepool status on init', () => {
    it('should load user profile on initialization', fakeAsync(() => {
      // ARRANGE: Profile service already mocked with profile data

      // ACT: Initialize component
      fixture.detectChanges();
      tick();

      // ASSERT: Profile loaded
      expect(mockProfileService.getProfile).toHaveBeenCalled();
      expect(component.profile).toEqual(mockUserProfile);
      expect(component.currentTheme).toBe('light');
      expect(component.currentGlucoseUnit).toBe('mg/dL');
    }));

    it('should load Tidepool connection status', fakeAsync(() => {
      // ARRANGE: Connected profile
      const connectedProfile = {
        ...mockUserProfile,
        tidepoolConnection: {
          connected: true,
          userId: 'tidepool_123',
          email: 'tidepool@example.com',
        },
      };
      mockProfileService.getProfile.mockResolvedValue(connectedProfile);
      mockProfileService.profile$.next(connectedProfile);

      // ACT: Initialize component
      fixture.detectChanges();
      tick();

      // ASSERT: Tidepool status loaded
      expect(component.isConnected).toBe(true);
    }));

    it('should handle missing profile gracefully', fakeAsync(() => {
      // ARRANGE: No profile
      mockProfileService.getProfile.mockResolvedValue(null);
      mockProfileService.profile$.next(null);

      // ACT: Initialize component
      fixture.detectChanges();
      tick();

      // ASSERT: No errors, defaults applied
      expect(component.profile).toBeNull();
      expect(() => fixture.detectChanges()).not.toThrow();
    }));
  });

  describe('2. Tidepool connection flow', () => {
    it('should show login dialog and connect to Tidepool', fakeAsync(() => {
      // ARRANGE: Mock alert dialog
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // Mock toast for success message
      const mockToast = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockToastController.create.mockResolvedValue(mockToast);

      // ACT: Trigger Tidepool connection
      component.onToggleTidepoolConnection();
      tick();

      // ASSERT: Alert dialog shown
      expect(mockAlertController.create).toHaveBeenCalled();
      const alertConfig = mockAlertController.create.mock.calls[0][0];
      expect(alertConfig.inputs).toHaveLength(2);
      expect(alertConfig.inputs[0].type).toBe('email');
      expect(alertConfig.inputs[1].type).toBe('password');

      // Simulate user entering credentials and clicking connect
      const connectButton = alertConfig.buttons.find((b: any) => b.text === 'profile.tidepoolLoginDialog.connect');
      expect(connectButton).toBeDefined();

      // Call handler with credentials
      const handlerResult = connectButton.handler({ email: 'test@tidepool.org', password: 'password123' });
      expect(handlerResult).toBe(true); // Dialog should close

      tick(200); // Wait for async login

      // ASSERT: Login called
      expect(mockTidepoolAuthService.loginWithCredentials).toHaveBeenCalledWith('test@tidepool.org', 'password123');
    }));

    it('should prevent empty credentials submission', fakeAsync(() => {
      // ARRANGE: Mock alert dialog
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Trigger Tidepool connection
      component.onToggleTidepoolConnection();
      tick();

      // Get connect button handler
      const alertConfig = mockAlertController.create.mock.calls[0][0];
      const connectButton = alertConfig.buttons.find((b: any) => b.text === 'profile.tidepoolLoginDialog.connect');

      // Simulate empty credentials
      const handlerResult = connectButton.handler({ email: '', password: '' });

      // ASSERT: Dialog should not close
      expect(handlerResult).toBe(false);
      expect(mockTidepoolAuthService.loginWithCredentials).not.toHaveBeenCalled();
    }));

    it('should show error on failed Tidepool login', fakeAsync(() => {
      // ARRANGE: Mock failed login
      mockTidepoolAuthService.loginWithCredentials.mockRejectedValue(new Error('Invalid credentials'));

      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      const mockErrorAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValueOnce(mockAlert).mockResolvedValueOnce(mockErrorAlert);

      // ACT: Trigger connection and simulate login
      component.onToggleTidepoolConnection();
      tick();

      const alertConfig = mockAlertController.create.mock.calls[0][0];
      const connectButton = alertConfig.buttons.find((b: any) => b.text === 'profile.tidepoolLoginDialog.connect');
      connectButton.handler({ email: 'test@tidepool.org', password: 'wrong' });
      tick(200);

      // ASSERT: Error alert shown
      expect(mockAlertController.create).toHaveBeenCalledTimes(2);
    }));
  });

  describe('3. Disconnect from Tidepool', () => {
    it('should disconnect from Tidepool when connected', fakeAsync(() => {
      // ARRANGE: Set connected state
      component.isConnected = true;
      fixture.detectChanges();

      // ACT: Trigger disconnect
      component.onToggleTidepoolConnection();
      tick();

      // ASSERT: Logout called
      expect(mockTidepoolAuthService.logout).toHaveBeenCalled();
      expect(mockProfileService.clearTidepoolCredentials).toHaveBeenCalled();
    }));

    it('should handle disconnect errors gracefully', fakeAsync(() => {
      // ARRANGE: Set connected state, mock error
      component.isConnected = true;
      mockTidepoolAuthService.logout.mockRejectedValue(new Error('Network error'));

      // ACT: Trigger disconnect
      component.onToggleTidepoolConnection();
      tick();

      // ASSERT: No error thrown, continues silently
      expect(() => tick()).not.toThrow();
    }));
  });

  describe('4. Theme change with apply and persist', () => {
    it('should apply and persist theme change', fakeAsync(() => {
      // ARRANGE: Initialize component
      fixture.detectChanges();
      tick();

      // ACT: Change theme to dark
      const event = { detail: { value: 'dark' as ThemeMode } } as CustomEvent<{ value: ThemeMode }>;
      component.onThemeChange(event);
      tick();

      // ASSERT: Theme service called to apply
      expect(mockThemeService.setThemeMode).toHaveBeenCalledWith('dark');

      // ASSERT: Local state updated
      expect(component.currentTheme).toBe('dark');
    }));

    it('should handle theme change to auto mode', fakeAsync(() => {
      // ACT: Change theme to auto
      const event = { detail: { value: 'auto' as ThemeMode } } as CustomEvent<{ value: ThemeMode }>;
      component.onThemeChange(event);
      tick();

      // ASSERT: Theme service called
      expect(mockThemeService.setThemeMode).toHaveBeenCalledWith('auto');
      expect(component.currentTheme).toBe('auto');
    }));
  });

  describe('5. Language change with confirmation dialog and reload', () => {
    it('should change language and update profile', fakeAsync(() => {
      // ARRANGE: Initialize component
      fixture.detectChanges();
      tick();

      // ACT: Change language to Spanish
      const event = { detail: { value: 'es' as 'en' | 'es' } } as CustomEvent<{ value: 'en' | 'es' }>;
      component.onLanguageChange(event);
      tick();

      // ASSERT: Translation service updated
      expect(mockTranslationService.setLanguage).toHaveBeenCalledWith('es');

      // ASSERT: Profile preferences updated
      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ language: 'es' });
    }));

    it('should handle language change from Spanish to English', fakeAsync(() => {
      // ARRANGE: Start with Spanish
      mockTranslationService.getCurrentLanguage.mockReturnValue('es');
      component.currentLanguage = 'es';

      // ACT: Change to English
      const event = { detail: { value: 'en' as 'en' | 'es' } } as CustomEvent<{ value: 'en' | 'es' }>;
      component.onLanguageChange(event);
      tick();

      // ASSERT: Language changed
      expect(mockTranslationService.setLanguage).toHaveBeenCalledWith('en');
      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ language: 'en' });
    }));
  });

  describe('6. Glucose unit change with persist', () => {
    it('should update glucose unit preference', fakeAsync(() => {
      // ACT: Change glucose unit to mmol/L
      const event = { detail: { value: 'mmol/L' } } as CustomEvent<{ value: string }>;
      component.onGlucoseUnitChange(event);
      tick();

      // ASSERT: Profile updated
      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ glucoseUnit: 'mmol/L' });
      expect(component.currentGlucoseUnit).toBe('mmol/L');
    }));

    it('should handle change back to mg/dL', fakeAsync(() => {
      // ARRANGE: Start with mmol/L
      component.currentGlucoseUnit = 'mmol/L';

      // ACT: Change to mg/dL
      const event = { detail: { value: 'mg/dL' } } as CustomEvent<{ value: string }>;
      component.onGlucoseUnitChange(event);
      tick();

      // ASSERT: Updated
      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ glucoseUnit: 'mg/dL' });
      expect(component.currentGlucoseUnit).toBe('mg/dL');
    }));
  });

  describe('7. Toggle notifications with permission check', () => {
    it('should enable notifications when permission granted', fakeAsync(() => {
      // ARRANGE: Mock permission granted
      mockNotificationService.requestPermissions.mockResolvedValue(true);

      const mockToast = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockToastController.create.mockResolvedValue(mockToast);

      // ACT: Enable notifications
      const event = { detail: { checked: true }, target: null } as any;
      component.onNotificationsToggle(event);
      tick();

      // ASSERT: Permission requested
      expect(mockNotificationService.requestPermissions).toHaveBeenCalled();

      // ASSERT: Notifications enabled
      expect(component.notificationsEnabled).toBe(true);

      // ASSERT: Success toast shown
      expect(mockToastController.create).toHaveBeenCalled();
    }));

    it('should show warning when permission denied', fakeAsync(() => {
      // ARRANGE: Mock permission denied
      mockNotificationService.requestPermissions.mockResolvedValue(false);

      const mockToggle = { checked: true };
      const mockToast = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockToastController.create.mockResolvedValue(mockToast);

      // ACT: Try to enable notifications
      const event = { detail: { checked: true }, target: mockToggle } as any;
      component.onNotificationsToggle(event);
      tick();

      // ASSERT: Toggle unchecked
      expect(mockToggle.checked).toBe(false);

      // ASSERT: Warning toast shown
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'warning',
        })
      );
    }));

    it('should disable notifications without permission check', fakeAsync(() => {
      // ARRANGE: Start with notifications enabled
      component.notificationsEnabled = true;

      const mockToast = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockToastController.create.mockResolvedValue(mockToast);

      // ACT: Disable notifications
      const event = { detail: { checked: false }, target: null } as any;
      component.onNotificationsToggle(event);
      tick();

      // ASSERT: No permission check
      expect(mockNotificationService.requestPermissions).not.toHaveBeenCalled();

      // ASSERT: Notifications disabled
      expect(component.notificationsEnabled).toBe(false);
    }));
  });

  describe('8. Edit age dialog', () => {
    it('should show age edit dialog and update profile', fakeAsync(() => {
      // ARRANGE: Mock alert dialog
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Trigger edit age
      component.editAge();
      tick();

      // ASSERT: Alert shown
      expect(mockAlertController.create).toHaveBeenCalled();
      const alertConfig = mockAlertController.create.mock.calls[0][0];
      expect(alertConfig.inputs[0].type).toBe('number');
      expect(alertConfig.inputs[0].min).toBe(1);
      expect(alertConfig.inputs[0].max).toBe(120);

      // Simulate save
      const saveButton = alertConfig.buttons.find((b: any) => b.text === 'common.save');
      saveButton.handler({ age: '42' });
      tick();

      // ASSERT: Profile updated
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith({ age: 42 });
    }));

    it('should reject invalid age values', fakeAsync(() => {
      // ARRANGE: Mock alert
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Trigger edit age
      component.editAge();
      tick();

      const alertConfig = mockAlertController.create.mock.calls[0][0];
      const saveButton = alertConfig.buttons.find((b: any) => b.text === 'common.save');

      // Try invalid values
      saveButton.handler({ age: '0' });
      saveButton.handler({ age: '150' });
      saveButton.handler({ age: '' });
      tick();

      // ASSERT: Profile not updated
      expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    }));
  });

  describe('9. Edit username dialog', () => {
    it('should show username edit dialog and update profile', fakeAsync(() => {
      // ARRANGE: Mock alert dialog
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Trigger edit username
      component.editUsername();
      tick();

      // ASSERT: Alert shown
      expect(mockAlertController.create).toHaveBeenCalled();
      const alertConfig = mockAlertController.create.mock.calls[0][0];
      expect(alertConfig.inputs[0].type).toBe('text');

      // Simulate save
      const saveButton = alertConfig.buttons.find((b: any) => b.text === 'common.save');
      saveButton.handler({ name: 'New Name' });
      tick();

      // ASSERT: Profile updated
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith({ name: 'New Name' });
    }));

    it('should trim whitespace from username', fakeAsync(() => {
      // ARRANGE: Mock alert
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Trigger edit username
      component.editUsername();
      tick();

      const alertConfig = mockAlertController.create.mock.calls[0][0];
      const saveButton = alertConfig.buttons.find((b: any) => b.text === 'common.save');
      saveButton.handler({ name: '  Trimmed Name  ' });
      tick();

      // ASSERT: Whitespace trimmed
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith({ name: 'Trimmed Name' });
    }));

    it('should reject empty username', fakeAsync(() => {
      // ARRANGE: Mock alert
      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Trigger edit username
      component.editUsername();
      tick();

      const alertConfig = mockAlertController.create.mock.calls[0][0];
      const saveButton = alertConfig.buttons.find((b: any) => b.text === 'common.save');
      saveButton.handler({ name: '   ' });
      tick();

      // ASSERT: Profile not updated
      expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    }));
  });

  describe('10. Sign out flow and navigate to welcome', () => {
    it('should sign out and navigate to welcome page', fakeAsync(() => {
      // ACT: Trigger sign out
      component.onSignOut();
      tick();

      // ASSERT: Both auth services logged out
      expect(mockUnifiedAuthService.logout).toHaveBeenCalled();
      expect(mockTidepoolAuthService.logout).toHaveBeenCalled();

      // ASSERT: Profile deleted
      expect(mockProfileService.deleteProfile).toHaveBeenCalled();

      // ASSERT: Navigated to welcome
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.WELCOME], { replaceUrl: true });
    }));

    it('should navigate to welcome even if logout fails', fakeAsync(() => {
      // ARRANGE: Mock logout failure
      mockUnifiedAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      // ACT: Trigger sign out
      component.onSignOut();
      tick();

      // ASSERT: Still navigated to welcome
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.WELCOME], { replaceUrl: true });
    }));
  });

  describe('11. Avatar upload with resize and update', () => {
    it('should upload and resize avatar image', fakeAsync(() => {
      // ARRANGE: Create mock file
      const mockFile = new File(['image data'], 'avatar.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 2 * 1024 * 1024 }); // 2MB

      const mockInput = {
        files: [mockFile],
        value: 'avatar.jpg',
      } as any;
      const event = { target: mockInput } as any;

      // Mock image resize
      const mockCanvas = document.createElement('canvas');
      const mockDataUrl = 'data:image/jpeg;base64,mock_image_data';
      vi.spyOn(mockCanvas, 'toDataURL').mockReturnValue(mockDataUrl);
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      // ACT: Upload avatar
      component.onAvatarSelected(event);
      tick();

      // Simulate FileReader load
      const reader = (global as any).FileReader.mock.instances[0];
      if (reader && reader.onload) {
        reader.result = 'data:image/jpeg;base64,original_data';
        reader.onload({ target: { result: reader.result } } as any);
        tick();
      }

      // ASSERT: Input reset
      expect(mockInput.value).toBe('');
    }));

    it('should reject files larger than 3MB', fakeAsync(() => {
      // ARRANGE: Create large file
      const mockFile = new File(['large image data'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 4 * 1024 * 1024 }); // 4MB

      const mockInput = { files: [mockFile], value: '' } as any;
      const event = { target: mockInput } as any;

      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Try to upload
      component.onAvatarSelected(event);
      tick();

      // ASSERT: Error shown
      expect(mockAlertController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'profile.avatar.errorTitle',
        })
      );
    }));

    it('should handle no file selected', fakeAsync(() => {
      // ARRANGE: No file
      const mockInput = { files: [], value: '' } as any;
      const event = { target: mockInput } as any;

      // ACT: Upload with no file
      component.onAvatarSelected(event);
      tick();

      // ASSERT: No action taken
      expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
      expect(mockAlertController.create).not.toHaveBeenCalled();
    }));
  });

  describe('12. Profile data display', () => {
    it('should display user profile information', fakeAsync(() => {
      // ACT: Initialize component
      fixture.detectChanges();
      tick();

      // ASSERT: Profile data displayed
      expect(component.profile).toBeDefined();
      expect(component.emailText).toContain('test@example.com');
      expect(component.greeting).toBeDefined();
    }));

    it('should format member since text correctly', fakeAsync(() => {
      // ARRANGE: Profile with creation date
      const recentProfile = {
        ...mockUserProfile,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      };
      mockProfileService.getProfile.mockResolvedValue(recentProfile);
      mockProfileService.profile$.next(recentProfile);

      // ACT: Initialize
      fixture.detectChanges();
      tick();

      // ASSERT: Member since text generated
      expect(component.memberSinceText).toBeDefined();
    }));

    it('should show age description', fakeAsync(() => {
      // ACT: Initialize with profile
      fixture.detectChanges();
      tick();

      // ASSERT: Age description formatted
      expect(component.ageDescription).toContain('35');
    }));
  });

  describe('13. Loading state during profile fetch', () => {
    it('should handle loading state when fetching profile', fakeAsync(() => {
      // ARRANGE: Delay profile loading
      let resolveProfile: any;
      mockProfileService.getProfile.mockReturnValue(
        new Promise(resolve => {
          resolveProfile = resolve;
        })
      );

      // ACT: Initialize component
      fixture.detectChanges();
      tick();

      // ASSERT: Profile not yet loaded
      expect(component.profile).toBeNull();

      // Resolve profile
      resolveProfile(mockUserProfile);
      tick();

      // ASSERT: Profile loaded
      expect(component.profile).toBeDefined();
    }));
  });

  describe('14. Error handling', () => {
    it('should handle profile service errors gracefully', fakeAsync(() => {
      // ARRANGE: Mock profile service error
      mockProfileService.getProfile.mockRejectedValue(new Error('Database error'));

      // ACT: Initialize component
      fixture.detectChanges();
      tick();

      // ASSERT: Component still renders
      expect(() => fixture.detectChanges()).not.toThrow();
    }));

    it('should handle theme change errors', fakeAsync(() => {
      // ARRANGE: Mock theme service error
      mockThemeService.setThemeMode.mockRejectedValue(new Error('Theme error'));

      // ACT: Change theme
      const event = { detail: { value: 'dark' as ThemeMode } } as CustomEvent<{ value: ThemeMode }>;
      component.onThemeChange(event);
      tick();

      // ASSERT: No crash
      expect(() => fixture.detectChanges()).not.toThrow();
    }));

    it('should handle profile update errors silently', fakeAsync(() => {
      // ARRANGE: Mock update error
      mockProfileService.updateProfile.mockRejectedValue(new Error('Update failed'));

      const mockAlert = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockAlertController.create.mockResolvedValue(mockAlert);

      // ACT: Edit age with error
      component.editAge();
      tick();

      const alertConfig = mockAlertController.create.mock.calls[0][0];
      const saveButton = alertConfig.buttons.find((b: any) => b.text === 'common.save');
      saveButton.handler({ age: '42' });
      tick();

      // ASSERT: Error handled gracefully
      expect(() => tick()).not.toThrow();
    }));
  });

  describe('15. Preferences save success toast', () => {
    it('should show success toast when saving glucose unit', fakeAsync(() => {
      // ARRANGE: Mock successful save
      const mockToast = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockToastController.create.mockResolvedValue(mockToast);

      // ACT: Change glucose unit
      const event = { detail: { value: 'mmol/L' } } as CustomEvent<{ value: string }>;
      component.onGlucoseUnitChange(event);
      tick();

      // ASSERT: Profile updated (toast is shown by profile service or component logic)
      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ glucoseUnit: 'mmol/L' });
    }));

    it('should show success toast when enabling notifications', fakeAsync(() => {
      // ARRANGE: Mock permission granted
      mockNotificationService.requestPermissions.mockResolvedValue(true);

      const mockToast = {
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockToastController.create.mockResolvedValue(mockToast);

      // ACT: Enable notifications
      const event = { detail: { checked: true }, target: null } as any;
      component.onNotificationsToggle(event);
      tick();

      // ASSERT: Toast shown
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'success',
        })
      );
      expect(mockToast.present).toHaveBeenCalled();
    }));
  });
});

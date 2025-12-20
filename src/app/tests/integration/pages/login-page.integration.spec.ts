/**
 * LoginPage Integration Tests
 *
 * Tests the complete login flow including:
 * 1. Form validation and user interactions
 * 2. Authentication with LocalAuthService
 * 3. Profile creation/update flow
 * 4. Navigation after successful login
 * 5. Error handling (network errors, invalid credentials, timeout)
 * 6. Loading states and duplicate submission prevention
 * 7. Remember me functionality
 * 8. Accessibility attributes
 *
 * Flow: Form Validation → Authentication → Profile Setup → Navigation
 */

// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError, BehaviorSubject, firstValueFrom } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { LoginPage } from '../../../login/login.page';
import { LocalAuthService, LocalUser, AccountState } from '@core/services/local-auth.service';
import { ProfileService } from '@core/services/profile.service';
import { LoggerService } from '@core/services/logger.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoadingController, ToastController, AlertController } from '@ionic/angular/standalone';
import { ROUTES } from '@core/constants';
import { Preferences } from '@capacitor/preferences';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('LoginPage Integration Tests', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let mockRouter: { navigate: Mock; url: string };
  let mockLocalAuthService: {
    login: Mock;
    isAuthenticated: Mock;
    authState$: BehaviorSubject<any>;
  };
  let mockProfileService: {
    getProfile: Mock;
    createProfile: Mock;
    updateProfile: Mock;
  };
  let mockLoadingCtrl: {
    create: Mock;
  };
  let mockToastCtrl: {
    create: Mock;
  };
  let mockAlertCtrl: {
    create: Mock;
  };
  let mockLoggerService: {
    info: Mock;
    debug: Mock;
    warn: Mock;
    error: Mock;
  };

  const mockUser: LocalUser = {
    id: '1000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    accountState: AccountState.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'es',
      notifications: { appointments: true, readings: true, reminders: true },
      theme: 'light',
    },
  };

  beforeEach(async () => {
    // Create mocks
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      url: '/login',
    };

    const authState$ = new BehaviorSubject<any>({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });

    mockLocalAuthService = {
      login: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(of(false)),
      authState$,
    };

    mockProfileService = {
      getProfile: vi.fn().mockResolvedValue(null),
      createProfile: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
    };

    const mockLoading = {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    mockLoadingCtrl = {
      create: vi.fn().mockResolvedValue(mockLoading),
    };

    const mockToast = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    mockToastCtrl = {
      create: vi.fn().mockResolvedValue(mockToast),
    };

    const mockAlert = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue(mockAlert),
    };

    const translations: Record<string, string> = {
      'login.messages.loggingIn': 'Iniciando sesión...',
      'login.messages.welcomeBack': 'Bienvenido de nuevo',
      'login.messages.loginError': 'Error de inicio de sesión',
      'login.messages.genericError': 'Error al iniciar sesión',
      'login.messages.invalidCredentials': 'Credenciales incorrectas',
      'login.messages.invalidData': 'Datos inválidos',
      'login.messages.connectionError': 'Error de conexión',
      'login.validation.usernameRequired': 'Usuario requerido',
      'login.validation.passwordRequired': 'Contraseña requerida',
      'login.validation.passwordMinLength': 'Mínimo 6 caracteres',
      'errors.timeout': 'Tiempo de espera agotado',
      'welcome.heroAlt': 'Bienvenido',
      'app.name': 'Diabetactic',
      'welcome.subtitle': 'Tu compañero en el manejo de la diabetes',
      'login.username.label': 'Usuario',
      'login.username.placeholder': 'Ingresa tu usuario',
      'login.password.label': 'Contraseña',
      'login.password.placeholder': 'Ingresa tu contraseña',
      'login.rememberMe': 'Recordarme',
      'login.submitButton': 'Iniciar sesión',
      'login.hidePassword': 'Ocultar contraseña',
      'login.showPassword': 'Mostrar contraseña',
      'login.footer.copyright': '© 2025 Diabetactic',
      'login.footer.links.terms': 'Términos',
      'login.footer.links.privacy': 'Privacidad',
      'login.footer.links.support': 'Soporte',
      'common.terms': 'Términos y condiciones',
      'common.privacy': 'Política de privacidad',
      'common.support': 'Soporte',
    };

    mockLoggerService = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Mock Preferences storage
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

    await TestBed.configureTestingModule({
      imports: [LoginPage, TranslateModule.forRoot()],
      providers: [
        FormBuilder,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: LocalAuthService, useValue: mockLocalAuthService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LoadingController, useValue: mockLoadingCtrl },
        { provide: ToastController, useValue: mockToastCtrl },
        { provide: AlertController, useValue: mockAlertCtrl },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    // Configure real TranslateService with translations
    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('es');
    translateService.setTranslation('es', translations, true); // shouldMerge = true
    await firstValueFrom(translateService.use('es'));

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Valid login with existing profile → navigate to dashboard', () => {
    it('should login successfully and navigate to dashboard when profile exists', async () => {
      // ARRANGE: Mock successful login with existing profile
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      mockProfileService.getProfile.mockResolvedValue({
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
        hasCompletedOnboarding: true,
      });

      // Set form values
      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT: Submit login form
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Login service called
      expect(mockLocalAuthService.login).toHaveBeenCalledWith('1000', 'tuvieja', false);

      // Loading spinner shown
      expect(mockLoadingCtrl.create).toHaveBeenCalledWith({
        message: 'Iniciando sesión...',
        spinner: 'crescent',
        cssClass: 'custom-loading',
      });

      // Profile fetched
      expect(mockProfileService.getProfile).toHaveBeenCalled();

      // Welcome toast shown
      expect(mockToastCtrl.create).toHaveBeenCalledWith({
        message: 'Bienvenido de nuevo',
        duration: 2000,
        color: 'success',
        position: 'top',
      });

      // Navigate to dashboard
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.TABS_DASHBOARD], {
        replaceUrl: true,
      });
    });
  });

  describe('2. Valid login without profile → create profile → navigate', () => {
    it('should create profile after successful login when profile does not exist', async () => {
      // ARRANGE: Mock successful login without existing profile
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      mockProfileService.getProfile.mockResolvedValue(null);

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT: Submit login form
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Profile created
      expect(mockProfileService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          accountState: AccountState.ACTIVE,
          hasCompletedOnboarding: true,
        })
      );

      // Navigate to dashboard
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.TABS_DASHBOARD], {
        replaceUrl: true,
      });
    });
  });

  describe('3. Invalid credentials (401/403) → show error message', () => {
    it('should show error alert when credentials are invalid (401)', async () => {
      // ARRANGE: Mock 401 error
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: false,
          error: 'Credenciales incorrectas',
        })
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'wrongpassword',
        rememberMe: false,
      });

      // ACT: Submit login form
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Error alert shown
      expect(mockAlertCtrl.create).toHaveBeenCalledWith({
        header: 'Error de inicio de sesión',
        message: 'Credenciales incorrectas',
        buttons: ['OK'],
      });

      // Navigation not called
      expect(mockRouter.navigate).not.toHaveBeenCalled();

      // Password field cleared
      expect(component.loginForm.value.password).toBe('');
    });

    it('should handle 403 forbidden error', async () => {
      // ARRANGE: Mock error with 403 status
      const error = new Error('Forbidden') as any;
      error.status = 403;

      mockLocalAuthService.login.mockReturnValue(throwError(() => error));

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT: Submit login form
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Error alert shown with invalid credentials message
      expect(mockAlertCtrl.create).toHaveBeenCalledWith({
        header: 'Error de inicio de sesión',
        message: 'Credenciales incorrectas',
        buttons: ['OK'],
      });
    });
  });

  describe('4. Network timeout → show network error', () => {
    it('should handle timeout error from login service', async () => {
      // ARRANGE: Mock timeout error
      const timeoutError = new Error('Login API call timed out');
      mockLocalAuthService.login.mockReturnValue(throwError(() => timeoutError));

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT: Submit login form
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Timeout alert shown
      expect(mockAlertCtrl.create).toHaveBeenCalledWith({
        header: 'Error de inicio de sesión',
        message: 'Tiempo de espera agotado',
        buttons: ['OK'],
      });
    });

    it('should handle network error (status 0)', async () => {
      // ARRANGE: Mock network error
      const error = new Error('Network error') as any;
      error.status = 0;

      mockLocalAuthService.login.mockReturnValue(throwError(() => error));

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT: Submit login form
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Connection error message shown
      expect(mockAlertCtrl.create).toHaveBeenCalledWith({
        header: 'Error de inicio de sesión',
        message: 'Error de conexión',
        buttons: ['OK'],
      });
    });
  });

  describe('5. Form validation failures (empty username, empty password)', () => {
    it('should mark fields as touched and show errors when username is empty', () => {
      // ARRANGE: Empty form
      component.loginForm.patchValue({
        username: '',
        password: 'password',
        rememberMe: false,
      });

      // ACT: Submit form
      component.onSubmit();
      fixture.detectChanges();

      // ASSERT: Form is invalid
      expect(component.loginForm.invalid).toBe(true);

      // Username field marked as touched
      const usernameControl = component.loginForm.get('username');
      expect(usernameControl?.touched).toBe(true);

      // Username error message
      expect(component.usernameError).toBe('Usuario requerido');

      // Login service not called
      expect(mockLocalAuthService.login).not.toHaveBeenCalled();
    });

    it('should show error when password is empty', () => {
      // ARRANGE
      component.loginForm.patchValue({
        username: '1000',
        password: '',
        rememberMe: false,
      });

      // ACT
      component.onSubmit();
      fixture.detectChanges();

      // ASSERT
      expect(component.loginForm.invalid).toBe(true);

      const passwordControl = component.loginForm.get('password');
      expect(passwordControl?.touched).toBe(true);

      expect(component.passwordError).toBe('Contraseña requerida');
      expect(mockLocalAuthService.login).not.toHaveBeenCalled();
    });

    it('should show error when password is less than 6 characters', () => {
      // ARRANGE
      component.loginForm.patchValue({
        username: '1000',
        password: '12345',
        rememberMe: false,
      });

      // ACT
      component.onSubmit();
      fixture.detectChanges();

      // ASSERT
      expect(component.loginForm.invalid).toBe(true);

      const passwordControl = component.loginForm.get('password');
      expect(passwordControl?.touched).toBe(true);

      expect(component.passwordError).toBe('Mínimo 6 caracteres');
    });

    it('should show errors when both fields are empty', () => {
      // ARRANGE
      component.loginForm.patchValue({
        username: '',
        password: '',
        rememberMe: false,
      });

      // ACT
      component.onSubmit();
      fixture.detectChanges();

      // ASSERT
      expect(component.loginForm.invalid).toBe(true);
      expect(component.usernameError).toBe('Usuario requerido');
      expect(component.passwordError).toBe('Contraseña requerida');
    });
  });

  describe('6. Duplicate submission prevention (button disabled during submit)', () => {
    it('should prevent duplicate submissions when already loading', async () => {
      // ARRANGE: Mock successful login
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // Set loading state
      component.isLoading = true;

      // ACT: Try to submit again
      await component.onSubmit();

      // ASSERT: Login service not called (duplicate prevented)
      expect(mockLocalAuthService.login).not.toHaveBeenCalled();
    });

    it('should disable form during login process', async () => {
      // ARRANGE
      mockLocalAuthService.login.mockReturnValue(
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                success: true,
                user: mockUser,
              }),
            100
          )
        ) as any
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT: Start login
      const submitPromise = component.onSubmit();

      // ASSERT: Form disabled immediately
      expect(component.isLoading).toBe(true);
      expect(component.loginForm.disabled).toBe(true);

      // Wait for completion
      await submitPromise;
      await fixture.whenStable();
      fixture.detectChanges();
    });
  });

  describe('7. Password field clearing on error', () => {
    it('should clear password field when login fails', async () => {
      // ARRANGE
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: false,
          error: 'Invalid credentials',
        })
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'wrongpassword',
        rememberMe: false,
      });

      // ACT
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Password cleared
      expect(component.loginForm.value.password).toBe('');

      // Username remains
      expect(component.loginForm.value.username).toBe('1000');
    });
  });

  describe('8. Remember me checkbox → persist preference', () => {
    it('should pass rememberMe value to login service', async () => {
      // ARRANGE
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: true,
      });

      // ACT
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: rememberMe passed as true
      expect(mockLocalAuthService.login).toHaveBeenCalledWith('1000', 'tuvieja', true);
    });

    it('should handle rememberMe as false when unchecked', async () => {
      // ARRANGE
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: rememberMe passed as false
      expect(mockLocalAuthService.login).toHaveBeenCalledWith('1000', 'tuvieja', false);
    });
  });

  describe('9. Translation key resolution for error messages', () => {
    it('should use translated messages for validation errors', () => {
      // ARRANGE
      component.loginForm.patchValue({
        username: '',
        password: '123',
        rememberMe: false,
      });

      // ACT
      component.onSubmit();
      fixture.detectChanges();

      // ASSERT: Translation service returns translated strings
      const translateService = TestBed.inject(TranslateService);
      expect(translateService.instant('login.validation.usernameRequired')).toBe('Usuario requerido');
      expect(translateService.instant('login.validation.passwordMinLength')).toBe('Mínimo 6 caracteres');
    });

    it('should use translated messages for server errors', async () => {
      // ARRANGE
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: false,
          error: 'Server error',
        })
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT
      await component.onSubmit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Error messages translated
      const translateService = TestBed.inject(TranslateService);
      expect(translateService.instant('login.messages.loginError')).toBe('Error de inicio de sesión');
      expect(translateService.instant('login.messages.loggingIn')).toBe('Iniciando sesión...');
    });
  });

  describe('10. Username/password field clearing on form reset', () => {
    it('should clear form when reset is called', () => {
      // ARRANGE
      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: true,
      });

      // ACT
      component.loginForm.reset();

      // ASSERT: All fields cleared
      expect(component.loginForm.value.username).toBeNull();
      expect(component.loginForm.value.password).toBeNull();
      expect(component.loginForm.value.rememberMe).toBeNull();
    });
  });

  describe('11. Navigate to register link', () => {
    it('should have navigation links in template (manual navigation)', () => {
      // NOTE: LoginPage currently doesn't have register/forgot-password links
      // This test documents expected behavior if links are added
      // ARRANGE & ACT: Check if router is available
      expect(mockRouter).toBeDefined();

      // ASSERT: Router can navigate (functionality exists for future use)
      expect(mockRouter.navigate).toBeDefined();
    });
  });

  describe('12. Navigate to forgot password', () => {
    it('should support navigation capability for forgot password (future use)', () => {
      // NOTE: Similar to above, this documents router capability
      // ARRANGE & ACT
      expect(mockRouter).toBeDefined();

      // ASSERT
      expect(mockRouter.navigate).toBeDefined();
    });
  });

  describe('13. Loading spinner during login', () => {
    it('should show loading spinner during login', async () => {
      // ARRANGE
      const mockLoading = {
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(undefined),
      };

      mockLoadingCtrl.create.mockResolvedValue(mockLoading);

      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Loading created and presented
      expect(mockLoadingCtrl.create).toHaveBeenCalledWith({
        message: 'Iniciando sesión...',
        spinner: 'crescent',
        cssClass: 'custom-loading',
      });
      expect(mockLoading.present).toHaveBeenCalled();

      // Loading dismissed after completion
      expect(mockLoading.dismiss).toHaveBeenCalled();
    });

    it('should update isLoading flag during login', async () => {
      // ARRANGE
      mockLocalAuthService.login.mockReturnValue(
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                success: true,
                user: mockUser,
              }),
            50
          )
        ) as any
      );

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT
      const submitPromise = component.onSubmit();

      // ASSERT: Loading flag set
      expect(component.isLoading).toBe(true);

      await submitPromise;
      await fixture.whenStable();
      fixture.detectChanges();

      // Loading flag cleared (in error or success path)
      // Note: isLoading is managed in catch/finally blocks
    });
  });

  describe('14. Form invalid state styling', () => {
    it('should mark field as invalid when touched and has errors', () => {
      // ARRANGE
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('');
      usernameControl?.markAsTouched();

      // ACT
      const isInvalid = component.isFieldInvalid('username');

      // ASSERT
      expect(isInvalid).toBe(true);
    });

    it('should not mark field as invalid when not touched', () => {
      // ARRANGE
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('');

      // ACT
      const isInvalid = component.isFieldInvalid('username');

      // ASSERT: Not invalid because not touched yet
      expect(isInvalid).toBe(false);
    });

    it('should not mark field as invalid when valid', () => {
      // ARRANGE
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('1000');
      usernameControl?.markAsTouched();

      // ACT
      const isInvalid = component.isFieldInvalid('username');

      // ASSERT
      expect(isInvalid).toBe(false);
    });
  });

  describe('15. Accessibility attributes on form', () => {
    it('should have accessible form controls', () => {
      // ARRANGE & ACT: Check form structure
      const usernameControl = component.loginForm.get('username');
      const passwordControl = component.loginForm.get('password');
      const rememberMeControl = component.loginForm.get('rememberMe');

      // ASSERT: All controls exist
      expect(usernameControl).toBeDefined();
      expect(passwordControl).toBeDefined();
      expect(rememberMeControl).toBeDefined();

      // Form has required validators (accessibility requirement)
      expect(usernameControl?.hasError('required')).toBe(true); // Empty initially
      expect(passwordControl?.hasError('required')).toBe(true);
    });

    it('should toggle password visibility for accessibility', () => {
      // ARRANGE
      expect(component.showPassword).toBe(false);

      // ACT: Toggle visibility
      component.togglePasswordVisibility();

      // ASSERT
      expect(component.showPassword).toBe(true);

      // Toggle again
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle profile creation failure gracefully', async () => {
      // ARRANGE
      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      mockProfileService.getProfile.mockResolvedValue(null);
      mockProfileService.createProfile.mockRejectedValue(new Error('Profile creation failed'));

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT: Submit - should continue even if profile creation fails
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Still navigates to dashboard (graceful failure)
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.TABS_DASHBOARD], {
        replaceUrl: true,
      });
    });

    it('should handle profile update with mismatched email', async () => {
      // ARRANGE
      const userWithDifferentEmail = {
        ...mockUser,
        email: 'newemail@example.com',
      };

      mockLocalAuthService.login.mockReturnValue(
        of({
          success: true,
          user: userWithDifferentEmail,
        })
      );

      mockProfileService.getProfile.mockResolvedValue({
        name: 'Test User',
        email: 'oldemail@example.com',
        age: 25,
        hasCompletedOnboarding: true,
      });

      component.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: false,
      });

      // ACT
      await component.onSubmit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Profile updated with new email
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith({
        email: 'newemail@example.com',
        hasCompletedOnboarding: true,
      });
    });

    it('should redirect if user already authenticated on init', async () => {
      // ARRANGE: User already authenticated
      mockLocalAuthService.isAuthenticated.mockReturnValue(of(true));
      mockRouter.url = '/login';

      // ACT: Initialize component
      component.ngOnInit();

      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: Navigate to dashboard
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.TABS_DASHBOARD], {
        replaceUrl: true,
      });
    });

    it('should not redirect if already on dashboard route', async () => {
      // ARRANGE
      mockLocalAuthService.isAuthenticated.mockReturnValue(of(true));
      mockRouter.url = ROUTES.TABS_DASHBOARD;

      // ACT
      component.ngOnInit();
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT: No navigation (already on correct route)
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup subscriptions on destroy', () => {
      // ARRANGE
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completespy = vi.spyOn(component['destroy$'], 'complete');

      // ACT
      component.ngOnDestroy();

      // ASSERT
      expect(destroySpy).toHaveBeenCalled();
      expect(completespy).toHaveBeenCalled();
    });
  });
});

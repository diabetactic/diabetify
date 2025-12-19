// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { vi } from 'vitest';

import { LoginPage } from './login.page';
import { LocalAuthService, LocalUser, AccountState } from '@core/services/local-auth.service';
import { ProfileService } from '@core/services/profile.service';
import { LoggerService } from '@core/services/logger.service';
import { ROUTES } from '@core/constants';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';
import { DEFAULT_USER_PREFERENCES } from '@core/models/user-profile.model';

class LoggerServiceStub {
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
  debug = vi.fn();
}

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authService: any;
  let profileService: any;
  let router: any;
  let loadingCtrl: any;
  let toastCtrl: any;
  let alertCtrl: any;
  let _translate: TranslateService;
  let logger: LoggerServiceStub;
  let mockLoading: any;
  let mockToast: any;
  let mockAlert: any;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;

  const mockUser: LocalUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    accountState: AccountState.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Setup mocks
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

    mockLoading = {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    mockToast = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    mockAlert = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    authService = {
      login: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(isAuthenticatedSubject.asObservable()),
      logout: vi.fn(),
      authState$: of({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      }),
    } as any;

    profileService = {
      getProfile: vi.fn().mockResolvedValue(null),
      createProfile: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      profile$: of(null),
    } as any;

    router = {
      navigate: vi.fn().mockResolvedValue(true),
    } as any;
    Object.defineProperty(router, 'url', {
      writable: true,
      value: '/login',
    });

    loadingCtrl = {
      create: vi.fn().mockResolvedValue(mockLoading),
    } as any;

    toastCtrl = {
      create: vi.fn().mockResolvedValue(mockToast),
    } as any;

    alertCtrl = {
      create: vi.fn().mockResolvedValue(mockAlert),
    } as any;

    logger = new LoggerServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        LoginPage,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        getLucideIconsForTesting(),
      ],
      providers: [
        { provide: LocalAuthService, useValue: authService },
        { provide: ProfileService, useValue: profileService },
        { provide: Router, useValue: router },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: AlertController, useValue: alertCtrl },
        TranslateService,
        { provide: LoggerService, useValue: logger },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    _translate = TestBed.inject(TranslateService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize login form with empty values', () => {
      expect(component.loginForm).toBeDefined();
      expect(component.loginForm.get('username')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
      expect(component.loginForm.get('rememberMe')?.value).toBe(false);
    });

    it('should set username field as required', () => {
      const usernameControl = component.loginForm.get('username');
      expect(usernameControl?.hasError('required')).toBe(true);

      usernameControl?.setValue('test@example.com');
      expect(usernameControl?.hasError('required')).toBe(false);
    });

    it('should set password field as required with minLength 6', () => {
      const passwordControl = component.loginForm.get('password');
      expect(passwordControl?.hasError('required')).toBe(true);

      passwordControl?.setValue('12345');
      expect(passwordControl?.hasError('minlength')).toBe(true);

      passwordControl?.setValue('123456');
      expect(passwordControl?.hasError('minlength')).toBe(false);
    });

    // Skip: Navigation for authenticated users is handled by route guards
    it.skip('should navigate to dashboard if user is already authenticated', async () => {
      // Recreate component for clean state
      router.navigate.mockClear();
      isAuthenticatedSubject = new BehaviorSubject<boolean>(true);
      authService.isAuthenticated.mockReturnValue(isAuthenticatedSubject.asObservable());
      Object.defineProperty(router, 'url', { writable: true, value: '/login' });

      const newFixture = TestBed.createComponent(LoginPage);
      // Component created above triggers auth check on construction

      newFixture.detectChanges();
      await newFixture.whenStable();

      // Navigation happens in setTimeout, so we need to wait for it
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(router.navigate).toHaveBeenCalledWith([ROUTES.TABS_DASHBOARD], { replaceUrl: true });
    });

    it('should not navigate if user is already on tabs route', async () => {
      // Recreate component for clean state
      router.navigate.mockClear();
      isAuthenticatedSubject = new BehaviorSubject<boolean>(true);
      authService.isAuthenticated.mockReturnValue(isAuthenticatedSubject.asObservable());
      Object.defineProperty(router, 'url', { writable: true, value: '/tabs/dashboard' });

      const newFixture = TestBed.createComponent(LoginPage);
      // Component created above triggers auth check on construction

      newFixture.detectChanges();
      await newFixture.whenStable();

      // Wait same amount as previous test
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should mark form as invalid when empty', () => {
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as valid with correct data', () => {
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
      });
      expect(component.loginForm.valid).toBe(true);
    });

    it('should return username error message when field is touched and empty', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();
      fixture.detectChanges();

      const errorMsg = component.usernameError;
      // TranslateService returns keys as-is in test mode
      expect(errorMsg).toBe('login.validation.usernameRequired');
    });

    it('should return empty string when username is valid', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.setValue('test@example.com');
      usernameControl?.markAsTouched();

      expect(component.usernameError).toBe('');
    });

    it('should return password required error message', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.markAsTouched();
      fixture.detectChanges();

      const errorMsg = component.passwordError;
      // TranslateService returns keys as-is in test mode
      expect(errorMsg).toBe('login.validation.passwordRequired');
    });

    it('should return password minLength error message', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('12345');
      passwordControl?.markAsTouched();
      fixture.detectChanges();

      const errorMsg = component.passwordError;
      // TranslateService returns keys as-is in test mode
      expect(errorMsg).toBe('login.validation.passwordMinLength');
    });

    it('should check if field is invalid', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();

      expect(component.isFieldInvalid('username')).toBe(true);

      usernameControl?.setValue('test@example.com');
      expect(component.isFieldInvalid('username')).toBe(false);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);

      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);

      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });
  });

  describe('Login Submission - Validation', () => {
    it('should prevent submission if form is invalid', async () => {
      component.loginForm.patchValue({ username: '', password: '' });

      await component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
      expect(loadingCtrl.create).not.toHaveBeenCalled();
    });

    it('should prevent duplicate submissions when already loading', async () => {
      component.isLoading = true;
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
      });

      await component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched on invalid submit', async () => {
      component.loginForm.patchValue({
        username: '',
        password: '',
      });

      await component.onSubmit();

      expect(component.loginForm.get('username')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });
  });

  describe('Login Submission - Success Flow', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });

    it('should call authService.login with correct credentials', async () => {
      authService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      await component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123', false);
    });

    it('should show loading spinner during login', async () => {
      authService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      const submitPromise = component.onSubmit();

      // Give ngZone time to run
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(loadingCtrl.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();

      await submitPromise;
    });

    it('should handle rememberMe flag', async () => {
      component.loginForm.patchValue({ rememberMe: true });
      authService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );

      await component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123', true);
    });
  });

  describe('Login Submission - Error Handling', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle invalid credentials (401)', async () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;
      authService.login.mockReturnValue(throwError(() => error));

      await component.onSubmit();

      expect(alertCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'login.messages.invalidCredentials',
        })
      );
    });

    it('should handle validation error (422)', async () => {
      const error = new Error('Validation failed') as any;
      error.status = 422;
      authService.login.mockReturnValue(throwError(() => error));

      await component.onSubmit();

      expect(alertCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'login.messages.invalidData',
        })
      );
    });

    it('should handle connection error (status 0)', async () => {
      const error = new Error('Network error') as any;
      error.status = 0;
      authService.login.mockReturnValue(throwError(() => error));

      await component.onSubmit();

      expect(alertCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'login.messages.connectionError',
        })
      );
    });

    it('should handle timeout error', async () => {
      authService.login.mockReturnValue(throwError(() => new Error('Login API call timed out')));

      await component.onSubmit();

      expect(alertCtrl.create).toHaveBeenCalled();
    });

    it('should handle login success:false response', async () => {
      authService.login.mockReturnValue(
        of({
          success: false,
          error: 'Invalid credentials',
        })
      );

      await component.onSubmit();

      expect(alertCtrl.create).toHaveBeenCalled();
    });

    it('should reset form password after error', async () => {
      authService.login.mockReturnValue(
        throwError(() => ({
          status: 401,
        }))
      );

      await component.onSubmit();
      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should dismiss loading spinner after error', async () => {
      authService.login.mockReturnValue(
        throwError(() => ({
          status: 401,
        }))
      );

      await component.onSubmit();

      expect(mockLoading.dismiss).toHaveBeenCalled();
    });
  });

  describe('Logger Integration', () => {
    it('should log initialization', () => {
      fixture.detectChanges();
      expect(logger.info).toHaveBeenCalledWith('Init', 'LoginPage initialized');
    });

    it('should log form validation errors', async () => {
      component.loginForm.patchValue({ username: '', password: '' });
      await component.onSubmit();

      expect(logger.warn).toHaveBeenCalledWith(
        'Auth',
        'Login form invalid',
        component.loginForm.errors
      );
    });

    it('should log errors during login', async () => {
      const error = new Error('Network error');
      authService.login.mockReturnValue(throwError(() => error));
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
      });

      await component.onSubmit();

      expect(logger.error).toHaveBeenCalledWith('Auth', 'Error during login process', error);
    });
  });

  describe('ensureOnboardingProfile (private method behavior)', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
      });
    });

    it('should create profile when none exists', async () => {
      authService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );
      profileService.getProfile.mockResolvedValue(null);

      await component.onSubmit();
      // Wait for profile creation
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(profileService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          age: 12,
          accountState: AccountState.ACTIVE,
          hasCompletedOnboarding: true,
        })
      );
    });

    it('should update profile if email changed', async () => {
      authService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );
      profileService.getProfile.mockResolvedValue({
        id: '123',
        name: 'Test User',
        email: 'old@example.com',
        hasCompletedOnboarding: true,
        age: 12,
        accountState: AccountState.ACTIVE,
        preferences: DEFAULT_USER_PREFERENCES,
        tidepoolConnection: { connected: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await component.onSubmit();
      // Wait for profile update
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(profileService.updateProfile).toHaveBeenCalledWith({
        email: 'test@example.com',
        hasCompletedOnboarding: true,
      });
    });

    it('should not update profile if email unchanged and onboarding complete', async () => {
      authService.login.mockReturnValue(
        of({
          success: true,
          user: mockUser,
        })
      );
      profileService.getProfile.mockResolvedValue({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        hasCompletedOnboarding: true,
        age: 12,
        accountState: AccountState.ACTIVE,
        preferences: DEFAULT_USER_PREFERENCES,
        tidepoolConnection: { connected: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await component.onSubmit();
      // Wait to ensure nothing happens
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-Error thrown objects', async () => {
      authService.login.mockReturnValue(throwError(() => 'string error'));
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
      });

      await component.onSubmit();

      expect(alertCtrl.create).toHaveBeenCalled();
    });

    it('should use email as name if firstName and lastName are empty', async () => {
      const userWithNoName = { ...mockUser, firstName: '', lastName: '' };
      authService.login.mockReturnValue(
        of({
          success: true,
          user: userWithNoName,
        })
      );
      profileService.getProfile.mockResolvedValue(null);
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
      });

      await component.onSubmit();
      // Wait for profile creation
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(profileService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test@example.com',
        })
      );
    });
  });
});

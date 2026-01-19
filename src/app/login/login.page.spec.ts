// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { LoginPage } from './login.page';
import { LocalAuthService, LocalUser, AccountState } from '@core/services/local-auth.service';
import { ProfileService } from '@core/services/profile.service';
import { LoggerService } from '@core/services/logger.service';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';
import { DEFAULT_USER_PREFERENCES } from '@core/models/user-profile.model';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authService: any;
  let profileService: any;
  let router: any;
  let loadingCtrl: any;
  let toastCtrl: any;
  let alertCtrl: any;
  let logger: any;
  let mockLoading: any;
  let mockAlert: any;
  let mockToast: any;
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
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

    mockLoading = {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    mockAlert = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    mockToast = {
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
      events: of(),
      createUrlTree: vi.fn().mockReturnValue({}),
      serializeUrl: vi.fn().mockReturnValue('/forgot-password'),
    } as any;
    Object.defineProperty(router, 'url', { writable: true, value: '/login' });

    loadingCtrl = { create: vi.fn().mockResolvedValue(mockLoading) } as any;
    toastCtrl = { create: vi.fn().mockResolvedValue(mockToast) } as any;
    alertCtrl = { create: vi.fn().mockResolvedValue(mockAlert) } as any;

    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

    const activatedRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };

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
        { provide: ActivatedRoute, useValue: activatedRoute },
        TranslateService,
        { provide: LoggerService, useValue: logger },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION & FORM STRUCTURE
  // ============================================================================

  describe('Component Initialization', () => {
    it('should initialize login form with correct structure and validation', () => {
      expect(component.loginForm).toBeDefined();
      expect(component.loginForm.get('username')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
      expect(component.loginForm.get('rememberMe')?.value).toBe(false);

      // Username required
      const usernameControl = component.loginForm.get('username');
      expect(usernameControl?.hasError('required')).toBe(true);
      usernameControl?.setValue('test@example.com');
      expect(usernameControl?.hasError('required')).toBe(false);

      // Password required + minLength 6
      const passwordControl = component.loginForm.get('password');
      expect(passwordControl?.hasError('required')).toBe(true);
      passwordControl?.setValue('12345');
      expect(passwordControl?.hasError('minlength')).toBe(true);
      passwordControl?.setValue('123456');
      expect(passwordControl?.hasError('minlength')).toBe(false);
    });

    it('should not navigate if user is already on tabs route', async () => {
      router.navigate.mockClear();
      isAuthenticatedSubject = new BehaviorSubject<boolean>(true);
      authService.isAuthenticated.mockReturnValue(isAuthenticatedSubject.asObservable());
      Object.defineProperty(router, 'url', { writable: true, value: '/tabs/dashboard' });

      const newFixture = TestBed.createComponent(LoginPage);
      newFixture.detectChanges();
      await newFixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // FORM VALIDATION & ERROR MESSAGES
  // ============================================================================

  describe('Form Validation', () => {
    it('should validate form and display error messages correctly', () => {
      expect(component.loginForm.valid).toBe(false);

      component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });
      expect(component.loginForm.valid).toBe(true);
    });

    it('should return correct error messages for username field', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();
      fixture.detectChanges();

      expect(component.usernameError).toBe('login.validation.usernameRequired');

      usernameControl?.setValue('test@example.com');
      expect(component.usernameError).toBe('');
    });

    it('should return correct error messages for password field', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.markAsTouched();
      fixture.detectChanges();

      expect(component.passwordError).toBe('login.validation.passwordRequired');

      passwordControl?.setValue('12345');
      fixture.detectChanges();
      expect(component.passwordError).toBe('login.validation.passwordMinLength');

      passwordControl?.setValue('123456');
      expect(component.passwordError).toBe('');
    });

    it('should correctly identify invalid fields', () => {
      const usernameControl = component.loginForm.get('username');
      usernameControl?.markAsTouched();
      expect(component.isFieldInvalid('username')).toBe(true);

      usernameControl?.setValue('test@example.com');
      expect(component.isFieldInvalid('username')).toBe(false);
    });
  });

  // ============================================================================
  // PASSWORD VISIBILITY
  // ============================================================================

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });
  });

  // ============================================================================
  // LOGIN SUBMISSION - VALIDATION GUARDS
  // ============================================================================

  describe('Login Submission - Validation', () => {
    it('should prevent submission if form is invalid or already loading', async () => {
      // Invalid form
      component.loginForm.patchValue({ username: '', password: '' });
      await component.onSubmit();
      expect(authService.login).not.toHaveBeenCalled();
      expect(loadingCtrl.create).not.toHaveBeenCalled();

      // Already loading
      component.isLoading = true;
      component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });
      await component.onSubmit();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched on invalid submit', async () => {
      component.loginForm.patchValue({ username: '', password: '' });
      await component.onSubmit();

      expect(component.loginForm.get('username')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });
  });

  // ============================================================================
  // LOGIN SUBMISSION - SUCCESS FLOW
  // ============================================================================

  describe('Login Submission - Success Flow', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        username: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });

    it('should call authService.login with correct credentials and show loading', async () => {
      authService.login.mockReturnValue(of({ success: true, user: mockUser }));

      const submitPromise = component.onSubmit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(loadingCtrl.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();

      await submitPromise;

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123', false);
    });

    it('should handle rememberMe flag', async () => {
      component.loginForm.patchValue({ rememberMe: true });
      authService.login.mockReturnValue(of({ success: true, user: mockUser }));

      await component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123', true);
    });
  });

  // ============================================================================
  // LOGIN SUBMISSION - ERROR HANDLING
  // ============================================================================

  describe('Login Submission - Error Handling', () => {
    beforeEach(() => {
      component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });
    });

    it('should handle various HTTP error codes', async () => {
      const errorCases = [
        { status: 401, expectedMessage: 'login.messages.invalidCredentials' },
        { status: 422, expectedMessage: 'login.messages.invalidData' },
        { status: 0, expectedMessage: 'login.messages.connectionError' },
      ];

      for (const errorCase of errorCases) {
        vi.clearAllMocks();
        // Re-setup mocks and form after clearing (password gets reset to '' on error)
        loadingCtrl.create.mockResolvedValue(mockLoading);
        toastCtrl.create.mockResolvedValue(mockToast);
        alertCtrl.create.mockResolvedValue(mockAlert);
        component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });
        component.isLoading = false;

        const error = new Error('Error') as any;
        error.status = errorCase.status;
        authService.login.mockReturnValue(throwError(() => error));

        await component.onSubmit();

        expect(toastCtrl.create).toHaveBeenCalledWith(
          expect.objectContaining({ message: errorCase.expectedMessage })
        );
      }
    });

    it('should handle login success:false response', async () => {
      authService.login.mockReturnValue(of({ success: false, error: 'Invalid credentials' }));

      await component.onSubmit();

      expect(toastCtrl.create).toHaveBeenCalled();
    });

    it('should reset password and dismiss loading after error', async () => {
      authService.login.mockReturnValue(throwError(() => ({ status: 401 })));

      await component.onSubmit();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(component.loginForm.get('password')?.value).toBe('');
      expect(mockLoading.dismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // LOGGER INTEGRATION
  // ============================================================================

  describe('Logger Integration', () => {
    it('should log initialization and errors', async () => {
      fixture.detectChanges();
      expect(logger.info).toHaveBeenCalledWith('Init', 'LoginPage initialized');

      component.loginForm.patchValue({ username: '', password: '' });
      await component.onSubmit();
      expect(logger.warn).toHaveBeenCalledWith(
        'Auth',
        'Login form invalid',
        component.loginForm.errors
      );

      const error = new Error('Network error');
      authService.login.mockReturnValue(throwError(() => error));
      component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });

      await component.onSubmit();

      expect(logger.error).toHaveBeenCalledWith('Auth', 'Error during login process', error);
    });
  });

  // ============================================================================
  // PROFILE CREATION / UPDATE
  // ============================================================================

  describe('ensureOnboardingProfile behavior', () => {
    beforeEach(() => {
      component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });
    });

    it('should create profile when none exists', async () => {
      authService.login.mockReturnValue(of({ success: true, user: mockUser }));
      profileService.getProfile.mockResolvedValue(null);

      await component.onSubmit();
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
      authService.login.mockReturnValue(of({ success: true, user: mockUser }));
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
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(profileService.updateProfile).toHaveBeenCalledWith({
        email: 'test@example.com',
        hasCompletedOnboarding: true,
      });
    });

    it('should not update profile if email unchanged and onboarding complete', async () => {
      authService.login.mockReturnValue(of({ success: true, user: mockUser }));
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
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle non-Error thrown objects', async () => {
      authService.login.mockReturnValue(throwError(() => 'string error'));
      component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });

      await component.onSubmit();

      expect(toastCtrl.create).toHaveBeenCalled();
    });

    it('should use email as name if firstName and lastName are empty', async () => {
      const userWithNoName = { ...mockUser, firstName: '', lastName: '' };
      authService.login.mockReturnValue(of({ success: true, user: userWithNoName }));
      profileService.getProfile.mockResolvedValue(null);
      component.loginForm.patchValue({ username: 'test@example.com', password: 'password123' });

      await component.onSubmit();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(profileService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test@example.com' })
      );
    });
  });
});

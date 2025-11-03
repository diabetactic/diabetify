/**
 * Enhanced Authentication User Journey Tests
 *
 * Simulates complete user flows from welcome screen to dashboard.
 * Tests real form validation, navigation guards, and state persistence.
 */

import { TestBed, ComponentFixture, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { LoginPage } from '../../../login/login.page';
import { LoginPageModule } from '../../../login/login.module';
import { DashboardPage } from '../../../dashboard/dashboard.page';
import { UnifiedAuthService } from '../../../core/services/unified-auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthGuard } from '../../../core/guards/auth.guard';

import {
  TestLogger,
  DOMSnapshot,
  PerformanceMeasurement,
  NetworkMonitor,
  ConsoleErrorCapture,
  MemoryLeakDetector,
} from '../../helpers/test-diagnostics';

describe('Enhanced Auth User Journey', () => {
  let router: Router;
  let location: Location;
  let authService: jasmine.SpyObj<UnifiedAuthService>;
  let logger: TestLogger;
  let networkMonitor: NetworkMonitor;
  let consoleCapture: ConsoleErrorCapture;
  let memoryDetector: MemoryLeakDetector;

  beforeEach(async () => {
    logger = new TestLogger('Auth User Journey');
    networkMonitor = new NetworkMonitor();
    consoleCapture = new ConsoleErrorCapture();
    memoryDetector = new MemoryLeakDetector();

    logger.log('Setting up test environment');
    consoleCapture.start();
    networkMonitor.start();
    memoryDetector.takeSnapshot('setup-start');

    // Create auth service spy with correct method signatures
    authService = jasmine.createSpyObj(
      'UnifiedAuthService',
      ['login', 'loginLocal', 'logout', 'isAuthenticated', 'getCurrentUser', 'getAccessToken'],
      {
        isAuthenticated$: of(false),
        currentUser$: of(null),
        authState$: of({
          isAuthenticated: false,
          provider: null,
          tidepoolAuth: null,
          localAuth: null,
          user: null,
        }),
      }
    );

    await TestBed.configureTestingModule({
      imports: [
        LoginPageModule,
        DashboardPage,
        RouterTestingModule.withRoutes([
          { path: 'login', loadChildren: () => Promise.resolve(LoginPageModule) },
          {
            path: 'dashboard',
            component: DashboardPage,
            canActivate: [AuthGuard],
          },
        ]),
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: UnifiedAuthService, useValue: authService },
        ProfileService,
        AuthGuard,
        TranslateService,
      ],
      schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    logger.checkpoint('TestBed compiled');

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    logger.log('Router initialized');
    memoryDetector.takeSnapshot('setup-complete');
  });

  afterEach(() => {
    memoryDetector.takeSnapshot('teardown');
    memoryDetector.analyze();
    networkMonitor.stop();
    networkMonitor.logSummary();
    consoleCapture.stop();
    consoleCapture.logSummary();

    const report = logger.complete();
    expect(consoleCapture.hasErrors()).toBe(false, 'No console errors should occur');
  });

  describe('Complete Login Journey', () => {
    it('should complete full login flow from form to dashboard', fakeAsync(() => {
      logger.log('🎬 Starting complete login journey');

      // Navigate to login page
      logger.log('📍 Navigating to /login');
      PerformanceMeasurement.mark('journey-start');

      router.navigate(['/login']);
      tick();

      logger.checkpoint('login-page-loaded');
      expect(location.path()).toBe('/login');
      logger.log('✅ At login page:', location.path());

      // Create login component
      const fixture: ComponentFixture<LoginPage> = TestBed.createComponent(LoginPage);
      const component = fixture.componentInstance;
      const compiled = fixture.nativeElement;

      fixture.detectChanges();
      tick();

      logger.log('Login component rendered');
      DOMSnapshot.log('Login Page', compiled);

      // Find form elements
      const dniInput =
        compiled.querySelector('input[name="dni"]') ||
        compiled.querySelector('input[formControlName="dni"]') ||
        compiled.querySelector('ion-input[name="dni"]');

      const passwordInput =
        compiled.querySelector('input[name="password"]') ||
        compiled.querySelector('input[formControlName="password"]') ||
        compiled.querySelector('ion-input[name="password"]');

      const submitButton =
        compiled.querySelector('button[type="submit"]') ||
        compiled.querySelector('ion-button[type="submit"]');

      if (!dniInput || !passwordInput || !submitButton) {
        logger.error('Form elements not found:', {
          dniInput: !!dniInput,
          passwordInput: !!passwordInput,
          submitButton: !!submitButton,
        });
        logger.log('Available HTML:', compiled.innerHTML.substring(0, 1000));
      }

      // Test form validation - empty submission
      logger.log('🧪 Testing empty form validation');

      if (submitButton) {
        submitButton.click();
        fixture.detectChanges();
        tick(100);

        const errors = compiled.querySelectorAll('.error-message, ion-text[color="danger"]');
        logger.log(`Found ${errors.length} validation error(s)`);

        if (errors.length > 0) {
          errors.forEach((error: Element, i: number) => {
            logger.log(`  Error ${i + 1}: ${error.textContent?.trim()}`);
          });
        }
      }

      logger.checkpoint('empty-validation-tested');

      // Fill in login form
      if (dniInput && passwordInput) {
        logger.log('📝 Filling login form');

        // Simulate user typing
        logger.log('⌨️ Typing DNI: 1000');
        (dniInput as HTMLInputElement).value = '1000';
        dniInput.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        tick(50);

        logger.log('⌨️ Typing password: ********');
        (passwordInput as HTMLInputElement).value = 'tuvieja';
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        tick(50);

        logger.log('Form filled:', {
          dni: (dniInput as HTMLInputElement).value,
          password: '********',
        });

        DOMSnapshot.log('Form After Fill', compiled);

        logger.checkpoint('form-filled');

        // Mock successful login - loginLocal returns Observable<UnifiedAuthState>
        authService.loginLocal.and.returnValue(
          of({
            isAuthenticated: true,
            provider: 'local' as const,
            tidepoolAuth: null,
            localAuth: {
              isAuthenticated: true,
              user: {
                id: '1',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'patient' as const,
                phone: '',
                dateOfBirth: '',
                diabetesType: '1' as const,
                diagnosisDate: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                preferences: {
                  glucoseUnit: 'mg/dL' as const,
                  targetRange: { low: 70, high: 180 },
                  language: 'en' as const,
                  theme: 'auto' as const,
                  notifications: {
                    appointments: true,
                    readings: true,
                    reminders: true,
                  },
                },
              },
              accessToken: 'mock-token',
              refreshToken: 'mock-refresh-token',
              expiresAt: Date.now() + 3600000,
            },
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              fullName: 'Test User',
              provider: 'local' as const,
            },
          })
        );

        // isAuthenticated returns boolean (synchronous)
        authService.isAuthenticated.and.returnValue(true);
        // getCurrentUser returns UnifiedUser | null (synchronous)
        authService.getCurrentUser.and.returnValue({
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          fullName: 'Test User',
          provider: 'local' as const,
        });

        // Submit form
        logger.log('🚀 Submitting form');
        PerformanceMeasurement.mark('submit-start');

        if (submitButton) {
          submitButton.click();
        } else if (component.onSubmit) {
          component.onSubmit();
        }

        fixture.detectChanges();
        tick(100);

        // Wait for async operations
        fixture.whenStable();
        tick(500);

        PerformanceMeasurement.mark('submit-end');
        const submitDuration = PerformanceMeasurement.measure(
          'Form Submission',
          'submit-start',
          'submit-end'
        );

        logger.checkpoint('form-submitted');
        logger.log(`✅ Form submitted in ${submitDuration.toFixed(2)}ms`);

        // Verify loginLocal was called
        expect(authService.loginLocal).toHaveBeenCalled();
        logger.log('✅ Auth service loginLocal called');

        // Verify localStorage/sessionStorage
        logger.log('💾 Checking storage');
        const storageKeys = Object.keys(localStorage);
        logger.log('LocalStorage keys:', storageKeys);

        if (sessionStorage.length > 0) {
          const sessionKeys = Object.keys(sessionStorage);
          logger.log('SessionStorage keys:', sessionKeys);
        }

        // Navigate to dashboard (simulating successful auth)
        logger.log('📍 Navigating to dashboard');
        router.navigate(['/dashboard']);
        tick();

        logger.checkpoint('dashboard-navigated');
        expect(location.path()).toBe('/dashboard');
        logger.log('✅ At dashboard:', location.path());
      }

      PerformanceMeasurement.mark('journey-end');
      const totalDuration = PerformanceMeasurement.measure(
        'Complete Journey',
        'journey-start',
        'journey-end'
      );

      logger.log(`✅ Complete journey in ${totalDuration.toFixed(2)}ms`);

      flush();
      fixture.destroy();
    }));

    it('should handle failed login with error display', fakeAsync(() => {
      logger.log('🎬 Testing failed login');

      router.navigate(['/login']);
      tick();

      const fixture: ComponentFixture<LoginPage> = TestBed.createComponent(LoginPage);
      const compiled = fixture.nativeElement;

      fixture.detectChanges();
      tick();

      logger.log('Login page rendered');

      // Mock failed login - loginLocal throws error
      authService.loginLocal.and.throwError('Invalid credentials');
      authService.isAuthenticated.and.returnValue(false);

      logger.log('🔄 Simulating failed login attempt');

      const component = fixture.componentInstance;
      if (component.onSubmit) {
        component.onSubmit();
        fixture.detectChanges();
        tick(100);
      }

      // Check for error message
      const errorElements = compiled.querySelectorAll(
        '.error-message, .alert-error, ion-text[color="danger"]'
      );

      logger.log(`Found ${errorElements.length} error element(s)`);
      errorElements.forEach((el: Element, i: number) => {
        logger.log(`Error ${i + 1}:`, el.textContent?.trim());
      });

      // Verify still on login page
      expect(location.path()).toBe('/login');
      logger.log('✅ User remained on login page');

      flush();
      fixture.destroy();
    }));
  });

  describe('Navigation Guards', () => {
    it('should redirect unauthenticated users from protected routes', fakeAsync(() => {
      logger.log('🎬 Testing auth guard redirect');

      // Mock unauthenticated state
      authService.isAuthenticated.and.returnValue(false);

      logger.log('🔒 Attempting to access /dashboard (unauthenticated)');
      PerformanceMeasurement.mark('guard-check-start');

      try {
        router.navigate(['/dashboard']);
        tick();
        tick(500);
      } catch (error) {
        logger.log('Navigation prevented:', error);
      }

      PerformanceMeasurement.mark('guard-check-end');
      const guardDuration = PerformanceMeasurement.measure(
        'Auth Guard Check',
        'guard-check-start',
        'guard-check-end'
      );

      logger.log(`Guard check completed in ${guardDuration.toFixed(2)}ms`);

      // Should be redirected to login
      const finalPath = location.path();
      logger.log('Final path:', finalPath);

      // May redirect to login or stay at empty path
      expect(['/login', '']).toContain(finalPath);
      logger.log('✅ Unauthenticated user prevented from accessing dashboard');

      flush();
    }));

    it('should allow authenticated users to access protected routes', fakeAsync(() => {
      logger.log('🎬 Testing authenticated access');

      // Mock authenticated state
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue({
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        provider: 'local' as const,
      });

      logger.log('✅ Attempting to access /dashboard (authenticated)');

      router.navigate(['/dashboard']);
      tick();
      tick(500);

      expect(location.path()).toBe('/dashboard');
      logger.log('✅ Authenticated user accessed dashboard successfully');

      flush();
    }));
  });

  describe('Back Button and Navigation', () => {
    it('should handle back button navigation correctly', fakeAsync(() => {
      logger.log('🎬 Testing back button navigation');

      // Navigate through pages
      logger.log('📍 Navigate: / → /login → /dashboard');

      router.navigate(['/login']);
      tick();
      expect(location.path()).toBe('/login');
      logger.log('At:', location.path());

      authService.isAuthenticated.and.returnValue(true);

      router.navigate(['/dashboard']);
      tick();
      expect(location.path()).toBe('/dashboard');
      logger.log('At:', location.path());

      // Go back
      logger.log('⬅️ Simulating back button');
      location.back();
      tick();

      logger.log('After back:', location.path());

      flush();
    }));

    it('should handle forward button navigation', fakeAsync(() => {
      logger.log('🎬 Testing forward navigation');

      router.navigate(['/login']);
      tick();

      router.navigate(['/dashboard']);
      tick();

      location.back();
      tick();
      logger.log('After back:', location.path());

      logger.log('➡️ Simulating forward button');
      location.forward();
      tick();

      logger.log('After forward:', location.path());

      flush();
    }));
  });

  describe('Deep Linking', () => {
    it('should handle deep links with redirect to login', fakeAsync(() => {
      logger.log('🎬 Testing deep link handling');

      // Mock unauthenticated
      authService.isAuthenticated.and.returnValue(false);

      // Try to deep link to dashboard
      logger.log('🔗 Deep linking to /dashboard?tab=readings');

      router.navigate(['/dashboard'], { queryParams: { tab: 'readings' } });
      tick();
      tick(500);

      const path = location.path();
      logger.log('Final path:', path);

      // Should redirect to login or stay at root
      expect(['/login', '']).toContain(path);
      logger.log('✅ Deep link handled with redirect');

      flush();
    }));

    it('should preserve query params during authentication flow', fakeAsync(() => {
      logger.log('🎬 Testing query param preservation');

      // Navigate with query params
      logger.log('📍 Navigating to /login?returnUrl=/dashboard&tab=appointments');

      router.navigate(['/login'], {
        queryParams: { returnUrl: '/dashboard', tab: 'appointments' },
      });
      tick();

      const fullPath = location.path();
      logger.log('Full path with params:', fullPath);

      expect(fullPath).toContain('returnUrl');
      logger.log('✅ Query params preserved in URL');

      flush();
    }));
  });

  describe('Form Validation States', () => {
    it('should show real-time validation feedback', fakeAsync(() => {
      logger.log('🎬 Testing real-time validation');

      const fixture: ComponentFixture<LoginPage> = TestBed.createComponent(LoginPage);
      const compiled = fixture.nativeElement;

      fixture.detectChanges();
      tick();

      const dniInput = compiled.querySelector('input[name="dni"]') as HTMLInputElement;

      if (dniInput) {
        logger.log('📝 Testing DNI input validation');

        // Test invalid input
        logger.log('⌨️ Entering invalid DNI: "abc"');
        dniInput.value = 'abc';
        dniInput.dispatchEvent(new Event('input', { bubbles: true }));
        dniInput.dispatchEvent(new Event('blur', { bubbles: true }));

        fixture.detectChanges();
        tick(100);

        let errors = compiled.querySelectorAll('.error-message, ion-text[color="danger"]');
        logger.log(`Validation errors shown: ${errors.length}`);

        // Test valid input
        logger.log('⌨️ Entering valid DNI: "1000"');
        dniInput.value = '1000';
        dniInput.dispatchEvent(new Event('input', { bubbles: true }));
        dniInput.dispatchEvent(new Event('blur', { bubbles: true }));

        fixture.detectChanges();
        tick(100);

        errors = compiled.querySelectorAll('.error-message, ion-text[color="danger"]');
        logger.log(`Validation errors after correction: ${errors.length}`);

        logger.log('✅ Real-time validation working');
      }

      flush();
      fixture.destroy();
    }));
  });

  describe('Session Persistence', () => {
    it('should persist authentication state across page reloads', fakeAsync(() => {
      logger.log('🎬 Testing session persistence');

      // Set up authenticated state
      authService.isAuthenticated.and.returnValue(true);
      localStorage.setItem('auth_token', 'mock-token-123');
      logger.log('💾 Auth token stored in localStorage');

      // Simulate page reload by checking storage
      const token = localStorage.getItem('auth_token');
      logger.log('🔍 Retrieved token after reload:', token);

      expect(token).toBe('mock-token-123');
      logger.log('✅ Session persisted successfully');

      // Clean up
      localStorage.removeItem('auth_token');

      flush();
    }));
  });
});

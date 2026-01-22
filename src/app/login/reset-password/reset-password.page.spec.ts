// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { ResetPasswordPage } from './reset-password.page';
import { LocalAuthService } from '@core/services/local-auth.service';
import { LoggerService } from '@core/services/logger.service';

describe('ResetPasswordPage', () => {
  let component: ResetPasswordPage;
  let fixture: ComponentFixture<ResetPasswordPage>;
  let authService: any;
  let router: any;
  let loadingCtrl: any;
  let toastCtrl: any;
  let logger: any;
  let mockLoading: any;
  let mockToast: any;
  let activatedRoute: any;

  beforeEach(async () => {
    mockLoading = {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    mockToast = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    authService = {
      resetPassword: vi.fn().mockReturnValue(of({ message: 'Password reset successfully' })),
    };

    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    loadingCtrl = {
      create: vi.fn().mockResolvedValue(mockLoading),
    };

    toastCtrl = {
      create: vi.fn().mockResolvedValue(mockToast),
    };

    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    activatedRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue('valid-token-123'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage, ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: LocalAuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoggerService, useValue: logger },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract token from query params on init', () => {
    expect(component.token).toBe('valid-token-123');
  });

  it('should warn when no token is provided', async () => {
    activatedRoute.snapshot.queryParamMap.get.mockReturnValue(null);

    const newFixture = TestBed.createComponent(ResetPasswordPage);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.token).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('ResetPassword', 'No token provided');
  });

  describe('form validation', () => {
    it('should have invalid form when empty', () => {
      expect(component.resetForm.valid).toBe(false);
    });

    it('should validate password is required', () => {
      const passwordControl = component.resetForm.get('password');
      passwordControl?.markAsTouched();
      expect(passwordControl?.errors?.['required']).toBeTruthy();
    });

    it('should validate password minimum length', () => {
      const passwordControl = component.resetForm.get('password');
      passwordControl?.setValue('12345');
      passwordControl?.markAsTouched();
      expect(passwordControl?.errors?.['minlength']).toBeTruthy();
    });

    it('should validate passwords match', () => {
      component.resetForm.get('password')?.setValue('password123');
      component.resetForm.get('confirmPassword')?.setValue('different');
      component.resetForm.get('confirmPassword')?.markAsTouched();
      expect(component.resetForm.errors?.['mismatch']).toBeTruthy();
    });

    it('should be valid with matching passwords', () => {
      component.resetForm.get('password')?.setValue('password123');
      component.resetForm.get('confirmPassword')?.setValue('password123');
      expect(component.resetForm.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not submit if form is invalid', async () => {
      await component.onSubmit();
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });

    it('should not submit if no token', async () => {
      component.token = null;
      component.resetForm.get('password')?.setValue('newPassword123');
      component.resetForm.get('confirmPassword')?.setValue('newPassword123');
      await component.onSubmit();
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });

    it('should call authService.resetPassword with token and password', async () => {
      component.resetForm.get('password')?.setValue('newPassword123');
      component.resetForm.get('confirmPassword')?.setValue('newPassword123');
      await component.onSubmit();
      await fixture.whenStable();
      expect(authService.resetPassword).toHaveBeenCalledWith('valid-token-123', 'newPassword123');
    });

    it('should navigate to login on success', async () => {
      component.resetForm.get('password')?.setValue('newPassword123');
      component.resetForm.get('confirmPassword')?.setValue('newPassword123');
      await component.onSubmit();
      await fixture.whenStable();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should show error toast on expired token', async () => {
      authService.resetPassword.mockReturnValue(
        throwError(() => new Error('Recovery token has expired'))
      );
      component.resetForm.get('password')?.setValue('newPassword123');
      component.resetForm.get('confirmPassword')?.setValue('newPassword123');
      await component.onSubmit();
      await fixture.whenStable();
      expect(toastCtrl.create).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should show error toast on invalid token', async () => {
      authService.resetPassword.mockReturnValue(
        throwError(() => new Error('Invalid recovery token'))
      );
      component.resetForm.get('password')?.setValue('newPassword123');
      component.resetForm.get('confirmPassword')?.setValue('newPassword123');
      await component.onSubmit();
      await fixture.whenStable();
      expect(toastCtrl.create).toHaveBeenCalled();
    });
  });

  describe('password visibility toggles', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });

    it('should toggle confirm password visibility', () => {
      expect(component.showConfirmPassword).toBe(false);
      component.toggleConfirmPasswordVisibility();
      expect(component.showConfirmPassword).toBe(true);
    });
  });

  describe('error getters', () => {
    it('should return password required error', () => {
      const control = component.resetForm.get('password');
      control?.markAsTouched();
      expect(component.passwordError).toBeTruthy();
    });

    it('should return password minlength error', () => {
      const control = component.resetForm.get('password');
      control?.setValue('12345');
      control?.markAsTouched();
      expect(component.passwordError).toBeTruthy();
    });

    it('should return empty for valid password', () => {
      const control = component.resetForm.get('password');
      control?.setValue('validPassword123');
      control?.markAsTouched();
      expect(component.passwordError).toBe('');
    });

    it('should return confirm password mismatch error', () => {
      component.resetForm.get('password')?.setValue('password123');
      component.resetForm.get('confirmPassword')?.setValue('different');
      component.resetForm.get('confirmPassword')?.markAsTouched();
      expect(component.confirmPasswordError).toBeTruthy();
    });
  });
});

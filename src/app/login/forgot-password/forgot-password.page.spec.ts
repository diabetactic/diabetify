// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { ForgotPasswordPage } from './forgot-password.page';
import { LocalAuthService } from '@core/services/local-auth.service';
import { LoggerService } from '@core/services/logger.service';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let authService: any;
  let loadingCtrl: any;
  let logger: any;
  let mockLoading: any;

  beforeEach(async () => {
    mockLoading = {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    authService = {
      requestPasswordReset: vi
        .fn()
        .mockReturnValue(of({ message: 'Mail should be received anytime' })),
    };

    loadingCtrl = {
      create: vi.fn().mockResolvedValue(mockLoading),
    };

    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const activatedRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage, ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: LocalAuthService, useValue: authService },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: LoggerService, useValue: logger },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('should have invalid form when empty', () => {
      expect(component.forgotForm.valid).toBe(false);
    });

    it('should validate email is required', () => {
      const emailControl = component.forgotForm.get('email');
      emailControl?.markAsTouched();
      expect(emailControl?.errors?.['required']).toBeTruthy();
    });

    it('should validate email format', () => {
      const emailControl = component.forgotForm.get('email');
      emailControl?.setValue('invalid-email');
      emailControl?.markAsTouched();
      expect(emailControl?.errors?.['email']).toBeTruthy();
    });

    it('should be valid with proper email', () => {
      component.forgotForm.get('email')?.setValue('test@example.com');
      expect(component.forgotForm.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not submit if form is invalid', async () => {
      await component.onSubmit();
      expect(authService.requestPasswordReset).not.toHaveBeenCalled();
    });

    it('should call authService.requestPasswordReset with email', async () => {
      component.forgotForm.get('email')?.setValue('test@example.com');
      await component.onSubmit();
      await fixture.whenStable();
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('should set isSuccess to true on success', async () => {
      component.forgotForm.get('email')?.setValue('test@example.com');
      await component.onSubmit();
      await fixture.whenStable();
      expect(component.isSuccess).toBe(true);
    });

    it('should set isSuccess to true even on error (security)', async () => {
      authService.requestPasswordReset.mockReturnValue(throwError(() => new Error('Server error')));
      component.forgotForm.get('email')?.setValue('test@example.com');
      await component.onSubmit();
      await fixture.whenStable();
      expect(component.isSuccess).toBe(true);
    });

    it('should show loading indicator during request', async () => {
      component.forgotForm.get('email')?.setValue('test@example.com');
      const submitPromise = component.onSubmit();
      // isLoading is set synchronously at the start of onSubmit
      expect(component.isLoading).toBe(true);
      await submitPromise;
      await fixture.whenStable();
      expect(component.isLoading).toBe(false);
    });
  });

  describe('emailError getter', () => {
    it('should return required error message when touched and empty', () => {
      const emailControl = component.forgotForm.get('email');
      emailControl?.markAsTouched();
      expect(component.emailError).toBeTruthy();
    });

    it('should return invalid error message for bad email', () => {
      const emailControl = component.forgotForm.get('email');
      emailControl?.setValue('bad-email');
      emailControl?.markAsTouched();
      expect(component.emailError).toBeTruthy();
    });

    it('should return empty string for valid email', () => {
      const emailControl = component.forgotForm.get('email');
      emailControl?.setValue('valid@example.com');
      emailControl?.markAsTouched();
      expect(component.emailError).toBe('');
    });
  });
});

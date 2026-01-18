import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoadingController, ToastController } from '@ionic/angular';
import {
  IonContent,
  IonButton,
  IonCheckbox,
  IonFooter,
  IonToolbar,
  IonText,
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { LocalAuthService, LocalUser } from '@services/local-auth.service';
import { ProfileService } from '@services/profile.service';
import { LoggerService } from '@services/logger.service';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { AccountState, DEFAULT_USER_PREFERENCES } from '@models/user-profile.model';
import { ROUTES } from '@core/constants';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    IonContent,
    IonButton,
    IonCheckbox,
    IonFooter,
    IonToolbar,
    IonText,
    AppIconComponent,
  ],
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: LocalAuthService,
    private profileService: ProfileService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService // Inject LoggerService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]], // Can be DNI or email
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  ngOnInit() {
    this.logger.info('Init', 'LoginPage initialized');
    // Check if user is already logged in (single, deferred check to avoid double-activation)
    this.authService
      .isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth && !this.router.url.startsWith(ROUTES.TABS)) {
          this.logger.info('Auth', 'User already authenticated, navigating to dashboard.');
          setTimeout(() => {
            this.router.navigate([ROUTES.TABS_DASHBOARD], { replaceUrl: true });
          }, 0);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    // Prevent duplicate submissions if a login is already in progress
    if (this.isLoading) {
      this.logger.debug('Auth', 'onSubmit ignored (already loading)');
      return;
    }

    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

    if (!this.loginForm.valid) {
      this.markFormGroupTouched(this.loginForm);
      this.logger.warn('Auth', 'Login form invalid', this.loginForm.errors);
      return;
    }

    this.ngZone.run(() => {
      this.isLoading = true;
      this.loginForm.disable({ emitEvent: false });
      this.cdr.detectChanges();
    });
    this.logger.info('Auth', 'Form valid, starting authentication flow', {
      stage: 'ui-before-loading',
    });

    // NOTE: Do not await LoadingController.create()/present() here.
    // In some web builds this can hang indefinitely and block the entire login flow.
    const loadingPromise: Promise<{ dismiss: () => Promise<boolean> } | null> = this.loadingCtrl
      .create({
        message: this.translate.instant('login.messages.loggingIn'),
        spinner: 'crescent',
        cssClass: 'custom-loading',
      })
      .then(async loading => {
        const presentPromise = loading.present().catch(error => {
          this.logger.warn('Auth', 'Loading spinner failed to present', error);
        });
        await Promise.race([presentPromise, sleep(500)]);
        return loading;
      })
      .catch(error => {
        this.logger.warn('Auth', 'Loading spinner failed to create', error);
        return null;
      });

    const dismissLoading = async () => {
      try {
        const loading = await Promise.race([
          loadingPromise,
          sleep(1000).then(() => null),
        ]);
        if (!loading) return;
        await Promise.race([loading.dismiss(), sleep(1000)]);
      } catch (error) {
        this.logger.warn('Auth', 'Loading spinner failed to dismiss', error);
      }
    };

    // FAILSAFE: Dismiss loading after 15 seconds NO MATTER WHAT
    // This ensures the user is never stuck on a spinning screen forever
    const failsafeTimeout = setTimeout(async () => {
      this.logger.error('Auth', 'FAILSAFE: 15-second hard timeout triggered - dismissing loading');
      try {
        await dismissLoading();
        this.ngZone.run(() => {
          this.isLoading = false;
          this.loginForm.enable({ emitEvent: false });
          this.cdr.detectChanges();
        });
        void this.showErrorToast(this.translate.instant('errors.timeout'));
      } catch (e) {
        this.logger.error('Auth', 'FAILSAFE cleanup error', e);
      }
    }, 15000);

    const { username, password, rememberMe } = this.loginForm.value;

    try {
      // Add a 10-second timeout for the core login API call
      this.logger.debug('Auth', 'Creating loginPromise and timeoutPromise', {
        stage: 'before-promise-race',
      });
      const loginObservable = this.authService.login(username, password, rememberMe);
      const loginPromise = firstValueFrom(loginObservable);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          this.logger.warn('Auth', '10-second timeout triggered');
          reject(new Error('Login API call timed out'));
        }, 10000)
      );
      const result = await Promise.race([loginPromise, timeoutPromise]);
      this.logger.debug('Auth', 'Login Promise.race resolved', {
        stage: 'after-promise-race',
        success: result?.success ?? null,
      });

      if (result?.success) {
        this.logger.info('Auth', 'Login successful, starting post-login flow', {
          stage: 'login-success',
        });

        if (result.user) {
          try {
            this.logger.debug('Auth', 'Starting ensureOnboardingProfile', {
              stage: 'ensure-onboarding-start',
            });
            const onboardingPromise = this.ensureOnboardingProfile(result.user);
            const onboardingTimeout = new Promise<void>(resolve => setTimeout(resolve, 3000));
            await Promise.race([onboardingPromise, onboardingTimeout]);
            this.logger.debug('Auth', 'ensureOnboardingProfile completed', {
              stage: 'ensure-onboarding-complete',
            });
          } catch (e) {
            this.logger.error('Auth', 'ensureOnboardingProfile failed', e);
          }
        }

        this.logger.debug('Auth', 'Showing welcome toast', { stage: 'toast-before' });
        const toast = await this.toastCtrl.create({
          message: this.translate.instant('login.messages.welcomeBack'),
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        this.logger.info('Auth', 'Navigating to dashboard...', { stage: 'navigate-dashboard' });
        await this.router.navigate([ROUTES.TABS_DASHBOARD], { replaceUrl: true });
        this.logger.debug('Auth', 'Navigation complete', { stage: 'navigate-complete' });
      } else {
        throw new Error(result?.error || this.translate.instant('login.messages.genericError'));
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Login API call timed out')) {
        this.logger.error('Auth', 'Login Promise.race timeout triggered', {
          stage: 'timeout',
          message: error.message,
        });
      } else {
        this.logger.error('Auth', 'Error during login process', error);
      }

      this.logger.debug('Auth', 'Handling error in onSubmit', {
        stage: 'catch',
        isErrorInstance: error instanceof Error,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = this.translate.instant('login.messages.genericError');

      if (error instanceof Error) {
        if (error.message.includes('Login API call timed out')) {
          errorMessage = this.translate.instant('errors.timeout');
        } else {
          const httpError = error as { status?: number; message?: string };
          if (httpError.status === 401 || httpError.status === 403) {
            errorMessage = this.translate.instant('login.messages.invalidCredentials');
          } else if (httpError.status === 422) {
            errorMessage = this.translate.instant('login.messages.invalidData');
          } else if (httpError.status === 0) {
            errorMessage = this.translate.instant('login.messages.connectionError');
          } else if (httpError.message) {
            errorMessage = httpError.message;
          }
        }
      } else if (typeof error === 'object' && error !== null) {
        // Handle other non-Error objects if necessary
        errorMessage = JSON.stringify(error);
      }

      this.logger.debug('Auth', 'Resetting UI state due to error');
      this.ngZone.run(() => {
        this.isLoading = false;
        this.loginForm.enable({ emitEvent: false });
        this.loginForm.patchValue({ password: '' });
        this.cdr.detectChanges();
      });

      this.logger.debug('Auth', 'Showing error toast');
      await this.showErrorToast(errorMessage);
    } finally {
      // Cancel the failsafe timeout since we're handling the result normally
      clearTimeout(failsafeTimeout);
      await dismissLoading();

      // Always reset UI state if we remain on this page (Ionic may cache routes).
      this.ngZone.run(() => {
        this.isLoading = false;
        this.loginForm.enable({ emitEvent: false });
        this.cdr.detectChanges();
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper methods for template
  get usernameError(): string {
    const control = this.loginForm.get('username');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return this.translate.instant('login.validation.usernameRequired');
      }
    }
    return '';
  }

  get passwordError(): string {
    const control = this.loginForm.get('password');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return this.translate.instant('login.validation.passwordRequired');
      }
      if (control.errors['minlength']) {
        return this.translate.instant('login.validation.passwordMinLength');
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return Boolean(field?.invalid && (field?.dirty || field?.touched));
  }

  private async ensureOnboardingProfile(localUser: LocalUser): Promise<void> {
    const existingProfile = await this.profileService.getProfile();

    if (!existingProfile) {
      await this.profileService.createProfile({
        name: `${localUser.firstName} ${localUser.lastName}`.trim() || localUser.email,
        email: localUser.email,
        age: 12,
        accountState: AccountState.ACTIVE,
        preferences: DEFAULT_USER_PREFERENCES,
        hasCompletedOnboarding: true,
      });
      return;
    }

    // Always update email from backend in case it changed
    if (!existingProfile.hasCompletedOnboarding || existingProfile.email !== localUser.email) {
      await this.profileService.updateProfile({
        email: localUser.email,
        hasCompletedOnboarding: true,
      });
    }
  }

  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color: 'danger',
      position: 'top',
      buttons: [
        {
          icon: 'close',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }
}

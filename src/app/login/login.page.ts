import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import {
  IonContent,
  IonIcon,
  IonButton,
  IonCheckbox,
  IonFooter,
  IonToolbar,
  IonText,
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { LocalAuthService, LocalUser } from '../core/services/local-auth.service';
import { ProfileService } from '../core/services/profile.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';
import { AccountState, DEFAULT_USER_PREFERENCES } from '../core/models/user-profile.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    // Ionic standalone components
    IonContent,
    IonIcon,
    IonButton,
    IonCheckbox,
    IonFooter,
    IonToolbar,
    IonText,
    // App components
    AppIconComponent,
  ],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: LocalAuthService,
    private profileService: ProfileService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]], // Can be DNI or email
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  ngOnInit() {
    // Check if user is already logged in (single, deferred check to avoid double-activation)
    this.authService
      .isAuthenticated()
      .pipe(take(1))
      .subscribe(isAuth => {
        if (isAuth && !this.router.url.startsWith('/tabs')) {
          setTimeout(() => {
            this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
          }, 0);
        }
      });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    // Prevent duplicate submissions if a login is already in progress
    if (this.isLoading) {
      console.log('[LOGIN] onSubmit ignored (already loading)');
      return;
    }

    // SECURITY: Removed form value logging (contains password) - HIPAA/COPPA compliance

    if (!this.loginForm.valid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    // Use NgZone to ensure change detection fires on Android WebView
    this.ngZone.run(() => {
      this.isLoading = true;
      this.loginForm.disable({ emitEvent: false });
      this.cdr.detectChanges();
    });
    console.log('[LOGIN] Form valid, starting auth flow');

    // Show loading spinner
    const loading = await this.loadingCtrl.create({
      message: this.translate.instant('login.messages.loggingIn'),
      spinner: 'crescent',
      cssClass: 'custom-loading',
    });
    await loading.present();

    const { username, password, rememberMe } = this.loginForm.value;

    try {
      const result = await firstValueFrom(this.authService.login(username, password, rememberMe));

      if (result && result.success) {
        console.log('[LOGIN] Login successful, starting post-login flow');

        if (result.user) {
          // Best-effort onboarding profile; don't block login if it hangs
          try {
            console.log('[LOGIN] Starting ensureOnboardingProfile');
            const onboardingPromise = this.ensureOnboardingProfile(result.user);
            await Promise.race([
              onboardingPromise,
              new Promise<void>(resolve => setTimeout(resolve, 3000)),
            ]);
            console.log('[LOGIN] ensureOnboardingProfile completed');
          } catch (e) {
            console.error('[LOGIN] ensureOnboardingProfile failed', e);
          }
        }

        // Navigate to dashboard - try multiple approaches for Android
        console.log('[LOGIN] Navigating to dashboard...');
        try {
          await this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
          console.log('[LOGIN] Navigation complete');
        } catch (navError) {
          console.error('[LOGIN] Router navigate failed:', navError);
          // Fallback: direct location change
          window.location.href = '/tabs/dashboard';
        }

        // Dismiss loading after navigation starts (small delay to cover transition)
        setTimeout(() => loading.dismiss(), 500);
      } else {
        throw new Error(result?.error || this.translate.instant('login.messages.genericError'));
      }
    } catch (error: unknown) {
      await loading.dismiss();
      console.error('[LOGIN] Error during login', error);
      let errorMessage = this.translate.instant('login.messages.genericError');

      const httpError = error as { status?: number; message?: string };
      if (httpError.status === 401) {
        errorMessage = this.translate.instant('login.messages.invalidCredentials');
      } else if (httpError.status === 422) {
        errorMessage = this.translate.instant('login.messages.invalidData');
      } else if (httpError.status === 0) {
        errorMessage = this.translate.instant('login.messages.connectionError');
      } else if (httpError.message) {
        errorMessage = httpError.message;
      }

      // Reset loading state BEFORE showing alert (ensures UI updates)
      this.ngZone.run(() => {
        this.isLoading = false;
        this.loginForm.enable({ emitEvent: false });
        this.loginForm.patchValue({ password: '' });
        this.cdr.detectChanges();
      });

      // Show error alert - with timeout fallback for Android WebView issues
      console.log('[LOGIN] Creating error alert with message:', errorMessage);
      try {
        const alertPromise = this.alertCtrl.create({
          header: this.translate.instant('login.messages.loginError'),
          message: errorMessage,
          buttons: ['OK'],
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Alert create timeout')), 2000)
        );
        const alert = await Promise.race([alertPromise, timeoutPromise]);
        console.log('[LOGIN] Alert created, calling present()...');
        await alert.present();
        console.log('[LOGIN] Alert present() completed');
      } catch (alertError) {
        console.error('[LOGIN] Alert failed:', alertError);
        // Fallback: use native alert for Android WebView
        window.alert(errorMessage);
      }
    } finally {
      // Ensure loading state is reset even if alert fails
      if (this.isLoading) {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.loginForm.enable({ emitEvent: false });
          this.cdr.detectChanges();
        });
      }
    }
  }

  async forgotPassword() {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('login.forgotPasswordDialog.title'),
      message: this.translate.instant('login.forgotPasswordDialog.message'),
      buttons: ['OK'],
    });
    await alert.present();
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
    return !!(field?.invalid && (field?.dirty || field?.touched));
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
}

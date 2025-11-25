import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoadingController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { LocalAuthService, LocalUser } from '../core/services/local-auth.service';
import { ProfileService } from '../core/services/profile.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';
import { AccountState, DEFAULT_USER_PREFERENCES } from '../core/models/user-profile.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule,
    TranslateModule,
    AppIconComponent,
  ],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  statusMessage = '';
  statusLevel: 'info' | 'error' | 'success' = 'info';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: LocalAuthService,
    private profileService: ProfileService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]], // Can be DNI or email
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    this.loginForm.valueChanges.subscribe(value => {
      console.log('[LoginForm]', value?.username, value?.password, value?.rememberMe);
    });
  }

  ngOnInit() {
    // Check if user is already logged in
    this.authService.isAuthenticated().subscribe(isAuth => {
      if (isAuth) {
        this.router.navigate(['/tabs/dashboard']);
      }
    });

    // In non-production builds, prefill demo credentials to speed up testing
    if (!environment.production) {
      this.loginForm.patchValue({
        username: '1000',
        password: 'tuvieja',
        rememberMe: true,
      });
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    console.log('📱 [LOGIN PAGE] ========== LOGIN FORM SUBMITTED ==========');
    console.log('📱 [LOGIN PAGE] Form value:', this.loginForm.value);
    console.log('📱 [LOGIN PAGE] Form valid:', this.loginForm.valid);

    if (!this.loginForm.valid) {
      console.warn('⚠️ [LOGIN PAGE] Form is invalid');
      this.markFormGroupTouched(this.loginForm);
      this.statusLevel = 'error';
      this.statusMessage = 'Completa usuario y contraseña antes de continuar.';
      return;
    }

    console.log('📱 [LOGIN PAGE] Form is valid, proceeding with login');
    this.statusLevel = 'info';
    this.statusMessage = 'Enviando credenciales...';
    this.loginForm.disable({ emitEvent: false });

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'circular',
    });

    await loading.present();
    this.isLoading = true;

    const { username, password, rememberMe } = this.loginForm.value;
    console.log('📱 [LOGIN PAGE] Username:', username);
    console.log('📱 [LOGIN PAGE] Password length:', password?.length);
    console.log('📱 [LOGIN PAGE] Remember me:', rememberMe);
    console.log('📱 [LOGIN PAGE] Calling authService.login()...');

    try {
      // Call auth service with credentials (returns Observable)
      console.log('📱 [LOGIN PAGE] Waiting for auth service response...');
      const result = await firstValueFrom(this.authService.login(username, password, rememberMe));
      console.log('📱 [LOGIN PAGE] Auth service returned result:', result);

      if (result && result.success) {
        console.log('✅ [LOGIN PAGE] Login successful!');
        console.log('✅ [LOGIN PAGE] User data:', result.user);

        if (result.user) {
          console.log('✅ [LOGIN PAGE] Ensuring onboarding profile...');
          await this.ensureOnboardingProfile(result.user);
        }

        this.statusLevel = 'success';
        this.statusMessage = 'Sesión iniciada correctamente.';

        // Show success message
        console.log('✅ [LOGIN PAGE] Showing success toast...');
        const toast = await this.toastCtrl.create({
          message: '¡Bienvenido de nuevo!',
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        // Navigate to dashboard
        console.log('✅ [LOGIN PAGE] Navigating to /tabs/dashboard...');
        await this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
        console.log('✅ [LOGIN PAGE] Navigation completed');
      } else {
        console.error('❌ [LOGIN PAGE] Login failed - result.success is false');
        console.error('❌ [LOGIN PAGE] Error from result:', result?.error);
        this.statusLevel = 'error';
        this.statusMessage = result?.error || 'Error desconocido al iniciar sesión.';
        throw new Error(result?.error || 'Error al iniciar sesión');
      }
    } catch (error: any) {
      console.error('❌ [LOGIN PAGE] Exception caught in onSubmit');
      console.error('❌ [LOGIN PAGE] Error:', error);
      console.error('❌ [LOGIN PAGE] Error message:', error?.message);
      console.error('❌ [LOGIN PAGE] Error status:', error?.status);
      this.statusLevel = 'error';

      // Handle specific error codes
      let errorMessage = 'Error al iniciar sesión. Por favor, intenta de nuevo.';

      if (error.status === 401) {
        errorMessage = 'Credenciales incorrectas. Verifica tu DNI/email y contraseña.';
      } else if (error.status === 422) {
        errorMessage = 'Datos inválidos. Verifica el formato de tu DNI o email.';
      } else if (error.status === 0) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.statusMessage = errorMessage;
      const alert = await this.alertCtrl.create({
        header: 'Error de inicio de sesión',
        message: errorMessage,
        buttons: ['OK'],
      });
      await alert.present();

      // Clear password field on error
      this.loginForm.patchValue({ password: '' });
    } finally {
      await loading.dismiss();
      this.isLoading = false;
      this.loginForm.enable({ emitEvent: false });
      console.log('[LoginPage] final status', this.statusLevel, this.statusMessage);
    }
  }

  async forgotPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Recuperar Contraseña',
      message:
        'La función de recuperación de contraseña estará disponible próximamente. Por favor, contacta a soporte para asistencia.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  navigateToRegister() {
    // Navigate to register page
    this.router.navigate(['/register']);
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
        return 'DNI o email es requerido';
      }
    }
    return '';
  }

  get passwordError(): string {
    const control = this.loginForm.get('password');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return 'La contraseña es requerida';
      }
      if (control.errors['minlength']) {
        return 'La contraseña debe tener al menos 6 caracteres';
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
        age: 12,
        accountState: AccountState.ACTIVE,
        preferences: DEFAULT_USER_PREFERENCES,
        hasCompletedOnboarding: true,
      });
      return;
    }

    if (!existingProfile.hasCompletedOnboarding) {
      await this.profileService.updateProfile({
        hasCompletedOnboarding: true,
      });
    }
  }
}

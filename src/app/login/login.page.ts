import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoadingController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { LocalAuthService } from '../core/services/local-auth.service';
import { ProfileService } from '../core/services/profile.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

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
  ],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  showDemoHint = true;

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
  }

  ngOnInit() {
    // Check if user is already logged in
    this.authService.isAuthenticated().subscribe(isAuth => {
      if (isAuth) {
        this.router.navigate(['/tabs/dashboard']);
      }
    });

    // Pre-fill demo credentials if in demo mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
      this.fillDemoCredentials();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  fillDemoCredentials() {
    this.loginForm.patchValue({
      username: 'demo_patient',
      password: 'demo123',
      rememberMe: true,
    });
    this.showDemoHint = false;
  }

  async onSubmit() {
    if (!this.loginForm.valid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'circular',
    });

    await loading.present();
    this.isLoading = true;

    const { username, password, rememberMe } = this.loginForm.value;

    try {
      // Call auth service with credentials (returns Observable)
      const result = await firstValueFrom(this.authService.login(username, password, rememberMe));

      if (result && result.success) {
        // Fetch user profile after successful login
        await this.profileService.getProfile();

        // Show success message
        const toast = await this.toastCtrl.create({
          message: '¡Bienvenido de nuevo!',
          duration: 2000,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        // Navigate to dashboard
        await this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
      } else {
        throw new Error(result?.error || 'Error al iniciar sesión');
      }
    } catch (error: any) {
      console.error('Login error:', error);

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
    }
  }

  async useDemoMode() {
    const alert = await this.alertCtrl.create({
      header: 'Modo Demo',
      message:
        'Usar el modo demo te permitirá explorar la aplicación con datos de ejemplo. ¿Deseas continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Usar Modo Demo',
          handler: () => {
            this.fillDemoCredentials();
            this.onSubmit();
          },
        },
      ],
    });
    await alert.present();
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

  async showRegistrationNotAvailable() {
    const alert = await this.alertCtrl.create({
      header: 'Registro no disponible',
      message:
        'El registro de nuevos usuarios está temporalmente deshabilitado. Por favor, usa el modo demo o contacta a tu administrador.',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
        {
          text: 'Usar Modo Demo',
          handler: () => {
            this.fillDemoCredentials();
            this.onSubmit();
          },
        },
      ],
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
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import {
  IonContent,
  IonItem,
  IonIcon,
  IonInput,
  IonButton,
  IonCheckbox,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    // Ionic standalone components
    IonContent,
    IonItem,
    IonIcon,
    IonInput,
    IonButton,
    IonCheckbox,
    IonLabel,
    IonSpinner,
  ],
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        age: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
        acceptTerms: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit() {}

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    if (!this.registerForm.valid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Registro no disponible',
      message:
        'El registro de nuevos usuarios está temporalmente deshabilitado para esta demo. Por favor, usa las credenciales de demostración: usuario "demo_patient" y contraseña "demo123".',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
        {
          text: 'Ir a Login',
          handler: () => {
            this.router.navigate(['/login']);
          },
        },
      ],
    });
    await alert.present();
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
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
  get nameError(): string {
    const control = this.registerForm.get('name');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'El nombre es requerido';
      if (control.errors['minlength']) return 'El nombre debe tener al menos 2 caracteres';
    }
    return '';
  }

  get emailError(): string {
    const control = this.registerForm.get('email');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'El email es requerido';
      if (control.errors['email']) return 'Email inválido';
    }
    return '';
  }

  get passwordError(): string {
    const control = this.registerForm.get('password');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'La contraseña es requerida';
      if (control.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
    }
    return '';
  }

  get confirmPasswordError(): string {
    const control = this.registerForm.get('confirmPassword');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Debes confirmar la contraseña';
      if (control.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }

  get ageError(): string {
    const control = this.registerForm.get('age');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'La edad es requerida';
      if (control.errors['min'] || control.errors['max']) return 'Edad inválida';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }
}

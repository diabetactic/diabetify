import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import {
  IonContent,
  IonButton,
  IonToolbar,
  IonHeader,
  IonButtons,
  IonBackButton,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalAuthService } from '@services/local-auth.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoggerService } from '@services/logger.service';
import { createOverlaySafely } from '@core/utils/ionic-overlays';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
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
    IonToolbar,
    IonHeader,
    IonButtons,
    IonBackButton,
    AppIconComponent,
  ],
})
export class ResetPasswordPage implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: LocalAuthService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) {
    this.resetForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.logger.warn('ResetPassword', 'No token provided');
      // Use setTimeout to avoid expression changed after checked error if executed during change detection cycle
      setTimeout(() => {
        this.showErrorToast(this.translate.instant('resetPassword.errors.tokenInvalid'));
      });
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    if (this.resetForm.invalid || this.isLoading || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.resetForm.disable();
    this.cdr.detectChanges();

    const loading = await createOverlaySafely(() =>
      this.loadingCtrl.create({
        message: this.translate.instant('login.messages.loggingIn').replace('...', ''),
        spinner: 'crescent',
      })
    );
    await loading?.present();

    const { password } = this.resetForm.value;

    this.authService.resetPassword(this.token, password).subscribe({
      next: async () => {
        this.isLoading = false;
        loading?.dismiss();

        const toast = await createOverlaySafely(() =>
          this.toastCtrl.create({
            message: this.translate.instant('resetPassword.successMessage'),
            duration: 3000,
            color: 'success',
            position: 'top',
          })
        );
        await toast?.present();

        this.router.navigate(['/login']);
      },
      error: async error => {
        this.logger.error('ResetPassword', 'Error resetting password', error);
        this.isLoading = false;
        this.resetForm.enable();
        loading?.dismiss();
        this.cdr.detectChanges();

        let message = this.translate.instant('resetPassword.errors.resetFailed');
        if (error.message && error.message.toLowerCase().includes('expired')) {
          message = this.translate.instant('resetPassword.errors.tokenExpired');
        } else if (error.message && error.message.toLowerCase().includes('invalid')) {
          message = this.translate.instant('resetPassword.errors.tokenInvalid');
        }

        await this.showErrorToast(message);
      },
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      // Clear mismatch error if it was the only error
      if (confirmPassword?.hasError('mismatch')) {
        const errors = confirmPassword.errors;
        if (errors) {
          delete errors['mismatch'];
          confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
        }
      }
    }
    return null;
  }

  async showErrorToast(message: string) {
    const toast = await createOverlaySafely(() =>
      this.toastCtrl.create({
        message,
        duration: 3500,
        color: 'danger',
        position: 'top',
        buttons: [{ icon: 'close', role: 'cancel' }],
      })
    );
    await toast?.present();
  }

  get passwordError(): string {
    const control = this.resetForm.get('password');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return this.translate.instant('resetPassword.validation.passwordRequired');
      }
      if (control.errors['minlength']) {
        return this.translate.instant('resetPassword.validation.passwordMinLength');
      }
    }
    return '';
  }

  get confirmPasswordError(): string {
    const control = this.resetForm.get('confirmPassword');
    if (control?.touched) {
      if (control.errors?.['required']) {
        return this.translate.instant('resetPassword.validation.passwordRequired');
      }
      if (control.errors?.['mismatch']) {
        return this.translate.instant('resetPassword.validation.passwordsMustMatch');
      }
    }
    return '';
  }
}

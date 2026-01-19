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
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoadingController } from '@ionic/angular';
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
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
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
export class ForgotPasswordPage implements OnInit {
  forgotForm: FormGroup;
  isLoading = false;
  isSuccess = false;

  constructor(
    private fb: FormBuilder,
    private authService: LocalAuthService,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit() {
    this.logger.info('ForgotPassword', 'Initialized');
  }

  async onSubmit() {
    if (this.forgotForm.invalid || this.isLoading) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.forgotForm.disable();
    this.cdr.detectChanges();

    const loading = await createOverlaySafely(() =>
      this.loadingCtrl.create({
        message: this.translate.instant('login.messages.loggingIn').replace('...', ''), // Reuse or generic wait
        spinner: 'crescent',
      })
    );
    await loading?.present();

    const { email } = this.forgotForm.value;

    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.finishRequest(loading, true);
      },
      error: error => {
        this.logger.error('ForgotPassword', 'Error requesting reset', error);
        // Show success anyway for security (don't reveal email existence)
        this.finishRequest(loading, true);
      },
    });
  }

  private finishRequest(loading: HTMLIonLoadingElement | undefined | null, success: boolean) {
    this.isLoading = false;
    this.isSuccess = success;
    this.forgotForm.enable();
    loading?.dismiss();
    this.cdr.detectChanges();
  }

  get emailError(): string {
    const control = this.forgotForm.get('email');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return this.translate.instant('forgotPassword.validation.emailRequired');
      }
      if (control.errors['email']) {
        return this.translate.instant('forgotPassword.validation.emailInvalid');
      }
    }
    return '';
  }
}

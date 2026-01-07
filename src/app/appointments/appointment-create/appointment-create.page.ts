import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonCheckbox,
  IonTextarea,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';

import { AppointmentService } from '@services/appointment.service';
import { CreateAppointmentRequest, AppointmentQueueState } from '@models/appointment.model';

import { TranslationService } from '@services/translation.service';
import { LoggerService } from '@services/logger.service';
import { ROUTES } from '@core/constants';

@Component({
  selector: 'app-appointment-create',
  templateUrl: './appointment-create.page.html',
  styleUrls: ['./appointment-create.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonCheckbox,
    IonTextarea,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppointmentCreatePage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Clinical form data
  formData: CreateAppointmentRequest = {
    glucose_objective: 100,
    insulin_type: 'rapid',
    dose: 0,
    fast_insulin: '',
    fixed_dose: 0,
    ratio: 0,
    sensitivity: 0,
    pump_type: 'none',
    control_data: '',
    motive: [],
    other_motive: '',
    another_treatment: '',
  };

  // Dropdown options
  insulinTypes = [
    { value: 'rapid', label: 'appointments.create.insulin_rapid' },
    { value: 'slow', label: 'appointments.create.insulin_slow' },
    { value: 'mixed', label: 'appointments.create.insulin_mixed' },
  ];

  pumpTypes = [
    { value: 'none', label: 'appointments.create.pump_none' },
    { value: 'pump', label: 'appointments.create.pump_pump' },
    { value: 'pen', label: 'appointments.create.pump_pen' },
  ];

  // Backend expects: 'AJUSTE', 'HIPOGLUCEMIA', 'HIPERGLUCEMIA', 'CETOSIS', 'DUDAS', 'OTRO'
  motiveOptions = [
    { value: 'AJUSTE', label: 'appointments.create.motive_ajuste' },
    { value: 'HIPOGLUCEMIA', label: 'appointments.create.motive_hipoglucemia' },
    { value: 'HIPERGLUCEMIA', label: 'appointments.create.motive_hiperglucemia' },
    { value: 'CETOSIS', label: 'appointments.create.motive_cetosis' },
    { value: 'DUDAS', label: 'appointments.create.motive_dudas' },
    { value: 'OTRO', label: 'appointments.create.motive_otro' },
  ];

  // UI state
  isLoading = false;
  showOtherMotive = false;
  isSubmitting = false;

  // Queue guard state
  queueState: AppointmentQueueState | null = null;
  checkingQueueState = true;
  canSubmit = false;
  queueBlockMessage: string | null = null;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private appointmentService: AppointmentService,
    private translationService: TranslationService,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    this.checkQueueStateAndGuard();
  }

  /**
   * Check queue state and block if not ACCEPTED
   */
  private async checkQueueStateAndGuard(): Promise<void> {
    this.checkingQueueState = true;

    try {
      const response = await firstValueFrom(this.appointmentService.getQueueState());
      this.queueState = response.state;

      switch (response.state) {
        case 'ACCEPTED':
          // User can proceed
          this.canSubmit = true;
          this.queueBlockMessage = null;
          break;

        case 'NONE':
          // User hasn't requested yet
          this.canSubmit = false;
          this.queueBlockMessage = this.translationService.instant(
            'appointments.queue.messages.mustRequestFirst'
          );
          await this.showBlockAlert(this.queueBlockMessage);
          break;

        case 'PENDING':
          // User's request is still pending
          this.canSubmit = false;
          this.queueBlockMessage = this.translationService.instant(
            'appointments.queue.messages.waitingReview'
          );
          await this.showBlockAlert(this.queueBlockMessage);
          break;

        case 'DENIED':
          // User's request was denied
          this.canSubmit = false;
          this.queueBlockMessage = this.translationService.instant(
            'appointments.queue.messages.requestDenied'
          );
          await this.showBlockAlert(this.queueBlockMessage);
          break;

        case 'BLOCKED':
          // User is blocked from creating appointments
          this.canSubmit = false;
          this.queueBlockMessage = this.translationService.instant(
            'appointments.queue.messages.blocked'
          );
          await this.showBlockAlert(this.queueBlockMessage);
          break;

        default:
          // Unknown state - treat as blocked
          this.canSubmit = false;
          this.queueBlockMessage = 'Unable to verify appointment eligibility';
          break;
      }
    } catch (error) {
      this.logger.error('Appointments', 'Error checking queue state', error);
      // On error, allow submission (fallback to backend validation)
      this.canSubmit = true;
    } finally {
      this.checkingQueueState = false;
    }
  }

  /**
   * Show alert and redirect back
   */
  private async showBlockAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('appointments.queue.title'),
      message,
      buttons: [
        {
          text: 'OK',
          handler: () => {
            this.router.navigate([ROUTES.TABS_APPOINTMENTS]);
          },
        },
      ],
      backdropDismiss: false,
    });
    await alert.present();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle motive selection
   */
  onMotiveChange(motive: string, event: CustomEvent) {
    if (event.detail.checked) {
      this.formData.motive.push(motive);
      if (motive === 'OTRO') {
        this.showOtherMotive = true;
      }
    } else {
      const index = this.formData.motive.indexOf(motive);
      if (index > -1) {
        this.formData.motive.splice(index, 1);
      }
      if (motive === 'OTRO') {
        this.showOtherMotive = false;
        this.formData.other_motive = '';
      }
    }
  }

  /**
   * Check if a motive is selected
   */
  isMotiveSelected(motive: string): boolean {
    return this.formData.motive.includes(motive);
  }

  /**
   * Validate form
   */
  private validateForm(): boolean {
    // Required fields
    if (this.formData.glucose_objective <= 0) {
      this.showToast('Por favor, ingresa un objetivo de glucosa válido', 'warning');
      return false;
    }

    if (!this.formData.insulin_type) {
      this.showToast('Por favor, selecciona el tipo de insulina', 'warning');
      return false;
    }

    if (this.formData.dose <= 0) {
      this.showToast('Por favor, ingresa una dosis válida', 'warning');
      return false;
    }

    if (!this.formData.fast_insulin || this.formData.fast_insulin.trim() === '') {
      this.showToast('Por favor, ingresa la marca de insulina rápida', 'warning');
      return false;
    }

    if (this.formData.fixed_dose < 0) {
      this.showToast('Por favor, ingresa una dosis fija válida', 'warning');
      return false;
    }

    if (this.formData.ratio <= 0) {
      this.showToast('Por favor, ingresa un ratio válido', 'warning');
      return false;
    }

    if (this.formData.sensitivity <= 0) {
      this.showToast('Por favor, ingresa un factor de sensibilidad válido', 'warning');
      return false;
    }

    if (!this.formData.pump_type) {
      this.showToast('Por favor, selecciona el método de administración', 'warning');
      return false;
    }

    // Removed control_data validation as the field was removed

    if (this.formData.motive.length === 0) {
      this.showToast('Por favor, selecciona al menos un motivo de visita', 'warning');
      return false;
    }

    if (this.formData.motive.includes('OTRO') && !this.formData.other_motive) {
      this.showToast('Por favor, especifica el otro motivo', 'warning');
      return false;
    }

    return true;
  }

  /**
   * Submit appointment request
   */
  async submitAppointment() {
    // Prevent double-tap (debouncing)
    if (this.isSubmitting) {
      return;
    }

    // Check queue state first
    if (!this.canSubmit) {
      await this.showToast(
        this.queueBlockMessage ||
          this.translationService.instant('appointments.errors.notAccepted'),
        'warning'
      );
      return;
    }

    // Validate
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    // Show loading
    const loading = await this.loadingController.create({
      message: 'Creando cita...',
    });
    await loading.present();

    this.isLoading = true;

    try {
      // Create a timeout promise (15 seconds)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado')), 15000)
      );

      // Call backend API with race condition
      await Promise.race([
        firstValueFrom(this.appointmentService.createAppointment(this.formData)),
        timeoutPromise,
      ]);

      await loading.dismiss();
      await this.showToast('Cita creada exitosamente', 'success');

      // Navigate back to appointments list
      this.router.navigate([ROUTES.TABS_APPOINTMENTS]);
    } catch (error: unknown) {
      await loading.dismiss();
      this.logger.error('Appointments', 'Error creating appointment', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al crear la cita. Por favor, intenta de nuevo.';
      await this.showToast(errorMessage, 'danger');
    } finally {
      this.isLoading = false;
      this.isSubmitting = false;
    }
  }

  /**
   * Cancel and go back
   */
  async cancel() {
    const alert = await this.alertController.create({
      header: '¿Cancelar cita?',
      message: '¿Estás seguro de que deseas cancelar? Se perderán los datos ingresados.',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
        },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: () => {
            this.router.navigate([ROUTES.TABS_APPOINTMENTS]);
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // trackBy functions for ngFor optimization
  trackByInsulinType(_index: number, type: { value: string; label: string }): string {
    return type.value;
  }

  trackByPumpType(_index: number, type: { value: string; label: string }): string {
    return type.value;
  }

  trackByMotive(_index: number, motive: { value: string; label: string }): string {
    return motive.value;
  }
}

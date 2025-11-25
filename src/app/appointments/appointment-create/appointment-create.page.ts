import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AppointmentService } from '../../core/services/appointment.service';
import { CreateAppointmentRequest } from '../../core/models/appointment.model';
import { LocalAuthService } from '../../core/services/local-auth.service';

@Component({
  selector: 'app-appointment-create',
  templateUrl: './appointment-create.page.html',
  styleUrls: ['./appointment-create.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule],
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

  motiveOptions = [
    { value: 'control_routine', label: 'appointments.create.motive_control_routine' },
    { value: 'follow_up', label: 'appointments.create.motive_follow_up' },
    { value: 'emergency', label: 'appointments.create.motive_emergency' },
    { value: 'consultation', label: 'appointments.create.motive_consultation' },
    { value: 'other', label: 'appointments.create.motive_other' },
  ];

  // UI state
  isLoading = false;
  showOtherMotive = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private appointmentService: AppointmentService,
    private authService: LocalAuthService
  ) {}

  ngOnInit() {
    // Initialize form
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle motive selection
   */
  onMotiveChange(motive: string, event: any) {
    if (event.detail.checked) {
      this.formData.motive.push(motive);
      if (motive === 'other') {
        this.showOtherMotive = true;
      }
    } else {
      const index = this.formData.motive.indexOf(motive);
      if (index > -1) {
        this.formData.motive.splice(index, 1);
      }
      if (motive === 'other') {
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

    if (!this.formData.control_data || this.formData.control_data.trim() === '') {
      this.showToast('Por favor, ingresa la URL del PDF de control', 'warning');
      return false;
    }

    if (this.formData.motive.length === 0) {
      this.showToast('Por favor, selecciona al menos un motivo de visita', 'warning');
      return false;
    }

    if (this.formData.motive.includes('other') && !this.formData.other_motive) {
      this.showToast('Por favor, especifica el otro motivo', 'warning');
      return false;
    }

    return true;
  }

  /**
   * Submit appointment request
   */
  async submitAppointment() {
    // Validate
    if (!this.validateForm()) {
      return;
    }

    // Show loading
    const loading = await this.loadingController.create({
      message: 'Creando cita...',
    });
    await loading.present();

    this.isLoading = true;

    try {
      // Call backend API
      const appointment = await firstValueFrom(
        this.appointmentService.createAppointment(this.formData)
      );

      await loading.dismiss();
      await this.showToast('Cita creada exitosamente', 'success');

      // Navigate back to appointments list
      this.router.navigate(['/tabs/appointments']);
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error creating appointment:', error);
      await this.showToast(
        error.message || 'Error al crear la cita. Por favor, intenta de nuevo.',
        'danger'
      );
    } finally {
      this.isLoading = false;
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
            this.router.navigate(['/tabs/appointments']);
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
}

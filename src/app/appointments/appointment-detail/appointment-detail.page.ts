import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-appointment-detail',
  templateUrl: './appointment-detail.page.html',
  styleUrls: ['./appointment-detail.page.scss'],
  standalone: false,
})
export class AppointmentDetailPage implements OnInit {
  appointment: Appointment | null = null;
  loading = false;
  sharingData = false;
  shareSuccess = false;
  shareMessage = '';
  recordCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController,
    private translationService: TranslationService
  ) {}

  ngOnInit() {
    const appointmentId = this.route.snapshot.paramMap.get('id');
    if (appointmentId) {
      this.loadAppointment(appointmentId);
    } else {
      this.router.navigate(['/tabs/appointments']);
    }
  }

  /**
   * Load appointment details
   */
  async loadAppointment(id: string): Promise<void> {
    this.loading = true;
    try {
      this.appointment = (await this.appointmentService.getAppointment(id).toPromise()) ?? null;
    } catch (error: any) {
      console.error('Error loading appointment:', error);
      await this.showError(error?.message || 'Error al cargar la cita');
      this.router.navigate(['/tabs/appointments']);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Share last 30 days of glucose data
   */
  async shareGlucoseData(): Promise<void> {
    if (!this.appointment?.id) return;

    const alert = await this.alertController.create({
      header: 'Compartir datos de glucosa',
      message: '¿Desea compartir sus lecturas de glucosa de los últimos 30 días con su médico?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Compartir',
          handler: () => {
            this.performShareGlucoseData();
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Perform the actual data sharing
   */
  private async performShareGlucoseData(): Promise<void> {
    if (!this.appointment?.id) return;

    const loading = await this.loadingController.create({
      message: 'Compartiendo datos de glucosa...',
      spinner: 'circular',
    });

    await loading.present();
    this.sharingData = true;
    this.shareSuccess = false;

    try {
      // Use the manual-first sharing method with last 30 days
      const result = await this.appointmentService
        .shareManualGlucoseData(this.appointment.id, { days: 30 })
        .toPromise();

      if (result) {
        this.shareSuccess = true;
        this.recordCount = result.recordCount || 0;
        this.shareMessage = result.message || `${this.recordCount} lecturas compartidas exitosamente`;

        // Update appointment to mark data as shared
        if (this.appointment) {
          this.appointment.glucoseDataShared = true;
        }

        await this.showSuccessToast(this.shareMessage);
      }
    } catch (error: any) {
      console.error('Error sharing glucose data:', error);

      let errorMessage = 'Error al compartir los datos';
      if (error?.message?.includes('No hay lecturas')) {
        errorMessage = 'No hay lecturas de glucosa para compartir en los últimos 30 días';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      await this.showError(errorMessage);
    } finally {
      await loading.dismiss();
      this.sharingData = false;
    }
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(): Promise<void> {
    if (!this.appointment?.id) return;

    const alert = await this.alertController.create({
      header: 'Cancelar cita',
      message: '¿Está seguro de que desea cancelar esta cita?',
      inputs: [
        {
          name: 'reason',
          type: 'text',
          placeholder: 'Motivo de cancelación (opcional)',
        },
      ],
      buttons: [
        {
          text: 'No',
          role: 'cancel',
        },
        {
          text: 'Sí, cancelar',
          handler: async (data) => {
            await this.performCancelAppointment(data.reason);
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Perform appointment cancellation
   */
  private async performCancelAppointment(reason?: string): Promise<void> {
    if (!this.appointment?.id) return;

    const loading = await this.loadingController.create({
      message: 'Cancelando cita...',
      spinner: 'circular',
    });

    await loading.present();

    try {
      await this.appointmentService.cancelAppointment(this.appointment.id, reason).toPromise();
      await this.showSuccessToast('Cita cancelada exitosamente');
      this.router.navigate(['/tabs/appointments']);
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      await this.showError(error?.message || 'Error al cancelar la cita');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Navigate to reschedule appointment
   */
  rescheduleAppointment(): void {
    if (this.appointment?.id) {
      // TODO: Navigate to reschedule page
      this.showError('Función de reprogramación no disponible aún');
    }
  }

  /**
   * Join video call
   */
  async joinVideoCall(): Promise<void> {
    if (!this.appointment?.id) return;

    try {
      const result = await this.appointmentService.joinVideoCall(this.appointment.id).toPromise();
      if (result?.url) {
        // Open video call URL
        window.open(result.url, '_blank');
      }
    } catch (error: any) {
      await this.showError('La videollamada no está disponible aún');
    }
  }

  /**
   * Format date
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format time
   */
  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
      case 'no_show':
        return 'danger';
      case 'completed':
        return 'medium';
      case 'rescheduled':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  /**
   * Get urgency color
   */
  getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case 'emergency':
        return 'danger';
      case 'urgent':
        return 'warning';
      case 'routine':
      default:
        return 'primary';
    }
  }

  /**
   * Show success toast
   */
  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle',
    });
    await toast.present();
  }

  /**
   * Show error message
   */
  private async showError(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    this.router.navigate(['/tabs/appointments']);
  }

  /**
   * Get current date for template
   */
  getCurrentDate(): Date {
    return new Date();
  }
}
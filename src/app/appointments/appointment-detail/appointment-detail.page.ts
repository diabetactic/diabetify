import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
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
      this.appointment = (await firstValueFrom(this.appointmentService.getAppointment(id))) ?? null;
    } catch (error: any) {
      console.error('Error loading appointment:', error);
      await this.showError(
        error?.message || this.translationService.instant('appointments.errors.loadFailed')
      );
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
      header: this.translationService.instant('appointments.shareData.title'),
      message: this.translationService.instant('appointments.shareData.confirm'),
      buttons: [
        {
          text: this.translationService.instant('common.cancel'),
          role: 'cancel',
        },
        {
          text: this.translationService.instant('appointments.shareData.action'),
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
      message: this.translationService.instant('appointments.shareData.sharing'),
      spinner: 'circular',
    });

    await loading.present();
    this.sharingData = true;
    this.shareSuccess = false;

    try {
      // Use the manual-first sharing method with last 30 days
      const result = await firstValueFrom(
        this.appointmentService.shareManualGlucoseData(this.appointment.id, { days: 30 })
      );

      if (result) {
        this.shareSuccess = true;
        this.recordCount = result.recordCount || 0;
        this.shareMessage =
          result.message ||
          this.translationService.instant('appointments.shareData.successWithCount', {
            count: this.recordCount,
          });

        // Update appointment to mark data as shared
        if (this.appointment) {
          this.appointment.glucoseDataShared = true;
        }

        await this.showSuccessToast(this.shareMessage);
      }
    } catch (error: any) {
      console.error('Error sharing glucose data:', error);

      let errorMessage = this.translationService.instant('appointments.shareData.error');
      if (error?.message?.includes('No hay lecturas')) {
        errorMessage = this.translationService.instant('appointments.shareData.noReadings');
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
      header: this.translationService.instant('appointments.cancel.title'),
      message: this.translationService.instant('appointments.cancel.confirm'),
      inputs: [
        {
          name: 'reason',
          type: 'text',
          placeholder: this.translationService.instant('appointments.cancel.reasonPlaceholder'),
        },
      ],
      buttons: [
        {
          text: this.translationService.instant('common.no'),
          role: 'cancel',
        },
        {
          text: this.translationService.instant('appointments.cancel.action'),
          handler: async data => {
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
      message: this.translationService.instant('appointments.cancel.cancelling'),
      spinner: 'circular',
    });

    await loading.present();

    try {
      await firstValueFrom(this.appointmentService.cancelAppointment(this.appointment.id, reason));
      await this.showSuccessToast(this.translationService.instant('appointments.cancel.success'));
      this.router.navigate(['/tabs/appointments']);
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      await this.showError(
        error?.message || this.translationService.instant('appointments.cancel.error')
      );
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
      this.showError(this.translationService.instant('appointments.reschedule.unavailable'));
    }
  }

  /**
   * Join video call
   */
  async joinVideoCall(): Promise<void> {
    if (!this.appointment?.id) return;

    try {
      const result = await firstValueFrom(
        this.appointmentService.joinVideoCall(this.appointment.id)
      );
      if (result?.url) {
        // Open video call URL
        window.open(result.url, '_blank');
      }
    } catch (error: any) {
      await this.showError(this.translationService.instant('appointments.videoCall.unavailable'));
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

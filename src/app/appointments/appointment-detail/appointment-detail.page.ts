import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../core/services/appointment.service';
import { Appointment } from '../../core/models/appointment.model';
import { TranslationService } from '../../core/services/translation.service';
import { LoggerService } from '../../core/services/logger.service';

@Component({
  selector: 'app-appointment-detail',
  templateUrl: './appointment-detail.page.html',
  styleUrls: ['./appointment-detail.page.scss'],
  standalone: false,
})
export class AppointmentDetailPage implements OnInit {
  appointment: Appointment | null = null;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService,
    private alertController: AlertController,
    private translationService: TranslationService,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    const appointmentId = this.route.snapshot.paramMap.get('id');
    if (appointmentId) {
      this.loadAppointment(Number(appointmentId));
    } else {
      this.router.navigate(['/tabs/appointments']);
    }
  }

  /**
   * Load appointment details
   */
  async loadAppointment(id: number): Promise<void> {
    this.loading = true;
    try {
      this.appointment = await firstValueFrom(this.appointmentService.getAppointment(id));
      this.logger.info('UI', 'Appointment loaded', { appointmentId: id });
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
   * Format motive array to string
   */
  formatMotive(motive: string[]): string {
    if (!motive || motive.length === 0) return '-';
    return motive
      .map(m => this.translationService.instant(`appointments.motives.${m}`) || m)
      .join(', ');
  }

  /**
   * Format insulin type
   */
  formatInsulinType(type: string): string {
    return this.translationService.instant(`appointments.insulinTypes.${type}`) || type;
  }

  /**
   * Format pump type
   */
  formatPumpType(type: string): string {
    return this.translationService.instant(`appointments.pumpTypes.${type}`) || type;
  }

  /**
   * Show error message
   */
  private async showError(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('app.error'),
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
}

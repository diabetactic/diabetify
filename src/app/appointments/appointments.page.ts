import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { AppointmentService } from '../core/services/appointment.service';
import { Appointment } from '../core/models/appointment.model';
import { TranslationService } from '../core/services/translation.service';
import { LoggerService } from '../core/services/logger.service';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: false,
})
export class AppointmentsPage implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  loading = false;
  error: string | null = null;
  pastAppointmentsExpanded = false;

  /**
   * Get the current/upcoming appointment (first in list)
   */
  get currentAppointment(): Appointment | null {
    return this.appointments.length > 0 ? this.appointments[0] : null;
  }

  /**
   * Get past appointments (all except first)
   */
  get pastAppointments(): Appointment[] {
    return this.appointments.length > 1 ? this.appointments.slice(1) : [];
  }

  private destroy$ = new Subject<void>();

  constructor(
    private appointmentService: AppointmentService,
    private router: Router,
    private translationService: TranslationService,
    private logger: LoggerService
  ) {
    this.logger.info('Init', 'AppointmentsPage initialized');
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.subscribeToAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to appointments updates
   */
  private subscribeToAppointments(): void {
    this.appointmentService.appointments$.pipe(takeUntil(this.destroy$)).subscribe(appointments => {
      this.appointments = appointments;
    });
  }

  /**
   * Load appointments from the service
   */
  async loadAppointments(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      await firstValueFrom(this.appointmentService.getAppointments());
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      this.error =
        error?.message || this.translationService.instant('appointments.errors.loadListFailed');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Navigate to appointment detail
   */
  viewAppointment(appointment: Appointment): void {
    this.logger.info('UI', 'Appointment clicked', { appointmentId: appointment.appointment_id });
    this.router.navigate(['/tabs/appointments/appointment-detail', appointment.appointment_id]);
  }

  /**
   * Create a new appointment
   */
  createAppointment(): void {
    this.logger.info('UI', 'Create appointment button clicked');
    this.router.navigate(['/tabs/appointments/create']);
  }

  /**
   * Handle pull to refresh
   */
  async doRefresh(event: any): Promise<void> {
    this.logger.info('UI', 'Appointments refresh initiated');
    await this.loadAppointments();
    event.target.complete();
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
}

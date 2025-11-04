import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest, firstValueFrom } from 'rxjs';
import {
  AppointmentService,
  Appointment,
  AppointmentStatus,
} from '../core/services/appointment.service';
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
  upcomingAppointments: Appointment[] = [];
  pastAppointments: Appointment[] = [];
  loading = false;
  error: string | null = null;
  selectedSegment = 'upcoming';

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
      this.categorizeAppointments();
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
   * Categorize appointments into upcoming and past
   */
  private categorizeAppointments(): void {
    const now = new Date();

    this.upcomingAppointments = this.appointments
      .filter(apt => {
        const aptDate = new Date(`${apt.date} ${apt.startTime}`);
        return aptDate >= now && (apt.status === 'confirmed' || apt.status === 'pending');
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.startTime}`);
        const dateB = new Date(`${b.date} ${b.startTime}`);
        return dateA.getTime() - dateB.getTime();
      });

    this.pastAppointments = this.appointments
      .filter(apt => {
        const aptDate = new Date(`${apt.date} ${apt.startTime}`);
        return (
          aptDate < now ||
          apt.status === 'completed' ||
          apt.status === 'cancelled' ||
          apt.status === 'no_show'
        );
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.startTime}`);
        const dateB = new Date(`${b.date} ${b.startTime}`);
        return dateB.getTime() - dateA.getTime();
      });
  }

  /**
   * Handle segment change
   */
  onSegmentChange(event: any): void {
    this.selectedSegment = event.detail.value;
  }

  /**
   * Navigate to appointment detail
   */
  viewAppointment(appointment: Appointment): void {
    this.logger.info('UI', 'Appointment clicked', { appointmentId: appointment.id });
    if (appointment.id) {
      this.router.navigate(['/tabs/appointments/appointment-detail', appointment.id]);
    }
  }

  /**
   * Create a new appointment
   */
  createAppointment(): void {
    this.logger.info('UI', 'Create appointment button clicked');
    // TODO: Navigate to create appointment page
    this.router.navigate(['/tabs/appointments/new']);
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
   * Get status color
   */
  getStatusColor(status: AppointmentStatus): string {
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
   * Get status icon
   */
  getStatusIcon(status: AppointmentStatus): string {
    switch (status) {
      case 'confirmed':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'cancelled':
        return 'cancel';
      case 'completed':
        return 'task_alt';
      case 'no_show':
        return 'person_off';
      case 'rescheduled':
        return 'update';
      default:
        return 'event';
    }
  }

  /**
   * Format appointment date
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
   * Format appointment time
   */
  formatTime(time: string): string {
    return time.substring(0, 5); // Show HH:MM only
  }

  /**
   * Get urgency badge color
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
}

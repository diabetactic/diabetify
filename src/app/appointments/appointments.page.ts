import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { AppointmentService } from '../core/services/appointment.service';
import {
  Appointment,
  AppointmentQueueState,
  AppointmentQueueStateResponse,
} from '../core/models/appointment.model';
import { TranslationService } from '../core/services/translation.service';
import { LoggerService } from '../core/services/logger.service';
import { environment } from '../../environments/environment';

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

  // Queue state
  queueState: AppointmentQueueStateResponse | null = null;
  queueLoading = false;
  queueError: string | null = null;
  requestingAppointment = false;

  /**
   * Get the current/upcoming appointment (first in list)
   */
  get currentAppointment(): Appointment | null {
    if (this.appointments.length === 0) {
      return null;
    }

    const state = this.queueState?.state;
    // When there is no queue entry or it was denied, treat all appointments as "past"
    if (!state || state === 'NONE' || state === 'DENIED') {
      return null;
    }

    return this.appointments[0];
  }

  /**
   * Get past appointments (all except first)
   */
  get pastAppointments(): Appointment[] {
    if (this.appointments.length === 0) {
      return [];
    }

    const state = this.queueState?.state;
    const hasCurrent =
      !!state && state !== 'NONE' && state !== 'DENIED' && this.appointments.length > 0;

    if (hasCurrent) {
      return this.appointments.length > 1 ? this.appointments.slice(1) : [];
    }

    // No active appointment associated with the queue → all are considered "past"
    return this.appointments;
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
    if (environment.backendMode !== 'mock') {
      this.loadQueueState();
    } else {
      this.logger.info('Queue', 'Skipping queue state in mock mode');
    }
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
   * Mapping from backend motive values to translation keys
   * Backend may return Spanish/uppercase values, translation keys are English/lowercase
   */
  private readonly motiveMapping: Record<string, string> = {
    // Spanish uppercase (backend format from MotivesEnum)
    AJUSTE: 'adjustment',
    HIPOGLUCEMIA: 'hypoglycemia',
    HIPERGLUCEMIA: 'hyperglycemia',
    CETOSIS: 'ketosis',
    DUDAS: 'questions',
    OTRO: 'other',
    // Legacy Spanish mappings
    CONTROL: 'control_routine',
    CONTROL_RUTINA: 'control_routine',
    SEGUIMIENTO: 'follow_up',
    EMERGENCIA: 'emergency',
    CONSULTA: 'consultation',
    // English lowercase (already correct)
    adjustment: 'adjustment',
    control_routine: 'control_routine',
    follow_up: 'follow_up',
    emergency: 'emergency',
    consultation: 'consultation',
    hypoglycemia: 'hypoglycemia',
    hyperglycemia: 'hyperglycemia',
    ketosis: 'ketosis',
    questions: 'questions',
    other: 'other',
  };

  /**
   * Mapping from backend insulin type values to translation keys
   */
  private readonly insulinTypeMapping: Record<string, string> = {
    // Common backend values
    rapida: 'rapid',
    RAPIDA: 'rapid',
    lenta: 'long',
    LENTA: 'long',
    corta: 'short',
    CORTA: 'short',
    intermedia: 'intermediate',
    INTERMEDIA: 'intermediate',
    mixta: 'mixed',
    MIXTA: 'mixed',
    ninguna: 'none',
    NINGUNA: 'none',
    // English (already correct)
    rapid: 'rapid',
    short: 'short',
    intermediate: 'intermediate',
    long: 'long',
    mixed: 'mixed',
    none: 'none',
  };

  /**
   * Format motive array to string
   */
  formatMotive(motive: string[]): string {
    if (!motive || motive.length === 0) return '-';
    return motive
      .map(m => {
        // Try to map the backend value to a translation key
        const mappedKey =
          this.motiveMapping[m] || this.motiveMapping[m.toUpperCase()] || m.toLowerCase();
        const translated = this.translationService.instant(`appointments.motives.${mappedKey}`);
        // If translation returns the key itself, it wasn't found - return original
        return translated && !translated.startsWith('appointments.motives.') ? translated : m;
      })
      .join(', ');
  }

  /**
   * Format insulin type
   */
  formatInsulinType(type: string): string {
    if (!type || !this.isValidField(type)) return '-';
    // Try to map the backend value to a translation key
    const mappedKey =
      this.insulinTypeMapping[type] ||
      this.insulinTypeMapping[type.toUpperCase()] ||
      type.toLowerCase();
    const translated = this.translationService.instant(`appointments.insulinTypes.${mappedKey}`);
    // If translation returns the key itself, it wasn't found - return original
    return translated && !translated.startsWith('appointments.insulinTypes.') ? translated : type;
  }

  /**
   * Map queue state to badge styles and label
   */
  getQueueBadge(state: AppointmentQueueState | null | undefined): {
    classes: string[];
    icon: string;
    label: string;
  } {
    const normalized = state || 'NONE';
    switch (normalized) {
      case 'PENDING':
        return {
          classes: ['badge', 'badge-warning', 'gap-1', 'text-xs'],
          icon: 'loader-circle',
          label: this.translationService.instant('appointments.queue.labels.pending'),
        };
      case 'ACCEPTED':
        return {
          classes: ['badge', 'badge-success', 'gap-1', 'text-xs'],
          icon: 'check',
          label: this.translationService.instant('appointments.queue.labels.accepted'),
        };
      case 'DENIED':
        return {
          classes: ['badge', 'badge-error', 'gap-1', 'text-xs'],
          icon: 'x',
          label: this.translationService.instant('appointments.queue.labels.denied'),
        };
      case 'CREATED':
        return {
          classes: ['badge', 'badge-info', 'gap-1', 'text-xs'],
          icon: 'calendar-check',
          label: this.translationService.instant('appointments.queue.labels.created'),
        };
      case 'NONE':
      default:
        return {
          classes: ['badge', 'badge-ghost', 'gap-1', 'text-xs'],
          icon: 'minus',
          label: this.translationService.instant('appointments.queue.labels.none') || '—',
        };
    }
  }

  // ========== Queue Methods ==========

  /**
   * Load current queue state
   */
  async loadQueueState(): Promise<void> {
    if (environment.backendMode === 'mock') {
      this.queueState = { state: 'NONE' };
      return;
    }

    this.queueLoading = true;
    this.queueError = null;

    try {
      this.queueState = await firstValueFrom(this.appointmentService.getQueueState());
      this.logger.info('Queue', 'Queue state loaded', { state: this.queueState?.state });
    } catch (error: any) {
      // Don't show error for "not found" - this is normal when no queue state exists
      const errorMsg = error?.message?.toLowerCase() || '';
      const isNotFoundError =
        errorMsg.includes('not found') ||
        errorMsg.includes('no encontrada') ||
        errorMsg.includes('does not exist');

      if (!isNotFoundError) {
        console.error('Error loading queue state:', error);
        this.queueError = error?.message || 'Failed to load queue state';
      } else {
        // Treat "not found" as NONE state (no queue entry)
        this.queueState = { state: 'NONE' as AppointmentQueueState };
        this.logger.info('Queue', 'No queue state found, defaulting to NONE');
      }
    } finally {
      this.queueLoading = false;
      this.requestingAppointment = false; // Reset request flag after state is loaded
    }
  }

  /**
   * Request an appointment (submit to queue)
   */
  async onRequestAppointment(): Promise<void> {
    // Prevent multiple requests
    if (this.requestingAppointment || !this.canRequestAppointment) {
      return;
    }

    this.requestingAppointment = true;
    this.queueError = null;

    try {
      const response = await firstValueFrom(this.appointmentService.requestAppointment());
      this.logger.info('Queue', 'Appointment requested', { response });

      // Optimistically update queue state to prevent duplicate requests
      this.queueState = { state: 'PENDING' as AppointmentQueueState };

      // Show success message
      alert(this.translationService.instant('appointments.queue.messages.submitSuccess'));

      // Reload actual queue state from server (in background)
      this.loadQueueState();
    } catch (error: any) {
      console.error('Error requesting appointment:', error);
      this.queueError =
        error?.message ||
        this.translationService.instant('appointments.queue.messages.submitError');
      this.requestingAppointment = false;
    }
    // Note: Don't reset requestingAppointment on success - the optimistic state update handles it
  }

  /**
   * Get translated message for current queue state
   */
  getQueueStateMessage(): string {
    if (!this.queueState) return '';

    const state = this.queueState.state;
    return this.translationService.instant(`appointments.queue.states.${state}`) || state;
  }

  /**
   * Check if user can create appointment (queue state is ACCEPTED)
   */
  get canCreateAppointment(): boolean {
    return this.queueState?.state === 'ACCEPTED';
  }

  /**
   * Check if user can request appointment (no pending request)
   * User can request when no state exists, NONE, or DENIED
   * CREATED means they already have an appointment, so they cannot request again
   */
  get canRequestAppointment(): boolean {
    if (this.requestingAppointment) return false;
    return (
      !this.queueState || this.queueState.state === 'NONE' || this.queueState.state === 'DENIED'
    );
  }

  /**
   * Check if user has pending request
   */
  get hasPendingRequest(): boolean {
    return this.queueState?.state === 'PENDING';
  }

  /**
   * Check if user has created an appointment (finished the flow)
   */
  get hasCreatedAppointment(): boolean {
    return this.queueState?.state === 'CREATED';
  }

  /**
   * Check if a field value is valid (not empty, null, or garbage data like "string", "asd")
   */
  isValidField(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim().toLowerCase();
    // Common garbage/placeholder values to hide
    const invalidValues = [
      'string',
      'asd',
      'test',
      'null',
      'undefined',
      'n/a',
      '-',
      '',
      'xxx',
      'abc',
      '123',
      'asdf',
      'qwerty',
    ];
    return !invalidValues.includes(trimmed) && trimmed.length > 1;
  }
}

import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItemSliding,
  IonItemOption,
  IonItemOptions,
  IonItem,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom, interval } from 'rxjs';
import { AppointmentService } from '@services/appointment.service';
import {
  Appointment,
  AppointmentQueueState,
  AppointmentQueueStateResponse,
  AppointmentResolutionResponse,
} from '@models/appointment.model';
import { TranslationService } from '@services/translation.service';
import { LoggerService } from '@services/logger.service';
import { environment } from '@env/environment';
import { ROUTES, appointmentDetailRoute } from '@core/constants';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AppIconComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItemSliding,
    IonItemOption,
    IonItemOptions,
    IonItem,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  isSubmitting = false;

  // Polling for real-time queue updates
  private readonly POLLING_INTERVAL_MS = 15000; // Poll every 15 seconds
  private consecutivePollingFailures = 0;
  private readonly MAX_POLLING_FAILURES = 3; // Show warning after 3 consecutive failures
  private pollingErrorShown = false;

  // Resolution data cache
  resolutions: Map<number, AppointmentResolutionResponse> = new Map();
  resolutionsLoading = false;

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
      Boolean(state) && state !== 'NONE' && state !== 'DENIED' && this.appointments.length > 0;

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
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private toastController: ToastController
  ) {
    this.logger.info('Init', 'AppointmentsPage initialized');
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.subscribeToAppointments();
    if (environment.backendMode !== 'mock') {
      // Set loading guard before async load to prevent stale UI
      this.queueLoading = true;
      this.loadQueueState();
    } else {
      // Mock mode: set explicit NONE state immediately (no loading needed)
      this.queueState = { state: 'NONE' };
      this.logger.info('Queue', 'Mock mode: queue state set to NONE');
    }
  }

  ngOnDestroy(): void {
    // Only need destroy$ - polling uses takeUntil(destroy$) for automatic cleanup
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Track if polling is active (managed via destroy$, not manual subscription)
  private isPollingActive = false;

  /**
   * Start polling for queue state updates (when in PENDING or ACCEPTED state)
   * Uses takeUntil(destroy$) for automatic cleanup - no manual unsubscription needed
   */
  private startPolling(): void {
    // Only poll if not already polling and in a state that can change
    if (this.isPollingActive) return;

    const state = this.queueState?.state;
    if (state !== 'PENDING' && state !== 'ACCEPTED') return;

    this.logger.info('Queue', 'Starting polling for queue updates', {
      interval: this.POLLING_INTERVAL_MS,
    });

    this.isPollingActive = true;
    this.consecutivePollingFailures = 0;
    this.pollingErrorShown = false;

    interval(this.POLLING_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pollQueueState();
      });
  }

  /**
   * Stop polling indicator (actual subscription is managed by destroy$)
   */
  private stopPolling(): void {
    if (this.isPollingActive) {
      this.isPollingActive = false;
      this.logger.info('Queue', 'Stopped polling for queue updates');
    }
  }

  /**
   * Poll queue state silently (no loading indicator)
   */
  private async pollQueueState(): Promise<void> {
    if (environment.backendMode === 'mock') return;

    try {
      const previousState = this.queueState?.state;
      const newState = await firstValueFrom(this.appointmentService.getQueueState());

      // Reset failure counter on successful poll
      this.consecutivePollingFailures = 0;
      this.pollingErrorShown = false;

      // Check if state changed
      if (newState.state !== previousState) {
        this.logger.info('Queue', 'Queue state changed via polling', {
          from: previousState,
          to: newState.state,
        });

        this.queueState = newState;

        // Show toast notification for state change
        await this.notifyStateChange(previousState, newState.state);

        // If moved to ACCEPTED, fetch position (should be undefined now, but for completeness)
        // If moved to CREATED or DENIED, stop polling
        if (
          newState.state === 'CREATED' ||
          newState.state === 'DENIED' ||
          newState.state === 'NONE'
        ) {
          this.stopPolling();
        }

        this.cdr.markForCheck();
      } else if (newState.state === 'PENDING') {
        // Update position even if state didn't change
        try {
          const position = await firstValueFrom(this.appointmentService.getQueuePosition());
          if (position >= 0 && this.queueState && position !== this.queueState.position) {
            this.queueState = { ...this.queueState, position };
            this.cdr.markForCheck();
          }
        } catch {
          // Ignore position fetch errors during polling
        }
      }
    } catch (error) {
      // Track consecutive failures and warn user if updates are unavailable
      this.consecutivePollingFailures++;
      this.logger.warn('Queue', 'Polling error', {
        consecutiveFailures: this.consecutivePollingFailures,
        error,
      });

      // Show warning to user after MAX_POLLING_FAILURES consecutive failures
      if (this.consecutivePollingFailures >= this.MAX_POLLING_FAILURES && !this.pollingErrorShown) {
        this.pollingErrorShown = true;
        this.showToast(
          this.translationService.instant('appointments.queue.messages.updatesUnavailable'),
          'warning'
        );
      }
    }
  }

  /**
   * Show toast notification when queue state changes
   */
  private async notifyStateChange(
    fromState: AppointmentQueueState | undefined,
    toState: AppointmentQueueState
  ): Promise<void> {
    let message: string;
    let color: 'success' | 'warning' | 'danger' = 'success';

    switch (toState) {
      case 'ACCEPTED':
        message = this.translationService.instant('appointments.queue.messages.accepted');
        color = 'success';
        break;
      case 'DENIED':
        message = this.translationService.instant('appointments.queue.messages.denied');
        color = 'danger';
        break;
      case 'CREATED':
        message = this.translationService.instant('appointments.queue.messages.created');
        color = 'success';
        break;
      default:
        return; // Don't notify for other state changes
    }

    await this.showToast(message, color);
  }

  /**
   * Subscribe to appointments updates
   */
  private subscribeToAppointments(): void {
    this.appointmentService.appointments$.pipe(takeUntil(this.destroy$)).subscribe(appointments => {
      // Sort by appointment_id descending (most recent first)
      this.appointments = [...appointments].sort((a, b) => b.appointment_id - a.appointment_id);
      this.cdr.markForCheck();
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
    } catch (error: unknown) {
      this.logger.error('Appointments', 'Error loading appointments', error);
      this.error =
        (error as Error)?.message ||
        this.translationService.instant('appointments.errors.loadListFailed');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Navigate to appointment detail
   */
  viewAppointment(appointment: Appointment): void {
    this.logger.info('UI', 'Appointment clicked', { appointmentId: appointment.appointment_id });
    this.router.navigate([appointmentDetailRoute(appointment.appointment_id)]);
  }

  /**
   * Delete an appointment
   */
  async deleteAppointment(appointmentId: number): Promise<void> {
    try {
      await firstValueFrom(this.appointmentService.deleteAppointment(appointmentId));
      this.logger.info('Appointments', 'Appointment deleted successfully', { appointmentId });
      await this.showToast(
        this.translationService.instant('appointments.deleteSuccess'),
        'success'
      );
    } catch (error) {
      this.logger.error('Appointments', 'Error deleting appointment', { appointmentId, error });
      await this.showToast(
        this.translationService.instant('appointments.errors.deleteFailed'),
        'danger'
      );
    }
  }

  /**
   * Create a new appointment
   */
  createAppointment(): void {
    this.logger.info('UI', 'Create appointment button clicked');
    this.router.navigate([ROUTES.APPOINTMENTS_CREATE]);
  }

  /**
   * Handle pull to refresh
   */
  async doRefresh(event: CustomEvent): Promise<void> {
    this.logger.info('UI', 'Appointments refresh initiated');
    await Promise.all([this.loadAppointments(), this.loadQueueState()]);
    (event.target as HTMLIonRefresherElement).complete();
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
      case 'BLOCKED':
        return {
          classes: ['badge', 'badge-error', 'gap-1', 'text-xs'],
          icon: 'ban',
          label: this.translationService.instant('appointments.queue.labels.blocked'),
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

  /**
   * Get DaisyUI badge classes based on queue state (larger badges for status display)
   */
  getQueueStateBadgeClass(state: AppointmentQueueState | null | undefined): string {
    const normalized = state || 'NONE';
    switch (normalized) {
      case 'PENDING':
        return 'badge badge-warning badge-lg';
      case 'ACCEPTED':
        return 'badge badge-info badge-lg';
      case 'CREATED':
        return 'badge badge-success badge-lg';
      case 'DENIED':
      case 'BLOCKED':
        return 'badge badge-error badge-lg';
      case 'NONE':
      default:
        return 'badge badge-ghost badge-lg';
    }
  }

  // ========== Queue Methods ==========

  /**
   * Load current queue state
   */
  async loadQueueState(): Promise<void> {
    if (environment.backendMode === 'mock') {
      this.queueState = { state: 'NONE' };
      this.queueLoading = false; // Reset loading state in mock mode
      this.cdr.markForCheck();
      return;
    }

    this.queueLoading = true;
    this.queueError = null;

    try {
      this.queueState = await firstValueFrom(this.appointmentService.getQueueState());
      this.logger.info('Queue', 'Queue state loaded', { state: this.queueState?.state });

      // If state is NONE, check if queue is actually open
      if (this.queueState?.state === 'NONE') {
        try {
          const isOpen = await firstValueFrom(this.appointmentService.checkQueueOpen());
          if (!isOpen) {
            this.queueState = { state: 'BLOCKED' as AppointmentQueueState };
            this.logger.info('Queue', 'Queue is closed, setting state to BLOCKED');
          }
        } catch (openError) {
          this.logger.warn('Queue', 'Failed to check queue open status', openError);
        }
      }

      // If user is in PENDING state, fetch queue position
      if (this.queueState?.state === 'PENDING') {
        try {
          const position = await firstValueFrom(this.appointmentService.getQueuePosition());
          if (position >= 0) {
            this.queueState = { ...this.queueState, position };
            this.logger.info('Queue', 'Queue position loaded', { position });
          }
        } catch (positionError) {
          this.logger.warn('Queue', 'Failed to load queue position', positionError);
          // Don't fail the entire state load if position fetch fails
        }
      }
    } catch (error: unknown) {
      // Don't show error for "not found" - this is normal when no queue state exists
      const errorMsg = (error as Error)?.message?.toLowerCase() || '';
      const isNotFoundError =
        errorMsg.includes('not found') ||
        errorMsg.includes('no encontrada') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('not in queue') ||
        errorMsg.includes('no está en la cola');

      if (!isNotFoundError) {
        this.logger.error('Appointments', 'Error loading queue state', error);
        this.queueError = (error as Error)?.message || 'Failed to load queue state';
      } else {
        // Treat "not found" as NONE state (no queue entry)
        this.queueState = { state: 'NONE' as AppointmentQueueState };
        this.logger.info('Queue', 'No queue state found, defaulting to NONE');
      }
    } finally {
      this.queueLoading = false;
      this.requestingAppointment = false; // Reset request flag after state is loaded

      // Start polling if in a state that can change (PENDING or ACCEPTED)
      this.startPolling();

      this.cdr.markForCheck();
    }
  }

  /**
   * Request an appointment (submit to queue)
   */
  async onRequestAppointment(): Promise<void> {
    // Prevent multiple requests (debouncing)
    if (this.isSubmitting || this.requestingAppointment || !this.canRequestAppointment) {
      return;
    }

    this.isSubmitting = true;
    this.requestingAppointment = true;
    this.queueError = null;

    try {
      const response = await firstValueFrom(this.appointmentService.requestAppointment());
      this.logger.info('Queue', 'Appointment requested', { response });

      // Optimistically update queue state to prevent duplicate requests
      this.queueState = { state: 'PENDING' as AppointmentQueueState };

      // Show success message
      await this.showToast(
        this.translationService.instant('appointments.queue.messages.submitSuccess'),
        'success'
      );

      // Reload actual queue state from server (in background)
      this.loadQueueState();
    } catch (error: unknown) {
      this.logger.error('Appointments', 'Error requesting appointment', error);
      this.queueError =
        (error as Error)?.message ||
        this.translationService.instant('appointments.queue.messages.submitError');
      this.requestingAppointment = false;
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
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

  /**
   * Show toast message
   */
  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger' = 'success'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  // trackBy function for past appointments ngFor
  trackByAppointment(index: number, appointment: Appointment): number {
    return appointment.appointment_id;
  }

  /**
   * Toggle past appointments expansion and load resolutions if expanding
   */
  togglePastAppointments(): void {
    this.pastAppointmentsExpanded = !this.pastAppointmentsExpanded;
    if (this.pastAppointmentsExpanded && this.pastAppointments.length > 0) {
      this.loadResolutionsForPastAppointments();
    }
  }

  /**
   * Load resolutions for all past appointments
   */
  private async loadResolutionsForPastAppointments(): Promise<void> {
    if (this.resolutionsLoading) return;
    if (environment.backendMode === 'mock') return;

    this.resolutionsLoading = true;
    this.cdr.markForCheck();

    for (const apt of this.pastAppointments) {
      // Skip if already cached
      if (this.resolutions.has(apt.appointment_id)) continue;

      try {
        const resolution = await firstValueFrom(
          this.appointmentService.getResolution(apt.appointment_id)
        );
        if (resolution) {
          this.resolutions.set(apt.appointment_id, resolution);
        }
      } catch (error: unknown) {
        // Distinguish between "not found" (expected) and real errors
        const errorMsg = (error as Error)?.message?.toLowerCase() || '';
        const httpStatus = (error as { status?: number })?.status;
        const isNotFoundError =
          httpStatus === 404 ||
          errorMsg.includes('not found') ||
          errorMsg.includes('no resolution') ||
          errorMsg.includes('no encontrad');

        if (isNotFoundError) {
          // Expected: appointment doesn't have a resolution yet
          this.logger.debug('Resolution', `No resolution for appointment ${apt.appointment_id}`);
        } else {
          // Unexpected error: network issue, server error, etc.
          this.logger.warn(
            'Resolution',
            `Failed to fetch resolution for appointment ${apt.appointment_id}`,
            error
          );
        }
      }
    }

    this.resolutionsLoading = false;
    this.cdr.markForCheck();
  }

  /**
   * Get resolution for an appointment (from cache)
   */
  getResolution(appointmentId: number): AppointmentResolutionResponse | undefined {
    return this.resolutions.get(appointmentId);
  }

  /**
   * Check if appointment has resolution with emergency care flag
   */
  hasEmergencyCare(appointmentId: number): boolean {
    return this.resolutions.get(appointmentId)?.emergency_care === true;
  }

  /**
   * Check if appointment has resolution with physical appointment flag
   */
  needsPhysicalAppointment(appointmentId: number): boolean {
    return this.resolutions.get(appointmentId)?.needed_physical_appointment === true;
  }
}

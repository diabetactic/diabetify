import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ROUTES, ROUTE_SEGMENTS } from '../core/constants';
import { AppointmentService } from '../core/services/appointment.service';
import { TranslationService } from '../core/services/translation.service';
import { AppointmentQueueStateResponse } from '../core/models/appointment.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonFab,
    IonFabButton,
    TranslateModule,
  ],
})
export class TabsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  fabIcon = 'medkit-outline';
  fabLabel = '';

  // Queue state for appointment FAB button control
  private queueState: AppointmentQueueStateResponse | null = null;
  private readonly isMockMode = environment.backendMode === 'mock';

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private toastController: ToastController,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateFabContext(event.url);
      }
    });

    this.updateFabContext(this.router.url);

    // Subscribe to queue state for appointment FAB control
    if (!this.isMockMode) {
      this.loadQueueState();
    } else {
      // Mock mode: set explicit NONE state
      this.queueState = { state: 'NONE' };
    }
  }

  /**
   * Load appointment queue state from backend
   */
  private loadQueueState(): void {
    this.appointmentService
      .getQueueState()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: state => {
          this.queueState = state;
        },
        error: () => {
          // On error, default to NONE state (allow requesting)
          this.queueState = { state: 'NONE' };
        },
      });
  }

  /**
   * Check if user can create an appointment (state must be ACCEPTED)
   */
  private get canCreateAppointment(): boolean {
    return this.queueState?.state === 'ACCEPTED';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateFabContext(url: string): void {
    if (url.includes(ROUTE_SEGMENTS.APPOINTMENTS)) {
      this.fabIcon = 'calendar-outline';
      this.fabLabel = 'Add Appointment';
    } else {
      this.fabIcon = 'medkit-outline';
      this.fabLabel = 'Add Reading';
    }
  }

  navigateToAddReading(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes(ROUTE_SEGMENTS.APPOINTMENTS)) {
      // Check if user can create an appointment before navigating
      if (!this.canCreateAppointment) {
        this.showCannotCreateAppointmentToast();
        return;
      }
      this.router.navigate([ROUTES.APPOINTMENTS_CREATE]);
    } else {
      this.router.navigate([ROUTES.ADD_READING]);
    }
  }

  /**
   * Show toast when user cannot create an appointment
   */
  private async showCannotCreateAppointmentToast(): Promise<void> {
    const state = this.queueState?.state;
    let messageKey = 'appointments.errors.cannotCreate';

    // Provide more specific message based on state
    if (state === 'CREATED') {
      messageKey = 'appointments.errors.alreadyHasAppointment';
    } else if (state === 'PENDING') {
      messageKey = 'appointments.errors.pendingRequest';
    } else if (state === 'BLOCKED') {
      messageKey = 'appointments.errors.blocked';
    }

    const toast = await this.toastController.create({
      message: this.translationService.instant(messageKey),
      duration: 3000,
      position: 'bottom',
      color: 'warning',
      buttons: [
        {
          text: this.translationService.instant('common.close'),
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }
}

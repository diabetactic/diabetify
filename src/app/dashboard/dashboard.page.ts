import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReadingsService } from '../core/services/readings.service';
import { TidepoolSyncService } from '../core/services/tidepool-sync.service';
import { AppointmentService, Appointment } from '../core/services/appointment.service';
import {
  LocalGlucoseReading,
  GlucoseStatistics,
  GlucoseUnit,
} from '../core/models/glucose-reading.model';
import { SyncStatus } from '../core/models/tidepool-sync.model';
import { TranslationService } from '../core/services/translation.service';
import { ProfileService } from '../core/services/profile.service';
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { ReadingItemComponent } from '../shared/components/reading-item/reading-item.component';
import { AlertBannerComponent } from '../shared/components/alert-banner/alert-banner.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { LanguageSwitcherComponentModule } from '../shared/components/language-switcher/language-switcher.module';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    TranslateModule,
    DatePipe,
    StatCardComponent,
    ReadingItemComponent,
    AlertBannerComponent,
    EmptyStateComponent,
    LanguageSwitcherComponentModule,
  ],
})
export class DashboardPage implements OnInit, OnDestroy {
  // Statistics data
  statistics: GlucoseStatistics | null = null;

  // Recent readings (last 5)
  recentReadings: LocalGlucoseReading[] = [];

  // Appointment data
  upcomingAppointment: Appointment | null = null;
  isSharingGlucose = false;

  // Sync status
  syncStatus: SyncStatus | null = null;

  // Loading states
  isLoading = true;
  isSyncing = false;

  // Alert banner
  showSuccessAlert = false;

  // Gradient colors for stat cards (matching uiResources design)
  gradients = {
    hba1c: ['#60a5fa', '#3b82f6'] as [string, string], // Blue gradient (blue-400 to blue-500)
    timeInRange: ['#c084fc', '#a855f7'] as [string, string], // Purple gradient (purple-400 to purple-500)
    avgGlucose: ['#4ade80', '#22c55e'] as [string, string], // Green gradient (green-400 to green-500)
    gmi: ['#fbbf24', '#f59e0b'] as [string, string], // Yellow gradient (yellow-400 to yellow-500)
  };

  // Icons for stat cards
  icons = {
    hba1c: 'star',
    timeInRange: 'track_changes',
    avgGlucose: 'favorite',
    gmi: 'monitoring',
  };

  preferredGlucoseUnit: GlucoseUnit;

  private destroy$ = new Subject<void>();

  constructor(
    private readingsService: ReadingsService,
    private syncService: TidepoolSyncService,
    private appointmentService: AppointmentService,
    private toastController: ToastController,
    private router: Router,
    private translationService: TranslationService,
    private profileService: ProfileService
  ) {
    this.preferredGlucoseUnit = this.translationService.getCurrentConfig().glucoseUnit;
  }

  ngOnInit() {
    this.subscribeToPreferences();
    this.loadDashboardData();
    this.subscribeToReadings();
    this.subscribeToSyncStatus();
    this.subscribeToAppointments();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load initial dashboard data
   */
  private async loadDashboardData() {
    try {
      this.isLoading = true;

      // Get statistics for the last month
      this.statistics = await this.readingsService.getStatistics(
        'month',
        70,
        180,
        this.preferredGlucoseUnit
      );

      // Get recent readings (last 5)
      const result = await this.readingsService.getAllReadings(5);
      this.recentReadings = result.readings;

      // Show success alert if Time in Range > 70%
      if (this.statistics && this.statistics.timeInRange > 70) {
        this.showSuccessAlert = true;
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Subscribe to readings changes
   */
  private subscribeToReadings() {
    this.readingsService.readings$.pipe(takeUntil(this.destroy$)).subscribe(async readings => {
      // Update recent readings
      this.recentReadings = readings.slice(0, 5);

      // Recalculate statistics when readings change
      if (!this.isLoading) {
        this.statistics = await this.readingsService.getStatistics(
          'month',
          70,
          180,
          this.preferredGlucoseUnit
        );

        // Update success alert
        if (this.statistics && this.statistics.timeInRange > 70) {
          this.showSuccessAlert = true;
        }
      }
    });
  }

  /**
   * Subscribe to sync status changes
   */
  private subscribeToSyncStatus() {
    this.syncService.syncStatus$.pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.syncStatus = status;
      this.isSyncing = status.isRunning;
    });
  }

  /**
   * Subscribe to upcoming appointments
   */
  private subscribeToAppointments() {
    this.appointmentService.upcomingAppointment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(appointment => {
        this.upcomingAppointment = appointment;
      });

    // Load appointments initially
    this.appointmentService.getAppointments('confirmed').subscribe();
  }

  /**
   * Handle pull-to-refresh
   */
  async handleRefresh(event: any) {
    try {
      await this.syncService.performManualSync();
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      event.target.complete();
    }
  }

  /**
   * Handle sync button click
   */
  async onSync() {
    try {
      this.isSyncing = true;
      await this.syncService.performManualSync();
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Dismiss success alert
   */
  onAlertDismissed() {
    this.showSuccessAlert = false;
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number | undefined): string {
    const locale = this.translationService.getCurrentLanguage();
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatter.format(typeof value === 'number' ? value : 0)}%`;
  }

  /**
   * Format glucose value for display
   */
  formatGlucose(value: number | undefined): string {
    const decimals = this.preferredGlucoseUnit === 'mmol/L' ? 1 : 0;
    const locale = this.translationService.getCurrentLanguage();
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatter.format(typeof value === 'number' ? value : 0);
  }

  /**
   * Get current glucose unit from translation service
   */
  getCurrentGlucoseUnit(): string {
    return this.preferredGlucoseUnit;
  }

  /**
   * Share glucose data with doctor for upcoming appointment
   */
  async shareGlucoseData() {
    if (!this.upcomingAppointment) {
      return;
    }

    this.isSharingGlucose = true;

    try {
      // Calculate date range (30 days before appointment)
      const appointmentDate = new Date(
        `${this.upcomingAppointment.date} ${this.upcomingAppointment.startTime}`
      );
      const startDate = new Date(appointmentDate);
      startDate.setDate(startDate.getDate() - 30);

      // Share glucose data including manual readings summary (manual-only friendly)
      const result = await firstValueFrom(
        this.appointmentService.shareManualGlucoseData(this.upcomingAppointment.id!, {
          dateRange: { start: startDate, end: appointmentDate },
        })
      );

      // Show success message
      const doctorName =
        this.upcomingAppointment.doctorName ||
        this.translationService.instant('dashboard.defaultDoctorName');
      const successMessage = this.translationService.instant('dashboard.shareToast.success', {
        count: result?.recordCount ?? 0,
        doctor: doctorName,
      });
      await this.showToast(successMessage, 'success');
    } catch (error) {
      console.error('Error sharing glucose data:', error);
      await this.showToast(this.translationService.instant('dashboard.shareToast.error'), 'danger');
    } finally {
      this.isSharingGlucose = false;
    }
  }

  /**
   * Navigate to appointment details
   */
  viewAppointmentDetails() {
    if (this.upcomingAppointment) {
      // TODO: Navigate to appointment details page when implemented
      this.router.navigate(['/appointments', this.upcomingAppointment.id]);
    }
  }

  /**
   * Navigate to add reading page
   */
  addReading() {
    this.router.navigate(['/add-reading']);
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [
        {
          text: this.translationService.instant('common.close'),
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  /**
   * Get time until appointment
   */
  getTimeUntilAppointment(): string {
    if (!this.upcomingAppointment) {
      return '';
    }

    const appointmentDate = new Date(
      `${this.upcomingAppointment.date} ${this.upcomingAppointment.startTime}`
    );
    const now = new Date();
    const diffMs = appointmentDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return this.translationService.instant('dashboard.timeUntil.now');
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const key = diffDays === 1 ? 'dashboard.timeUntil.oneDay' : 'dashboard.timeUntil.manyDays';
      return this.translationService.instant(key, { count: diffDays });
    } else if (diffHours > 0) {
      const key = diffHours === 1 ? 'dashboard.timeUntil.oneHour' : 'dashboard.timeUntil.manyHours';
      return this.translationService.instant(key, { count: diffHours });
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const key =
        diffMinutes === 1 ? 'dashboard.timeUntil.oneMinute' : 'dashboard.timeUntil.manyMinutes';
      return this.translationService.instant(key, { count: diffMinutes });
    }
  }

  /**
   * Get last sync time display
   */
  getLastSyncDisplay(): string {
    if (!this.syncStatus?.lastSyncTime) {
      return this.translationService.instant('dashboard.lastSyncStatus.never');
    }

    const syncDate = new Date(this.syncStatus.lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return this.translationService.instant('dashboard.lastSyncStatus.justNow');
    } else if (diffMinutes < 60) {
      const key =
        diffMinutes === 1
          ? 'dashboard.lastSyncStatus.oneMinute'
          : 'dashboard.lastSyncStatus.manyMinutes';
      return this.translationService.instant(key, { count: diffMinutes });
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      const key =
        hours === 1 ? 'dashboard.lastSyncStatus.oneHour' : 'dashboard.lastSyncStatus.manyHours';
      return this.translationService.instant(key, { count: hours });
    } else {
      const days = Math.floor(diffMinutes / 1440);
      const key =
        days === 1 ? 'dashboard.lastSyncStatus.oneDay' : 'dashboard.lastSyncStatus.manyDays';
      return this.translationService.instant(key, { count: days });
    }
  }

  /**
   * Subscribe to profile preferences for glucose unit updates
   */
  private subscribeToPreferences(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      if (
        profile?.preferences?.glucoseUnit &&
        profile.preferences.glucoseUnit !== this.preferredGlucoseUnit
      ) {
        this.preferredGlucoseUnit = profile.preferences.glucoseUnit;
        if (!this.isLoading) {
          this.loadDashboardData();
        }
      }
    });
  }
}

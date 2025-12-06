import { Component, OnInit, OnDestroy, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReadingsService } from '../core/services/readings.service';
import { LoggerService } from '../core/services/logger.service';
import {
  LocalGlucoseReading,
  GlucoseStatistics,
  GlucoseUnit,
} from '../core/models/glucose-reading.model';
import { TranslationService } from '../core/services/translation.service';
import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { ReadingItemComponent } from '../shared/components/reading-item/reading-item.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../shared/components/error-banner/error-banner.component';
import { LanguageSwitcherComponentModule } from '../shared/components/language-switcher/language-switcher.module';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';
import { environment } from '../../environments/environment';
import { ROUTES } from '../core/constants';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    // Ionic standalone components
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    // App components
    StatCardComponent,
    ReadingItemComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
    LanguageSwitcherComponentModule,
    AppIconComponent,
  ],
})
export class DashboardPage implements OnInit, OnDestroy {
  readonly isMockMode = environment.backendMode === 'mock';
  readonly routes = ROUTES;

  // Statistics data
  statistics: GlucoseStatistics | null = null;

  // Recent readings (last 5)
  recentReadings: LocalGlucoseReading[] = [];

  // Backend sync results (for cloud mode counter)
  backendSyncResult: {
    pushed: number;
    fetched: number;
    failed: number;
    lastError?: string | null;
  } | null = null;

  // Last sync time for display
  lastSyncTime: string | null = null;

  // Loading states
  isLoading = true;
  isSyncing = false;

  // Alert banner
  showSuccessAlert = false;

  // Kid-friendly view toggle
  showDetails = false;

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
    private toastController: ToastController,
    private router: Router,
    private translationService: TranslationService,
    private profileService: ProfileService,
    private logger: LoggerService,
    private themeService: ThemeService,
    private ngZone: NgZone
  ) {
    this.logger.info('Init', 'DashboardPage initialized');
    this.preferredGlucoseUnit = this.translationService.getCurrentConfig().glucoseUnit;
  }

  ngOnInit() {
    this.subscribeToPreferences();
    this.loadDashboardData();
    this.subscribeToReadings();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load initial dashboard data
   * In cloud mode, syncs with backend first to get latest readings
   */
  private async loadDashboardData() {
    try {
      this.isLoading = true;

      // In cloud mode, fetch from backend first (auto-load after login)
      if (!this.isMockMode) {
        this.logger.info('Dashboard', 'Auto-syncing with backend on load');
        try {
          this.backendSyncResult = await this.readingsService.performFullSync();
          this.logger.info('Dashboard', 'Backend sync completed', this.backendSyncResult);
        } catch (syncError) {
          this.logger.error('Dashboard', 'Backend sync failed on load', syncError);
        }
      }

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
    } catch (error) {
      this.logger.error('Dashboard', 'Error loading dashboard data', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Subscribe to readings changes
   */
  private subscribeToReadings() {
    this.readingsService.readings$.pipe(takeUntil(this.destroy$)).subscribe({
      next: async readings => {
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
        }
      },
      error: error => {
        this.logger.error('Dashboard', 'Error subscribing to readings', error);
      },
    });
  }

  /**
   * Handle pull-to-refresh
   */
  async handleRefresh(event: CustomEvent) {
    try {
      // Sync with backend (not Tidepool)
      await this.readingsService.performFullSync();
      await this.loadDashboardData();
    } catch (error) {
      this.logger.error('Dashboard', 'Error refreshing data', error);
      await this.showToast(
        this.translationService.instant('dashboard.errors.refreshFailed'),
        'danger'
      );
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  /**
   * Handle sync button click
   */
  async onSync() {
    this.logger.info('UI', 'Manual sync button clicked (backend)');
    try {
      this.isSyncing = true;
      // Sync with backend (not Tidepool)
      this.backendSyncResult = await this.readingsService.performFullSync();
      this.logger.info('UI', 'Backend sync completed successfully', this.backendSyncResult);

      // Reload dashboard data (but skip another sync since we just did one)
      this.statistics = await this.readingsService.getStatistics(
        'month',
        70,
        180,
        this.preferredGlucoseUnit
      );
      const result = await this.readingsService.getAllReadings(5);
      this.recentReadings = result.readings;
    } catch (error) {
      this.logger.error('Dashboard', 'Error syncing data from backend', error);
      await this.showToast(
        this.translationService.instant('dashboard.errors.syncFailed'),
        'danger'
      );
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
   * Navigate to add reading page
   * Using ngZone.run() to ensure navigation triggers immediately on mobile
   */
  addReading() {
    this.ngZone.run(() => {
      this.router.navigate([ROUTES.ADD_READING]);
    });
  }

  /**
   * Navigate to bolus calculator page
   * Using ngZone.run() to ensure navigation triggers immediately on mobile
   */
  openBolusCalculator() {
    this.ngZone.run(() => {
      this.router.navigate([ROUTES.BOLUS_CALCULATOR]);
    });
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
   * Get last sync time display
   */
  getLastSyncDisplay(): string {
    if (!this.lastSyncTime) {
      return this.translationService.instant('dashboard.lastSyncStatus.never');
    }

    const syncDate = new Date(this.lastSyncTime);
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

  /**
   * Toggle technical details section
   */
  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  /**
   * Get sync items count for display
   */
  getSyncItemsCount(): number {
    if (this.backendSyncResult) {
      return this.backendSyncResult.fetched + this.backendSyncResult.pushed;
    }
    return 0;
  }

  /**
   * Get sync failed count for display
   */
  getSyncFailedCount(): number {
    if (this.backendSyncResult) {
      return this.backendSyncResult.failed;
    }
    return 0;
  }

  /**
   * Get last sync error for display (debugging)
   */
  getLastSyncError(): string | null {
    return this.backendSyncResult?.lastError || null;
  }

  /**
   * Clear sync error from display
   */
  clearSyncError(): void {
    if (this.backendSyncResult) {
      this.backendSyncResult.lastError = null;
    }
  }

  /**
   * Get kid-friendly status icon based on time in range
   * Returns filled icons in dark mode for better visibility
   * Using Material Symbols for emoji-like icons
   */
  getStatusIcon(): string {
    const isDark = this.themeService.isDarkTheme();

    if (!this.statistics) {
      return isDark ? 'sentiment_satisfied' : 'sentiment_satisfied_outline';
    }

    const timeInRange = this.statistics.timeInRange;
    if (timeInRange >= 70) return 'sentiment_satisfied'; // Excellent! (always filled)
    if (timeInRange >= 50) {
      return isDark ? 'sentiment_satisfied' : 'sentiment_satisfied_outline'; // Good (filled in dark mode)
    }
    return isDark ? 'sentiment_dissatisfied' : 'sentiment_dissatisfied_outline'; // Needs improvement
  }

  /**
   * Get status color based on time in range
   */
  getStatusColor(): string {
    if (!this.statistics) return 'medium';

    const timeInRange = this.statistics.timeInRange;
    if (timeInRange >= 70) return 'success';
    if (timeInRange >= 50) return 'warning';
    return 'danger';
  }

  /**
   * Get kid-friendly status message
   */
  getKidFriendlyStatusMessage(): string {
    if (!this.statistics) {
      return this.translationService.instant('dashboard.kids.status.noData');
    }

    const timeInRange = this.statistics.timeInRange;
    if (timeInRange >= 70) {
      return this.translationService.instant('dashboard.kids.status.great');
    }
    if (timeInRange >= 50) {
      return this.translationService.instant('dashboard.kids.status.good');
    }
    return this.translationService.instant('dashboard.kids.status.needsWork');
  }
}

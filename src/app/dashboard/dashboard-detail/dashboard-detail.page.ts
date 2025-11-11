import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReadingsService } from '../../core/services/readings.service';
import { TidepoolSyncService } from '../../core/services/tidepool-sync.service';
import { ProfileService } from '../../core/services/profile.service';
import { TranslationService } from '../../core/services/translation.service';
import { GlucoseStatistics, GlucoseUnit } from '../../core/models/glucose-reading.model';
import { SyncStatus } from '../../core/models/tidepool-sync.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-dashboard-detail',
  templateUrl: './dashboard-detail.page.html',
  styleUrls: ['./dashboard-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule, StatCardComponent],
})
export class DashboardDetailPage implements OnInit, OnDestroy {
  readonly isKarma = typeof window !== 'undefined' && (window as any).__karma__;

  // Statistics data
  statistics: GlucoseStatistics | null = null;

  // Sync status
  syncStatus: SyncStatus | null = null;

  // Loading states
  isLoading = true;
  isSyncing = false;

  // Gradient colors for stat cards
  gradients = {
    hba1c: ['#60a5fa', '#3b82f6'] as [string, string],
    timeInRange: ['#c084fc', '#a855f7'] as [string, string],
    avgGlucose: ['#4ade80', '#22c55e'] as [string, string],
    gmi: ['#fbbf24', '#f59e0b'] as [string, string],
    stdDev: ['#f87171', '#ef4444'] as [string, string],
    cv: ['#fb923c', '#f97316'] as [string, string],
  };

  // Icons for stat cards
  icons = {
    hba1c: 'star',
    timeInRange: 'track_changes',
    avgGlucose: 'favorite',
    gmi: 'monitoring',
    stdDev: 'analytics',
    cv: 'trending_up',
  };

  preferredGlucoseUnit: GlucoseUnit;

  private destroy$ = new Subject<void>();

  constructor(
    private readingsService: ReadingsService,
    private syncService: TidepoolSyncService,
    private router: Router,
    private translationService: TranslationService,
    private profileService: ProfileService
  ) {
    this.preferredGlucoseUnit = this.translationService.getCurrentConfig().glucoseUnit;
  }

  ngOnInit() {
    this.subscribeToPreferences();
    this.loadStatistics();
    this.subscribeToSyncStatus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load statistics
   */
  private async loadStatistics() {
    try {
      this.isLoading = true;
      this.statistics = await this.readingsService.getStatistics(
        'month',
        70,
        180,
        this.preferredGlucoseUnit
      );
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      this.isLoading = false;
    }
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
   * Handle sync button click
   */
  async onSync() {
    try {
      this.isSyncing = true;
      await this.syncService.performManualSync();
      await this.loadStatistics();
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Navigate back to dashboard
   */
  goBack() {
    this.router.navigate(['/tabs/dashboard']);
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
   * Get current glucose unit
   */
  getCurrentGlucoseUnit(): string {
    return this.preferredGlucoseUnit;
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
   * Get sync status text
   */
  getSyncStatusText(): string {
    if (!this.syncStatus) {
      return this.translationService.instant('dashboard.syncStatus.unknown');
    }

    if (this.syncStatus.isRunning) {
      return this.translationService.instant('dashboard.syncStatus.syncing');
    }

    if (this.syncStatus.itemsFailed > 0) {
      return this.translationService.instant('dashboard.syncStatus.failed', {
        count: this.syncStatus.itemsFailed,
      });
    }

    if (this.syncStatus.itemsSynced > 0) {
      return this.translationService.instant('dashboard.syncStatus.success', {
        count: this.syncStatus.itemsSynced,
      });
    }

    return this.translationService.instant('dashboard.syncStatus.idle');
  }

  /**
   * Subscribe to profile preferences
   */
  private subscribeToPreferences(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      if (
        profile?.preferences?.glucoseUnit &&
        profile.preferences.glucoseUnit !== this.preferredGlucoseUnit
      ) {
        this.preferredGlucoseUnit = profile.preferences.glucoseUnit;
        if (!this.isLoading) {
          this.loadStatistics();
        }
      }
    });
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReadingsService } from '../../core/services/readings.service';
import { ProfileService } from '../../core/services/profile.service';
import { TranslationService } from '../../core/services/translation.service';
import { GlucoseStatistics, GlucoseUnit } from '../../core/models/glucose-reading.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { ROUTES } from '../../core/constants';

@Component({
  selector: 'app-dashboard-detail',
  templateUrl: './dashboard-detail.page.html',
  styleUrls: ['./dashboard-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    // Ionic standalone components
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    // App components
    StatCardComponent,
    AppIconComponent,
  ],
})
export class DashboardDetailPage implements OnInit, OnDestroy {
  // Statistics data
  statistics: GlucoseStatistics | null = null;

  // Backend sync results
  backendSyncResult: { pushed: number; fetched: number; failed: number } | null = null;

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
    private router: Router,
    private translationService: TranslationService,
    private profileService: ProfileService
  ) {
    this.preferredGlucoseUnit = this.translationService.getCurrentConfig().glucoseUnit;
  }

  ngOnInit() {
    this.subscribeToPreferences();
    this.loadStatistics();
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
   * Handle sync button click
   */
  async onSync() {
    try {
      this.isSyncing = true;
      this.backendSyncResult = await this.readingsService.performFullSync();
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
    this.router.navigate([ROUTES.TABS_DASHBOARD]);
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
   * Get sync status text
   */
  getSyncStatusText(): string {
    if (this.isSyncing) {
      return this.translationService.instant('dashboard.syncStatus.syncing');
    }

    if (!this.backendSyncResult) {
      return this.translationService.instant('dashboard.syncStatus.idle');
    }

    if (this.backendSyncResult.failed > 0) {
      return this.translationService.instant('dashboard.syncStatus.failed', {
        count: this.backendSyncResult.failed,
      });
    }

    const itemsSynced = this.backendSyncResult.fetched + this.backendSyncResult.pushed;
    if (itemsSynced > 0) {
      return this.translationService.instant('dashboard.syncStatus.success', {
        count: itemsSynced,
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

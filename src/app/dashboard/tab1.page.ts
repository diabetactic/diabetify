import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReadingsService } from '../core/services/readings.service';
import { TidepoolSyncService } from '../core/services/tidepool-sync.service';
import { LocalGlucoseReading, GlucoseStatistics } from '../core/models/glucose-reading.model';

@Component({
  selector: 'app-tab1',
  templateUrl: './dashboard.html',
  styleUrls: ['./tab1.page.scss'],
})
export class Tab1Page implements OnInit, OnDestroy {
  // Statistics data
  statistics: GlucoseStatistics | null = null;

  // Recent readings (last 5)
  recentReadings: LocalGlucoseReading[] = [];

  // Loading states
  isLoading = true;
  isSyncing = false;

  // Alert banner
  showSuccessAlert = false;

  // Gradient colors for stat cards
  gradients = {
    hba1c: ['#60a5fa', '#3b82f6'] as [string, string], // Blue gradient
    timeInRange: ['#a78bfa', '#8b5cf6'] as [string, string], // Purple gradient
    avgGlucose: ['#4ade80', '#22c55e'] as [string, string], // Green gradient
    gmi: ['#facc15', '#eab308'] as [string, string], // Yellow gradient
  };

  // Icons for stat cards
  icons = {
    hba1c: 'star',
    timeInRange: 'track_changes',
    avgGlucose: 'favorite',
    gmi: 'monitoring',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private readingsService: ReadingsService,
    private syncService: TidepoolSyncService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.subscribeToReadings();
    this.subscribeToSyncStatus();
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
      this.statistics = await this.readingsService.getStatistics('month');

      // Get recent readings (last 5)
      const result = await this.readingsService.getAllReadings(5);
      this.recentReadings = result.readings;

      // Show success alert if Time in Range > 70%
      if (this.statistics.timeInRange > 70) {
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
        this.statistics = await this.readingsService.getStatistics('month');

        // Update success alert
        if (this.statistics.timeInRange > 70) {
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
      this.isSyncing = status.isRunning;
    });
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
    return value ? `${value.toFixed(1)}%` : '0.0%';
  }

  /**
   * Format glucose value for display
   */
  formatGlucose(value: number | undefined): string {
    return value ? Math.round(value).toString() : '0';
  }
}

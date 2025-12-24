import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBadge,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  IonChip,
  IonLabel,
  IonText,
  IonFab,
  IonFabButton,
  IonModal,
  IonList,
  IonListHeader,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonDatetimeButton,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LocalGlucoseReading, GlucoseStatus, GlucoseUnit } from '@models/glucose-reading.model';
import { ReadingsService } from '@services/readings.service';
import { ProfileService } from '@services/profile.service';
import { TranslationService } from '@services/translation.service';
import { LoggerService } from '@services/logger.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ReadingItemComponent } from '@shared/components/reading-item/reading-item.component';
import { ROUTES } from '@core/constants';

/**
 * Interface for grouped readings by date
 */
interface GroupedReading {
  date: string; // ISO date string
  displayDate: string; // "Today", "Yesterday", or formatted date
  readings: LocalGlucoseReading[];
}

/**
 * Filter options for readings
 */
interface ReadingFilters {
  startDate?: Date;
  endDate?: Date;
  status?: GlucoseStatus | 'all';
  searchTerm?: string;
}

@Component({
  selector: 'app-readings',
  templateUrl: './readings.html',
  styleUrls: ['./readings.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBadge,
    IonSearchbar,
    IonRefresher,
    IonRefresherContent,
    IonChip,
    IonLabel,
    IonText,
    IonFab,
    IonFabButton,
    IonModal,
    IonList,
    IonListHeader,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    IonDatetimeButton,
    AppIconComponent,
    EmptyStateComponent,
    ReadingItemComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ReadingsPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content?: IonContent;

  // State
  allReadings: LocalGlucoseReading[] = [];
  groupedReadings: GroupedReading[] = [];
  filteredReadings: LocalGlucoseReading[] = [];
  isLoading = true;
  isSyncing = false;
  totalCount = 0;

  // Filters
  filters: ReadingFilters = {
    status: 'all',
  };
  isFilterModalOpen = false;

  // Reading detail modal
  isDetailModalOpen = false;
  selectedReading: LocalGlucoseReading | null = null;

  // User preferences
  preferredUnit: GlucoseUnit = 'mg/dL';

  // Search
  searchTerm = '';
  private searchSubject = new Subject<string>();

  // Subscriptions
  private destroy$ = new Subject<void>();
  private readingsSubscription?: Subscription;

  constructor(
    private readingsService: ReadingsService,
    private router: Router,
    private profileService: ProfileService,
    private translationService: TranslationService,
    private logger: LoggerService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    this.logger.info('Init', 'ReadingsPage initialized');
  }

  ngOnInit(): void {
    this.subscribeToUserPreferences();
    this.loadReadings();
    this.setupSearchDebounce();
    // Auto-fetch from backend when page loads (background sync)
    this.autoFetchFromBackend();
  }

  /**
   * Auto-sync readings with backend on page load
   * Runs in background without blocking the UI
   */
  private async autoFetchFromBackend(): Promise<void> {
    try {
      const result = await this.readingsService.performFullSync();
      if (result.fetched > 0 || result.pushed > 0) {
        this.logger.info(
          'Sync',
          `Auto-sync complete: ${result.fetched} fetched, ${result.pushed} pushed`
        );
        this.cdr.markForCheck();
      }
    } catch (error) {
      // Silent fail - don't show error for background sync
      this.logger.warn('Sync', 'Auto-sync failed', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.readingsSubscription) {
      this.readingsSubscription.unsubscribe();
    }
  }

  /**
   * Load readings from the service
   */
  private loadReadings(): void {
    this.isLoading = true;

    this.readingsSubscription = this.readingsService.readings$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: readings => {
          this.allReadings = readings;
          this.totalCount = readings.length;
          this.applyFiltersAndGroup();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: error => {
          this.logger.error('Readings', 'Error loading readings', error);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Setup search with debounce
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.filters.searchTerm = term;
        this.applyFiltersAndGroup();
      });
  }

  /**
   * Handle search input
   */
  onSearchChange(event: CustomEvent): void {
    const value = (event.detail?.value as string) || '';
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  /**
   * Apply filters and group readings by date
   */
  private applyFiltersAndGroup(): void {
    // Start with all readings
    let filtered = [...this.allReadings];

    // Apply status filter
    if (this.filters.status && this.filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === this.filters.status);
    }

    // Apply date range filter
    if (this.filters.startDate && this.filters.endDate) {
      const startTime = this.filters.startDate.toISOString();
      const endTime = this.filters.endDate.toISOString();
      filtered = filtered.filter(r => r.time >= startTime && r.time <= endTime);
    }

    // Apply search term filter (search in notes/tags)
    if (this.filters.searchTerm && this.filters.searchTerm.trim() !== '') {
      const term = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const notes = r.notes?.toLowerCase() || '';
        const tags = r.tags?.join(' ').toLowerCase() || '';
        const value = r.value.toString();
        return notes.includes(term) || tags.includes(term) || value.includes(term);
      });
    }

    this.filteredReadings = filtered;

    // Group by date
    this.groupedReadings = this.groupReadingsByDate(filtered);
  }

  /**
   * Group readings by date
   */
  private groupReadingsByDate(readings: LocalGlucoseReading[]): GroupedReading[] {
    const groups = new Map<string, LocalGlucoseReading[]>();

    // Group readings by date
    readings.forEach(reading => {
      const date = new Date(reading.time);
      const dateKey = this.getDateKey(date);

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }

      groups.get(dateKey)?.push(reading);
    });

    // Convert map to array and sort
    const grouped: GroupedReading[] = [];

    groups.forEach((readings, dateKey) => {
      grouped.push({
        date: dateKey,
        displayDate: this.formatDateHeader(dateKey),
        readings: readings.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
      });
    });

    // Sort groups by date (newest first)
    return grouped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Get date key for grouping (YYYY-MM-DD) in local timezone
   */
  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format date header (Today, Yesterday, or date)
   */
  private formatDateHeader(dateKey: string): string {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayKey = this.getDateKey(today);
    const yesterdayKey = this.getDateKey(yesterday);

    if (dateKey === todayKey) {
      return this.translationService.instant('common.today');
    } else if (dateKey === yesterdayKey) {
      return this.translationService.instant('common.yesterday');
    } else {
      const locale = this.translationService.getCurrentLanguage();
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  }

  /**
   * Open filter modal
   */
  openFilterModal(): void {
    this.isFilterModalOpen = true;
  }

  /**
   * Close filter modal
   */
  closeFilterModal(): void {
    this.isFilterModalOpen = false;
  }

  /**
   * Apply filters from modal
   */
  applyFilters(filters: ReadingFilters): void {
    this.filters = { ...filters };
    this.applyFiltersAndGroup();
    this.closeFilterModal();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters = {
      status: 'all',
    };
    this.searchTerm = '';
    this.applyFiltersAndGroup();
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    return (
      this.filters.status !== 'all' ||
      Boolean(this.filters.startDate) ||
      Boolean(this.filters.endDate) ||
      Boolean(this.filters.searchTerm)
    );
  }

  /**
   * Get localized label for status chips
   */
  getStatusLabel(status: GlucoseStatus | 'all'): string {
    if (!status || status === 'all') {
      return this.translationService.instant('readings.filter.all');
    }

    switch (status) {
      case 'critical-low':
        return this.translationService.instant('glucose.status.veryLow');
      case 'low':
        return this.translationService.instant('glucose.status.low');
      case 'normal':
        return this.translationService.instant('glucose.status.normal');
      case 'high':
        return this.translationService.instant('glucose.status.high');
      case 'critical-high':
        return this.translationService.instant('glucose.status.veryHigh');
      default:
        return '';
    }
  }

  /**
   * Subscribe to profile preferences to determine glucose unit
   */
  private subscribeToUserPreferences(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      if (profile?.preferences?.glucoseUnit) {
        this.preferredUnit = profile.preferences.glucoseUnit;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Navigate to add reading page
   */
  addReading(): void {
    this.logger.info('UI', 'Add reading button clicked');
    this.router.navigate([ROUTES.ADD_READING]);
  }

  /**
   * Handle reading item click - opens detail modal
   */
  onReadingClick(reading: LocalGlucoseReading): void {
    this.logger.info('UI', 'Reading clicked', { readingId: reading.id });
    this.selectedReading = reading;
    this.isDetailModalOpen = true;
  }

  /**
   * Close the reading detail modal
   */
  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedReading = null;
  }

  /**
   * Format time for display in modal
   */
  formatReadingTime(time: string): string {
    const date = new Date(time);
    const locale = this.translationService.getCurrentLanguage() === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format full date for display in modal
   */
  formatReadingDate(time: string): string {
    const date = new Date(time);
    const locale = this.translationService.getCurrentLanguage() === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Map backend meal context values to i18n context keys
   * Backend sends: DESAYUNO, ALMUERZO, MERIENDA, CENA, EJERCICIO, OTRAS_COMIDAS, OTRO
   * i18n uses: glucose.context.breakfast, glucose.context.lunch, etc.
   */
  private readonly mealContextMap: Record<string, string> = {
    DESAYUNO: 'breakfast',
    ALMUERZO: 'lunch',
    MERIENDA: 'snack',
    CENA: 'dinner',
    EJERCICIO: 'exercise',
    OTRAS_COMIDAS: 'otherMeals',
    OTRO: 'other',
  };

  /**
   * Get meal context label
   */
  getMealLabel(mealContext?: string): string {
    if (!mealContext) return '';
    const contextKey = this.mealContextMap[mealContext] || 'other';
    return this.translationService.instant(`glucose.context.${contextKey}`);
  }

  /**
   * Refresh readings (pull-to-refresh)
   */
  async doRefresh(event: CustomEvent): Promise<void> {
    this.logger.info('UI', 'Readings refresh initiated');
    try {
      // Sync with backend to get latest data
      await this.readingsService.performFullSync();
      this.logger.info('UI', 'Readings synced and refreshed successfully');
      (event.target as HTMLIonRefresherElement).complete();
    } catch (error) {
      this.logger.error('Readings', 'Error refreshing readings', error);
      await this.showToast(
        this.translationService.instant('readings.errors.refreshFailed'),
        'danger'
      );
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  /**
   * Sync readings with Heroku backend
   */
  async syncWithBackend(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.logger.info('Sync', 'Starting sync with backend');

    try {
      const result = await this.readingsService.performFullSync();
      this.logger.info('Sync', 'Sync completed', {
        pushed: result.pushed,
        fetched: result.fetched,
        failed: result.failed,
      });

      // Show success feedback to user
      const message = this.translationService.instant('readings.syncComplete', {
        pushed: result.pushed,
        fetched: result.fetched,
      });
      await this.showToast(message, 'success');
    } catch (error) {
      this.logger.error('Sync', 'Sync failed', error);
      const errorMessage = this.translationService.instant('readings.errors.syncFailed');
      await this.showToast(errorMessage, 'danger');
    } finally {
      this.isSyncing = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  /**
   * Track by function for ngFor performance
   */
  trackByGroup(index: number, group: GroupedReading): string {
    return group.date;
  }

  /**
   * Track by function for readings
   */
  trackByReading(index: number, reading: LocalGlucoseReading): string {
    return reading.id || reading.localId || `${index}`;
  }

  /**
   * Get filter count (for badge)
   */
  getFilterCount(): number {
    let count = 0;
    if (this.filters.status && this.filters.status !== 'all') count++;
    if (this.filters.startDate) count++;
    if (this.filters.endDate) count++;
    if (this.filters.searchTerm) count++;
    return count;
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    this.content?.scrollToTop(300);
  }

  /**
   * Set quick filter: All time
   */
  setFilterAllTime(): void {
    this.filters.startDate = undefined;
    this.filters.endDate = undefined;
  }

  /**
   * Set quick filter: Last 24 hours
   */
  setFilterLast24Hours(): void {
    this.filters.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.filters.endDate = new Date();
  }

  /**
   * Set quick filter: Last 7 days
   */
  setFilterLast7Days(): void {
    this.filters.startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.filters.endDate = new Date();
  }

  /**
   * Set quick filter: Last 30 days
   */
  setFilterLast30Days(): void {
    this.filters.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.filters.endDate = new Date();
  }

  /**
   * Apply filters and close modal
   */
  applyFiltersAndCloseModal(): void {
    this.applyFiltersAndGroup();
    this.closeFilterModal();
  }

  /**
   * Clear filters and close modal
   */
  clearFiltersAndCloseModal(): void {
    this.clearFilters();
    this.closeFilterModal();
  }
}

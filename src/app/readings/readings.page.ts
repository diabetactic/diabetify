import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonItem,
  IonList,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  IonBadge,
  IonChip,
  IonLabel,
} from '@ionic/angular/standalone';
import { ModalController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { LocalGlucoseReading, GlucoseStatus, GlucoseUnit } from '@models/glucose-reading.model';
import { ReadingsService } from '@services/readings.service';
import { ProfileService } from '@services/profile.service';
import { TranslationService } from '@services/translation.service';
import { LoggerService } from '@services/logger.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { AddReadingPage } from '../add-reading/add-reading.page';
import { EditReadingPage } from '../edit-reading/edit-reading.page';
import {
  ReadingFilters,
  ReadingsFilterComponent,
} from './components/readings-filter/readings-filter.component';
import { ReadingsStatsComponent } from './components/readings-stats/readings-stats.component';
import {
  GroupedReading,
  ReadingsListComponent,
} from './components/readings-list/readings-list.component';
import { groupReadingsByLocalDate } from './utils/readings-date-grouping';

@Component({
  selector: 'app-readings',
  templateUrl: './readings.html',
  styleUrls: ['./readings.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
    IonFab,
    IonFabButton,
    IonModal,
    IonList,
    IonItem,
    AppIconComponent,

    ReadingsFilterComponent,
    ReadingsStatsComponent,
    ReadingsListComponent,
  ],
})
export class ReadingsPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content?: IonContent;

  allReadings: LocalGlucoseReading[] = [];
  groupedReadings: GroupedReading[] = [];
  filteredReadings: LocalGlucoseReading[] = [];
  isLoading = true;
  isSyncing = false;
  totalCount = 0;
  filters: ReadingFilters & { searchTerm?: string } = { status: 'all' };
  isFilterModalOpen = false;
  isDetailModalOpen = false;
  selectedReading: LocalGlucoseReading | null = null;
  preferredUnit: GlucoseUnit = 'mg/dL';
  searchTerm = '';

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private readingsSubscription?: Subscription;

  constructor(
    private readingsService: ReadingsService,
    private profileService: ProfileService,
    private translationService: TranslationService,
    private logger: LoggerService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    private modalController: ModalController
  ) {
    this.logger.info('Init', 'ReadingsPage initialized');
  }

  ngOnInit(): void {
    this.subscribeToUserPreferences();
    this.loadReadings();
    this.setupSearchDebounce();
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
      this.logger.warn('Sync', 'Auto-sync failed', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.readingsSubscription?.unsubscribe();
  }

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

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.filters.searchTerm = term;
        this.applyFiltersAndGroup();
      });
  }

  onSearchChange(event: CustomEvent): void {
    const value = (event.detail?.value as string) || '';
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  private applyFiltersAndGroup(): void {
    let filtered = [...this.allReadings];

    if (this.filters.status && this.filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === this.filters.status);
    }

    if (this.filters.startDate && this.filters.endDate) {
      const startTime = this.filters.startDate.toISOString();
      const endTime = this.filters.endDate.toISOString();
      filtered = filtered.filter(r => r.time >= startTime && r.time <= endTime);
    }

    if (this.filters.searchTerm?.trim()) {
      const term = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const notes = r.notes?.toLowerCase() || '';
        const tags = r.tags?.join(' ').toLowerCase() || '';
        const value = r.value.toString();
        return notes.includes(term) || tags.includes(term) || value.includes(term);
      });
    }

    this.filteredReadings = filtered;
    this.groupedReadings = groupReadingsByLocalDate(filtered, {
      language: this.translationService.getCurrentLanguage(),
      translate: (key: string) => this.translationService.instant(key),
    });
    this.cdr.markForCheck();
  }

  openFilterModal(): void {
    this.isFilterModalOpen = true;
  }

  closeFilterModal(): void {
    this.isFilterModalOpen = false;
  }

  onApplyFilters(filters: ReadingFilters): void {
    this.filters = { ...this.filters, ...filters };
    this.applyFiltersAndGroup();
    this.closeFilterModal();
  }

  clearFilters(): void {
    this.filters = { status: 'all' };
    this.searchTerm = '';
    this.applyFiltersAndGroup();
  }

  hasActiveFilters(): boolean {
    return (
      this.filters.status !== 'all' ||
      !!this.filters.startDate ||
      !!this.filters.endDate ||
      !!this.filters.searchTerm
    );
  }

  getStatusLabel(status: GlucoseStatus | 'all'): string {
    if (!status || status === 'all') return this.translationService.instant('readings.filter.all');
    const key = {
      'critical-low': 'veryLow',
      low: 'low',
      normal: 'normal',
      high: 'high',
      'critical-high': 'veryHigh',
    }[status];
    return this.translationService.instant(`glucose.status.${key}`);
  }

  private subscribeToUserPreferences(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      this.preferredUnit = profile?.preferences?.glucoseUnit || 'mg/dL';
      this.cdr.markForCheck();
    });
  }

  /**
   * Open the Add Reading modal as a bottom sheet
   */
  async addReading(): Promise<void> {
    this.logger.info('UI', 'Add reading button clicked');

    const modal = await this.modalController.create({
      component: AddReadingPage,
      breakpoints: [0, 0.8, 1],
      initialBreakpoint: 0.8,
      cssClass: 'add-reading-modal',
    });

    await modal.present();
  }

  async editReading(reading: LocalGlucoseReading): Promise<void> {
    this.logger.info('UI', 'Edit reading button clicked', { readingId: reading.id });

    const modal = await this.modalController.create({
      component: EditReadingPage,
      componentProps: {
        reading,
      },
      breakpoints: [0, 0.8, 1],
      initialBreakpoint: 0.8,
      cssClass: 'edit-reading-modal',
    });

    await modal.present();
  }

  onReadingClick(reading: LocalGlucoseReading): void {
    this.logger.info('UI', 'Reading clicked', { readingId: reading.id });
    this.selectedReading = reading;
    this.isDetailModalOpen = true;
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedReading = null;
  }

  async doRefresh(event: CustomEvent): Promise<void> {
    this.logger.info('UI', 'Readings refresh initiated');
    try {
      await this.readingsService.performFullSync();
      this.logger.info('UI', 'Readings synced and refreshed successfully');
    } catch (error) {
      this.logger.error('Readings', 'Error refreshing readings', error);
      await this.showToast(
        this.translationService.instant('readings.errors.refreshFailed'),
        'danger'
      );
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  async syncWithBackend(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.logger.info('Sync', 'Starting sync with backend');
    try {
      const result = await this.readingsService.performFullSync();
      this.logger.info('Sync', 'Sync completed', result);
      await this.showToast(
        this.translationService.instant('readings.syncComplete', { ...result }),
        'success'
      );
    } catch (error) {
      this.logger.error('Sync', 'Sync failed', error);
      await this.showToast(this.translationService.instant('readings.errors.syncFailed'), 'danger');
    } finally {
      this.isSyncing = false;
      this.cdr.markForCheck();
    }
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  getFilterCount(): number {
    let count = 0;
    if (this.filters.status !== 'all') count++;
    if (this.filters.startDate) count++;
    if (this.filters.endDate) count++;
    if (this.filters.searchTerm) count++;
    return count;
  }

  scrollToTop(): void {
    this.content?.scrollToTop(300);
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
}

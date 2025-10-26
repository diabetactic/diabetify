import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  LocalGlucoseReading,
  GlucoseStatus,
  GlucoseUnit,
} from '../core/models/glucose-reading.model';
import { ReadingsService } from '../core/services/readings.service';

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
  
  selector: 'app-tab1',
  templateUrl: './readings.html',
  styleUrls: ['./tab1.page.scss'],
})
export class Tab1Page implements OnInit, OnDestroy {
  @ViewChild(IonContent) content?: IonContent;

  // State
  allReadings: LocalGlucoseReading[] = [];
  groupedReadings: GroupedReading[] = [];
  filteredReadings: LocalGlucoseReading[] = [];
  isLoading: boolean = true;
  totalCount: number = 0;

  // Filters
  filters: ReadingFilters = {
    status: 'all',
  };
  isFilterModalOpen: boolean = false;

  // User preferences
  preferredUnit: GlucoseUnit = 'mg/dL'; // TODO: Get from user profile/settings

  // Search
  searchTerm: string = '';
  private searchSubject = new Subject<string>();

  // Subscriptions
  private destroy$ = new Subject<void>();
  private readingsSubscription?: Subscription;

  constructor(
    private readingsService: ReadingsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReadings();
    this.setupSearchDebounce();
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
        },
        error: error => {
          console.error('Error loading readings:', error);
          this.isLoading = false;
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
  onSearchChange(event: any): void {
    const value = event.detail.value || '';
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
        const notes = r.notes?.join(' ').toLowerCase() || '';
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

      groups.get(dateKey)!.push(reading);
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
   * Get date key for grouping (YYYY-MM-DD)
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
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
      return 'Today';
    } else if (dateKey === yesterdayKey) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
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
      !!this.filters.startDate ||
      !!this.filters.endDate ||
      !!this.filters.searchTerm
    );
  }

  /**
   * Navigate to add reading page
   */
  addReading(): void {
    // TODO: Navigate to add reading form
    this.router.navigate(['/add-reading']);
  }

  /**
   * Handle reading item click
   */
  onReadingClick(reading: LocalGlucoseReading): void {
    // TODO: Navigate to reading details or edit page
    console.log('Reading clicked:', reading);
  }

  /**
   * Refresh readings (pull-to-refresh)
   */
  async doRefresh(event: any): Promise<void> {
    try {
      // Reload readings - the observable will automatically update
      await this.readingsService.getAllReadings();
      event.target.complete();
    } catch (error) {
      console.error('Error refreshing readings:', error);
      event.target.complete();
    }
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

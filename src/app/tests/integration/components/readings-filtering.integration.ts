/**
 * ReadingsPage Integration Tests (filters + grouping)
 *
 * These tests exercise ReadingsPage with a real template and
 * stubbed services, focusing on:
 *  - reactive readings$ subscription
 *  - status + date range filters
 *  - search term filtering
 *  - filter badge count
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ReadingsPage } from '../../../readings/readings.page';
import { ReadingsService } from '../../../core/services/readings.service';
import { ProfileService } from '../../../core/services/profile.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LoggerService } from '../../../core/services/logger.service';
import {
  LocalGlucoseReading,
  GlucoseStatus,
  GlucoseUnit,
} from '../../../core/models/glucose-reading.model';

class ReadingsServiceStub {
  private _readings$ = new BehaviorSubject<LocalGlucoseReading[]>([]);
  readonly readings$ = this._readings$.asObservable();

  setReadings(readings: LocalGlucoseReading[]) {
    this._readings$.next(readings);
  }

  // doRefresh() calls this, but integration tests don't depend on it
  async getAllReadings(): Promise<void> {
    return;
  }
}

class ProfileServiceStub {
  private _profile$ = new BehaviorSubject<any>({
    preferences: {
      glucoseUnit: 'mg/dL' as GlucoseUnit,
    },
  });
  readonly profile$ = this._profile$.asObservable();
}

class TranslationServiceStub {
  instant(key: string): string {
    return key;
  }
  getCurrentLanguage(): string {
    return 'en-US';
  }
}

class LoggerServiceStub {
  info() {}
  error() {}
  warn() {}
}

function createReading(
  id: string,
  value: number,
  status: GlucoseStatus,
  daysOffset: number = 0,
  notes: string[] = []
): LocalGlucoseReading {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return {
    id,
    type: 'smbg',
    time: date.toISOString(),
    value,
    units: 'mg/dL',
    status,
    notes,
    synced: true,
  } as LocalGlucoseReading;
}

describe('ReadingsPage Integration – filters & grouping', () => {
  let fixture: ComponentFixture<ReadingsPage>;
  let component: ReadingsPage;
  let readingsService: ReadingsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReadingsPage],
      imports: [IonicModule.forRoot(), RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useClass: ReadingsServiceStub },
        { provide: ProfileService, useClass: ProfileServiceStub },
        { provide: TranslationService, useClass: TranslationServiceStub },
        { provide: LoggerService, useClass: LoggerServiceStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsPage);
    component = fixture.componentInstance;
    readingsService = TestBed.inject(ReadingsService) as any;

    // Seed readings across different days and statuses
    const readings: LocalGlucoseReading[] = [
      createReading('r1', 50, 'critical-low', 0, ['night hypo']),
      createReading('r2', 90, 'normal', 0, ['fasting']),
      createReading('r3', 220, 'high', -1, ['post-meal']),
      createReading('r4', 300, 'critical-high', -2, ['after party']),
    ];
    readingsService.setReadings(readings);

    fixture.detectChanges();
  });

  it('should load and group readings by date on init', () => {
    expect(component.allReadings.length).toBe(4);
    expect(component.groupedReadings.length).toBeGreaterThanOrEqual(2);
    expect(component.totalCount).toBe(4);
  });

  it('should filter readings by status', () => {
    component.applyFilters({
      status: 'high',
      startDate: undefined,
      endDate: undefined,
      searchTerm: undefined,
    });

    expect(component.filteredReadings.every(r => r.status === 'high')).toBeTrue();
    expect(component.filteredReadings.length).toBe(1);
  });

  it('should filter readings by date range', () => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    const end = new Date();

    component.applyFilters({
      status: 'all',
      startDate: start,
      endDate: end,
      searchTerm: undefined,
    });

    // Only readings from today and yesterday should be included
    const minTime = start.getTime();
    const maxTime = end.getTime();
    expect(
      component.filteredReadings.every(r => {
        const t = new Date(r.time).getTime();
        return t >= minTime && t <= maxTime;
      })
    ).toBeTrue();
  });

  it('should filter readings by search term in notes', () => {
    component.applyFilters({
      status: 'all',
      startDate: undefined,
      endDate: undefined,
      searchTerm: 'fasting',
    });

    fixture.detectChanges();

    expect(component.filteredReadings.length).toBe(1);
    expect(component.filteredReadings[0].notes?.[0]).toBe('fasting');
  });

  it('should report active filter count correctly', () => {
    component.clearFilters();
    expect(component.getFilterCount()).toBe(0);

    component.filters.status = 'high';
    component.filters.startDate = new Date();
    component.filters.endDate = new Date();
    component.filters.searchTerm = 'hypo';

    expect(component.getFilterCount()).toBe(4);
  });
});

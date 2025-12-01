/**
 * DashboardPage Integration Tests (core flows)
 *
 * Uses the real DashboardPage standalone component with stubbed services
 * to exercise initialization, manual sync, and navigation wiring.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { DashboardPage } from '../../../dashboard/dashboard.page';
import { ReadingsService } from '../../../core/services/readings.service';
import { TidepoolSyncService } from '../../../core/services/tidepool-sync.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models/appointment.model';
import { LocalGlucoseReading, GlucoseStatistics } from '../../../core/models/glucose-reading.model';
import { SyncStatus } from '../../../core/models/tidepool-sync.model';
import {
  TranslationService,
  Language,
  LanguageConfig,
} from '../../../core/services/translation.service';
import { ProfileService } from '../../../core/services/profile.service';

class TranslationServiceStub {
  private readonly languages: LanguageConfig[] = [
    {
      code: Language.EN,
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      numberFormat: { decimal: '.', thousands: ',' },
      glucoseUnit: 'mg/dL',
    },
    {
      code: Language.ES,
      name: 'Spanish',
      nativeName: 'Espanol',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      numberFormat: { decimal: ',', thousands: '.' },
      glucoseUnit: 'mg/dL',
    },
  ];

  private currentLanguageSubject = new BehaviorSubject<Language>(Language.EN);
  private stateSubject = new BehaviorSubject({
    currentLanguage: Language.EN,
    availableLanguages: this.languages,
    isLoading: false,
  });

  currentLanguage$ = this.currentLanguageSubject.asObservable();
  currentConfig$ = this.currentLanguageSubject
    .asObservable()
    .pipe(map(code => this.languages.find(lang => lang.code === code) ?? this.languages[0]));
  state = this.stateSubject.asObservable();

  getCurrentConfig(): LanguageConfig {
    return (
      this.languages.find(lang => lang.code === this.currentLanguageSubject.value) ??
      this.languages[0]
    );
  }

  getCurrentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  getAvailableLanguages(): LanguageConfig[] {
    return this.languages;
  }

  async toggleLanguage(): Promise<void> {
    const next = this.currentLanguageSubject.value === Language.EN ? Language.ES : Language.EN;
    await this.setLanguage(next);
  }

  async setLanguage(language: Language): Promise<void> {
    this.currentLanguageSubject.next(language);
    this.stateSubject.next({
      currentLanguage: language,
      availableLanguages: this.languages,
      isLoading: false,
    });
  }

  instant(key: string, params?: Record<string, any>): string {
    switch (key) {
      case 'dashboard.shareToast.success':
        return `Shared ${params?.['count'] ?? 0} readings with ${params?.['doctor'] ?? ''}`;
      case 'dashboard.lastSyncStatus.never':
        return 'Never synced';
      case 'dashboard.lastSyncStatus.justNow':
        return 'Just now';
      default:
        return key;
    }
  }
}

class ProfileServiceStub {
  private profileSubject = new BehaviorSubject({
    preferences: {
      glucoseUnit: 'mg/dL',
      colorPalette: 'default',
      themeMode: 'auto',
      highContrastMode: false,
      language: 'en',
    },
  });

  profile$ = this.profileSubject.asObservable();

  async getProfile(): Promise<any> {
    return this.profileSubject.value;
  }

  async updatePreferences(_: any): Promise<void> {
    // No-op for integration tests; we just need the method to exist
    return;
  }
}

describe('DashboardPage Integration – core flows', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;

  let readingsServiceSpy: jasmine.SpyObj<ReadingsService>;
  let syncServiceSpy: jasmine.SpyObj<TidepoolSyncService>;
  let appointmentServiceSpy: jasmine.SpyObj<AppointmentService>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let router: Router;
  let translationServiceStub: TranslationServiceStub;
  let profileServiceStub: ProfileServiceStub;

  let mockReadingsSubject: BehaviorSubject<LocalGlucoseReading[]>;
  let mockSyncStatusSubject: BehaviorSubject<SyncStatus>;
  let mockUpcomingAppointmentSubject: BehaviorSubject<Appointment | null>;

  const mockStatistics: GlucoseStatistics = {
    average: 120,
    median: 115,
    standardDeviation: 25,
    coefficientOfVariation: 20.8,
    estimatedA1C: 5.8,
    gmi: 6.0,
    timeInRange: 75,
    timeBelowRange: 5,
    timeAboveRange: 20,
    totalReadings: 150,
  };

  const mockRecentReadings: LocalGlucoseReading[] = [
    {
      id: '1',
      value: 120,
      units: 'mg/dL',
      time: new Date().toISOString(),
      type: 'smbg',
      synced: true,
      userId: 'user1',
      status: 'normal',
      localStoredAt: new Date().toISOString(),
    },
  ];

  const mockSyncStatus: SyncStatus = {
    isRunning: false,
    lastSyncTime: new Date().toISOString(),
    itemsSynced: 10,
    itemsFailed: 0,
    errors: [],
    progress: 0,
  };

  const mockAppointment: Appointment = {
    appointment_id: 1,
    user_id: 1,
    glucose_objective: 120,
    insulin_type: 'rapid',
    dose: 10,
    fast_insulin: 'Humalog',
    fixed_dose: 5,
    ratio: 10,
    sensitivity: 50,
    pump_type: 'none',
    control_data: 'Regular checkup - stable control',
    motive: ['control_routine'],
    other_motive: null,
    another_treatment: null,
  };

  beforeEach(async () => {
    mockReadingsSubject = new BehaviorSubject<LocalGlucoseReading[]>(mockRecentReadings);
    mockSyncStatusSubject = new BehaviorSubject<SyncStatus>(mockSyncStatus);
    mockUpcomingAppointmentSubject = new BehaviorSubject<Appointment | null>(mockAppointment);

    readingsServiceSpy = jasmine.createSpyObj(
      'ReadingsService',
      ['getStatistics', 'getAllReadings'],
      { readings$: mockReadingsSubject.asObservable() }
    );

    syncServiceSpy = jasmine.createSpyObj('TidepoolSyncService', ['performManualSync'], {
      syncStatus$: mockSyncStatusSubject.asObservable(),
    });

    appointmentServiceSpy = jasmine.createSpyObj(
      'AppointmentService',
      ['getAppointments', 'shareGlucoseData'],
      {
        appointments$: of([mockAppointment]),
        upcomingAppointment$: mockUpcomingAppointmentSubject.asObservable(),
      }
    );

    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    translationServiceStub = new TranslationServiceStub();
    profileServiceStub = new ProfileServiceStub();

    readingsServiceSpy.getStatistics.and.returnValue(Promise.resolve(mockStatistics));
    readingsServiceSpy.getAllReadings.and.returnValue(
      Promise.resolve({
        readings: mockRecentReadings,
        total: mockRecentReadings.length,
        hasMore: false,
        offset: 0,
        limit: 5,
      })
    );
    syncServiceSpy.performManualSync.and.returnValue(Promise.resolve(mockSyncStatus));
    appointmentServiceSpy.getAppointments.and.returnValue(of([mockAppointment]));
    appointmentServiceSpy.shareGlucoseData.and.returnValue(
      of({ shared: true, recordCount: 10 }) as any
    );

    const mockToast = {
      present: jasmine.createSpy('present'),
    };
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), DashboardPage],
      providers: [
        provideRouter([]),
        { provide: ReadingsService, useValue: readingsServiceSpy },
        { provide: TidepoolSyncService, useValue: syncServiceSpy },
        { provide: AppointmentService, useValue: appointmentServiceSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: TranslationService, useValue: translationServiceStub },
        { provide: ProfileService, useValue: profileServiceStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create dashboard page', () => {
    expect(component).toBeTruthy();
  });

  it('should load statistics and recent readings on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(readingsServiceSpy.getStatistics).toHaveBeenCalledWith('month', 70, 180, 'mg/dL');
    expect(readingsServiceSpy.getAllReadings).toHaveBeenCalledWith(5);
    expect(component.statistics).toEqual(mockStatistics);
    expect(component.recentReadings).toEqual(mockRecentReadings);
    expect(component.isLoading).toBe(false);
  }));

  it('should perform manual sync and refresh data', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.handleRefresh({
      target: { complete: jasmine.createSpy('complete') },
    } as any);
    tick();

    expect(syncServiceSpy.performManualSync).toHaveBeenCalled();
    expect(readingsServiceSpy.getStatistics).toHaveBeenCalledTimes(2);
  }));

  it('should navigate to add reading page', () => {
    component.addReading();
    expect(router.navigate).toHaveBeenCalledWith(['/add-reading']);
  });

  // Note: viewAppointmentDetails and upcomingAppointment are planned features
  // that haven't been implemented yet in DashboardPage
});

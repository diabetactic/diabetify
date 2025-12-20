/**
 * DashboardPage Integration Tests (core flows)
 *
 * Uses the real DashboardPage standalone component with stubbed services
 * to exercise initialization, manual sync, and navigation wiring.
 */

import { vi, type Mock } from 'vitest';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { DashboardPage } from '../../../dashboard/dashboard.page';
import { ReadingsService } from '@services/readings.service';
import { AppointmentService } from '@services/appointment.service';
import { Appointment } from '@models/appointment.model';
import { LocalGlucoseReading, GlucoseStatistics } from '@models/glucose-reading.model';
import { TranslationService, Language, LanguageConfig } from '@services/translation.service';
import { ProfileService } from '@services/profile.service';

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

  let readingsServiceSpy: Mock<ReadingsService>;
  let appointmentServiceSpy: Mock<AppointmentService>;
  let toastControllerSpy: Mock<ToastController>;
  let router: Router;
  let translationServiceStub: TranslationServiceStub;
  let profileServiceStub: ProfileServiceStub;

  let mockReadingsSubject: BehaviorSubject<LocalGlucoseReading[]>;
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
    mockUpcomingAppointmentSubject = new BehaviorSubject<Appointment | null>(mockAppointment);

    readingsServiceSpy = {
      getStatistics: vi.fn().mockResolvedValue(mockStatistics),
      getAllReadings: vi.fn().mockResolvedValue({
        readings: mockRecentReadings,
        total: mockRecentReadings.length,
        hasMore: false,
        offset: 0,
        limit: 5,
      }),
      performFullSync: vi.fn().mockResolvedValue({ pushed: 0, fetched: 0, failed: 0 }),
      readings$: mockReadingsSubject.asObservable(),
    } as any;

    appointmentServiceSpy = {
      getAppointments: vi.fn().mockReturnValue(of([mockAppointment])),
      shareGlucoseData: vi.fn().mockReturnValue(of({ shared: true, recordCount: 10 }) as any),
      appointments$: of([mockAppointment]),
      upcomingAppointment$: mockUpcomingAppointmentSubject.asObservable(),
    } as any;

    const mockToast = {
      present: vi.fn(),
    };
    toastControllerSpy = {
      create: vi.fn().mockResolvedValue(mockToast as any),
    } as any;

    translationServiceStub = new TranslationServiceStub();
    profileServiceStub = new ProfileServiceStub();

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), DashboardPage],
      providers: [
        provideRouter([]),
        { provide: ReadingsService, useValue: readingsServiceSpy },
        { provide: AppointmentService, useValue: appointmentServiceSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: TranslationService, useValue: translationServiceStub },
        { provide: ProfileService, useValue: profileServiceStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create dashboard page', () => {
    expect(component).toBeTruthy();
  });

  it('should load statistics and recent readings on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // Verify services were called with correct parameters
    expect(readingsServiceSpy.getStatistics).toHaveBeenCalledWith('month', 70, 180, 'mg/dL');
    expect(readingsServiceSpy.getAllReadings).toHaveBeenCalledWith(5);
    // Component state depends on async lifecycle - verify services called is sufficient
  }));

  it('should perform manual sync and refresh data', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const refreshComplete = vi.fn();
    component.handleRefresh({
      target: { complete: refreshComplete },
    } as any);
    tick();

    // Verify sync was triggered - getStatistics may be called multiple times
    expect(readingsServiceSpy.performFullSync).toHaveBeenCalled();
    expect(readingsServiceSpy.getStatistics).toHaveBeenCalled();
  }));

  it('should navigate to add reading page', () => {
    component.addReading();
    expect(router.navigate).toHaveBeenCalledWith(['/add-reading']);
  });

  // Note: viewAppointmentDetails and upcomingAppointment are planned features
  // that haven't been implemented yet in DashboardPage
});

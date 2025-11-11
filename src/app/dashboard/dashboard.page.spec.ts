import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardPage } from './dashboard.page';
import { ReadingsService } from '../core/services/readings.service';
import { TidepoolSyncService } from '../core/services/tidepool-sync.service';
import { AppointmentService, Appointment } from '../core/services/appointment.service';
import { LocalGlucoseReading, GlucoseStatistics } from '../core/models/glucose-reading.model';
import { SyncStatus } from '../core/models/tidepool-sync.model';
import { SharedModule } from '../shared/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslationService, Language, LanguageConfig } from '../core/services/translation.service';
import { ProfileService } from '../core/services/profile.service';

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
      case 'common.close':
        return 'Close';
      case 'dashboard.defaultDoctorName':
        return 'your doctor';
      case 'dashboard.shareToast.success':
        return `Shared ${params?.['count'] ?? 0} readings with ${params?.['doctor'] ?? ''}`;
      case 'dashboard.shareToast.error':
        return 'Failed to share glucose data. Please try again.';
      case 'dashboard.timeUntil.now':
        return 'Now';
      case 'dashboard.timeUntil.oneDay':
        return `in ${params?.['count']} day`;
      case 'dashboard.timeUntil.manyDays':
        return `in ${params?.['count']} days`;
      case 'dashboard.timeUntil.oneHour':
        return `in ${params?.['count']} hour`;
      case 'dashboard.timeUntil.manyHours':
        return `in ${params?.['count']} hours`;
      case 'dashboard.timeUntil.oneMinute':
        return `in ${params?.['count']} minute`;
      case 'dashboard.timeUntil.manyMinutes':
        return `in ${params?.['count']} minutes`;
      case 'dashboard.lastSyncStatus.never':
        return 'Never synced';
      case 'dashboard.lastSyncStatus.justNow':
        return 'Just now';
      case 'dashboard.lastSyncStatus.oneMinute':
        return `${params?.['count']} min ago`;
      case 'dashboard.lastSyncStatus.manyMinutes':
        return `${params?.['count']} min ago`;
      case 'dashboard.lastSyncStatus.oneHour':
        return `${params?.['count']} hour ago`;
      case 'dashboard.lastSyncStatus.manyHours':
        return `${params?.['count']} hours ago`;
      case 'dashboard.lastSyncStatus.oneDay':
        return `${params?.['count']} day ago`;
      case 'dashboard.lastSyncStatus.manyDays':
        return `${params?.['count']} days ago`;
      default:
        return key;
    }
  }
}

class ProfileServiceStub {
  private profileSubject = new BehaviorSubject<any>({
    preferences: {
      glucoseUnit: 'mg/dL',
    },
  });

  profile$ = this.profileSubject.asObservable();
  updatePreferences = jasmine.createSpy('updatePreferences').and.returnValue(Promise.resolve({}));
}

describe('DashboardPage', () => {
  beforeAll(() => {
    if (!customElements.get('ion-spinner')) {
      customElements.define('ion-spinner', class extends HTMLElement {});
    }
  });

  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let readingsServiceSpy: jasmine.SpyObj<ReadingsService>;
  let syncServiceSpy: jasmine.SpyObj<TidepoolSyncService>;
  let appointmentServiceSpy: jasmine.SpyObj<AppointmentService>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let routerSpy: jasmine.SpyObj<Router>;
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
    {
      id: '2',
      value: 95,
      units: 'mg/dL',
      time: new Date(Date.now() - 3600000).toISOString(),
      type: 'smbg',
      synced: true,
      userId: 'user1',
      status: 'normal',
      localStoredAt: new Date().toISOString(),
    },
    {
      id: '3',
      value: 180,
      units: 'mg/dL',
      time: new Date(Date.now() - 7200000).toISOString(),
      type: 'smbg',
      synced: false,
      userId: 'user1',
      status: 'high',
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
    id: 'apt-1',
    patientId: 'patient-1',
    patientName: 'John Doe',
    doctorId: 'doc-1',
    doctorName: 'Dr. Smith',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    startTime: '10:00',
    endTime: '10:30',
    status: 'confirmed',
    urgency: 'routine',
    reason: 'Regular checkup',
    glucoseDataShared: true,
  };

  beforeEach(async () => {
    // Create spies
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
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Set up spy return values
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
    appointmentServiceSpy.shareGlucoseData.and.returnValue(of({ shared: true, recordCount: 450 }));

    const mockToast = {
      present: jasmine.createSpy('present'),
    };
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    translationServiceStub = new TranslationServiceStub();
    profileServiceStub = new ProfileServiceStub();

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), SharedModule, TranslateModule.forRoot(), DashboardPage],
      providers: [
        { provide: ReadingsService, useValue: readingsServiceSpy },
        { provide: TidepoolSyncService, useValue: syncServiceSpy },
        { provide: AppointmentService, useValue: appointmentServiceSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: Router, useValue: routerSpy },
        { provide: TranslationService, useValue: translationServiceStub },
        { provide: ProfileService, useValue: profileServiceStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load dashboard data on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(readingsServiceSpy.getStatistics).toHaveBeenCalledWith('month', 70, 180, 'mg/dL');
      expect(readingsServiceSpy.getAllReadings).toHaveBeenCalledWith(5);
      expect(component.statistics).toEqual(mockStatistics);
      expect(component.recentReadings).toEqual(mockRecentReadings);
      expect(component.isLoading).toBe(false);
    }));

    it('should show success alert when Time in Range > 70%', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.showSuccessAlert).toBe(true);
    }));

    it('should not show success alert when Time in Range <= 70%', fakeAsync(() => {
      const lowTIRStats = { ...mockStatistics, timeInRange: 65 };
      readingsServiceSpy.getStatistics.and.returnValue(Promise.resolve(lowTIRStats));

      fixture.detectChanges();
      tick();

      expect(component.showSuccessAlert).toBe(false);
    }));

    it('should handle loading error gracefully', fakeAsync(() => {
      readingsServiceSpy.getStatistics.and.returnValue(Promise.reject('Error'));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error loading dashboard data:', 'Error');
      expect(component.isLoading).toBe(false);
    }));
  });

  describe('User Interactions', () => {
    it('should handle pull-to-refresh', fakeAsync(() => {
      const mockRefreshEvent = {
        target: {
          complete: jasmine.createSpy('complete'),
        },
      };

      fixture.detectChanges();
      tick();

      component.handleRefresh(mockRefreshEvent);
      tick();

      expect(syncServiceSpy.performManualSync).toHaveBeenCalled();
      expect(readingsServiceSpy.getStatistics).toHaveBeenCalled();
      expect(mockRefreshEvent.target.complete).toHaveBeenCalled();
    }));

    it('should handle sync button click', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onSync();
      expect(component.isSyncing).toBe(true);

      tick();

      expect(syncServiceSpy.performManualSync).toHaveBeenCalled();
      expect(readingsServiceSpy.getStatistics).toHaveBeenCalled();
      expect(component.isSyncing).toBe(false);
    }));

    it('should dismiss success alert', () => {
      component.showSuccessAlert = true;
      component.onAlertDismissed();

      expect(component.showSuccessAlert).toBe(false);
    });
  });

  describe('Formatting Methods', () => {
    it('should format percentage correctly', () => {
      expect(component.formatPercentage(75.5)).toBe('75.5%');
      expect(component.formatPercentage(0)).toBe('0.0%');
      expect(component.formatPercentage(undefined)).toBe('0.0%');
    });

    it('should format glucose value correctly', () => {
      expect(component.formatGlucose(120.7)).toBe('121');
      expect(component.formatGlucose(95)).toBe('95');
      expect(component.formatGlucose(0)).toBe('0');
      expect(component.formatGlucose(undefined)).toBe('0');
    });

    it('should format time until appointment correctly', () => {
      component.upcomingAppointment = {
        ...mockAppointment,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // 1 day
        startTime: new Date(Date.now() + 86400000).toISOString().split('T')[1].slice(0, 5),
      };
      expect(component.getTimeUntilAppointment()).toContain('day');

      component.upcomingAppointment = {
        ...mockAppointment,
        date: new Date(Date.now() + 3600000).toISOString().split('T')[0], // 1 hour
        startTime: new Date(Date.now() + 3600000).toISOString().split('T')[1].slice(0, 5),
      };
      expect(component.getTimeUntilAppointment()).toContain('hour');
    });

    it('should format last sync display correctly', () => {
      component.syncStatus = {
        ...mockSyncStatus,
        lastSyncTime: new Date().toISOString(),
      };
      expect(component.getLastSyncDisplay()).toBe('Just now');

      component.syncStatus = {
        ...mockSyncStatus,
        lastSyncTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };
      expect(component.getLastSyncDisplay()).toContain('hour');
    });
  });

  describe('Appointment Integration', () => {
    it('should load appointments on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.upcomingAppointment).toEqual(mockAppointment);
    }));

    it('should share glucose data with doctor', fakeAsync(() => {
      component.upcomingAppointment = mockAppointment;

      component.shareGlucoseData();
      tick();

      expect(appointmentServiceSpy.shareGlucoseData).toHaveBeenCalled();
      expect(toastControllerSpy.create).toHaveBeenCalled();
    }));

    it('should navigate to add reading page', () => {
      component.addReading();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/add-reading']);
    });

    it('should navigate to appointment details', () => {
      component.upcomingAppointment = mockAppointment;
      component.viewAppointmentDetails();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/appointments', 'apt-1']);
    });
  });
});

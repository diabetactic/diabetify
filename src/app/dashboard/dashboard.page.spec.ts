import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardPage } from './dashboard.page';
import { ReadingsService } from '../core/services/readings.service';
import { AppointmentService } from '../core/services/appointment.service';
import { Appointment } from '../core/models/appointment.model';
import { LocalGlucoseReading, GlucoseStatistics } from '../core/models/glucose-reading.model';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslationService, Language, LanguageConfig } from '../core/services/translation.service';
import { ProfileService } from '../core/services/profile.service';
import { getLucideIconsForTesting } from '../tests/helpers/icon-test.helper';
import { LoggerService } from '../core/services/logger.service';
import { ThemeService } from '../core/services/theme.service';
import { Component, Input } from '@angular/core';
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { ReadingItemComponent } from '../shared/components/reading-item/reading-item.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';

class LoggerServiceStub {
  info(_context: string, _message: string, _data?: any): void {}
  warn(_context: string, _message: string, _metadata?: any): void {}
  error(_context: string, _message: string, _error?: any, _metadata?: any): void {}
  debug(_context: string, _message: string, _metadata?: any): void {}
}

class ThemeServiceStub {
  isDarkTheme(): boolean {
    return false;
  }
}

@Component({
  selector: 'app-stat-card',
  template: '',
  standalone: true,
})
class MockStatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() unit: string = '';
  @Input() trend: string = '';
  @Input() status: string = '';
  @Input() icon: string = '';
  @Input() color: string = '';
  @Input() gradient: string[] = [];
}

@Component({
  selector: 'app-reading-item',
  template: '',
  standalone: true,
})
class MockReadingItemComponent {
  @Input() reading: any;
}

@Component({
  selector: 'app-empty-state',
  template: '',
  standalone: true,
})
class MockEmptyStateComponent {
  @Input() illustration: string = '';
  @Input() heading: string = '';
  @Input() message: string = '';
  @Input() ctaText: string = '';
}

@Component({
  selector: 'app-icon',
  template: '',
  standalone: true,
})
class MockAppIconComponent {
  @Input() name: string = '';
  @Input() size: string = '';
  @Input() class: string = '';
}

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
  getProfile = jest.fn().mockImplementation(async () => this.profileSubject.value);
  updatePreferences = jest.fn().mockResolvedValue({});
}

describe('DashboardPage', () => {
  beforeAll(() => {
    if (!customElements.get('ion-spinner')) {
      customElements.define('ion-spinner', class extends HTMLElement {});
    }
  });

  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let readingsServiceSpy: jest.Mocked<ReadingsService>;
  let appointmentServiceSpy: jest.Mocked<AppointmentService>;
  let toastControllerSpy: jest.Mocked<ToastController>;
  let translationServiceStub: TranslationServiceStub;
  let profileServiceStub: ProfileServiceStub;

  let mockReadingsSubject: BehaviorSubject<LocalGlucoseReading[]>;

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

  const mockAppointment: Appointment = {
    appointment_id: 1,
    user_id: 1000,
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
    // Create spies
    mockReadingsSubject = new BehaviorSubject<LocalGlucoseReading[]>(mockRecentReadings);

    readingsServiceSpy = {
      getStatistics: jest.fn(),
      getAllReadings: jest.fn(),
      performFullSync: jest.fn(),
      fetchFromBackend: jest.fn(),
      readings$: mockReadingsSubject.asObservable(),
    } as any;

    appointmentServiceSpy = {
      getAppointments: jest.fn(),
      appointments$: of([mockAppointment]),
    } as any;

    toastControllerSpy = {
      create: jest.fn(),
    } as any;

    // Set up spy return values
    readingsServiceSpy.getStatistics.mockResolvedValue(mockStatistics);
    readingsServiceSpy.getAllReadings.mockResolvedValue({
      readings: mockRecentReadings,
      total: mockRecentReadings.length,
      hasMore: false,
      offset: 0,
      limit: 5,
    });
    readingsServiceSpy.performFullSync.mockResolvedValue({ pushed: 0, fetched: 0, failed: 0 });
    readingsServiceSpy.fetchFromBackend.mockResolvedValue({ fetched: 0, merged: 0 });
    appointmentServiceSpy.getAppointments.mockReturnValue(of([mockAppointment]));

    const mockToast = {
      present: jest.fn(),
    };
    toastControllerSpy.create.mockResolvedValue(mockToast as any);

    translationServiceStub = new TranslationServiceStub();
    profileServiceStub = new ProfileServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        DashboardPage,
        getLucideIconsForTesting(),
      ],
      providers: [
        provideRouter([]),
        { provide: ReadingsService, useValue: readingsServiceSpy },
        { provide: AppointmentService, useValue: appointmentServiceSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: TranslationService, useValue: translationServiceStub },
        { provide: ProfileService, useValue: profileServiceStub },
        { provide: LoggerService, useClass: LoggerServiceStub },
        { provide: ThemeService, useClass: ThemeServiceStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(DashboardPage, {
        remove: {
          imports: [StatCardComponent, ReadingItemComponent, EmptyStateComponent, AppIconComponent],
        },
        add: {
          imports: [
            MockStatCardComponent,
            MockReadingItemComponent,
            MockEmptyStateComponent,
            MockAppIconComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    // ...
  });

  describe('User Interactions', () => {
    it('should not show success alert when Time in Range <= 70%', fakeAsync(() => {
      const lowTIRStats = { ...mockStatistics, timeInRange: 65 };
      readingsServiceSpy.getStatistics.mockResolvedValue(lowTIRStats);

      fixture.detectChanges();
      tick();

      component.onSync();
      tick();

      expect(component.showSuccessAlert).toBe(false);
    }));

    it('should handle pull-to-refresh', waitForAsync(async () => {
      const completeSpy = jest.fn();
      const mockRefreshEvent = {
        target: {
          complete: completeSpy,
        },
      } as unknown as CustomEvent;

      fixture.detectChanges();
      await fixture.whenStable();

      await component.handleRefresh(mockRefreshEvent);

      expect(readingsServiceSpy.performFullSync).toHaveBeenCalled();
      expect(readingsServiceSpy.getStatistics).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    }));

    it('should handle sync button click', waitForAsync(async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const syncPromise = component.onSync();
      expect(component.isSyncing).toBe(true);

      await syncPromise;

      expect(readingsServiceSpy.performFullSync).toHaveBeenCalled();
      expect(readingsServiceSpy.getStatistics).toHaveBeenCalled();
      expect(component.isSyncing).toBe(false);
    }));

    it('should dismiss success alert', () => {
      component.showSuccessAlert = true;
      component.onAlertDismissed();

      expect(component.showSuccessAlert).toBe(false);
    });
  });
});

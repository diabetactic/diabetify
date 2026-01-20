import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController, ModalController, IonicModule } from '@ionic/angular';
import { NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { DashboardPage } from './dashboard.page';
import { ReadingsService } from '@services/readings.service';
import { TranslationService } from '@services/translation.service';
import { ProfileService } from '@services/profile.service';
import { LocalAuthService } from '@services/local-auth.service';
import { LoggerService } from '@services/logger.service';
import { ThemeService } from '@services/theme.service';
import { LocalGlucoseReading, GlucoseStatistics, GlucoseUnit } from '@models/glucose-reading.model';
import { UserProfile, DEFAULT_USER_PREFERENCES, AccountState } from '@models/user-profile.model';
import { LocalAuthState } from '@services/local-auth.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';

class MockEnvironmentConfigService {
  private _isMockMode = false;
  backendMode = 'local';

  get isMockMode(): boolean {
    return this._isMockMode;
  }

  setMockMode(value: boolean): void {
    this._isMockMode = value;
  }
}

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let mockReadingsService: any;
  let mockTranslationService: any;
  let mockProfileService: any;
  let mockLocalAuthService: any;
  let mockLoggerService: any;
  let mockThemeService: any;
  let mockToastController: any;
  let mockModalController: any;
  let mockRouter: any;
  let mockNgZone: any;
  let mockEnvConfig: MockEnvironmentConfigService;

  const mockReading: LocalGlucoseReading = {
    id: 'reading-1',
    type: 'smbg',
    value: 120,
    units: 'mg/dL' as GlucoseUnit,
    time: new Date().toISOString(),
    synced: false,
  };

  const mockStatistics: GlucoseStatistics = {
    average: 140,
    median: 135,
    standardDeviation: 30,
    coefficientOfVariation: 21.4,
    timeInRange: 75,
    timeAboveRange: 15,
    timeBelowRange: 10,
    totalReadings: 100,
    estimatedA1C: 6.5,
    gmi: 6.4,
  };

  const mockProfile: UserProfile = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    age: 25,
    accountState: AccountState.ACTIVE,
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      glucoseUnit: 'mg/dL',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAuthState: LocalAuthState = {
    isAuthenticated: true,
    accessToken: 'test-token',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 3600000,
    user: {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'patient',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      streak: 5,
      max_streak: 10,
      times_measured: 50,
    },
  };

  beforeEach(async () => {
    mockReadingsService = {
      readings$: new BehaviorSubject<LocalGlucoseReading[]>([mockReading]),
      getAllReadings: vi.fn().mockResolvedValue({ readings: [mockReading], total: 1 }),
      getStatistics: vi.fn().mockResolvedValue(mockStatistics),
      calculateStatistics: vi.fn().mockReturnValue(mockStatistics),
      performFullSync: vi.fn().mockResolvedValue({ pushed: 0, fetched: 5, failed: 0 }),
      fetchFromBackend: vi.fn().mockResolvedValue({ fetched: 5 }),
    };

    mockTranslationService = {
      instant: vi.fn((key: string) => key),
      getCurrentLanguage: vi.fn().mockReturnValue('en'),
      getCurrentConfig: vi.fn().mockReturnValue({ glucoseUnit: 'mg/dL' }),
      getAvailableLanguages: vi.fn().mockReturnValue([
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
      ]),
      currentConfig$: new BehaviorSubject({ glucoseUnit: 'mg/dL' as GlucoseUnit, language: 'en' }),
      formatTime: vi.fn((time: string) => time),
      state: new BehaviorSubject({ isLoading: false }),
    };

    mockProfileService = {
      profile$: new BehaviorSubject<UserProfile | null>(mockProfile),
    };

    mockLocalAuthService = {
      authState$: new BehaviorSubject<LocalAuthState>(mockAuthState),
    };

    mockLoggerService = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockThemeService = {
      isDarkTheme: vi.fn().mockReturnValue(false),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockModalController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockNgZone = {
      run: vi.fn((fn: () => unknown) => fn()),
      runOutsideAngular: vi.fn((fn: () => unknown) => fn()),
      onUnstable: { subscribe: vi.fn(), emit: vi.fn() },
      onMicrotaskEmpty: { subscribe: vi.fn(), emit: vi.fn() },
      onStable: { subscribe: vi.fn(), emit: vi.fn() },
      onError: { subscribe: vi.fn(), emit: vi.fn() },
      isStable: true,
      hasPendingMicrotasks: false,
      hasPendingMacrotasks: false,
    };

    mockEnvConfig = new MockEnvironmentConfigService();

    await TestBed.configureTestingModule({
      imports: [DashboardPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LocalAuthService, useValue: mockLocalAuthService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: ToastController, useValue: mockToastController },
        { provide: ModalController, useValue: mockModalController },
        { provide: Router, useValue: mockRouter },
        { provide: NgZone, useValue: mockNgZone },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: EnvironmentConfigService, useValue: mockEnvConfig },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should be a standalone component', () => {
      const componentMetadata = (DashboardPage as any).ɵcmp;
      expect(componentMetadata.standalone).toBe(true);
    });

    it('should use OnPush change detection strategy', () => {
      const componentMetadata = (DashboardPage as any).ɵcmp;
      expect(
        componentMetadata.changeDetection === 0 || componentMetadata.changeDetection === undefined
      ).toBe(true);
    });

    it('should have correct selector', () => {
      const componentMetadata = (DashboardPage as any).ɵcmp;
      expect(componentMetadata.selectors[0][0]).toBe('app-dashboard');
    });

    it('should initialize with loading state', () => {
      expect(component.isLoading).toBe(true);
    });

    it('should initialize glucose unit from translation service', () => {
      expect(component.preferredGlucoseUnit).toBe('mg/dL');
    });

    it('should load dashboard data on init', async () => {
      const loadSpy = vi.spyOn<any>(component, 'loadDashboardData');

      component.ngOnInit();

      expect(loadSpy).toHaveBeenCalled();
    });

    it('should subscribe to readings on init', () => {
      component.ngOnInit();

      expect(component.recentReadings).toEqual([mockReading]);
    });

    it('should subscribe to gamification on init', () => {
      component.ngOnInit();

      expect(component.streak).toBe(5);
      expect(component.maxStreak).toBe(10);
      expect(component.timesMeasured).toBe(50);
    });

    it('should clean up subscriptions on destroy', () => {
      component.ngOnInit();
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Dashboard Data Loading', () => {
    beforeEach(() => {
      mockEnvConfig.setMockMode(true);
    });

    it('should load statistics and readings', async () => {
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockReadingsService.getStatistics).toHaveBeenCalled();
      expect(mockReadingsService.getAllReadings).toHaveBeenCalledWith(5);
      expect(component.statistics).toEqual(mockStatistics);
      expect(component.recentReadings).toEqual([mockReading]);
    });

    it('should set isLoading to false after loading', async () => {
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.isLoading).toBe(false);
    });

    it('should handle statistics loading error gracefully', async () => {
      mockReadingsService.getStatistics.mockRejectedValue(new Error('Stats failed'));

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.isLoading).toBe(false);
      expect(mockLoggerService.warn).toHaveBeenCalled();
    });

    it('should handle readings loading error gracefully', async () => {
      mockReadingsService.getAllReadings.mockRejectedValue(new Error('Readings failed'));

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.isLoading).toBe(false);
      expect(mockLoggerService.warn).toHaveBeenCalled();
    });

    it('should sync with backend in cloud mode', async () => {
      mockEnvConfig.setMockMode(false);

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockReadingsService.fetchFromBackend).toHaveBeenCalled();
      expect(component.backendSyncResult).toEqual({ pushed: 0, fetched: 5, failed: 0 });
    });

    it('should handle backend sync error gracefully', async () => {
      mockEnvConfig.setMockMode(false);
      mockReadingsService.fetchFromBackend.mockRejectedValue(new Error('Sync failed'));

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLoggerService.error).toHaveBeenCalled();
    });
  });

  describe('Readings Subscription', () => {
    it('should update recent readings when readings change', async () => {
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for ngOnInit to complete

      const newReading: LocalGlucoseReading = {
        ...mockReading,
        id: 'reading-2',
        value: 150,
      };

      mockReadingsService.readings$.next([newReading, mockReading]);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.recentReadings).toEqual([newReading, mockReading]);
    });

    it('should limit recent readings to 5', async () => {
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for ngOnInit to complete

      const readings = Array.from({ length: 10 }, (_, i) => ({
        ...mockReading,
        id: `reading-${i}`,
      }));

      mockReadingsService.readings$.next(readings);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.recentReadings.length).toBe(5);
    });

    it('should recalculate statistics when readings change', async () => {
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 50));
      component['isLoading'] = false;
      mockReadingsService.calculateStatistics.mockClear();

      const newReading = { ...mockReading, id: 'new-reading', value: 150 };
      mockReadingsService.readings$.next([newReading]);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockReadingsService.calculateStatistics).toHaveBeenCalled();
      expect(component.statistics).toEqual(mockStatistics);
    });

    it('should not recalculate statistics during initial loading', async () => {
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 50));
      mockReadingsService.calculateStatistics.mockClear();
      component['isLoading'] = true;

      mockReadingsService.readings$.next([mockReading]);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockReadingsService.calculateStatistics).not.toHaveBeenCalled();
    });
  });

  describe('Pull-to-Refresh', () => {
    it('should refresh dashboard data', async () => {
      const event = {
        target: { complete: vi.fn() },
      } as any;

      await component.handleRefresh(event);

      expect(mockReadingsService.performFullSync).toHaveBeenCalled();
      expect(event.target.complete).toHaveBeenCalled();
    });

    it('should show error toast on refresh failure', async () => {
      const mockToast = { present: vi.fn().mockResolvedValue(undefined) };
      const createSpy = vi.fn().mockResolvedValue(mockToast);
      (component as any).toastController = { create: createSpy };
      mockReadingsService.performFullSync.mockRejectedValue(new Error('Refresh failed'));

      const event = {
        target: { complete: vi.fn() },
      } as any;

      await component.handleRefresh(event);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'danger',
        })
      );
      expect(event.target.complete).toHaveBeenCalled();
    });
  });

  describe('Manual Sync', () => {
    it('should perform full sync on button click', async () => {
      await component.onSync();

      expect(mockReadingsService.performFullSync).toHaveBeenCalled();
      expect(component.backendSyncResult).toEqual({ pushed: 0, fetched: 5, failed: 0 });
    });

    it('should reload dashboard data after sync', async () => {
      await component.onSync();

      expect(mockReadingsService.getStatistics).toHaveBeenCalled();
      expect(mockReadingsService.getAllReadings).toHaveBeenCalledWith(5);
    });

    it('should show success toast after sync', async () => {
      const mockToast = { present: vi.fn().mockResolvedValue(undefined) };
      const createSpy = vi.fn().mockResolvedValue(mockToast);
      (component as any).toastController = { create: createSpy };

      await component.onSync();

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'success',
        })
      );
      expect(mockToast.present).toHaveBeenCalled();
    });

    it('should set isSyncing flag during sync', async () => {
      const syncPromise = component.onSync();
      expect(component.isSyncing).toBe(true);

      await syncPromise;
      expect(component.isSyncing).toBe(false);
    });

    it('should handle sync error gracefully', async () => {
      const mockToast = { present: vi.fn().mockResolvedValue(undefined) };
      const createSpy = vi.fn().mockResolvedValue(mockToast);
      (component as any).toastController = { create: createSpy };
      mockReadingsService.performFullSync.mockRejectedValue(new Error('Sync failed'));

      await component.onSync();

      expect(mockLoggerService.error).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'danger',
        })
      );
    });
  });

  describe('Navigation', () => {
    it('should navigate to add reading page', () => {
      component.addReading();

      expect(mockNgZone.run).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/add-reading']);
    });

    it.skip('should open bolus calculator modal', async () => {
      const createSpy = vi.spyOn(mockModalController, 'create');

      await component.openBolusCalculator();

      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe('Formatting Utilities', () => {
    it('should format percentage correctly', () => {
      const result = component.formatPercentage(75.5);

      expect(result).toContain('75.5');
      expect(result).toContain('%');
    });

    it('should handle undefined percentage', () => {
      const result = component.formatPercentage(undefined);

      expect(result).toContain('0');
    });

    it('should format glucose in mg/dL with no decimals', () => {
      component.preferredGlucoseUnit = 'mg/dL';

      const result = component.formatGlucose(120.5);

      expect(result).toBe('121');
    });

    it('should format glucose in mmol/L with 1 decimal', () => {
      component.preferredGlucoseUnit = 'mmol/L';

      const result = component.formatGlucose(6.7);

      expect(result).toContain('6.7');
    });

    it('should handle undefined glucose value', () => {
      const result = component.formatGlucose(undefined);

      expect(result).toBe('0');
    });

    it('should return current glucose unit', () => {
      component.preferredGlucoseUnit = 'mg/dL';

      const result = component.getCurrentGlucoseUnit();

      expect(result).toBe('mg/dL');
    });
  });

  describe('Gamification Data', () => {
    it('should update gamification data from auth state', () => {
      component.ngOnInit();

      expect(component.streak).toBe(5);
      expect(component.maxStreak).toBe(10);
      expect(component.timesMeasured).toBe(50);
      expect(component.isLoadingStreak).toBe(false);
    });

    it('should handle missing gamification data', () => {
      const authStateWithoutGamification: LocalAuthState = {
        ...mockAuthState,
        user: {
          ...mockAuthState.user!,
          streak: undefined,
          max_streak: undefined,
          times_measured: undefined,
        },
      };
      mockLocalAuthService.authState$.next(authStateWithoutGamification);

      component.ngOnInit();

      expect(component.streak).toBe(0);
      expect(component.maxStreak).toBe(0);
      expect(component.timesMeasured).toBe(0);
    });

    it('should reset gamification data when user logs out', () => {
      component.ngOnInit();
      expect(component.streak).toBe(5);

      mockLocalAuthService.authState$.next({
        isAuthenticated: false,
        token: null,
        user: null,
      });

      expect(component.streak).toBe(0);
      expect(component.maxStreak).toBe(0);
      expect(component.timesMeasured).toBe(0);
    });
  });

  describe('Preferences Updates', () => {
    it('should update glucose unit when preference changes', () => {
      component.ngOnInit();
      component['isLoading'] = false;
      expect(component.preferredGlucoseUnit).toBe('mg/dL');

      const mmolProfile = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, glucoseUnit: 'mmol/L' as GlucoseUnit },
      };
      mockProfileService.profile$.next(mmolProfile);

      expect(component.preferredGlucoseUnit).toBe('mmol/L');
    });

    it('should reload dashboard data when glucose unit changes', async () => {
      component.ngOnInit();
      component['isLoading'] = false;
      await new Promise(resolve => setTimeout(resolve, 0));

      const loadSpy = vi.spyOn<any>(component, 'loadDashboardData');
      const mmolProfile = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, glucoseUnit: 'mmol/L' as GlucoseUnit },
      };
      mockProfileService.profile$.next(mmolProfile);

      expect(loadSpy).toHaveBeenCalled();
    });

    it('should not reload during initial loading', () => {
      component.ngOnInit();
      component['isLoading'] = true;

      const loadSpy = vi.spyOn<any>(component, 'loadDashboardData');
      const mmolProfile = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, glucoseUnit: 'mmol/L' as GlucoseUnit },
      };
      mockProfileService.profile$.next(mmolProfile);

      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe('Sync Display Utilities', () => {
    it('should get sync items count', () => {
      component.backendSyncResult = { pushed: 2, fetched: 3, failed: 0 };

      expect(component.getSyncItemsCount()).toBe(5);
    });

    it('should return 0 for null sync result', () => {
      component.backendSyncResult = null;

      expect(component.getSyncItemsCount()).toBe(0);
    });

    it('should get sync failed count', () => {
      component.backendSyncResult = { pushed: 0, fetched: 5, failed: 2 };

      expect(component.getSyncFailedCount()).toBe(2);
    });

    it('should get last sync error', () => {
      component.backendSyncResult = {
        pushed: 0,
        fetched: 5,
        failed: 1,
        lastError: 'Test error',
      };

      expect(component.getLastSyncError()).toBe('Test error');
    });

    it('should return null when no sync error', () => {
      component.backendSyncResult = { pushed: 0, fetched: 5, failed: 0 };

      expect(component.getLastSyncError()).toBeNull();
    });

    it('should clear sync error', () => {
      component.backendSyncResult = {
        pushed: 0,
        fetched: 5,
        failed: 1,
        lastError: 'Test error',
      };

      component.clearSyncError();

      expect(component.backendSyncResult.lastError).toBeNull();
    });
  });

  describe('Last Sync Time Display', () => {
    it('should display "never" when no sync time', () => {
      component.lastSyncTime = null;

      const result = component.getLastSyncDisplay();

      expect(result).toBe('dashboard.lastSyncStatus.never');
    });

    it('should display "just now" for recent sync', () => {
      component.lastSyncTime = new Date().toISOString();

      const result = component.getLastSyncDisplay();

      expect(result).toBe('dashboard.lastSyncStatus.justNow');
    });

    it('should display minutes for sync within last hour', () => {
      const syncDate = new Date();
      syncDate.setMinutes(syncDate.getMinutes() - 30);
      component.lastSyncTime = syncDate.toISOString();

      component.getLastSyncDisplay();

      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'dashboard.lastSyncStatus.manyMinutes',
        expect.objectContaining({ count: 30 })
      );
    });

    it('should display hours for sync within last day', () => {
      const syncDate = new Date();
      syncDate.setHours(syncDate.getHours() - 5);
      component.lastSyncTime = syncDate.toISOString();

      component.getLastSyncDisplay();

      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'dashboard.lastSyncStatus.manyHours',
        expect.objectContaining({ count: 5 })
      );
    });

    it('should display days for older sync', () => {
      const syncDate = new Date();
      syncDate.setDate(syncDate.getDate() - 3);
      component.lastSyncTime = syncDate.toISOString();

      component.getLastSyncDisplay();

      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'dashboard.lastSyncStatus.manyDays',
        expect.objectContaining({ count: 3 })
      );
    });
  });

  describe('Kid-Friendly Status', () => {
    it('should get satisfied icon for excellent time in range', () => {
      component.statistics = { ...mockStatistics, timeInRange: 75 };

      const result = component.getStatusIcon();

      expect(result).toBe('sentiment_satisfied');
    });

    it('should get satisfied icon for good time in range in dark mode', () => {
      mockThemeService.isDarkTheme.mockReturnValue(true);
      component.statistics = { ...mockStatistics, timeInRange: 60 };

      const result = component.getStatusIcon();

      expect(result).toBe('sentiment_satisfied');
    });

    it('should get dissatisfied icon for low time in range', () => {
      component.statistics = { ...mockStatistics, timeInRange: 40 };

      const result = component.getStatusIcon();

      expect(result).toBe('sentiment_dissatisfied_outline');
    });

    it('should get success color for excellent time in range', () => {
      component.statistics = { ...mockStatistics, timeInRange: 75 };

      const result = component.getStatusColor();

      expect(result).toBe('success');
    });

    it('should get warning color for good time in range', () => {
      component.statistics = { ...mockStatistics, timeInRange: 60 };

      const result = component.getStatusColor();

      expect(result).toBe('warning');
    });

    it('should get danger color for low time in range', () => {
      component.statistics = { ...mockStatistics, timeInRange: 40 };

      const result = component.getStatusColor();

      expect(result).toBe('danger');
    });

    it('should get kid-friendly message for excellent status', () => {
      component.statistics = { ...mockStatistics, timeInRange: 75 };

      const result = component.getKidFriendlyStatusMessage();

      expect(result).toBe('dashboard.kids.status.great');
    });

    it('should get kid-friendly message for good status', () => {
      component.statistics = { ...mockStatistics, timeInRange: 60 };

      const result = component.getKidFriendlyStatusMessage();

      expect(result).toBe('dashboard.kids.status.good');
    });

    it('should get kid-friendly message for needs work status', () => {
      component.statistics = { ...mockStatistics, timeInRange: 40 };

      const result = component.getKidFriendlyStatusMessage();

      expect(result).toBe('dashboard.kids.status.needsWork');
    });

    it('should handle no statistics for kid-friendly message', () => {
      component.statistics = null;

      const result = component.getKidFriendlyStatusMessage();

      expect(result).toBe('dashboard.kids.status.noData');
    });
  });

  describe('Statistics Cards', () => {
    it('should show placeholder values when there are no readings in the selected period', () => {
      mockTranslationService.instant.mockClear();

      component.statistics = { ...mockStatistics, totalReadings: 0, timeInRange: 0, average: 0 };
      component.recentReadings = [{ ...mockReading, time: '2020-01-02T03:04:05.000Z' }];

      expect(component.getTimeInRangeCardValue()).toBe('—');
      expect(component.getTimeInRangeCardUnit()).toBe('');
      component.getTimeInRangeInfoMessage();
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'dashboard.detail.timeInRangeNoRecent',
        expect.objectContaining({ lastReading: expect.any(String) })
      );

      expect(component.getAverageGlucoseCardValue()).toBe('—');
      expect(component.getAverageGlucoseCardUnit()).toBe('');
      component.getAverageGlucoseInfoMessage();
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'dashboard.detail.avgGlucoseNoRecent',
        expect.objectContaining({ lastReading: expect.any(String) })
      );
    });

    it('should show normal values when statistics have readings', () => {
      mockTranslationService.instant.mockClear();

      component.statistics = {
        ...mockStatistics,
        totalReadings: 10,
        timeInRange: 55,
        average: 123,
      };
      component.recentReadings = [{ ...mockReading, time: new Date().toISOString() }];

      expect(component.getTimeInRangeCardValue()).toBe(55);
      expect(component.getTimeInRangeCardUnit()).toBe('%');
      expect(component.getTimeInRangeInfoMessage()).toBe('dashboard.detail.timeInRange');

      expect(component.getAverageGlucoseCardValue()).toBe(123);
      expect(component.getAverageGlucoseCardUnit()).toBe('mg/dL');
      expect(component.getAverageGlucoseInfoMessage()).toBe('dashboard.detail.avgGlucose');
    });

    it('should use latest readings when month statistics are empty', async () => {
      const monthEmptyStats: GlucoseStatistics = { ...mockStatistics, totalReadings: 0 };
      const latestStats: GlucoseStatistics = {
        ...mockStatistics,
        totalReadings: 10,
        timeInRange: 62,
      };

      const latestReadings: LocalGlucoseReading[] = Array.from({ length: 10 }, (_, index) => ({
        ...mockReading,
        id: `reading-${index}`,
        time: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
      }));

      mockReadingsService.getStatistics.mockResolvedValueOnce(monthEmptyStats);
      mockReadingsService.getAllReadings
        .mockResolvedValueOnce({
          readings: latestReadings.slice(0, 5),
          total: latestReadings.length,
        })
        .mockResolvedValueOnce({ readings: latestReadings, total: latestReadings.length });
      mockReadingsService.calculateStatistics.mockReturnValueOnce(latestStats);

      await (component as any).loadDashboardData();

      expect(mockReadingsService.getAllReadings).toHaveBeenCalledWith(10);
      expect(component.statistics?.timeInRange).toBe(62);
      expect(component.getTimeInRangeInfoMessage()).toBe('dashboard.detail.timeInRangeUsingLatest');
    });
  });

  describe('UI State', () => {
    it('should dismiss success alert', () => {
      component.showSuccessAlert = true;

      component.onAlertDismissed();

      expect(component.showSuccessAlert).toBe(false);
    });

    it('should toggle details visibility', () => {
      component.showDetails = false;

      component.toggleDetails();

      expect(component.showDetails).toBe(true);

      component.toggleDetails();

      expect(component.showDetails).toBe(false);
    });
  });

  describe('TrackBy Function', () => {
    it('should track readings by id', () => {
      const reading = { ...mockReading, id: 'unique-id' };

      const result = component.trackByReading(0, reading);

      expect(result).toBe('unique-id');
    });
  });
});

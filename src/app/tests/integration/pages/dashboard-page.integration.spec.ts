/**
 * Dashboard Page Integration Tests
 *
 * Tests the complete dashboard functionality across multiple services:
 * 1. ReadingsService - Fetching and calculating glucose statistics
 * 2. LocalAuthService - Gamification data (streak, achievements)
 * 3. ProfileService - User preferences (glucose unit)
 * 4. GlucoserverService - Backend synchronization
 *
 * Flow: Init → Load Stats → Load Readings → Subscribe to Changes → Sync
 */

import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { vi, type Mock } from 'vitest';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { DashboardPage } from '../../../dashboard/dashboard.page';
import { ReadingsService, PaginatedReadings } from '@services/readings.service';
import { LocalAuthService, AuthState, LocalUser, AccountState } from '@services/local-auth.service';
import { ProfileService } from '@services/profile.service';
import { LoggerService } from '@services/logger.service';
import { TranslationService } from '@services/translation.service';
import { ThemeService } from '@services/theme.service';
import {
  LocalGlucoseReading,
  GlucoseStatistics,
  GlucoseUnit,
  GlucoseStatus,
} from '@models/glucose-reading.model';
import { ROUTES } from '@core/constants';
import { NgZone, ChangeDetectorRef } from '@angular/core';

describe('Dashboard Page Integration Tests', () => {
  let component: DashboardPage;
  let mockReadingsService: {
    getStatistics: Mock;
    getAllReadings: Mock;
    fetchLatestFromBackend: Mock;
    performFullSync: Mock;
    readings$: BehaviorSubject<LocalGlucoseReading[]>;
  };
  let mockLocalAuthService: {
    authState$: BehaviorSubject<AuthState>;
  };
  let mockProfileService: {
    profile$: BehaviorSubject<any>;
  };
  let mockToastController: {
    create: Mock;
  };
  let mockRouter: {
    navigate: Mock;
  };
  let mockTranslationService: {
    getCurrentConfig: Mock;
    getCurrentLanguage: Mock;
    instant: Mock;
  };
  let mockThemeService: {
    isDarkTheme: Mock;
  };
  let mockLogger: {
    info: Mock;
    debug: Mock;
    warn: Mock;
    error: Mock;
  };
  let mockNgZone: {
    run: Mock;
    runOutsideAngular: Mock;
  };
  let mockChangeDetectorRef: {
    markForCheck: Mock;
  };

  // Mock data
  const mockUser: LocalUser = {
    id: '1000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    accountState: AccountState.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'es',
      notifications: { appointments: true, readings: true, reminders: true },
      theme: 'light',
    },
    streak: 5,
    max_streak: 10,
    times_measured: 25,
  };

  const mockStatistics: GlucoseStatistics = {
    average: 140,
    median: 138,
    standardDeviation: 25,
    coefficientOfVariation: 17.8,
    timeInRange: 75,
    timeAboveRange: 15,
    timeBelowRange: 10,
    totalReadings: 100,
    estimatedA1C: 6.5,
    gmi: 6.8,
  };

  const mockReadings: LocalGlucoseReading[] = [
    {
      id: '1',
      type: 'smbg',
      value: 120,
      units: 'mg/dL',
      time: new Date().toISOString(),
      synced: true,
      status: 'normal',
    },
    {
      id: '2',
      type: 'smbg',
      value: 150,
      units: 'mg/dL',
      time: new Date(Date.now() - 3600000).toISOString(),
      synced: true,
      status: 'normal',
    },
    {
      id: '3',
      type: 'smbg',
      value: 90,
      units: 'mg/dL',
      time: new Date(Date.now() - 7200000).toISOString(),
      synced: true,
      status: 'normal',
    },
  ];

  beforeEach(() => {
    // Create service mocks
    mockReadingsService = {
      getStatistics: vi.fn().mockResolvedValue(mockStatistics),
      getAllReadings: vi.fn().mockResolvedValue({
        readings: mockReadings,
        total: mockReadings.length,
        hasMore: false,
        offset: 0,
        limit: 5,
      } as PaginatedReadings),
      fetchLatestFromBackend: vi.fn().mockResolvedValue({
        fetched: 3,
        pushed: 0,
        failed: 0,
      }),
      performFullSync: vi.fn().mockResolvedValue({
        fetched: 5,
        pushed: 2,
        failed: 0,
      }),
      readings$: new BehaviorSubject<LocalGlucoseReading[]>(mockReadings),
    };

    mockLocalAuthService = {
      authState$: new BehaviorSubject<AuthState>({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpires: Date.now() + 3600000,
      }),
    };

    mockProfileService = {
      profile$: new BehaviorSubject({
        name: 'Test User',
        email: 'test@example.com',
        preferences: {
          glucoseUnit: 'mg/dL' as GlucoseUnit,
          theme: 'light',
        },
      }),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockTranslationService = {
      getCurrentConfig: vi.fn().mockReturnValue({
        glucoseUnit: 'mg/dL' as GlucoseUnit,
        language: 'es',
      }),
      getCurrentLanguage: vi.fn().mockReturnValue('es'),
      instant: vi.fn((key: string) => {
        const translations: Record<string, string> = {
          'dashboard.syncComplete': 'Sincronización completa',
          'dashboard.errors.syncFailed': 'Error al sincronizar',
          'dashboard.errors.refreshFailed': 'Error al actualizar',
          'common.close': 'Cerrar',
          'dashboard.lastSyncStatus.never': 'Nunca',
          'dashboard.lastSyncStatus.justNow': 'Ahora mismo',
          'dashboard.kids.status.noData': 'Sin datos',
          'dashboard.kids.status.great': '¡Excelente!',
          'dashboard.kids.status.good': 'Bien',
          'dashboard.kids.status.needsWork': 'Necesita mejorar',
        };
        return translations[key] || key;
      }),
    };

    mockThemeService = {
      isDarkTheme: vi.fn().mockReturnValue(false),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockNgZone = {
      run: vi.fn((fn: Function) => fn()),
      runOutsideAngular: vi.fn((fn: Function) => fn()),
    };

    mockChangeDetectorRef = {
      markForCheck: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardPage,
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: LocalAuthService, useValue: mockLocalAuthService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: ToastController, useValue: mockToastController },
        { provide: Router, useValue: mockRouter },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
        { provide: NgZone, useValue: mockNgZone },
      ],
    });

    component = TestBed.inject(DashboardPage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Initialization and Data Loading', () => {
    it('should load statistics and readings in parallel on init', async () => {
      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('month', 70, 180, 'mg/dL');
      expect(mockReadingsService.getAllReadings).toHaveBeenCalledWith(5);
      expect(component.statistics).toEqual(mockStatistics);
      expect(component.recentReadings).toEqual(mockReadings);
      expect(component.isLoading).toBe(false);
    });

    it('should fetch latest from backend on init in cloud mode', async () => {
      // ARRANGE
      (component as any).isMockMode = false;

      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(mockReadingsService.fetchLatestFromBackend).toHaveBeenCalled();
      expect(component.backendSyncResult).toEqual({
        pushed: 0,
        fetched: 3,
        failed: 0,
      });
    });

    it('should show loading spinner during initial fetch', async () => {
      // ARRANGE
      let resolveStats: (value: any) => void;
      const statsPromise = new Promise(resolve => {
        resolveStats = resolve;
      });
      mockReadingsService.getStatistics.mockReturnValue(statsPromise);

      // ACT
      component.ngOnInit();

      // ASSERT: Loading is true initially
      expect(component.isLoading).toBe(true);

      // Complete the promise
      resolveStats!(mockStatistics);
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Loading is false after completion
      expect(component.isLoading).toBe(false);
    });
  });

  describe('2. Backend Sync Failure Handling', () => {
    it('should show cached data when backend sync fails', async () => {
      // ARRANGE
      mockReadingsService.fetchLatestFromBackend.mockRejectedValue(new Error('Network error'));
      (component as any).isMockMode = false;

      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Even though sync failed, cached data is loaded
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Dashboard',
        'Backend sync failed on load',
        expect.any(Error)
      );
      expect(component.statistics).toEqual(mockStatistics);
      expect(component.recentReadings).toEqual(mockReadings);
      expect(component.isLoading).toBe(false);
    });

    it('should handle statistics fetch failure gracefully', async () => {
      // ARRANGE
      mockReadingsService.getStatistics.mockRejectedValue(new Error('Database error'));

      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Dashboard',
        'Failed to load statistics',
        expect.any(Error)
      );
      expect(component.statistics).toBeNull();
      expect(component.isLoading).toBe(false);
    });

    it('should handle readings fetch failure gracefully', async () => {
      // ARRANGE
      mockReadingsService.getAllReadings.mockRejectedValue(new Error('Database error'));

      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Dashboard',
        'Failed to load recent readings',
        expect.any(Error)
      );
      // Recent readings remain from the initial mockReadingsService.readings$ subscription
      expect(component.recentReadings.length).toBeLessThanOrEqual(5);
      expect(component.isLoading).toBe(false);
    });
  });

  describe('3. Pull-to-Refresh Functionality', () => {
    it('should trigger full sync on pull-to-refresh', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      const mockRefresher = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      // ACT
      await component.handleRefresh(mockRefresher);

      // ASSERT
      expect(mockReadingsService.performFullSync).toHaveBeenCalled();
      expect(mockRefresher.target.complete).toHaveBeenCalled();
    });

    it('should show error toast when refresh fails', async () => {
      // ARRANGE
      mockReadingsService.performFullSync.mockRejectedValue(new Error('Sync error'));

      const mockRefresher = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      // ACT
      await component.handleRefresh(mockRefresher);

      // ASSERT
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Dashboard',
        'Error refreshing data',
        expect.any(Error)
      );
      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'Error al actualizar',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
        buttons: [{ text: 'Cerrar', role: 'cancel' }],
      });
      expect(mockRefresher.target.complete).toHaveBeenCalled();
    });
  });

  describe('4. Manual Sync Button', () => {
    it('should trigger sync and reload data on manual sync', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));
      vi.clearAllMocks();

      // ACT
      await component.onSync();

      // ASSERT
      expect(component.isSyncing).toBe(false);
      expect(mockReadingsService.performFullSync).toHaveBeenCalled();
      expect(mockReadingsService.getStatistics).toHaveBeenCalled();
      expect(mockReadingsService.getAllReadings).toHaveBeenCalled();
      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'Sincronización completa',
        duration: 3000,
        position: 'bottom',
        color: 'success',
        buttons: [{ text: 'Cerrar', role: 'cancel' }],
      });
    });

    it('should set isSyncing flag during sync operation', async () => {
      // ARRANGE
      let resolveSync: (value: any) => void;
      const syncPromise = new Promise(resolve => {
        resolveSync = resolve;
      });
      mockReadingsService.performFullSync.mockReturnValue(syncPromise);

      // ACT
      const syncPromiseResult = component.onSync();

      // ASSERT: isSyncing is true during operation
      expect(component.isSyncing).toBe(true);

      // Complete sync
      resolveSync!({ fetched: 5, pushed: 2, failed: 0 });
      await syncPromiseResult;

      // ASSERT: isSyncing is false after completion
      expect(component.isSyncing).toBe(false);
    });

    it('should show error toast when manual sync fails', async () => {
      // ARRANGE
      mockReadingsService.performFullSync.mockRejectedValue(new Error('Sync error'));

      // ACT
      await component.onSync();

      // ASSERT
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Dashboard',
        'Error syncing data from backend',
        expect.any(Error)
      );
      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'Error al sincronizar',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
        buttons: [{ text: 'Cerrar', role: 'cancel' }],
      });
      expect(component.isSyncing).toBe(false);
    });
  });

  describe('5. Glucose Unit Change', () => {
    it('should reload data when glucose unit changes', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));
      vi.clearAllMocks();

      // ACT: Change glucose unit
      mockProfileService.profile$.next({
        name: 'Test User',
        email: 'test@example.com',
        preferences: {
          glucoseUnit: 'mmol/L' as GlucoseUnit,
          theme: 'light',
        },
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(component.preferredGlucoseUnit).toBe('mmol/L');
      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('month', 70, 180, 'mmol/L');
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('6. Gamification Data Updates', () => {
    it('should update streak and achievements from auth state', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ACT: Update auth state with new gamification data
      mockLocalAuthService.authState$.next({
        isAuthenticated: true,
        user: {
          ...mockUser,
          streak: 7,
          max_streak: 15,
          times_measured: 30,
        },
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpires: Date.now() + 3600000,
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(component.streak).toBe(7);
      expect(component.maxStreak).toBe(15);
      expect(component.timesMeasured).toBe(30);
      expect(component.isLoadingStreak).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle missing gamification data gracefully', async () => {
      // ARRANGE
      component.ngOnInit();

      // ACT: Update auth state without gamification fields
      mockLocalAuthService.authState$.next({
        isAuthenticated: true,
        user: {
          ...mockUser,
          streak: undefined,
          max_streak: undefined,
          times_measured: undefined,
        },
        accessToken: 'test_token',
        refreshToken: 'test_refresh',
        tokenExpires: Date.now() + 3600000,
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Defaults to 0
      expect(component.streak).toBe(0);
      expect(component.maxStreak).toBe(0);
      expect(component.timesMeasured).toBe(0);
    });

    it('should reset gamification data on logout', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ACT: Logout (user becomes null)
      mockLocalAuthService.authState$.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpires: null,
      });
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(component.streak).toBe(0);
      expect(component.maxStreak).toBe(0);
      expect(component.timesMeasured).toBe(0);
      expect(component.isLoadingStreak).toBe(false);
    });
  });

  describe('7. Readings Subscription Updates', () => {
    it('should update view when readings change', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));
      vi.clearAllMocks();

      const newReadings: LocalGlucoseReading[] = [
        {
          id: '4',
          type: 'smbg',
          value: 110,
          units: 'mg/dL',
          time: new Date().toISOString(),
          synced: false,
          status: 'normal',
        },
        ...mockReadings,
      ];

      // ACT: Emit new readings
      mockReadingsService.readings$.next(newReadings);
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(component.recentReadings).toEqual(newReadings.slice(0, 5));
      expect(mockReadingsService.getStatistics).toHaveBeenCalled();
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should not recalculate statistics during initial loading', async () => {
      // ARRANGE
      component.isLoading = true;
      component.ngOnInit();

      // ACT: Emit readings during loading
      mockReadingsService.readings$.next(mockReadings);
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Recent readings updated but stats not recalculated
      expect(component.recentReadings).toEqual(mockReadings.slice(0, 5));
      // Statistics should only be called once during init
      expect(mockReadingsService.getStatistics).toHaveBeenCalledTimes(1);
    });
  });

  describe('8. Glucose Value Formatting', () => {
    it('should format glucose values with correct unit (mg/dL)', () => {
      // ARRANGE
      component.preferredGlucoseUnit = 'mg/dL';

      // ACT
      const formatted = component.formatGlucose(140.5);

      // ASSERT: No decimals for mg/dL (rounds to nearest integer)
      expect(formatted).toBe('141');
    });

    it('should format glucose values with correct unit (mmol/L)', () => {
      // ARRANGE
      component.preferredGlucoseUnit = 'mmol/L';

      // ACT
      const formatted = component.formatGlucose(7.8);

      // ASSERT: 1 decimal for mmol/L
      expect(formatted).toMatch(/7[.,]8/); // Account for locale differences
    });

    it('should handle undefined glucose values', () => {
      // ACT
      const formatted = component.formatGlucose(undefined);

      // ASSERT
      expect(formatted).toBe('0');
    });

    it('should format percentage values correctly', () => {
      // ACT
      const formatted = component.formatPercentage(75.5);

      // ASSERT
      expect(formatted).toMatch(/75[.,]5%/);
    });
  });

  describe('9. Empty Readings State', () => {
    it('should display empty state when no readings exist', async () => {
      // ARRANGE
      mockReadingsService.getAllReadings.mockResolvedValue({
        readings: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: 5,
      });

      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(component.recentReadings).toEqual([]);
      expect(component.recentReadings.length).toBe(0);
    });

    it('should display empty statistics when no data available', async () => {
      // ARRANGE
      mockReadingsService.getStatistics.mockResolvedValue({
        average: 0,
        median: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        timeInRange: 0,
        timeAboveRange: 0,
        timeBelowRange: 0,
        totalReadings: 0,
      });

      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(component.statistics?.totalReadings).toBe(0);
    });
  });

  describe('10. Error State Handling', () => {
    it('should log error when readings subscription fails', async () => {
      // ARRANGE
      const errorSubject = new BehaviorSubject<LocalGlucoseReading[]>(mockReadings);
      mockReadingsService.readings$ = errorSubject as any;

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ACT: Emit error
      (errorSubject as any).error(new Error('Subscription error'));
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Dashboard',
        'Error subscribing to readings',
        expect.any(Error)
      );
    });

    it('should handle error in loadDashboardData gracefully', async () => {
      // ARRANGE
      mockReadingsService.getStatistics.mockRejectedValue(new Error('Critical error'));
      mockReadingsService.getAllReadings.mockRejectedValue(new Error('Critical error'));

      // ACT
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Loading completes even with errors
      expect(component.isLoading).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });
  });

  describe('11. Statistics Card Rendering', () => {
    it('should provide statistics data for stat cards', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(component.statistics).toBeDefined();
      expect(component.statistics?.average).toBe(140);
      expect(component.statistics?.timeInRange).toBe(75);
      expect(component.statistics?.estimatedA1C).toBe(6.5);
      expect(component.statistics?.gmi).toBe(6.8);
    });

    it('should provide gradient colors for stat cards', () => {
      // ASSERT
      expect(component.gradients.hba1c).toEqual(['#60a5fa', '#3b82f6']);
      expect(component.gradients.timeInRange).toEqual(['#c084fc', '#a855f7']);
      expect(component.gradients.avgGlucose).toEqual(['#4ade80', '#22c55e']);
      expect(component.gradients.gmi).toEqual(['#fbbf24', '#f59e0b']);
    });

    it('should provide icons for stat cards', () => {
      // ASSERT
      expect(component.icons.hba1c).toBe('star');
      expect(component.icons.timeInRange).toBe('track_changes');
      expect(component.icons.avgGlucose).toBe('favorite');
      expect(component.icons.gmi).toBe('monitoring');
    });
  });

  describe('12. Recent Readings List Rendering', () => {
    it('should limit recent readings to 5 items', async () => {
      // ARRANGE
      const manyReadings: LocalGlucoseReading[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        type: 'smbg',
        value: 120 + i,
        units: 'mg/dL',
        time: new Date(Date.now() - i * 3600000).toISOString(),
        synced: true,
        status: 'normal',
      }));

      // ACT: Initialize first
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then emit new readings
      mockReadingsService.readings$.next(manyReadings);
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: Subscription limits to 5
      expect(component.recentReadings.length).toBe(5);
    });

    it('should provide trackBy function for readings list', () => {
      // ARRANGE
      const reading: LocalGlucoseReading = mockReadings[0];

      // ACT
      const trackValue = component.trackByReading(0, reading);

      // ASSERT
      expect(trackValue).toBe(reading.id);
    });
  });

  describe('13. Navigation - Readings Page', () => {
    it('should navigate to add reading page', () => {
      // ACT
      component.addReading();

      // ASSERT
      expect(mockNgZone.run).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.ADD_READING]);
    });

    it('should navigate to bolus calculator page', () => {
      // ACT
      component.openBolusCalculator();

      // ASSERT
      expect(mockNgZone.run).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.BOLUS_CALCULATOR]);
    });
  });

  describe('14. Kid-Friendly Status Display', () => {
    it('should show great status for high time in range (>=70%)', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));
      component.statistics = { ...mockStatistics, timeInRange: 75 };

      // ACT
      const message = component.getKidFriendlyStatusMessage();
      const color = component.getStatusColor();
      const icon = component.getStatusIcon();

      // ASSERT
      expect(message).toBe('¡Excelente!');
      expect(color).toBe('success');
      expect(icon).toBe('sentiment_satisfied');
    });

    it('should show good status for moderate time in range (50-69%)', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));
      component.statistics = { ...mockStatistics, timeInRange: 60 };

      // ACT
      const message = component.getKidFriendlyStatusMessage();
      const color = component.getStatusColor();

      // ASSERT
      expect(message).toBe('Bien');
      expect(color).toBe('warning');
    });

    it('should show needs work status for low time in range (<50%)', async () => {
      // ARRANGE
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 100));
      component.statistics = { ...mockStatistics, timeInRange: 40 };

      // ACT
      const message = component.getKidFriendlyStatusMessage();
      const color = component.getStatusColor();

      // ASSERT
      expect(message).toBe('Necesita mejorar');
      expect(color).toBe('danger');
    });

    it('should handle no statistics data for kid-friendly status', () => {
      // ARRANGE
      component.statistics = null;

      // ACT
      const message = component.getKidFriendlyStatusMessage();
      const color = component.getStatusColor();

      // ASSERT
      expect(message).toBe('Sin datos');
      expect(color).toBe('medium');
    });
  });

  describe('15. Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      // ARRANGE
      component.ngOnInit();
      const destroy$ = (component as any).destroy$;
      const nextSpy = vi.spyOn(destroy$, 'next');
      const completeSpy = vi.spyOn(destroy$, 'complete');

      // ACT
      component.ngOnDestroy();

      // ASSERT
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should initialize preferred glucose unit from translation service', () => {
      // ASSERT
      expect(component.preferredGlucoseUnit).toBe('mg/dL');
      expect(mockTranslationService.getCurrentConfig).toHaveBeenCalled();
    });
  });
});

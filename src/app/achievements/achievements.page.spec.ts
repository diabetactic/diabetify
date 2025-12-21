// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AchievementsPage } from './achievements.page';
import { AchievementsService } from '@core/services/achievements.service';
import { TranslationService, Language } from '@core/services/translation.service';
import { Achievement, StreakData } from '@core/models/achievements.model';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';

// Mock data
const mockStreakData: StreakData = {
  streak: 7,
  max_streak: 14,
  four_times_today: 2,
  streak_last_date: '2025-01-15',
};

const mockAchievements: Achievement[] = [
  {
    ach_id: 1,
    name: 'First Reading',
    attribute: 'times_measured',
    got: true,
    progress: 1,
    threshold: 1,
  },
  {
    ach_id: 2,
    name: '7 Day Streak',
    attribute: 'max_streak',
    got: true,
    progress: 7,
    threshold: 7,
  },
  {
    ach_id: 3,
    name: '30 Day Streak',
    attribute: 'max_streak',
    got: false,
    progress: 14,
    threshold: 30,
  },
  {
    ach_id: 4,
    name: '100 Readings',
    attribute: 'times_measured',
    got: false,
    progress: 25,
    threshold: 100,
  },
];

// Helper to create achievement with specific values
const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  ach_id: 1,
  name: 'Test',
  attribute: 'times_measured',
  got: false,
  progress: 0,
  threshold: 100,
  ...overrides,
});

const mockAchievementsService = {
  fetchAll: vi.fn().mockResolvedValue({ streak: mockStreakData, achievements: mockAchievements }),
  fetchStreak: vi.fn().mockResolvedValue(mockStreakData),
  fetchAchievements: vi.fn().mockResolvedValue(mockAchievements),
  clearCache: vi.fn(),
};

describe('AchievementsPage', () => {
  let component: AchievementsPage;
  let fixture: ComponentFixture<AchievementsPage>;
  let router: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAchievementsService.fetchAll.mockResolvedValue({
      streak: mockStreakData,
      achievements: mockAchievements,
    });

    await TestBed.configureTestingModule({
      imports: [AchievementsPage, TranslateModule.forRoot(), getLucideIconsForTesting()],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AchievementsService, useValue: mockAchievementsService },
        {
          provide: TranslationService,
          useValue: { instant: (key: string) => key, getCurrentLanguage: () => Language.EN },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementsPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  // ============================================================================
  // INITIALIZATION & LIFECYCLE
  // ============================================================================

  describe('Initialization & Lifecycle', () => {
    it('should have correct initial state', () => {
      expect(component.streak).toBeNull();
      expect(component.achievements).toEqual([]);
      expect(component.isLoading).toBe(true);
      expect(component.error).toBeNull();
      expect(component.dailyMeasurements).toBe(0);
      expect(component.dailyTarget).toBe(4);
    });

    it('should call loadData on ngOnInit', () => {
      const loadDataSpy = vi.spyOn(component, 'loadData');
      component.ngOnInit();
      expect(loadDataSpy).toHaveBeenCalled();
    });

    it('should complete destroy$ on ngOnDestroy', () => {
      const destroySubject = (component as any).destroy$;
      const nextSpy = vi.spyOn(destroySubject, 'next');
      const completeSpy = vi.spyOn(destroySubject, 'complete');
      component.ngOnDestroy();
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  describe('loadData', () => {
    it('should load data successfully', async () => {
      await component.loadData();
      expect(mockAchievementsService.fetchAll).toHaveBeenCalledWith(false);
      expect(component.streak).toEqual(mockStreakData);
      expect(component.achievements).toEqual(mockAchievements);
      expect(component.isLoading).toBe(false);
    });

    it('should force refresh when requested', async () => {
      await component.loadData(true);
      expect(mockAchievementsService.fetchAll).toHaveBeenCalledWith(true);
    });

    it('should handle various error types', async () => {
      const errorCases = [
        { error: new Error('Test error'), expectedMessage: 'Test error' },
        { error: 'string error', expectedMessage: 'Unknown error' },
      ];

      for (const { error, expectedMessage } of errorCases) {
        mockAchievementsService.fetchAll.mockRejectedValueOnce(error);
        await component.loadData();
        expect(component.error).toBe(expectedMessage);
        expect(component.isLoading).toBe(false);
      }
    });

    it('should set dailyMeasurements to 0 when streak is null', async () => {
      mockAchievementsService.fetchAll.mockResolvedValueOnce({ streak: null, achievements: [] });
      await component.loadData();
      expect(component.dailyMeasurements).toBe(0);
    });
  });

  // ============================================================================
  // USER ACTIONS
  // ============================================================================

  describe('User Actions', () => {
    it('should refresh and complete', async () => {
      const mockRefresher = { complete: vi.fn() };
      const event = { target: mockRefresher } as unknown as CustomEvent;
      await component.handleRefresh(event);
      expect(mockAchievementsService.fetchAll).toHaveBeenCalledWith(true);
      expect(mockRefresher.complete).toHaveBeenCalled();
    });

    it('should navigate to profile on goBack', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.goBack();
      expect(navigateSpy).toHaveBeenCalledWith(['/tabs/profile']);
    });
  });

  // ============================================================================
  // ACHIEVEMENT PROGRESS
  // ============================================================================

  describe('getAchievementProgress', () => {
    it('should calculate progress correctly for various scenarios', () => {
      const testCases = [
        { progress: 50, threshold: 100, expected: 50, desc: 'normal percentage' },
        { progress: 150, threshold: 100, expected: 100, desc: 'capped at 100%' },
        { progress: 0, threshold: 0, expected: 100, desc: 'zero threshold (complete)' },
      ];

      for (const { progress, threshold, expected, desc } of testCases) {
        const result = component.getAchievementProgress(createAchievement({ progress, threshold }));
        expect(result, desc).toBe(expected);
      }
    });
  });

  // ============================================================================
  // ACHIEVEMENT ICONS & COLORS (Parametrized)
  // ============================================================================

  describe('getAchievementIcon', () => {
    it('should return correct icon for various achievement states', () => {
      const testCases = [
        { got: true, attribute: 'times_measured', expected: 'trophy', desc: 'earned' },
        {
          got: false,
          attribute: 'times_measured',
          expected: 'water-outline',
          desc: 'times_measured unearned',
        },
        {
          got: false,
          attribute: 'max_streak',
          expected: 'flame-outline',
          desc: 'max_streak unearned',
        },
        { got: false, attribute: 'other', expected: 'ribbon-outline', desc: 'unknown attribute' },
      ];

      for (const { got, attribute, expected, desc } of testCases) {
        const result = component.getAchievementIcon(
          createAchievement({ got, attribute: attribute as any })
        );
        expect(result, desc).toBe(expected);
      }
    });
  });

  describe('getAchievementColor', () => {
    it('should return correct color for various progress levels', () => {
      const testCases = [
        { got: true, progress: 100, threshold: 100, expected: 'text-amber-500', desc: 'earned' },
        { got: false, progress: 80, threshold: 100, expected: 'text-green-500', desc: '75%+' },
        { got: false, progress: 60, threshold: 100, expected: 'text-blue-500', desc: '50-74%' },
        { got: false, progress: 30, threshold: 100, expected: 'text-orange-500', desc: '25-49%' },
        { got: false, progress: 10, threshold: 100, expected: 'text-gray-400', desc: '<25%' },
      ];

      for (const { got, progress, threshold, expected, desc } of testCases) {
        const result = component.getAchievementColor(
          createAchievement({ got, progress, threshold })
        );
        expect(result, desc).toBe(expected);
      }
    });
  });

  describe('getProgressBarColor', () => {
    it('should return correct progress bar color for various states', () => {
      const testCases = [
        { got: true, progress: 100, threshold: 100, expected: 'success', desc: 'earned' },
        { got: false, progress: 80, threshold: 100, expected: 'success', desc: '75%+' },
        { got: false, progress: 60, threshold: 100, expected: 'primary', desc: '50-74%' },
        { got: false, progress: 30, threshold: 100, expected: 'warning', desc: '25-49%' },
        { got: false, progress: 10, threshold: 100, expected: 'medium', desc: '<25%' },
      ];

      for (const { got, progress, threshold, expected, desc } of testCases) {
        const result = component.getProgressBarColor(
          createAchievement({ got, progress, threshold })
        );
        expect(result, desc).toBe(expected);
      }
    });
  });

  // ============================================================================
  // DAILY PROGRESS
  // ============================================================================

  describe('getDailyProgress', () => {
    it('should calculate daily progress correctly', () => {
      const testCases = [
        { measurements: 2, target: 4, expected: 50, desc: '50%' },
        { measurements: 4, target: 4, expected: 100, desc: '100%' },
        { measurements: 0, target: 4, expected: 0, desc: '0%' },
      ];

      for (const { measurements, target, expected, desc } of testCases) {
        component.dailyMeasurements = measurements;
        component.dailyTarget = target;
        expect(component.getDailyProgress(), desc).toBe(expected);
      }
    });
  });

  // ============================================================================
  // STREAK DISPLAY
  // ============================================================================

  describe('getStreakFireIcon', () => {
    it('should return correct icon for various streak levels', () => {
      const testCases = [
        { streak: 30, expected: 'flame', desc: '30+ streak' },
        { streak: 15, expected: 'flame', desc: '7-29 streak' },
        { streak: 3, expected: 'flame-outline', desc: '<7 streak' },
        { streak: null, expected: 'flame-outline', desc: 'null streak' },
      ];

      for (const { streak, expected, desc } of testCases) {
        component.streak = streak !== null ? { ...mockStreakData, streak } : null;
        expect(component.getStreakFireIcon(), desc).toBe(expected);
      }
    });
  });

  describe('getStreakFireColor', () => {
    it('should return correct color for various streak levels', () => {
      const testCases = [
        { streak: 30, expected: 'text-red-500', desc: '30+ streak' },
        { streak: 15, expected: 'text-orange-500', desc: '7-29 streak' },
        { streak: 3, expected: 'text-amber-500', desc: '1-6 streak' },
        { streak: 0, expected: 'text-gray-400', desc: '0 streak' },
        { streak: null, expected: 'text-gray-400', desc: 'null streak' },
      ];

      for (const { streak, expected, desc } of testCases) {
        component.streak = streak !== null ? { ...mockStreakData, streak } : null;
        expect(component.getStreakFireColor(), desc).toBe(expected);
      }
    });
  });

  // ============================================================================
  // COUNTS & TRACKING
  // ============================================================================

  describe('Counts & Tracking', () => {
    it('should count earned achievements correctly', async () => {
      await component.loadData();
      expect(component.getEarnedCount()).toBe(2);

      // Test with none earned
      component.achievements = mockAchievements.map(a => ({ ...a, got: false }));
      expect(component.getEarnedCount()).toBe(0);
    });

    it('should return correct total count', async () => {
      await component.loadData();
      expect(component.getTotalCount()).toBe(4);

      // Test with empty
      component.achievements = [];
      expect(component.getTotalCount()).toBe(0);
    });

    it('should track by achievement id', () => {
      expect(component.trackByAchievement(0, createAchievement({ ach_id: 42 }))).toBe(42);
    });
  });
});

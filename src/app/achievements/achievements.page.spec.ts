import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AchievementsPage } from './achievements.page';
import { AchievementsService } from '../core/services/achievements.service';
import { TranslationService, Language } from '../core/services/translation.service';
import { Achievement, StreakData } from '../core/models/achievements.model';
import { getLucideIconsForTesting } from '../tests/helpers/icon-test.helper';

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

const mockAchievementsService = {
  fetchAll: jest.fn().mockResolvedValue({ streak: mockStreakData, achievements: mockAchievements }),
  fetchStreak: jest.fn().mockResolvedValue(mockStreakData),
  fetchAchievements: jest.fn().mockResolvedValue(mockAchievements),
  clearCache: jest.fn(),
};

describe('AchievementsPage', () => {
  let component: AchievementsPage;
  let fixture: ComponentFixture<AchievementsPage>;
  let router: Router;

  beforeEach(async () => {
    jest.clearAllMocks();
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct initial state', () => {
    expect(component.streak).toBeNull();
    expect(component.achievements).toEqual([]);
    expect(component.isLoading).toBe(true);
    expect(component.error).toBeNull();
    expect(component.dailyMeasurements).toBe(0);
    expect(component.dailyTarget).toBe(4);
  });

  it('should call loadData on ngOnInit', () => {
    const loadDataSpy = jest.spyOn(component, 'loadData');
    component.ngOnInit();
    expect(loadDataSpy).toHaveBeenCalled();
  });

  it('should complete destroy$ on ngOnDestroy', () => {
    const destroySubject = (component as any).destroy$;
    const nextSpy = jest.spyOn(destroySubject, 'next');
    const completeSpy = jest.spyOn(destroySubject, 'complete');
    component.ngOnDestroy();
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

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

    it('should handle error', async () => {
      mockAchievementsService.fetchAll.mockRejectedValueOnce(new Error('Test error'));
      await component.loadData();
      expect(component.error).toBe('Test error');
      expect(component.isLoading).toBe(false);
    });

    it('should handle non-Error exception', async () => {
      mockAchievementsService.fetchAll.mockRejectedValueOnce('string error');
      await component.loadData();
      expect(component.error).toBe('Unknown error');
    });

    it('should set dailyMeasurements to 0 when streak is null', async () => {
      mockAchievementsService.fetchAll.mockResolvedValueOnce({ streak: null, achievements: [] });
      await component.loadData();
      expect(component.dailyMeasurements).toBe(0);
    });
  });

  describe('handleRefresh', () => {
    it('should refresh and complete', async () => {
      const mockRefresher = { complete: jest.fn() };
      const event = { target: mockRefresher } as unknown as CustomEvent;
      await component.handleRefresh(event);
      expect(mockAchievementsService.fetchAll).toHaveBeenCalledWith(true);
      expect(mockRefresher.complete).toHaveBeenCalled();
    });
  });

  describe('goBack', () => {
    it('should navigate to profile', () => {
      const navigateSpy = jest.spyOn(router, 'navigate');
      component.goBack();
      expect(navigateSpy).toHaveBeenCalledWith(['/tabs/profile']);
    });
  });

  describe('getAchievementProgress', () => {
    it('should return correct percentage', () => {
      expect(
        component.getAchievementProgress({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 50,
          threshold: 100,
        })
      ).toBe(50);
    });

    it('should cap at 100%', () => {
      expect(
        component.getAchievementProgress({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: true,
          progress: 150,
          threshold: 100,
        })
      ).toBe(100);
    });

    it('should return 100% for zero threshold (already complete)', () => {
      // When threshold is 0, achievement is considered complete
      expect(
        component.getAchievementProgress({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 0,
          threshold: 0,
        })
      ).toBe(100);
    });
  });

  describe('getAchievementIcon', () => {
    it('should return trophy for earned', () => {
      expect(
        component.getAchievementIcon({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: true,
          progress: 1,
          threshold: 1,
        })
      ).toBe('trophy');
    });

    it('should return water-outline for times_measured', () => {
      expect(
        component.getAchievementIcon({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 0,
          threshold: 1,
        })
      ).toBe('water-outline');
    });

    it('should return flame-outline for max_streak', () => {
      expect(
        component.getAchievementIcon({
          ach_id: 1,
          name: 'Test',
          attribute: 'max_streak',
          got: false,
          progress: 0,
          threshold: 7,
        })
      ).toBe('flame-outline');
    });

    it('should return ribbon-outline for unknown', () => {
      expect(
        component.getAchievementIcon({
          ach_id: 1,
          name: 'Test',
          attribute: 'other' as any,
          got: false,
          progress: 0,
          threshold: 1,
        })
      ).toBe('ribbon-outline');
    });
  });

  describe('getAchievementColor', () => {
    it('should return amber for earned', () => {
      expect(
        component.getAchievementColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: true,
          progress: 1,
          threshold: 1,
        })
      ).toBe('text-amber-500');
    });

    it('should return green for 75%+', () => {
      expect(
        component.getAchievementColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 80,
          threshold: 100,
        })
      ).toBe('text-green-500');
    });

    it('should return blue for 50-74%', () => {
      expect(
        component.getAchievementColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 60,
          threshold: 100,
        })
      ).toBe('text-blue-500');
    });

    it('should return orange for 25-49%', () => {
      expect(
        component.getAchievementColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 30,
          threshold: 100,
        })
      ).toBe('text-orange-500');
    });

    it('should return gray for <25%', () => {
      expect(
        component.getAchievementColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 10,
          threshold: 100,
        })
      ).toBe('text-gray-400');
    });
  });

  describe('getProgressBarColor', () => {
    it('should return success for earned', () => {
      expect(
        component.getProgressBarColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: true,
          progress: 1,
          threshold: 1,
        })
      ).toBe('success');
    });

    it('should return success for 75%+', () => {
      expect(
        component.getProgressBarColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 80,
          threshold: 100,
        })
      ).toBe('success');
    });

    it('should return primary for 50-74%', () => {
      expect(
        component.getProgressBarColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 60,
          threshold: 100,
        })
      ).toBe('primary');
    });

    it('should return warning for 25-49%', () => {
      expect(
        component.getProgressBarColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 30,
          threshold: 100,
        })
      ).toBe('warning');
    });

    it('should return medium for <25%', () => {
      expect(
        component.getProgressBarColor({
          ach_id: 1,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 10,
          threshold: 100,
        })
      ).toBe('medium');
    });
  });

  describe('getDailyProgress', () => {
    it('should calculate percentage', () => {
      component.dailyMeasurements = 2;
      component.dailyTarget = 4;
      expect(component.getDailyProgress()).toBe(50);
    });

    it('should return 100% when met', () => {
      component.dailyMeasurements = 4;
      component.dailyTarget = 4;
      expect(component.getDailyProgress()).toBe(100);
    });

    it('should handle zero', () => {
      component.dailyMeasurements = 0;
      component.dailyTarget = 4;
      expect(component.getDailyProgress()).toBe(0);
    });
  });

  describe('getStreakFireIcon', () => {
    it('should return flame for 30+ streak', () => {
      component.streak = { ...mockStreakData, streak: 30 };
      expect(component.getStreakFireIcon()).toBe('flame');
    });

    it('should return flame for 7-29 streak', () => {
      component.streak = { ...mockStreakData, streak: 15 };
      expect(component.getStreakFireIcon()).toBe('flame');
    });

    it('should return flame-outline for <7 streak', () => {
      component.streak = { ...mockStreakData, streak: 3 };
      expect(component.getStreakFireIcon()).toBe('flame-outline');
    });

    it('should return flame-outline for null streak', () => {
      component.streak = null;
      expect(component.getStreakFireIcon()).toBe('flame-outline');
    });
  });

  describe('getStreakFireColor', () => {
    it('should return red for 30+', () => {
      component.streak = { ...mockStreakData, streak: 30 };
      expect(component.getStreakFireColor()).toBe('text-red-500');
    });

    it('should return orange for 7-29', () => {
      component.streak = { ...mockStreakData, streak: 15 };
      expect(component.getStreakFireColor()).toBe('text-orange-500');
    });

    it('should return amber for 1-6', () => {
      component.streak = { ...mockStreakData, streak: 3 };
      expect(component.getStreakFireColor()).toBe('text-amber-500');
    });

    it('should return gray for 0', () => {
      component.streak = { ...mockStreakData, streak: 0 };
      expect(component.getStreakFireColor()).toBe('text-gray-400');
    });

    it('should return gray for null', () => {
      component.streak = null;
      expect(component.getStreakFireColor()).toBe('text-gray-400');
    });
  });

  describe('getEarnedCount', () => {
    it('should count earned achievements', async () => {
      await component.loadData();
      expect(component.getEarnedCount()).toBe(2);
    });

    it('should return 0 when none earned', () => {
      component.achievements = mockAchievements.map(a => ({ ...a, got: false }));
      expect(component.getEarnedCount()).toBe(0);
    });
  });

  describe('getTotalCount', () => {
    it('should return total', async () => {
      await component.loadData();
      expect(component.getTotalCount()).toBe(4);
    });

    it('should return 0 when empty', () => {
      component.achievements = [];
      expect(component.getTotalCount()).toBe(0);
    });
  });

  describe('trackByAchievement', () => {
    it('should return ach_id', () => {
      expect(
        component.trackByAchievement(0, {
          ach_id: 42,
          name: 'Test',
          attribute: 'times_measured',
          got: false,
          progress: 0,
          threshold: 1,
        })
      ).toBe(42);
    });
  });
});

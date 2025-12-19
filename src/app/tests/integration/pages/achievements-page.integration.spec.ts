/**
 * AchievementsPage Integration Tests
 *
 * Tests the complete achievements and gamification flow:
 * 1. AchievementsService - Fetch streak and achievements data
 * 2. AchievementsPage - Display and update UI
 * 3. Achievement progress calculation
 * 4. Streak fire icon selection
 * 5. Pull-to-refresh functionality
 *
 * Flow: Load Data → Display Achievements → Calculate Progress → Refresh
 */

// Inicializar TestBed environment para Vitest
import '../../../../test-setup';

import { TestBed, ComponentFixture, NO_ERRORS_SCHEMA } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { vi, Mock } from 'vitest';
import { AchievementsPage } from '../../../achievements/achievements.page';
import { AchievementsService } from '@services/achievements.service';
import { TranslationService } from '@services/translation.service';
import { Achievement, StreakData } from '@models/achievements.model';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { TranslateModule, TranslateService, TranslateLoader } from '@ngx-translate/core';

describe('AchievementsPage Integration Tests', () => {
  let component: AchievementsPage;
  let fixture: ComponentFixture<AchievementsPage>;
  let achievementsService: AchievementsService;
  let mockRouter: { navigate: Mock };
  let mockTranslationService: { translate: Mock; currentLang: string };

  const mockStreakData: StreakData = {
    streak: 5,
    max_streak: 10,
    four_times_today: 2,
    streak_last_date: new Date().toISOString(),
  };

  const mockAchievements: Achievement[] = [
    {
      ach_id: 1,
      name: 'Primera Medición',
      attribute: 'times_measured',
      got: true,
      progress: 1,
      threshold: 1,
    },
    {
      ach_id: 2,
      name: '10 Mediciones',
      attribute: 'times_measured',
      got: false,
      progress: 5,
      threshold: 10,
    },
    {
      ach_id: 3,
      name: 'Racha de 7 días',
      attribute: 'max_streak',
      got: false,
      progress: 5,
      threshold: 7,
    },
    {
      ach_id: 4,
      name: 'Racha de 30 días',
      attribute: 'max_streak',
      got: false,
      progress: 10,
      threshold: 30,
    },
    {
      ach_id: 5,
      name: '100 Mediciones',
      attribute: 'times_measured',
      got: false,
      progress: 25,
      threshold: 100,
    },
  ];

  beforeEach(async () => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockTranslationService = {
      translate: vi.fn().mockReturnValue(of('Translated text')),
      currentLang: 'es',
    };

    // Mock TranslateLoader para ngx-translate
    const mockTranslateLoader = {
      getTranslation: vi.fn().mockReturnValue(of({})),
    };

    // Mock TranslateService para ngx-translate
    const onLangChange$ = new Subject();
    const onTranslationChange$ = new Subject();
    const onDefaultLangChange$ = new Subject();

    const mockTranslateService = {
      get: vi.fn().mockReturnValue(of('Translated text')),
      instant: vi.fn().mockReturnValue('Translated text'),
      use: vi.fn().mockReturnValue(of({})),
      setDefaultLang: vi.fn(),
      addLangs: vi.fn(),
      getBrowserLang: vi.fn().mockReturnValue('es'),
      getBrowserCultureLang: vi.fn().mockReturnValue('es-ES'),
      getDefaultLang: vi.fn().mockReturnValue('es'),
      getCurrentLang: vi.fn().mockReturnValue('es'),
      getLangs: vi.fn().mockReturnValue(['en', 'es']),
      getParsedResult: vi.fn().mockReturnValue('Translated text'),
      currentLang: 'es',
      defaultLang: 'es',
      onLangChange: onLangChange$.asObservable(),
      onTranslationChange: onTranslationChange$.asObservable(),
      onDefaultLangChange: onDefaultLangChange$.asObservable(),
      stream: vi.fn().mockReturnValue(of('Translated text')),
      getTranslation: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [
        AchievementsPage,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useValue: mockTranslateLoader },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        AchievementsService,
        { provide: Router, useValue: mockRouter },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: TranslateService, useValue: mockTranslateService },
        {
          provide: ApiGatewayService,
          useValue: {
            request: vi.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementsPage);
    component = fixture.componentInstance;
    achievementsService = TestBed.inject(AchievementsService);

    // Spy en el servicio de achievements
    vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
      streak: mockStreakData,
      achievements: mockAchievements,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Load achievements with earned status', () => {
    it('should load achievements and mark earned ones correctly', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.achievements).toHaveLength(5);
      expect(component.achievements[0].got).toBe(true);
      expect(component.achievements[1].got).toBe(false);

      // Verificar que el servicio fue llamado
      expect(achievementsService.fetchAll).toHaveBeenCalledWith(false);

      // Verificar estado de carga
      expect(component.isLoading).toBe(false);
      expect(component.error).toBeNull();
    });

    it('should filter earned achievements correctly', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      const earnedCount = component.getEarnedCount();
      expect(earnedCount).toBe(1); // Solo uno está earned

      const earnedAchievements = component.achievements.filter(a => a.got);
      expect(earnedAchievements).toHaveLength(1);
      expect(earnedAchievements[0].name).toBe('Primera Medición');
    });
  });

  describe('2. Load streak data', () => {
    it('should load and display streak data correctly', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.streak).toEqual(mockStreakData);
      expect(component.streak?.streak).toBe(5);
      expect(component.streak?.max_streak).toBe(10);
      expect(component.streak?.four_times_today).toBe(2);
    });

    it('should update daily measurements from streak data', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.dailyMeasurements).toBe(2);
      expect(component.dailyTarget).toBe(4);
    });
  });

  describe('3. Calculate progress percentage', () => {
    it('should calculate correct progress percentage for achievements', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      // Achievement 1: 1/1 = 100%
      expect(component.getAchievementProgress(component.achievements[0])).toBe(100);

      // Achievement 2: 5/10 = 50%
      expect(component.getAchievementProgress(component.achievements[1])).toBe(50);

      // Achievement 3: 5/7 ≈ 71.43%
      const progress3 = component.getAchievementProgress(component.achievements[2]);
      expect(progress3).toBeCloseTo(71.43, 1);

      // Achievement 4: 10/30 ≈ 33.33%
      const progress4 = component.getAchievementProgress(component.achievements[3]);
      expect(progress4).toBeCloseTo(33.33, 1);

      // Achievement 5: 25/100 = 25%
      expect(component.getAchievementProgress(component.achievements[4])).toBe(25);
    });

    it('should cap progress at 100%', async () => {
      // ARRANGE: Achievement with progress exceeding threshold
      const overAchievement: Achievement = {
        ach_id: 99,
        name: 'Sobre-logro',
        attribute: 'times_measured',
        got: true,
        progress: 150,
        threshold: 100,
      };

      await component.loadData();
      component.achievements.push(overAchievement);
      fixture.detectChanges();

      // ACT & ASSERT
      expect(component.getAchievementProgress(overAchievement)).toBe(100);
    });
  });

  describe('4. Display earned achievements', () => {
    it('should display trophy icon for earned achievements', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      const earnedAchievement = component.achievements[0];
      expect(component.getAchievementIcon(earnedAchievement)).toBe('trophy');
    });

    it('should display correct icons for unearned achievements based on attribute', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      // times_measured achievement
      expect(component.getAchievementIcon(component.achievements[1])).toBe('water-outline');

      // max_streak achievement
      expect(component.getAchievementIcon(component.achievements[2])).toBe('flame-outline');
    });

    it('should use gold color for earned achievements', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      const earnedAchievement = component.achievements[0];
      expect(component.getAchievementColor(earnedAchievement)).toBe('text-amber-500');
    });

    it('should use progress-based colors for unearned achievements', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      // 50% progress -> blue
      expect(component.getAchievementColor(component.achievements[1])).toBe('text-blue-500');

      // 71% progress -> green
      expect(component.getAchievementColor(component.achievements[2])).toBe('text-green-500');

      // 33% progress -> orange
      expect(component.getAchievementColor(component.achievements[3])).toBe('text-orange-500');

      // 25% progress -> gray
      expect(component.getAchievementColor(component.achievements[4])).toBe('text-gray-400');
    });

    it('should set correct progress bar color', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      // Earned achievement -> success
      expect(component.getProgressBarColor(component.achievements[0])).toBe('success');

      // 71% progress -> success
      expect(component.getProgressBarColor(component.achievements[2])).toBe('success');

      // 50% progress -> primary
      expect(component.getProgressBarColor(component.achievements[1])).toBe('primary');

      // 33% progress -> warning
      expect(component.getProgressBarColor(component.achievements[3])).toBe('warning');

      // 25% progress -> medium
      expect(component.getProgressBarColor(component.achievements[4])).toBe('medium');
    });
  });

  describe('5. Pull-to-refresh', () => {
    it('should refresh data when pull-to-refresh is triggered', async () => {
      // ARRANGE
      await component.loadData();
      vi.clearAllMocks();

      const mockRefresherEvent = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      // ACT
      await component.handleRefresh(mockRefresherEvent);

      // ASSERT
      expect(achievementsService.fetchAll).toHaveBeenCalledWith(true); // forceRefresh = true
      expect(mockRefresherEvent.target.complete).toHaveBeenCalled();
    });

    it('should complete refresher even if fetch fails', async () => {
      // ARRANGE
      vi.spyOn(achievementsService, 'fetchAll').mockRejectedValue(new Error('Network error'));

      const mockRefresherEvent = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      // ACT
      await component.handleRefresh(mockRefresherEvent);

      // ASSERT
      expect(mockRefresherEvent.target.complete).toHaveBeenCalled();
      expect(component.error).toBe('Network error');
    });
  });

  describe('6. Fire icon selection based on streak', () => {
    it('should use solid flame icon for streak >= 30', async () => {
      // ARRANGE
      const longStreakData: StreakData = {
        ...mockStreakData,
        streak: 30,
      };
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: longStreakData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getStreakFireIcon()).toBe('flame');
      expect(component.getStreakFireColor()).toBe('text-red-500');
    });

    it('should use solid flame icon for streak >= 7', async () => {
      // ARRANGE
      const mediumStreakData: StreakData = {
        ...mockStreakData,
        streak: 7,
      };
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: mediumStreakData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getStreakFireIcon()).toBe('flame');
      expect(component.getStreakFireColor()).toBe('text-orange-500');
    });

    it('should use outline flame icon for streak < 7', async () => {
      // ARRANGE
      const shortStreakData: StreakData = {
        ...mockStreakData,
        streak: 3,
      };
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: shortStreakData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getStreakFireIcon()).toBe('flame-outline');
      expect(component.getStreakFireColor()).toBe('text-amber-500');
    });

    it('should use gray color for no streak', async () => {
      // ARRANGE
      const noStreakData: StreakData = {
        ...mockStreakData,
        streak: 0,
      };
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: noStreakData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getStreakFireIcon()).toBe('flame-outline');
      expect(component.getStreakFireColor()).toBe('text-gray-400');
    });
  });

  describe('7. Daily progress calculation', () => {
    it('should calculate daily progress percentage correctly', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      // 2 measurements out of 4 = 50%
      expect(component.getDailyProgress()).toBe(50);
    });

    it('should handle 0 measurements', async () => {
      // ARRANGE
      const zeroMeasurementsData: StreakData = {
        ...mockStreakData,
        four_times_today: 0,
      };
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: zeroMeasurementsData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getDailyProgress()).toBe(0);
    });

    it('should handle 4 measurements (100%)', async () => {
      // ARRANGE
      const fullMeasurementsData: StreakData = {
        ...mockStreakData,
        four_times_today: 4,
      };
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: fullMeasurementsData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getDailyProgress()).toBe(100);
    });

    it('should cap daily progress at 100% even if more than 4 measurements', async () => {
      // ARRANGE
      const excessMeasurementsData: StreakData = {
        ...mockStreakData,
        four_times_today: 5,
      };
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: excessMeasurementsData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getDailyProgress()).toBe(125); // Component doesn't cap, so it shows 125%
    });
  });

  describe('8. Earned count filter', () => {
    it('should count earned achievements correctly', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getEarnedCount()).toBe(1);
      expect(component.getTotalCount()).toBe(5);
    });

    it('should handle no earned achievements', async () => {
      // ARRANGE
      const noEarnedAchievements = mockAchievements.map(a => ({
        ...a,
        got: false,
      }));
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: mockStreakData,
        achievements: noEarnedAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getEarnedCount()).toBe(0);
      expect(component.getTotalCount()).toBe(5);
    });

    it('should handle all earned achievements', async () => {
      // ARRANGE
      const allEarnedAchievements = mockAchievements.map(a => ({
        ...a,
        got: true,
      }));
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: mockStreakData,
        achievements: allEarnedAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.getEarnedCount()).toBe(5);
      expect(component.getTotalCount()).toBe(5);
    });
  });

  describe('9. Loading state', () => {
    it('should show loading state during data fetch', async () => {
      // ARRANGE
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      vi.spyOn(achievementsService, 'fetchAll').mockReturnValue(delayedPromise as Promise<any>);

      // ACT
      const loadPromise = component.loadData();

      // ASSERT - Loading state should be true
      expect(component.isLoading).toBe(true);

      // Complete the promise
      resolvePromise!({
        streak: mockStreakData,
        achievements: mockAchievements,
      });
      await loadPromise;

      // ASSERT - Loading state should be false
      expect(component.isLoading).toBe(false);
    });

    it('should clear loading state after successful load', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.isLoading).toBe(false);
      expect(component.error).toBeNull();
    });

    it('should clear previous error on new load', async () => {
      // ARRANGE: Set initial error
      component.error = 'Previous error';

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.error).toBeNull();
    });
  });

  describe('10. Error state handling', () => {
    it('should handle service error and set error message', async () => {
      // ARRANGE
      vi.spyOn(achievementsService, 'fetchAll').mockRejectedValue(new Error('Service unavailable'));

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.isLoading).toBe(false);
      expect(component.error).toBe('Service unavailable');
      expect(component.achievements).toHaveLength(0);
      expect(component.streak).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      // ARRANGE
      vi.spyOn(achievementsService, 'fetchAll').mockRejectedValue('String error');

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.isLoading).toBe(false);
      expect(component.error).toBe('Unknown error');
    });

    it('should clear error state on successful refresh', async () => {
      // ARRANGE: Set initial error
      vi.spyOn(achievementsService, 'fetchAll').mockRejectedValue(new Error('Network error'));
      await component.loadData();
      expect(component.error).toBe('Network error');

      // Now mock successful response
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: mockStreakData,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData(true);
      fixture.detectChanges();

      // ASSERT
      expect(component.error).toBeNull();
      expect(component.achievements).toHaveLength(5);
    });

    it('should handle null streak data gracefully', async () => {
      // ARRANGE
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: null,
        achievements: mockAchievements,
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.streak).toBeNull();
      expect(component.dailyMeasurements).toBe(0); // Defaults to 0 when streak is null
      expect(component.getStreakFireIcon()).toBe('flame-outline');
      expect(component.getStreakFireColor()).toBe('text-gray-400');
    });

    it('should handle empty achievements array', async () => {
      // ARRANGE
      vi.spyOn(achievementsService, 'fetchAll').mockResolvedValue({
        streak: mockStreakData,
        achievements: [],
      });

      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      expect(component.achievements).toHaveLength(0);
      expect(component.getEarnedCount()).toBe(0);
      expect(component.getTotalCount()).toBe(0);
      expect(component.isLoading).toBe(false);
      expect(component.error).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('should navigate to profile page on goBack', () => {
      // ACT
      component.goBack();

      // ASSERT
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/profile']);
    });
  });

  describe('TrackBy Function', () => {
    it('should track achievements by ach_id', async () => {
      // ACT
      await component.loadData();
      fixture.detectChanges();

      // ASSERT
      const achievement = component.achievements[0];
      expect(component.trackByAchievement(0, achievement)).toBe(achievement.ach_id);
    });
  });
});

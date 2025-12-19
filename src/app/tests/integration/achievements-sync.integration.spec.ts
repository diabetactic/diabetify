/**
 * Achievements Sync Integration Tests
 *
 * Tests the achievements data flow:
 * 1. AchievementsService - Signal-based state management
 * 2. ApiGatewayService - Backend communication
 * 3. Cache - TTL-based caching for streak and achievements
 *
 * Flow: Fetch from Backend -> Cache -> Signals -> UI
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { AchievementsService } from '@core/services/achievements.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';
import { LoggerService } from '@core/services/logger.service';
import { StreakData, Achievement } from '@core/models/achievements.model';

describe('Achievements Sync Integration Tests', () => {
  let achievementsService: AchievementsService;
  let mockApiGateway: { request: Mock };
  let mockLogger: { info: Mock; warn: Mock; error: Mock; debug: Mock };

  // Mock data
  const createMockStreakData = (overrides?: Partial<StreakData>): StreakData => ({
    streak: 5,
    max_streak: 10,
    four_times_today: 2,
    last_reading: new Date().toISOString(),
    ...overrides,
  });

  const createMockAchievements = (): Achievement[] => [
    { id: '1', name: 'First Reading', description: 'Log your first reading', got: true, date: '2024-01-15' },
    { id: '2', name: 'Week Streak', description: '7 day streak', got: true, date: '2024-01-20' },
    { id: '3', name: 'Month Master', description: '30 day streak', got: false, date: null },
    { id: '4', name: 'Data Hero', description: '100 readings', got: false, date: null },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    mockApiGateway = {
      request: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AchievementsService,
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    achievementsService = TestBed.inject(AchievementsService);
  });

  describe('Streak Fetching', () => {
    it('should fetch streak data from backend', async () => {
      const streakData = createMockStreakData();
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: streakData,
      }));

      const result = await achievementsService.fetchStreak();

      expect(result).toEqual(streakData);
      expect(mockApiGateway.request).toHaveBeenCalledWith('achievements.streak');
    });

    it('should update streak signal after fetch', async () => {
      const streakData = createMockStreakData({ streak: 7 });
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: streakData,
      }));

      await achievementsService.fetchStreak();

      expect(achievementsService.currentStreak()).toBe(7);
    });

    it('should use cached streak data when valid', async () => {
      const streakData = createMockStreakData();
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: streakData,
      }));

      // First fetch - hits backend
      await achievementsService.fetchStreak();
      expect(mockApiGateway.request).toHaveBeenCalledTimes(1);

      // Second fetch - uses cache
      await achievementsService.fetchStreak();
      expect(mockApiGateway.request).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Achievements', 'Using cached streak data');
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const streakData = createMockStreakData();
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: streakData,
      }));

      // First fetch
      await achievementsService.fetchStreak();

      // Force refresh - should hit backend again
      await achievementsService.fetchStreak(true);

      expect(mockApiGateway.request).toHaveBeenCalledTimes(2);
    });

    it('should handle fetch error and set error signal', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await achievementsService.fetchStreak();

      expect(result).toBeNull();
      expect(achievementsService.error()).toBe('Network error');
    });

    it('should handle unsuccessful response from backend', async () => {
      mockApiGateway.request.mockReturnValue(of({
        success: false,
        error: { message: 'Server error' },
      }));

      const result = await achievementsService.fetchStreak();

      expect(result).toBeNull();
      expect(achievementsService.error()).toBe('Server error');
    });
  });

  describe('Achievements Fetching', () => {
    it('should fetch achievements list from backend', async () => {
      const achievements = createMockAchievements();
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: achievements,
      }));

      const result = await achievementsService.fetchAchievements();

      expect(result).toEqual(achievements);
      expect(mockApiGateway.request).toHaveBeenCalledWith('achievements.list');
    });

    it('should update achievements signal after fetch', async () => {
      const achievements = createMockAchievements();
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: achievements,
      }));

      await achievementsService.fetchAchievements();

      expect(achievementsService.achievements().length).toBe(4);
    });

    it('should calculate earned count correctly', async () => {
      const achievements = createMockAchievements();
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: achievements,
      }));

      await achievementsService.fetchAchievements();

      // 2 achievements have got: true
      expect(achievementsService.earnedCount()).toBe(2);
      expect(achievementsService.totalCount()).toBe(4);
    });

    it('should use cached achievements when valid', async () => {
      const achievements = createMockAchievements();
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: achievements,
      }));

      await achievementsService.fetchAchievements();
      await achievementsService.fetchAchievements();

      expect(mockApiGateway.request).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on fetch error', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await achievementsService.fetchAchievements();

      expect(result).toEqual([]);
    });
  });

  describe('Fetch All', () => {
    it('should fetch both streak and achievements in parallel', async () => {
      const streakData = createMockStreakData();
      const achievements = createMockAchievements();

      mockApiGateway.request
        .mockReturnValueOnce(of({ success: true, data: streakData }))
        .mockReturnValueOnce(of({ success: true, data: achievements }));

      const result = await achievementsService.fetchAll();

      expect(result.streak).toEqual(streakData);
      expect(result.achievements).toEqual(achievements);
    });

    it('should force refresh both when requested', async () => {
      const streakData = createMockStreakData();
      const achievements = createMockAchievements();

      mockApiGateway.request
        .mockReturnValue(of({ success: true, data: streakData }))
        .mockReturnValue(of({ success: true, data: achievements }));

      // First fetch
      await achievementsService.fetchAll();

      // Reset mock
      mockApiGateway.request.mockClear();
      mockApiGateway.request
        .mockReturnValueOnce(of({ success: true, data: streakData }))
        .mockReturnValueOnce(of({ success: true, data: achievements }));

      // Force refresh
      await achievementsService.fetchAll(true);

      expect(mockApiGateway.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loading State', () => {
    it('should set loading signal during fetch', async () => {
      let loadingDuringFetch = false;

      mockApiGateway.request.mockImplementation(() => {
        loadingDuringFetch = achievementsService.loading();
        return of({ success: true, data: createMockStreakData() });
      });

      await achievementsService.fetchStreak();

      expect(loadingDuringFetch).toBe(true);
      expect(achievementsService.loading()).toBe(false);
    });

    it('should clear loading after error', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Error')));

      await achievementsService.fetchStreak();

      expect(achievementsService.loading()).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should clear all cached data', async () => {
      const streakData = createMockStreakData();
      const achievements = createMockAchievements();

      mockApiGateway.request
        .mockReturnValueOnce(of({ success: true, data: streakData }))
        .mockReturnValueOnce(of({ success: true, data: achievements }));

      await achievementsService.fetchAll();

      expect(achievementsService.streak()).not.toBeNull();
      expect(achievementsService.achievements().length).toBe(4);

      // Clear cache
      achievementsService.clearCache();

      expect(achievementsService.streak()).toBeNull();
      expect(achievementsService.achievements()).toEqual([]);
      expect(achievementsService.error()).toBeNull();
    });

    it('should log cache clear action', () => {
      achievementsService.clearCache();

      expect(mockLogger.debug).toHaveBeenCalledWith('Achievements', 'Cache cleared');
    });
  });

  describe('Computed Signals', () => {
    it('should compute currentStreak from streak signal', async () => {
      const streakData = createMockStreakData({ streak: 15 });
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: streakData,
      }));

      await achievementsService.fetchStreak();

      expect(achievementsService.currentStreak()).toBe(15);
    });

    it('should compute maxStreak from streak signal', async () => {
      const streakData = createMockStreakData({ max_streak: 30 });
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: streakData,
      }));

      await achievementsService.fetchStreak();

      expect(achievementsService.maxStreak()).toBe(30);
    });

    it('should compute measurementsToday from streak signal', async () => {
      const streakData = createMockStreakData({ four_times_today: 3 });
      mockApiGateway.request.mockReturnValue(of({
        success: true,
        data: streakData,
      }));

      await achievementsService.fetchStreak();

      expect(achievementsService.measurementsToday()).toBe(3);
    });

    it('should return 0 for computed values when streak is null', () => {
      expect(achievementsService.currentStreak()).toBe(0);
      expect(achievementsService.maxStreak()).toBe(0);
      expect(achievementsService.measurementsToday()).toBe(0);
    });
  });
});

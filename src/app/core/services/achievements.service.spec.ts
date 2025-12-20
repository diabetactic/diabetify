// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AchievementsService } from '@services/achievements.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';
import { StreakData, Achievement } from '@models/achievements.model';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let mockApiGateway: { request: Mock };
  let mockLogger: { debug: Mock; info: Mock; error: Mock; warn: Mock };

  const mockStreakData: StreakData = {
    streak: 7,
    max_streak: 14,
    four_times_today: 2,
    streak_last_date: '2025-01-15',
  };

  const mockAchievements: Achievement[] = [
    {
      ach_id: 1,
      name: 'Primera Lectura',
      attribute: 'times_measured',
      got: true,
      progress: 1,
      threshold: 1,
    },
    {
      ach_id: 2,
      name: '10 Lecturas',
      attribute: 'times_measured',
      got: false,
      progress: 5,
      threshold: 10,
    },
    {
      ach_id: 3,
      name: 'Racha de 7 días',
      attribute: 'max_streak',
      got: true,
      progress: 7,
      threshold: 7,
    },
  ];

  beforeEach(() => {
    mockApiGateway = {
      request: vi.fn(),
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AchievementsService,
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(AchievementsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStreak', () => {
    it('should fetch streak data successfully', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));

      const result = await service.fetchStreak();

      expect(result).toEqual(mockStreakData);
      expect(service.streak()).toEqual(mockStreakData);
      expect(service.currentStreak()).toBe(7);
      expect(service.maxStreak()).toBe(14);
      expect(service.measurementsToday()).toBe(2);
      expect(mockApiGateway.request).toHaveBeenCalledWith('achievements.streak');
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should set loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockApiGateway.request.mockImplementation(() => {
        loadingDuringFetch = service.loading();
        return of({ success: true, data: mockStreakData });
      });

      await service.fetchStreak();

      expect(loadingDuringFetch).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('should handle API error response', async () => {
      mockApiGateway.request.mockReturnValue(
        of({ success: false, error: { message: 'API Error' } })
      );

      const result = await service.fetchStreak();

      expect(result).toBeNull();
      expect(service.error()).toBe('API Error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle missing data in response', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: null }));

      const result = await service.fetchStreak();

      expect(result).toBeNull();
      expect(service.error()).toBe('Failed to fetch streak data');
    });

    it('should handle thrown error', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.fetchStreak();

      expect(result).toBeNull();
      expect(service.error()).toBe('Network error');
    });

    it('should handle non-Error thrown objects', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => 'String error'));

      const result = await service.fetchStreak();

      expect(result).toBeNull();
      expect(service.error()).toBe('Unknown error fetching streak');
    });

    it('should use cache when valid and not forcing refresh', async () => {
      // First call - populates cache
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak();

      // Reset mock to track second call
      mockApiGateway.request.mockClear();

      // Second call - should use cache
      const result = await service.fetchStreak();

      expect(result).toEqual(mockStreakData);
      expect(mockApiGateway.request).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Achievements', 'Using cached streak data');
    });

    it('should bypass cache when forceRefresh is true', async () => {
      // First call - populates cache
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak();

      // Reset mock
      mockApiGateway.request.mockClear();
      mockApiGateway.request.mockReturnValue(
        of({ success: true, data: { ...mockStreakData, streak: 10 } })
      );

      // Second call with forceRefresh
      const result = await service.fetchStreak(true);

      expect(result?.streak).toBe(10);
      expect(mockApiGateway.request).toHaveBeenCalled();
    });

    it('should clear error on successful fetch', async () => {
      // First call - error
      mockApiGateway.request.mockReturnValue(of({ success: false, error: { message: 'Error' } }));
      await service.fetchStreak(true);
      expect(service.error()).toBe('Error');

      // Second call - success
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak(true);

      expect(service.error()).toBeNull();
    });
  });

  describe('fetchAchievements', () => {
    it('should fetch achievements successfully', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAchievements }));

      const result = await service.fetchAchievements();

      expect(result).toEqual(mockAchievements);
      expect(service.achievements()).toEqual(mockAchievements);
      expect(service.earnedCount()).toBe(2); // 2 achievements with got: true
      expect(service.totalCount()).toBe(3);
      expect(mockApiGateway.request).toHaveBeenCalledWith('achievements.list');
    });

    it('should set loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockApiGateway.request.mockImplementation(() => {
        loadingDuringFetch = service.loading();
        return of({ success: true, data: mockAchievements });
      });

      await service.fetchAchievements();

      expect(loadingDuringFetch).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('should handle API error response', async () => {
      mockApiGateway.request.mockReturnValue(
        of({ success: false, error: { message: 'API Error' } })
      );

      const result = await service.fetchAchievements();

      expect(result).toEqual([]);
      expect(service.error()).toBe('API Error');
    });

    it('should handle missing data in response', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: null }));

      const result = await service.fetchAchievements();

      expect(result).toEqual([]);
      expect(service.error()).toBe('Failed to fetch achievements');
    });

    it('should handle thrown error', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.fetchAchievements();

      expect(result).toEqual([]);
      expect(service.error()).toBe('Network error');
    });

    it('should handle non-Error thrown objects', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => ({ code: 500 })));

      const result = await service.fetchAchievements();

      expect(result).toEqual([]);
      expect(service.error()).toBe('Unknown error fetching achievements');
    });

    it('should use cache when valid', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAchievements }));
      await service.fetchAchievements();

      mockApiGateway.request.mockClear();

      const result = await service.fetchAchievements();

      expect(result).toEqual(mockAchievements);
      expect(mockApiGateway.request).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Achievements',
        'Using cached achievements data'
      );
    });

    it('should bypass cache when forceRefresh is true', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAchievements }));
      await service.fetchAchievements();

      mockApiGateway.request.mockClear();
      const newAchievements = [
        ...mockAchievements,
        {
          ach_id: 4,
          name: 'New Achievement',
          attribute: 'times_measured',
          got: false,
          progress: 0,
          threshold: 100,
        },
      ];
      mockApiGateway.request.mockReturnValue(of({ success: true, data: newAchievements }));

      const result = await service.fetchAchievements(true);

      expect(result.length).toBe(4);
      expect(mockApiGateway.request).toHaveBeenCalled();
    });
  });

  describe('fetchAll', () => {
    it('should fetch both streak and achievements', async () => {
      mockApiGateway.request.mockImplementation((endpoint: string) => {
        if (endpoint === 'achievements.streak') {
          return of({ success: true, data: mockStreakData });
        }
        if (endpoint === 'achievements.list') {
          return of({ success: true, data: mockAchievements });
        }
        return of({ success: false });
      });

      const result = await service.fetchAll();

      expect(result.streak).toEqual(mockStreakData);
      expect(result.achievements).toEqual(mockAchievements);
    });

    it('should pass forceRefresh to both methods', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak();

      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAchievements }));
      await service.fetchAchievements();

      mockApiGateway.request.mockClear();
      mockApiGateway.request.mockImplementation((endpoint: string) => {
        if (endpoint === 'achievements.streak') {
          return of({ success: true, data: { ...mockStreakData, streak: 20 } });
        }
        return of({ success: true, data: mockAchievements });
      });

      const result = await service.fetchAll(true);

      expect(result.streak?.streak).toBe(20);
      expect(mockApiGateway.request).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      mockApiGateway.request.mockImplementation((endpoint: string) => {
        if (endpoint === 'achievements.streak') {
          return throwError(() => new Error('Streak error'));
        }
        return of({ success: true, data: mockAchievements });
      });

      const result = await service.fetchAll(true);

      expect(result.streak).toBeNull();
      expect(result.achievements).toEqual(mockAchievements);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      // Populate data
      mockApiGateway.request.mockImplementation((endpoint: string) => {
        if (endpoint === 'achievements.streak') {
          return of({ success: true, data: mockStreakData });
        }
        return of({ success: true, data: mockAchievements });
      });
      await service.fetchAll();

      expect(service.streak()).not.toBeNull();
      expect(service.achievements().length).toBe(3);

      service.clearCache();

      expect(service.streak()).toBeNull();
      expect(service.achievements()).toEqual([]);
      expect(service.error()).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Achievements', 'Cache cleared');
    });

    it('should force new API calls after clearing cache', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak();

      service.clearCache();
      mockApiGateway.request.mockClear();
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));

      await service.fetchStreak();

      expect(mockApiGateway.request).toHaveBeenCalled();
    });
  });

  describe('computed signals', () => {
    beforeEach(async () => {
      mockApiGateway.request.mockImplementation((endpoint: string) => {
        if (endpoint === 'achievements.streak') {
          return of({ success: true, data: mockStreakData });
        }
        return of({ success: true, data: mockAchievements });
      });
      await service.fetchAll();
    });

    it('should compute currentStreak correctly', () => {
      expect(service.currentStreak()).toBe(7);
    });

    it('should compute maxStreak correctly', () => {
      expect(service.maxStreak()).toBe(14);
    });

    it('should compute measurementsToday correctly', () => {
      expect(service.measurementsToday()).toBe(2);
    });

    it('should compute earnedCount correctly', () => {
      expect(service.earnedCount()).toBe(2);
    });

    it('should compute totalCount correctly', () => {
      expect(service.totalCount()).toBe(3);
    });
  });

  describe('cache expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should invalidate cache after TTL expires', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak();

      mockApiGateway.request.mockClear();

      // Advance time beyond TTL (60 seconds)
      vi.advanceTimersByTime(61000);

      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak();

      expect(mockApiGateway.request).toHaveBeenCalled();
    });

    it('should use cache within TTL', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockStreakData }));
      await service.fetchStreak();

      mockApiGateway.request.mockClear();

      // Advance time but stay within TTL
      vi.advanceTimersByTime(30000);

      await service.fetchStreak();

      expect(mockApiGateway.request).not.toHaveBeenCalled();
    });
  });
});

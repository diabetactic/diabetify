/**
 * AchievementsService - Manages gamification/achievements data
 * Fetches streak and achievement data from the backend
 */

import { Injectable, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StreakData, Achievement } from '@models/achievements.model';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';

/** Cache entry with TTL tracking */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AchievementsService {
  /** Cache TTL in milliseconds (1 minute) */
  private readonly CACHE_TTL = 60000;

  /** Streak data signal */
  private streakSignal = signal<StreakData | null>(null);

  /** Achievements list signal */
  private achievementsSignal = signal<Achievement[]>([]);

  /** Loading state */
  private loadingSignal = signal(false);

  /** Error state */
  private errorSignal = signal<string | null>(null);

  /** Cache for streak data */
  private streakCache: CacheEntry<StreakData> | null = null;

  /** Cache for achievements list */
  private achievementsCache: CacheEntry<Achievement[]> | null = null;

  /** Public computed signals */
  readonly streak = computed(() => this.streakSignal());
  readonly achievements = computed(() => this.achievementsSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  /** Computed: current streak days */
  readonly currentStreak = computed(() => this.streakSignal()?.streak ?? 0);

  /** Computed: max streak days */
  readonly maxStreak = computed(() => this.streakSignal()?.max_streak ?? 0);

  /** Computed: measurements today (0-3 counter) */
  readonly measurementsToday = computed(() => this.streakSignal()?.four_times_today ?? 0);

  /** Computed: earned achievements count */
  readonly earnedCount = computed(() => this.achievementsSignal().filter(a => a.got).length);

  /** Computed: total achievements count */
  readonly totalCount = computed(() => this.achievementsSignal().length);

  constructor(
    private apiGateway: ApiGatewayService,
    private logger: LoggerService
  ) {}

  /**
   * Fetch streak data from backend
   * Uses cache if available and not expired
   */
  async fetchStreak(forceRefresh = false): Promise<StreakData | null> {
    // Check cache first
    if (!forceRefresh && this.isCacheValid(this.streakCache)) {
      this.logger.debug('Achievements', 'Using cached streak data');
      return this.streakCache?.data ?? null;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      this.logger.info('Achievements', 'Fetching streak data from backend');

      const response = await firstValueFrom(
        this.apiGateway.request<StreakData>('achievements.streak')
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch streak data');
      }

      const streakData = response.data;

      // Update cache
      this.streakCache = {
        data: streakData,
        timestamp: Date.now(),
      };

      // Update signal
      this.streakSignal.set(streakData);

      this.logger.info('Achievements', 'Streak data fetched', {
        streak: streakData.streak,
        maxStreak: streakData.max_streak,
        measurementsToday: streakData.four_times_today,
      });

      return streakData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error fetching streak';
      this.logger.error('Achievements', 'Failed to fetch streak', { error: message });
      this.errorSignal.set(message);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Fetch achievements list from backend
   * Uses cache if available and not expired
   */
  async fetchAchievements(forceRefresh = false): Promise<Achievement[]> {
    // Check cache first
    if (!forceRefresh && this.isCacheValid(this.achievementsCache)) {
      this.logger.debug('Achievements', 'Using cached achievements data');
      return this.achievementsCache?.data ?? [];
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      this.logger.info('Achievements', 'Fetching achievements from backend');

      const response = await firstValueFrom(
        this.apiGateway.request<Achievement[]>('achievements.list')
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch achievements');
      }

      const achievements = response.data;

      // Update cache
      this.achievementsCache = {
        data: achievements,
        timestamp: Date.now(),
      };

      // Update signal
      this.achievementsSignal.set(achievements);

      this.logger.info('Achievements', 'Achievements fetched', {
        total: achievements.length,
        earned: achievements.filter(a => a.got).length,
      });

      return achievements;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error fetching achievements';
      this.logger.error('Achievements', 'Failed to fetch achievements', { error: message });
      this.errorSignal.set(message);
      return [];
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Fetch both streak and achievements data
   * Convenience method for dashboard initialization
   */
  async fetchAll(forceRefresh = false): Promise<{
    streak: StreakData | null;
    achievements: Achievement[];
  }> {
    const [streak, achievements] = await Promise.all([
      this.fetchStreak(forceRefresh),
      this.fetchAchievements(forceRefresh),
    ]);

    return { streak, achievements };
  }

  /**
   * Clear all cached data
   * Call when user logs out or data needs refresh
   */
  clearCache(): void {
    this.streakCache = null;
    this.achievementsCache = null;
    this.streakSignal.set(null);
    this.achievementsSignal.set([]);
    this.errorSignal.set(null);
    this.logger.debug('Achievements', 'Cache cleared');
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid<T>(cache: CacheEntry<T> | null): boolean {
    if (!cache) return false;
    return Date.now() - cache.timestamp < this.CACHE_TTL;
  }
}

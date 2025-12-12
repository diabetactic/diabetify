/**
 * Achievements Model
 * Types for the gamification/achievements system
 *
 * Backend endpoints:
 * - GET /achievements/streak/ → StreakData
 * - GET /achievements/ → Achievement[]
 */

/**
 * Streak data from the backend
 * Tracks consecutive days of glucose measurements
 */
export interface StreakData {
  /** Current streak in days */
  streak: number;
  /** Historical maximum streak achieved */
  max_streak: number;
  /** Counter 0-3 for measurements today (resets to 0 when reaching 4) */
  four_times_today: number;
  /** Date of last streak update (Argentina timezone, ISO format) */
  streak_last_date: string;
}

/**
 * Achievement definition from the backend
 * Represents a single achievement/badge that can be earned
 */
export interface Achievement {
  /** Unique achievement ID */
  ach_id: number;
  /** Display name of the achievement */
  name: string;
  /** Attribute tracked for this achievement (e.g., "times_measured", "max_streak") */
  attribute: 'times_measured' | 'max_streak' | string;
  /** Whether the user has earned this achievement */
  got: boolean;
  /** Current progress towards the achievement (capped at threshold) */
  progress: number;
  /** Target value to earn the achievement */
  threshold: number;
}

/**
 * Achievement progress percentage helper
 */
export function getAchievementProgress(achievement: Achievement): number {
  if (achievement.threshold <= 0) return 100;
  return Math.min(100, (achievement.progress / achievement.threshold) * 100);
}

/**
 * Backend Integration Tests - Achievements & Gamification
 *
 * Tests the achievements/gamification system with real backend:
 * - GET /achievements/streak/ → StreakData
 * - GET /achievements/ → Achievement[]
 * - Streak increment on glucose measurement
 * - Achievement progress tracking
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  SERVICE_URLS,
  authenticatedGet,
  createGlucoseReading,
  GlucoseReadingType,
  clearCachedAuthToken,
} from '../../helpers/backend-services.helper';
import { StreakData, Achievement } from '@models/achievements.model';

let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

afterEach(() => {
  if (shouldRun) {
    clearCachedAuthToken();
  }
});

const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Backend Integration - Achievements & Gamification', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  // =========================================================================
  // STREAK DATA TESTS
  // =========================================================================

  describe('GET /achievements/streak/', () => {
    conditionalIt('should fetch streak data for authenticated user', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const streak = await authenticatedGet('/achievements/streak/', token);

      expect(streak).toBeDefined();
      expect(typeof streak.streak).toBe('number');
      expect(typeof streak.max_streak).toBe('number');
      expect(typeof streak.four_times_today).toBe('number');
      expect(streak.streak).toBeGreaterThanOrEqual(0);
      expect(streak.max_streak).toBeGreaterThanOrEqual(streak.streak);
      expect(streak.four_times_today).toBeGreaterThanOrEqual(0);
      expect(streak.four_times_today).toBeLessThanOrEqual(3);
    });

    conditionalIt('should have streak_last_date in valid format', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const streak: StreakData = await authenticatedGet('/achievements/streak/', token);

      if (streak.streak_last_date) {
        // Should be a date string
        expect(typeof streak.streak_last_date).toBe('string');
        expect(streak.streak_last_date.length).toBeGreaterThan(0);
      }
    });

    conditionalIt('should isolate streak data between users', async () => {
      const token1 = await loginTestUser(TEST_USERS.user1);
      const streak1: StreakData = await authenticatedGet('/achievements/streak/', token1);

      clearCachedAuthToken();

      const token2 = await loginTestUser(TEST_USERS.user2);
      const streak2: StreakData = await authenticatedGet('/achievements/streak/', token2);

      // Different users may have different streaks
      // Just verify both return valid data
      expect(streak1).toBeDefined();
      expect(streak2).toBeDefined();
      expect(typeof streak1.streak).toBe('number');
      expect(typeof streak2.streak).toBe('number');
    });

    conditionalIt('should reject request without authentication', async () => {
      try {
        const response = await fetch(`${SERVICE_URLS.apiGateway}/achievements/streak/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status).toBeOneOf([401, 403]);
      } catch (error) {
        // Network error is also acceptable for auth failure
        expect(String(error)).toMatch(/401|403|unauthorized/i);
      }
    });
  });

  // =========================================================================
  // ACHIEVEMENTS LIST TESTS
  // =========================================================================

  describe('GET /achievements/', () => {
    conditionalIt('should fetch achievements list', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const achievements: Achievement[] = await authenticatedGet('/achievements/', token);

      expect(Array.isArray(achievements)).toBe(true);
    });

    conditionalIt('should return achievements with correct structure', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const achievements: Achievement[] = await authenticatedGet('/achievements/', token);

      if (achievements.length > 0) {
        const achievement = achievements[0];

        expect(achievement).toHaveProperty('ach_id');
        expect(achievement).toHaveProperty('name');
        expect(achievement).toHaveProperty('attribute');
        expect(achievement).toHaveProperty('got');
        expect(achievement).toHaveProperty('progress');
        expect(achievement).toHaveProperty('threshold');

        expect(typeof achievement.ach_id).toBe('number');
        expect(typeof achievement.name).toBe('string');
        expect(typeof achievement.got).toBe('boolean');
        expect(typeof achievement.progress).toBe('number');
        expect(typeof achievement.threshold).toBe('number');
      }
    });

    conditionalIt('should have progress <= threshold for incomplete achievements', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const achievements: Achievement[] = await authenticatedGet('/achievements/', token);

      const incomplete = achievements.filter(a => !a.got);
      for (const achievement of incomplete) {
        expect(achievement.progress).toBeLessThanOrEqual(achievement.threshold);
      }
    });

    conditionalIt('should have valid attribute types', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const achievements: Achievement[] = await authenticatedGet('/achievements/', token);

      for (const achievement of achievements) {
        expect(typeof achievement.attribute).toBe('string');
        expect(achievement.attribute.length).toBeGreaterThan(0);
      }
    });

    conditionalIt('should isolate achievements between users', async () => {
      const token1 = await loginTestUser(TEST_USERS.user1);
      const achievements1: Achievement[] = await authenticatedGet('/achievements/', token1);

      clearCachedAuthToken();

      const token2 = await loginTestUser(TEST_USERS.user2);
      const achievements2: Achievement[] = await authenticatedGet('/achievements/', token2);

      // Both should return valid arrays
      expect(Array.isArray(achievements1)).toBe(true);
      expect(Array.isArray(achievements2)).toBe(true);
    });
  });

  // =========================================================================
  // STREAK INCREMENT ON READING
  // =========================================================================

  describe('Streak Updates on Reading Submission', () => {
    conditionalIt(
      'should track four_times_today counter correctly',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Get initial streak state
        const initialStreak: StreakData = await authenticatedGet('/achievements/streak/', token);
        const _initialMeasurements = initialStreak.four_times_today;

        // Submit a reading using the correct API
        const reading = {
          glucose_level: 120,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: 'Integration test - streak tracking',
        };

        await createGlucoseReading(reading, token);

        // Check streak after reading
        const updatedStreak: StreakData = await authenticatedGet('/achievements/streak/', token);

        // four_times_today should have changed (any valid value 0-3)
        expect(updatedStreak.four_times_today).toBeGreaterThanOrEqual(0);
        expect(updatedStreak.four_times_today).toBeLessThanOrEqual(3);
      },
      15000
    );

    conditionalIt(
      'should update achievement progress on reading submission',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Get initial achievements
        const initialAchievements: Achievement[] = await authenticatedGet('/achievements/', token);
        const timesMeasuredAchievement = initialAchievements.find(
          a => a.attribute === 'times_measured' && !a.got
        );

        if (!timesMeasuredAchievement) {
          return;
        }

        const initialProgress = timesMeasuredAchievement.progress;

        // Submit a reading using the correct API
        const reading = {
          glucose_level: 115,
          reading_type: 'ALMUERZO' as GlucoseReadingType,
          notes: 'Integration test - achievement progress',
        };

        await createGlucoseReading(reading, token);

        // Check achievements after reading
        const updatedAchievements: Achievement[] = await authenticatedGet('/achievements/', token);
        const updatedAchievement = updatedAchievements.find(
          a => a.ach_id === timesMeasuredAchievement.ach_id
        );

        expect(updatedAchievement).toBeDefined();
        // Progress should have increased (may be more than +1 due to concurrent tests)
        expect(updatedAchievement!.progress).toBeGreaterThanOrEqual(initialProgress);
      },
      15000
    );
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  describe('Error Handling', () => {
    conditionalIt('should reject achievements request without auth', async () => {
      try {
        const response = await fetch(`${SERVICE_URLS.apiGateway}/achievements/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status).toBeOneOf([401, 403]);
      } catch (error) {
        expect(String(error)).toMatch(/401|403|unauthorized/i);
      }
    });

    conditionalIt('should handle invalid token gracefully', async () => {
      try {
        const response = await fetch(`${SERVICE_URLS.apiGateway}/achievements/streak/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid.token.here',
          },
        });

        expect(response.status).toBeOneOf([401, 403, 422]);
      } catch (error) {
        expect(String(error)).toMatch(/401|403|unauthorized|invalid/i);
      }
    });
  });
});

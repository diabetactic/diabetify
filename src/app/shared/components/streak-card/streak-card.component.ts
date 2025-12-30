/**
 * Streak Card Component
 *
 * Kid-friendly gamification component displaying glucose tracking streaks
 * with emoji levels and encouraging messages.
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Streak level configuration with emoji and thresholds
 */
interface StreakLevel {
  emoji: string;
  minDays: number;
  key: string;
}

@Component({
  selector: 'app-streak-card',
  templateUrl: './streak-card.component.html',
  styleUrls: ['./streak-card.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakCardComponent {
  @Input() streak = 0;
  @Input() maxStreak = 0;
  @Input() timesMeasured = 0;
  @Input() loading = false;
  /** Measurements today counter (0-3, resets when hitting 4) */
  @Input() fourTimesToday = 0;

  /**
   * Streak levels with emoji progression
   * Designed to be encouraging and kid-friendly
   */
  private readonly streakLevels: StreakLevel[] = [
    { emoji: '💪', minDays: 0, key: 'starter' },
    { emoji: '✨', minDays: 3, key: 'consistent' },
    { emoji: '🔥', minDays: 7, key: 'dedicated' },
    { emoji: '⭐', minDays: 14, key: 'champion' },
    { emoji: '🏆', minDays: 30, key: 'legend' },
  ];

  /**
   * Get current streak level based on days
   */
  get currentLevel(): StreakLevel {
    for (let i = this.streakLevels.length - 1; i >= 0; i--) {
      if (this.streak >= this.streakLevels[i].minDays) {
        return this.streakLevels[i];
      }
    }
    return this.streakLevels[0];
  }

  /**
   * Get next level for progress indication
   */
  get nextLevel(): StreakLevel | null {
    const currentIndex = this.streakLevels.findIndex(level => level.key === this.currentLevel.key);
    if (currentIndex < this.streakLevels.length - 1) {
      return this.streakLevels[currentIndex + 1];
    }
    return null;
  }

  /**
   * Calculate progress to next level (0-100)
   */
  get progressToNextLevel(): number {
    if (!this.nextLevel) return 100;

    const currentMin = this.currentLevel.minDays;
    const nextMin = this.nextLevel.minDays;
    const progress = ((this.streak - currentMin) / (nextMin - currentMin)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }

  /**
   * Days remaining to next level
   */
  get daysToNextLevel(): number {
    if (!this.nextLevel) return 0;
    return this.nextLevel.minDays - this.streak;
  }

  /**
   * Check if user has a new personal record
   */
  get isNewRecord(): boolean {
    return this.streak > 0 && this.streak === this.maxStreak && this.streak > 1;
  }

  /**
   * Get gradient class based on streak level
   */
  get gradientClass(): string {
    switch (this.currentLevel.key) {
      case 'legend':
        return 'from-amber-400 via-yellow-500 to-amber-600';
      case 'champion':
        return 'from-purple-500 via-pink-500 to-purple-600';
      case 'dedicated':
        return 'from-orange-500 via-red-500 to-orange-600';
      case 'consistent':
        return 'from-cyan-500 via-blue-500 to-cyan-600';
      default:
        return 'from-green-500 via-emerald-500 to-green-600';
    }
  }

  /**
   * Get progress bar color class
   */
  get progressBarClass(): string {
    switch (this.currentLevel.key) {
      case 'legend':
        return 'progress-warning';
      case 'champion':
        return 'progress-secondary';
      case 'dedicated':
        return 'progress-error';
      case 'consistent':
        return 'progress-info';
      default:
        return 'progress-success';
    }
  }
}

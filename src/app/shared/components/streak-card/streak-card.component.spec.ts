// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { StreakCardComponent } from './streak-card.component';

describe('StreakCardComponent', () => {
  let component: StreakCardComponent;
  let fixture: ComponentFixture<StreakCardComponent>;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreakCardComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(StreakCardComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  function updateInputAndDetect(): void {
    cdr.markForCheck();
    fixture.detectChanges();
  }

  describe('default values', () => {
    it('should have default values of 0 and loading false', () => {
      expect(component.streak).toBe(0);
      expect(component.maxStreak).toBe(0);
      expect(component.timesMeasured).toBe(0);
      expect(component.loading).toBe(false);
    });
  });

  describe('currentLevel', () => {
    it('should return correct level for various streak values', () => {
      const testCases = [
        { streak: 0, key: 'starter', emoji: '💪' },
        { streak: 2, key: 'starter', emoji: '💪' },
        { streak: 3, key: 'consistent', emoji: '✨' },
        { streak: 6, key: 'consistent', emoji: '✨' },
        { streak: 7, key: 'dedicated', emoji: '🔥' },
        { streak: 13, key: 'dedicated', emoji: '🔥' },
        { streak: 14, key: 'champion', emoji: '⭐' },
        { streak: 29, key: 'champion', emoji: '⭐' },
        { streak: 30, key: 'legend', emoji: '🏆' },
        { streak: 100, key: 'legend', emoji: '🏆' },
      ];

      testCases.forEach(({ streak, key, emoji }) => {
        component.streak = streak;
        expect(component.currentLevel.key, `streak ${streak}`).toBe(key);
        expect(component.currentLevel.emoji, `streak ${streak} emoji`).toBe(emoji);
      });
    });
  });

  describe('nextLevel', () => {
    it('should return correct next level or null at legend', () => {
      const testCases = [
        { streak: 0, nextKey: 'consistent' },
        { streak: 5, nextKey: 'dedicated' },
        { streak: 10, nextKey: 'champion' },
        { streak: 20, nextKey: 'legend' },
        { streak: 30, nextKey: null },
        { streak: 365, nextKey: null },
      ];

      testCases.forEach(({ streak, nextKey }) => {
        component.streak = streak;
        if (nextKey) {
          expect(component.nextLevel?.key, `streak ${streak}`).toBe(nextKey);
        } else {
          expect(component.nextLevel, `streak ${streak}`).toBeNull();
        }
      });
    });
  });

  describe('progressToNextLevel', () => {
    it('should calculate progress correctly for various streaks', () => {
      const testCases = [
        { streak: 0, expected: 0 },
        { streak: 5, expected: 50 }, // (5-3)/(7-3)*100 = 50
        { streak: 6, expected: 75 }, // (6-3)/(7-3)*100 = 75
        { streak: 30, expected: 100 }, // legend = 100%
      ];

      testCases.forEach(({ streak, expected }) => {
        component.streak = streak;
        expect(component.progressToNextLevel, `streak ${streak}`).toBe(expected);
      });

      // Ensure progress is clamped to 0-100
      component.streak = 3;
      expect(component.progressToNextLevel).toBeGreaterThanOrEqual(0);
      expect(component.progressToNextLevel).toBeLessThanOrEqual(100);
    });
  });

  describe('daysToNextLevel', () => {
    it('should calculate days remaining to next level', () => {
      const testCases = [
        { streak: 0, days: 3 },
        { streak: 5, days: 2 }, // 7 - 5 = 2
        { streak: 30, days: 0 }, // legend
      ];

      testCases.forEach(({ streak, days }) => {
        component.streak = streak;
        expect(component.daysToNextLevel, `streak ${streak}`).toBe(days);
      });
    });
  });

  describe('isNewRecord', () => {
    it('should correctly identify new records', () => {
      const testCases = [
        { streak: 0, maxStreak: 0, isRecord: false },
        { streak: 1, maxStreak: 1, isRecord: false },
        { streak: 5, maxStreak: 5, isRecord: true },
        { streak: 3, maxStreak: 5, isRecord: false },
        { streak: 10, maxStreak: 10, isRecord: true },
      ];

      testCases.forEach(({ streak, maxStreak, isRecord }) => {
        component.streak = streak;
        component.maxStreak = maxStreak;
        expect(component.isNewRecord, `streak ${streak} max ${maxStreak}`).toBe(isRecord);
      });
    });
  });

  describe('gradientClass', () => {
    it('should return correct gradient class for each level', () => {
      const testCases = [
        { streak: 0, contains: 'green' },
        { streak: 5, contains: 'cyan' },
        { streak: 10, contains: 'orange' },
        { streak: 20, contains: 'purple' },
        { streak: 30, contains: 'amber' },
      ];

      testCases.forEach(({ streak, contains }) => {
        component.streak = streak;
        expect(component.gradientClass, `streak ${streak}`).toContain(contains);
      });
    });
  });

  describe('progressBarClass', () => {
    it('should return correct progress bar class for each level', () => {
      const testCases = [
        { streak: 0, className: 'progress-success' },
        { streak: 5, className: 'progress-info' },
        { streak: 10, className: 'progress-error' },
        { streak: 20, className: 'progress-secondary' },
        { streak: 30, className: 'progress-warning' },
      ];

      testCases.forEach(({ streak, className }) => {
        component.streak = streak;
        expect(component.progressBarClass, `streak ${streak}`).toBe(className);
      });
    });
  });

  describe('template rendering', () => {
    it('should display streak, maxStreak, and timesMeasured values', () => {
      component.streak = 7;
      component.maxStreak = 15;
      component.timesMeasured = 42;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('[data-testid="streak-value"]')?.textContent?.trim()).toBe('7');
      expect(compiled.querySelector('[data-testid="max-streak-value"]')?.textContent?.trim()).toBe(
        '15'
      );
      expect(
        compiled.querySelector('[data-testid="times-measured-value"]')?.textContent?.trim()
      ).toBe('42');
    });

    it('should show loading state and hide content when loading', () => {
      component.loading = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.loading')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="streak-value"]')).toBeFalsy();
    });
  });
});
